import hljs from "highlight.js";
import { marked } from "marked";
import { gfmHeadingId } from "marked-gfm-heading-id";
import { markedHighlight } from "marked-highlight";
import { parentPort } from "node:worker_threads";

marked.use(
	markedHighlight({
		highlight: (code, lang) => {
			const language = hljs.getLanguage(lang) ? lang : "plaintext";
			return hljs.highlight(code, { language }).value;
		},
		langPrefix: "hljs language-",
	}),
	gfmHeadingId()
);

if (parentPort === null) throw new Error("Parent port is null");

parentPort.on("message", (markdownString) => {
	// @ts-ignore
	parentPort.postMessage(marked.parse(markdownString));
});
