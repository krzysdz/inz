import { Router } from "express";
import { ObjectId } from "mongodb";
import { TASKS_DOMAIN } from "../../config.js";
import { db } from "../db.js";
import { authenticated } from "../middleware.js";

export const taskRouter = Router();

/** @type {import("express").RequestHandler<import("express-serve-static-core").RouteParameters<"/:id">>} */
async function taskAnonymous(req, res, next) {
	if (req.session.user) return next();

	const { id } = req.params;
	/** @type {import("mongodb").Collection<FullTaskDoc>} */
	const tasks = db.collection("fullTasks");
	const task = await tasks.findOne({ _id: new ObjectId(id) });
	if (!task) return next(404);

	res.render("task", { task, domain: TASKS_DOMAIN });
}

/** @type {import("express").RequestHandler<import("express-serve-static-core").RouteParameters<"/:id">>} */
async function taskUser(req, res, next) {
	const { id } = req.params;
	const taskId = new ObjectId(id);
	/** @type {import("mongodb").Collection<FullTaskDoc>} */
	const tasks = db.collection("fullTasks");
	const task = await tasks.findOne({ _id: taskId });
	if (!task) return next(404);

	/** @type {import("mongodb").Collection<UserDoc>} */
	const users = db.collection("users");
	const user = await users.findOne({ _id: req.session.user?.username });
	if (!user) return next(404);

	const subChallengeIds = task.answers
		.filter((a) => "challengeId" in a)
		.map((a) => /** @type {FullTaskIncorrectAnswerWChallenge} */ (a).challengeId.toString());
	const challengeId = task.challenge._id.toString();
	const taskIdStr = taskId.toString();
	const solved = user.solves && challengeId in user.solves;
	const answered = user.answers && taskIdStr in user.answers;
	const userAnswers = user.answers ? user.answers[taskIdStr] : null;
	const userSubChallengeSolves =
		user.solves && Object.keys(user.solves).filter((cid) => subChallengeIds.includes(cid));

	res.render("task", {
		task,
		domain: TASKS_DOMAIN,
		solved,
		answered,
		userAnswers,
		userSubChallengeSolves,
	});
}

taskRouter.get("/:id", [taskAnonymous, taskUser]);

/** @type {import("express").RequestHandler<import("express-serve-static-core").RouteParameters<"/:id">>} */
async function taskSubmission(req, res, next) {
	const { id } = req.params;
	const taskId = new ObjectId(id);
	/** @type {import("mongodb").Collection<FullTaskDoc>} */
	const tasks = db.collection("fullTasks");
	const task = await tasks.findOne({ _id: taskId });
	if (!task) return next(404);

	const userFlag = String.prototype.trim.call(req.body?.flag ?? "");
	const match = userFlag === task.challenge.flag;
	if (!match) return res.render("task", { task, domain: TASKS_DOMAIN, invalidFlag: true });

	/** @type {import("mongodb").Collection<UserDoc>} */
	const users = db.collection("users");
	await users.updateOne(
		{ _id: req.session.user?.username },
		// Technically the user can overwrite the date with a newer one, but I don't think that's a problem.
		{ $currentDate: { [`solves.${task.challenge._id}`]: true } }
	);

	res.render("task", { task, domain: TASKS_DOMAIN, solved: true });
}

taskRouter.post("/:id", [authenticated, taskSubmission]);

/** @type {import("express").RequestHandler<import("express-serve-static-core").RouteParameters<"/:id/quiz">>} */
async function quizSubmission(req, res, next) {
	const { id } = req.params;
	const taskId = new ObjectId(id);
	/** @type {import("mongodb").Collection<TaskDoc>} */
	const tasks = db.collection("tasks");
	const task = await tasks.findOne({ _id: taskId });
	if (!task) return next(404);

	const nAnswers = task.answers.length;
	let userAnswers = [];
	for (let i = 0; i < nAnswers; i++) {
		const key = `answer[${i}]`;
		if (key in req.body && req.body[key] === "on") userAnswers.push(true);
		else userAnswers.push(false);
	}

	/** @type {import("mongodb").Collection<UserDoc>} */
	const users = db.collection("users");
	await users.updateOne(
		{ _id: req.session.user?.username },
		// Technically the user can overwrite the answers, but let it be a "bonus" for those more curious.
		{ $set: { [`answers.${taskId}`]: userAnswers } }
	);

	res.redirect(`/task/${taskId}`);
}

taskRouter.post("/:id/quiz", [authenticated, quizSubmission]);

/** @type {import("express").RequestHandler<import("express-serve-static-core").RouteParameters<"/:tid/:cid">>} */
async function subTaskSubmission(req, res, next) {
	const { tid, cid } = req.params;
	const taskId = new ObjectId(tid);
	const challengeId = new ObjectId(cid);
	/** @type {import("mongodb").Collection<TaskDoc>} */
	const tasks = db.collection("tasks");
	/** @type {import("mongodb").Collection<ChallengeDoc>} */
	const challenges = db.collection("challenges");
	const [count, challenge] = await Promise.all([
		tasks.countDocuments({ _id: taskId }),
		challenges.findOne({ _id: challengeId }),
	]);
	if (count !== 1 || challenge === null) return next(404);

	const userFlag = String.prototype.trim.call(req.body?.flag ?? "");
	const match = userFlag === challenge.flag;
	if (match) {
		/** @type {import("mongodb").Collection<UserDoc>} */
		const users = db.collection("users");
		await users.updateOne(
			{ _id: req.session.user?.username },
			// Technically the user can overwrite the date with a newer one, but I don't think that's a problem.
			{ $currentDate: { [`solves.${challengeId}`]: true } }
		);
	} else {
		req.flash(
			`Incorrect flag for additional challenge "${challenge.subdomain}". Try again.`,
			"warning"
		);
	}

	res.redirect(`/task/${taskId}`);
}

taskRouter.post("/:tid/:cid", [authenticated, subTaskSubmission]);

// @ts-ignore
taskRouter.use((err, _req, _res, next) => {
	// Ignore 404, let the last handler on the stack handle it
	if (err === 404) return next();
	// Pass remaining errors to the next error handler
	else next(err);
});
