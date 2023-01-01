import { Worker } from "node:worker_threads";

/** 0.5 s timeout */
const TIMEOUT_LIMIT = 500;

/**
 * Process markdown using marked in a separate thread with a timeout.
 * @param {string} markdownString raw markdown string
 * @returns {Promise<string>}
 */
export function processMarkdown(markdownString) {
	return new Promise((resolve, reject) => {
		const markedWorker = new Worker(new URL("./markedThread.js", import.meta.url));

		const markedTimeout = setTimeout(() => {
			markedWorker.terminate();
			reject(new Error("Marked took too long!"));
		}, TIMEOUT_LIMIT);

		markedWorker.on("error", (err) => reject(err));

		markedWorker.on("message", (html) => {
			clearTimeout(markedTimeout);
			markedWorker.terminate();
			resolve(html);
		});

		markedWorker.postMessage(markdownString);
	});
}
