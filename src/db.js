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
	client = new MongoClient(DB_URL, { appName: "inz_app", directConnection: true });
	db = client.db(DB_NAME);
	setupDb(db);
} else {
	if (!global.__client) {
		global.__client = new MongoClient(DB_URL, {
			appName: "inz_app_dev",
			directConnection: true,
		});
	}
	client = global.__client;
	db = client.db(DB_NAME);
	setupDb(db);
}

/**
 * @param {import("mongodb").Db} db
 */
async function setupDb(db) {
	/** @type {import("mongodb").Collection<CategoryDoc>} */
	const categories = db.collection("categories");
	// Make sure that there is an unique index on name in the categories collection
	await categories.createIndex({ name: 1 }, { unique: true });

	/** @type {import("mongodb").Collection<ChallengeDoc>} */
	const challenges = db.collection("challenges");
	// Subdomains must be unique
	await challenges.createIndex({ subdomain: 1 }, { unique: true });
}

export { db, client };
