import hljs from "highlight.js";
import { marked } from "marked";
import { parentPort } from "node:worker_threads";

marked.setOptions({
	highlight: (code, lang) => {
		const language = hljs.getLanguage(lang) ? lang : "plaintext";
		return hljs.highlight(code, { language }).value;
	},
	langPrefix: "hljs language-",
});

if (parentPort === null) throw new Error("Parent port is null");

parentPort.on("message", (markdownString) => {
	// @ts-ignore
	parentPort.postMessage(marked.parse(markdownString));
});
