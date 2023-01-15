import { Router, default as express } from "express";
import { ObjectId } from "mongodb";
import { domainToASCII } from "url";
import { addChallenge, checkTag, reloadNginx } from "../challenges.js";
import { client, db } from "../db.js";
import { processMarkdown } from "../markdown.js";
import { adminOnly } from "../middleware.js";

export const adminRouter = Router();
adminRouter.use(adminOnly);
adminRouter.use(express.json({ strict: true }));

adminRouter.get("/", (_req, res) => {
	res.locals.activePage = "admin panel";
	res.render("admin");
});

adminRouter.get(
	"/users",
	async (req, /** @type {express.Response<AdminResponse<UsersList>>} */ res) => {
		const { page: pageStr, size: sizeStr } = req.query ?? {};
		let page, size;
		try {
			// @ts-ignore
			page = Number.parseInt(pageStr);
			// @ts-ignore
			size = Number.parseInt(sizeStr);
		} catch (error) {
			return res.status(422).json({
				error: "Invalid data",
				message: "page and size must be integers if provided",
			});
		}
		if (page < 1 || size < 1)
			return res
				.status(422)
				.json({ error: "Invalid data", message: "page and size must be >= 1" });

		/** @type {import("mongodb").Collection<UserDoc>} */
		const collection = db.collection("users");
		const users = collection
			.find(
				{},
				{
					projection: { _id: 1, role: 1 },
					sort: { role: 1, _id: 1 },
					skip: size * (page - 1),
					limit: size,
				}
			)
			.map(({ _id, role }) => ({ username: _id, role }))
			.toArray();
		const totalUsers = collection.estimatedDocumentCount();
		res.json({ error: null, users: await users, count: await totalUsers, page, size });
	}
);

adminRouter.patch(
	"/users/:username",
	async (req, /** @type {express.Response<AdminResponse<ChangeUserRole>>} */ res) => {
		const { username } = req.params;
		const role = req.body?.role ?? "";
		if (!["user", "admin"].includes(role))
			return res
				.status(422)
				.json({ error: "Invalid data", message: "Role must be either user or admin" });

		/** @type {import("mongodb").Collection<UserDoc>} */
		const collection = db.collection("users");
		const result = await collection.updateOne({ _id: username }, { $set: { role } });
		if (result.modifiedCount === 0)
			return res.status(404).json({ error: "Not found", message: "User does not exist" });
		res.json({ error: null, role });
	}
);

adminRouter.delete(
	"/users/:username",
	async (req, /** @type {express.Response<AdminResponse<{}>>} */ res) => {
		const { username } = req.params;
		if (username === res.locals.username)
			return res.status(418).json({
				error: "I'm a teapot",
				message: "Refusing to brew a coffee. Why are you trying to do this?",
			});

		/** @type {import("mongodb").Collection<UserDoc>} */
		const collection = db.collection("users");
		const result = await collection.deleteOne({ _id: username });
		if (result.deletedCount === 0)
			return res.status(404).json({ error: "Not found", message: "User does not exist" });
		res.json({ error: null });
	}
);

adminRouter.get(
	"/categories",
	async (_req, /** @type {express.Response<AdminResponse<CategoriesList>>} */ res) => {
		/** @type {import("mongodb").Collection<CategoryDoc>} */
		const collection = db.collection("categories");
		const categories = await collection.find().toArray();
		res.json({ error: null, categories });
	}
);

adminRouter.post("/categories", async (req, res) => {
	if (!req.body) res.status(400).json({ error: "Bad request", message: "No request body" });
	const { name, description: descriptionRaw, descriptionFormat } = req.body;
	if (
		typeof name !== "string" ||
		typeof descriptionRaw !== "string" ||
		!["html", "md"].includes(descriptionFormat)
	)
		return res.status(422).json({
			error: "Invalid data",
			message:
				'name and description must be strings, descriptionFormat must be either "html" or "md".',
		});

	/** @type {CategoryDoc} */
	const category = { name, descriptionRaw, descriptionFormat };
	if (descriptionFormat === "md") {
		const html = await processMarkdown(descriptionRaw);
		category.descriptionProcessed = html;
	}

	/** @type {import("mongodb").Collection<CategoryDoc>} */
	const collection = db.collection("categories");
	const result = await collection.insertOne(category);
	res.json({ error: null, id: result.insertedId });
});

adminRouter.put("/categories/:cid", async (req, res) => {
	/** @type {ObjectId} */
	let id;
	try {
		id = new ObjectId(req.params.cid);
	} catch (e) {
		return res.status(404).json({
			error: "Not found",
			message: "Requested id does not exist, because it's invalid",
		});
	}
	if (!req.body) res.status(400).json({ error: "Bad request", message: "No request body" });
	const { name, description: descriptionRaw, descriptionFormat } = req.body;
	if (
		typeof name !== "string" ||
		typeof descriptionRaw !== "string" ||
		!["html", "md"].includes(descriptionFormat)
	)
		return res.status(422).json({
			error: "Invalid data",
			message:
				'name and description must be strings, descriptionFormat must be either "html" or "md".',
		});

	/** @type {CategoryDoc} */
	const category = { name, descriptionRaw, descriptionFormat };
	if (descriptionFormat === "md") {
		const html = await processMarkdown(descriptionRaw);
		category.descriptionProcessed = html;
	}

	/** @type {import("mongodb").Collection<CategoryDoc>} */
	const collection = db.collection("categories");
	const result = await collection.replaceOne({ _id: id }, category);
	if (result.modifiedCount === 0)
		return res.status(404).json({ error: "Not found", message: "Category does not exist" });
	res.json({ error: null });
});

// adminRouter.post("/render", async (req, res) => {
// 	const html = await processMarkdown(req.body);
// 	res.type("text/plain").send(html);
// });

adminRouter.post("/tasks", async (req, res) => {
	if (!req.body) res.status(400).json({ error: "Bad request", message: "No request body" });
	const {
		name,
		category,
		description,
		taskImage,
		subdomain: subdomainUnicode,
		flag,
		flagInEnv,
		resetInterval,
		hints,
		question,
		answers,
		visible = true,
	} = req.body;
	if (
		typeof name !== "string" ||
		typeof description !== "string" ||
		typeof taskImage !== "string" ||
		typeof subdomainUnicode !== "string" ||
		typeof flag !== "string" ||
		typeof flagInEnv !== "boolean" ||
		typeof resetInterval !== "number" ||
		!Array.isArray(hints) ||
		hints.some((hint) => typeof hint !== "string") ||
		typeof question !== "string" ||
		!Array.isArray(answers) ||
		typeof visible !== "boolean" ||
		// These 3 must absolutely not be empty
		!name ||
		!taskImage ||
		!subdomainUnicode
	)
		return res
			.status(422)
			.json({ error: "Invalid data", message: "Request body validation failed" });

	/** @type {ObjectId} */
	let categoryId;
	try {
		categoryId = new ObjectId(category);
	} catch (e) {
		return res
			.status(422)
			.json({ error: "Invalid data", message: "Invalid category ObjectId" });
	}

	try {
		for (const answer of answers) {
			if (!answer.correct && typeof answer.subdomain === "string" && answer.subdomain)
				answer.subdomain = checkSubdomain(answer.subdomain);
		}
	} catch (e) {
		return res.status(422).json({
			error: "Invalid data",
			message: "Answer challenge subdomain verification failed:\n" + e,
		});
	}

	const subdomains = answers.map((a) => a.subdomain).filter((sub) => !!sub);
	if (new Set(subdomains).size !== subdomains.length)
		return res
			.status(422)
			.json({ error: "Invalid data", message: "Multiple answers with the same subdomain" });

	const renderedDescription = processMarkdown(description);
	/** @type {ChallengeDoc} */
	let taskChallengeDoc;
	try {
		const subdomain = checkSubdomain(subdomainUnicode);
		taskChallengeDoc = checkTag({
			taskImage,
			subdomain,
			flag,
			resetInterval,
			challengeKind: "task",
		});
	} catch (e) {
		return res
			.status(422)
			.json({ error: "Invalid data", message: "Invalid task subdomain:\n" + e });
	}
	/** @type {ChallengeDoc[]} */
	const answerChallengeDocs = answers
		.filter(
			(a) =>
				!a.correct &&
				typeof a.taskImage === "string" &&
				a.taskImage &&
				typeof a.subdomain === "string" &&
				a.subdomain &&
				typeof a.flag === "string" &&
				a.flag &&
				typeof a.resetInterval === "number" &&
				a.flagInEnv &&
				typeof a.flagInEnv === "boolean"
		)
		.map(({ taskImage, subdomain, flag, flagInEnv, resetInterval }) =>
			checkTag({
				taskImage,
				subdomain,
				flag,
				flagInEnv,
				resetInterval,
				challengeKind: "subtask",
			})
		);

	const session = client.startSession();
	try {
		session.startTransaction();

		/** @type {import("mongodb").Collection<ChallengeDoc>} */
		const challengesCollection = db.collection("challenges");
		const taskInsertResult = await challengesCollection.insertOne(taskChallengeDoc, {
			session,
		});
		/* eslint-disable no-mixed-spaces-and-tabs, indent */
		const subChallengeResult = answerChallengeDocs
			? await challengesCollection.insertMany(answerChallengeDocs, {
					session,
			  })
			: { insertedIds: [] };
		/* eslint-enable no-mixed-spaces-and-tabs, indent */

		const answersSubDocs = answers.map(({ text, correct, explanation, subdomain }) => {
			/** @type {TaskDoc["answers"][0]} */
			const answer = { text, correct };
			if (explanation && typeof explanation === "string") answer.explanation = explanation;
			if (!answer.correct && subdomain) {
				const idx = answerChallengeDocs.findIndex((a) => a.subdomain === subdomain);
				if (idx === -1) throw new Error("Subdomain not found in answers");
				const challengeId = subChallengeResult.insertedIds[idx];
				answer.challengeId = challengeId;
			}
			return answer;
		});

		/** @type {import("mongodb").Collection<TaskDoc>} */
		const tasksCollection = db.collection("tasks");
		await tasksCollection.insertOne(
			{
				name,
				categoryId,
				descriptionMd: description,
				descriptionRendered: await renderedDescription,
				challengeId: taskInsertResult.insertedId,
				hints,
				question,
				answers: answersSubDocs,
				visible,
			},
			{ session }
		);

		// Create Docker containers, don't wait for them to be created, because it can take a while
		const challengesPromises = answerChallengeDocs.map((ch) => addChallenge(ch));
		challengesPromises.push(addChallenge(taskChallengeDoc));
		Promise.allSettled(challengesPromises)
			.then((results) => {
				for (const result of results) {
					if (result.status === "rejected")
						console.error("Starting challenge failed with reason:\n", result.reason);
				}
				return reloadNginx();
			})
			.catch((e) => console.error(e));

		await session.commitTransaction();
		res.json({ error: null });
	} catch (error) {
		console.error(error);
		await session.abortTransaction();
		if (!res.headersSent)
			res.status(500).json({
				error: "Server error",
				message: "An error occurred, check server logs",
			});
	} finally {
		await session.endSession();
	}
});

adminRouter.get("/tasks", async (_req, res) => {
	const tasks = await db.collection("fullTasks").find().toArray();
	res.json({ error: null, tasks });
});

/**
 * Converts domain to ASCII representation and
 * checks if it meets criteria (not empty, not IP address, single level - no dots)
 * @param {string} subdomain subdomain possibly using unicode characters
 * @returns ASCII representation of the subdomain using punycode
 */
function checkSubdomain(subdomain) {
	const asciiSubdomain = domainToASCII(subdomain);
	if (asciiSubdomain.length === 0) throw new Error("Subdomain must not be empty");
	if (asciiSubdomain.includes("."))
		throw new Error("Subdomain must not include dots or be an IPv4 address");
	if (asciiSubdomain.includes("[")) throw new Error("Subdomain must not be an IPv6 address");
	return asciiSubdomain;
}

/**
 * @template R
 * @typedef {import("./admin").AdminResponse<R>} AdminResponse<R>
 */
/** @typedef {import("./admin").UsersList} UsersList */
/** @typedef {import("./admin").ChangeUserRole} ChangeUserRole */
/** @typedef {import("./admin").CategoriesList} CategoriesList */
