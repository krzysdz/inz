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
	// Make sure that there is an unique index on name in the categories collection, use collation for case-insensitive search
	await categories.createIndex(
		{ name: 1 },
		{ unique: true, collation: { locale: "en", strength: 2 } }
	);

	/** @type {import("mongodb").Collection<ChallengeDoc>} */
	const challenges = db.collection("challenges");
	// Subdomains must be unique
	await challenges.createIndex({ subdomain: 1 }, { unique: true });

	// A view on tasks, which joins appropriate challenges
	try {
		await db.createCollection("fullTasks", {
			viewOn: "tasks",
			pipeline: [
				// add challenge as "challenge" array of 1 document
				{
					$lookup: {
						from: "challenges",
						localField: "challengeId",
						foreignField: "_id",
						as: "challenge",
					},
				},
				// add challenges from answers as "answerChallenges" array
				{
					$lookup: {
						from: "challenges",
						localField: "answers.challengeId",
						foreignField: "_id",
						as: "answerChallenges",
					},
				},
				// select and modify returned fields
				{
					$project: {
						name: 1,
						categoryId: 1,
						descriptionMd: 1,
						descriptionRendered: 1,
						question: 1,
						hints: 1,
						visible: 1,
						// Replace the "challenge" array with the only document inside it
						challenge: {
							$first: "$challenge",
						},
						// Add a challenge field (subdocument) to each answer with challengeId
						answers: {
							$map: {
								input: "$answers",
								as: "a",
								in: {
									$mergeObjects: [
										"$$a",
										{
											challenge: {
												$first: {
													$filter: {
														input: "$answerChallenges",
														cond: {
															$eq: ["$$this._id", "$$a.challengeId"],
														},
														limit: 1,
													},
												},
											},
										},
									],
								},
							},
						},
					},
				},
			],
		});
	} catch (e) {
		/* Ignore NamespaceExists errors - it means that the view exists */ // @ts-ignore
		if (e?.codeName !== "NamespaceExists") throw e;
	}
}

export { db, client };
