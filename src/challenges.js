import Dockerode from "dockerode";
import { spawn } from "node:child_process";
import { opendir, unlink, writeFile } from "node:fs/promises";
import path, { extname } from "node:path";
import { domainToASCII, fileURLToPath } from "node:url";
import { CONTAINER_PREFIX, NGINX_BIN, TASKS_DOMAIN, TASK_PORT_START } from "../config.js";
import { db } from "./db.js";

// Use the default settings (for now), because it works on both Windows and Linux
const docker = new Dockerode();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const subdomainsPath = path.join(__dirname, "../nginx/conf/subdomains");

let nextPort = TASK_PORT_START;
/** @type {{[subdomain: string]: NodeJS.Timer}} */
const resetTimers = {};

export function getChallengeContainers(all = false) {
	return docker.listContainers({ all, filters: { label: ["pl.krzysdz.inz.challenge-kind"] } });
}

export async function startupChallenges() {
	// Stop all containers and remove subdomains
	console.log("Removing all nginx subdomain configs");
	const dir = await opendir(subdomainsPath);
	for await (const file of dir) {
		if (file.isFile() && extname(file.name) === ".conf") {
			const fullPath = path.join(subdomainsPath, file.name);
			await unlink(fullPath);
		}
	}
	console.log("Stopping and removing all containers");
	const containersList = await getChallengeContainers(true);
	const containers = containersList.map((info) => docker.getContainer(info.Id));
	const removePromises = containers.map((container) =>
		container
			.stop({ t: 10 })
			.catch((e) => console.error(e))
			.finally(() => container.remove({ v: true }))
	);
	await Promise.all(removePromises);
	console.log("All containers removed");

	// Recreate all challenges
	/** @type {import("mongodb").Collection<ChallengeDoc>} */
	const challenges = db.collection("challenges");
	const addChallengesPromise = await challenges
		.find()
		.map((doc) => addChallenge(doc))
		.toArray();
	await Promise.all(addChallengesPromise);
	console.log("All challenges are running");
	await reloadNginx();
	console.log("Nginx reloaded");
}

/**
 *
 * @param {ChallengeDoc} challengeDoc
 */
export async function addChallenge(challengeDoc, reload = false) {
	const taggedChallengeDoc = checkTag(challengeDoc);
	const port = await startChallengeContainer(taggedChallengeDoc);
	await createNginxConfig(taggedChallengeDoc.subdomain, port);
	if (reload) await reloadNginx();
}

/**
 * Make sure that the image is tagged
 * @param {ChallengeDoc} challengeDoc
 */
export function checkTag(challengeDoc) {
	const { taskImage } = challengeDoc;
	if (taskImage.includes(":")) return challengeDoc;
	console.log("Image is not tagged, adding tag :latest");
	return { ...challengeDoc, taskImage: taskImage + ":latest" };
}

/**
 * Pull the challenge image and start the container. If the container is running it will be restarted.
 * @param {ChallengeDoc} challengeDoc
 */
export async function startChallengeContainer(challengeDoc) {
	const containerName = CONTAINER_PREFIX + challengeDoc.subdomain;

	// pull the image
	/** @type {import("node:http").IncomingMessage} */ // @ts-ignore
	const i = await docker.createImage({
		fromImage: challengeDoc.taskImage,
	});
	// Reading data is necessary for end/close to be fired
	i.on("data", (chunk) => console.log(chunk.toString()));

	const imageCreatedPromise = new Promise((resolve, reject) => {
		if (i.complete) {
			resolve(null);
		} else {
			i.once("close", () => resolve(undefined));
			i.once("error", (e) => reject(e));
		}
	});
	await imageCreatedPromise;

	// make sure that there is no container with the same subdomain and stop it if it exists
	try {
		const container = docker.getContainer(containerName);
		await container.stop({ t: 10 });
		await container.remove({ v: true });
	} catch (error) {
		/* There is no such container */
	}

	const port = nextPort++;
	const container = await docker.createContainer({
		name: containerName,
		Image: challengeDoc.taskImage,
		ExposedPorts: {
			"80/tcp": {},
		},
		HostConfig: {
			PortBindings: {
				"80/tcp": [
					{
						HostIp: "127.0.0.1",
						// If HostPort is an empty string, docker should automatically assign a host port.
						HostPort: port.toString(),
					},
				],
			},
		},
		Labels: {
			"pl.krzysdz.inz.challenge-kind": challengeDoc.challengeKind,
			"pl.krzysdz.inz.subdomain": challengeDoc.subdomain,
		},
	});
	await container.start();
	if (challengeDoc.resetInterval) {
		const resetTimer = setInterval(async () => {
			try {
				await restartChallengeContainer(port, challengeDoc);
			} catch (e) {
				console.error(
					`Planned container ${challengeDoc.subdomain} restart failed with error`,
					e
				);
			}
		}, challengeDoc.resetInterval * 1000);
		resetTimers[challengeDoc.subdomain] = resetTimer;
	}
	return port;
}

/**
 * Restart a container, reusing the same port
 * @param {number} port
 * @param {ChallengeDoc} challengeDoc
 */
async function restartChallengeContainer(port, challengeDoc) {
	const containerName = CONTAINER_PREFIX + challengeDoc.subdomain;

	// Stop and remove the container
	try {
		const container = docker.getContainer(containerName);
		await container.stop({ t: 10 });
		await container.remove({ v: true });
	} catch (error) {
		console.error(`Failed to stop ${containerName} during restart with error`, error);
	}

	// Recreate and start
	const container = await docker.createContainer({
		name: containerName,
		Image: challengeDoc.taskImage,
		ExposedPorts: {
			"80/tcp": {},
		},
		HostConfig: {
			PortBindings: {
				"80/tcp": [
					{
						HostIp: "127.0.0.1",
						// If HostPort is an empty string, docker should automatically assign a host port.
						HostPort: port.toString(),
					},
				],
			},
		},
		Labels: {
			"pl.krzysdz.inz.challenge-kind": challengeDoc.challengeKind,
			"pl.krzysdz.inz.subdomain": challengeDoc.subdomain,
		},
	});
	await container.start();
}

/**
 *
 * @param {string} subdomain
 * @param {number} port
 */
export async function createNginxConfig(subdomain, port) {
	const asciiSubdomain = domainToASCII(subdomain);
	if (asciiSubdomain.length === 0) throw new Error("Subdomain must not be empty");
	if (asciiSubdomain.includes("."))
		throw new Error("Subdomain must not include dots or be an IPv4 address");
	if (asciiSubdomain.includes("[")) throw new Error("Subdomain must not be an IPv6 address");

	const config = `server {
		listen 443       ssl http2;
		listen [::]:443  ssl http2;

		server_name  ${asciiSubdomain}.${TASKS_DOMAIN};

		location / {
			proxy_pass   http://127.0.0.1:${port};
		}
	}
	`;

	const configPath = path.join(subdomainsPath, asciiSubdomain + ".conf");

	await writeFile(configPath, config, { encoding: "utf8" });
}

/**
 * @returns {Promise<0>}
 */
export function reloadNginx() {
	return new Promise((resolve, reject) => {
		const projectDir = path.join(__dirname, "../");
		const proc = spawn(NGINX_BIN, ["-s", "reload", "-p", "./nginx"], {
			cwd: projectDir,
			windowsHide: true,
			timeout: 5000,
		});
		proc.on("exit", (code, signal) => {
			if (code === null)
				return reject(new Error(`Nginx reload process terminated with signal ${signal}`));
			if (code === 0) return resolve(code);
			reject(new Error(`Nginx reload process exited with code ${code}`));
		});
	});
}
