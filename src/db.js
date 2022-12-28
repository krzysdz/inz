import { MongoClient } from "mongodb";
import { DB_NAME, DB_URL } from "../config.js";

/** @type {import("mongodb").Db} */
let db;
/** @type {MongoClient} */
let client;

// this is needed because in development we don't want to restart
// the server with every change, but we want to make sure we don't
// create a new connection to the DB with every change either.
if (process.env.NODE_ENV === "production") {
	client = new MongoClient(DB_URL, { appName: "inz_app" });
	db = client.db(DB_NAME);
} else {
	if (!global.__client) {
		global.__client = new MongoClient(DB_URL, { appName: "inz_app_dev" });
	}
	client = global.__client;
	db = client.db(DB_NAME);
}

export { db, client };
