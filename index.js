import MongoStore from "connect-mongo";
import express from "express";
import session from "express-session";
import helmet from "helmet";
import { env, exit } from "process";
import { DB_NAME, SECRET } from "./config.js";
import { client } from "./src/db.js";
import { flasher } from "./src/flash.js";
import { authRouter } from "./src/routes/auth.js";

const PORT = env.PORT ? Number.parseInt(env.PORT) : 3000;

const app = express();
app.set("view engine", "ejs");
app.set("view options", { strict: true });

app.use(
	helmet({
		contentSecurityPolicy: {
			directives: {
				scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
			},
		},
	})
);
app.use("/static", express.static("static"));
/***************************************************************************************
 *** REMEMBER NOT TO USE EXTENDED URLENCODED BODY PARSER (prototype pollution in qs) ***
 ***************************************************************************************/
app.use(express.urlencoded({ extended: false }));
app.use(
	session({
		cookie: {
			httpOnly: true,
			sameSite: "strict",
			secure: process.env.NODE_ENV === "production",
			maxAge: 14 * 24 * 3600_000,
		},
		resave: false,
		saveUninitialized: false,
		secret: SECRET,
		store: MongoStore.create({
			client,
			dbName: DB_NAME,
			touchAfter: 24 * 3600,
			ttl: 14 * 24 * 3600,
		}),
	})
);
app.use(flasher());
app.use((req, res, next) => {
	// res.locals.flashedMessages = req.getFlashedMessages({ withCategories: true });
	res.locals.loggedIn = typeof req.session.user !== "undefined";
	res.locals.username = req.session.user?.username ?? "";
	res.locals.userRole = req.session.user?.role ?? "none";
	res.locals.activePage = ""; // placeholder
	next();
});

app.get("/", (_req, res) => {
	res.render("index", { activePage: "home" });
});

app.use("/auth", authRouter);

const server = app.listen(PORT, () => console.log(`Listening on http://127.0.0.1:${PORT}`));

/**
 * @param {NodeJS.Signals} signal signal name
 */
function shutdown(signal) {
	console.log(`Received ${signal}, shutting down`);
	server.close(async (err) => {
		if (err) {
			console.error("Could not gracefully stop the server", err);
			await client.close();
			exit(128);
		}
		console.log("Server closed");
		await client.close();
		console.log("DB connection closed");
		exit(0);
	});
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
