import express from "express";
import helmet from "helmet";
import { env, exit } from "process";

const PORT = env.PORT ? Number.parseInt(env.PORT) : 3000;

const app = express();
app.set("view engine", "ejs");

app.use(helmet());
app.use("/static", express.static("static"));

app.get("/", (req, res) => {
	res.render("index");
});

const server = app.listen(PORT, () => console.log(`Listening on http://127.0.0.1:${PORT}`));

/**
 * @param {NodeJS.Signals} signal signal name
 */
function shutdown(signal) {
	console.log(`Received ${signal}, shutting down`);
	server.close((err) => {
		if (err) {
			console.error("Could not gracefully stop the server", err);
			exit(128);
		}
		console.log("Server closed");
	});
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
