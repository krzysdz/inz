import * as argon2 from "argon2";
import { Router } from "express";
import mongodb from "mongodb";
import { db } from "../db.js";
import { authenticated } from "../middleware.js";
const { MongoServerError } = mongodb;

export const authRouter = Router();

authRouter.get("/register", (_req, res) => {
	return res.render("register");
});

/** @type {import("express").RequestHandler} */
const register = async (req, res) => {
	/** @type {string[]} */
	let errors = [];
	if (!req.body) res.sendStatus(400);
	const { username, password, passwordRetype } = req.body;
	if (typeof username !== "string") errors.push("Username must be provided.");
	else if (username.length > 255) errors.push("Maximum username length is 255 characters.");
	if (typeof password !== "string") errors.push("Password must be provided.");
	else if (password.length < 8 || password.length > 64)
		errors.push("Password be have between 8 and 64 characters long.");
	else if (password !== passwordRetype) errors.push("Passwords do not match");

	if (errors.length) {
		for (const err of errors) {
			req.flash(err, "error");
		}
		return res.status(422).render("register");
	}

	/** @type {import("mongodb").Collection<UserDoc>} */
	const usersColl = db.collection("users");
	try {
		const hash = await argon2.hash(password);
		await usersColl.insertOne({ _id: username, hash, role: "user" });
		req.flash("You can now log in.");
		res.redirect("/auth/login");
	} catch (error) {
		if (error instanceof MongoServerError && error.code === 11000) {
			req.flash("Username already taken.", "error");
			return res.status(409).render("register");
		}
		console.error(error);
		req.flash(
			"Something went wrong. Try again later. If the problem persists, please contact administrators.",
			"error"
		);
		res.status(500).render("register");
	}
};
authRouter.post("/register", register);

authRouter.get("/login", (_req, res) => {
	res.render("login");
});

/** @type {import("express").RequestHandler} */
const login = async (req, res) => {
	if (!req.body) res.sendStatus(400);
	/** @type {string[]} */
	let errors = [];
	const { username, password } = req.body;
	if (typeof username !== "string") errors.push("Username must be provided.");
	else if (username.length > 255) errors.push("Maximum username length is 255 characters.");
	if (typeof password !== "string") errors.push("Password must be provided.");
	else if (password.length < 8 || password.length > 64)
		errors.push("Password must have between 8 and 64 characters long.");

	if (errors.length) {
		for (const err of errors) {
			req.flash(err, "error");
		}
		return res.status(422).render("login");
	}

	/** @type {import("mongodb").Collection<UserDoc>} */
	const usersColl = db.collection("users");
	const user = await usersColl.findOne({ _id: username });
	if (!user) {
		req.flash("Invalid username or password", "error");
		return res.render("login");
	}
	const passwordMatch = await argon2.verify(user.hash, password);
	if (!passwordMatch) {
		req.flash("Invalid username or password", "error");
		return res.render("login");
	}

	req.session.user = { username: user._id, role: user.role };
	return res.redirect("/");
};
authRouter.post("/login", login);

/** @type {import("express").RequestHandler} */
const logout = (req, res) => {
	req.session.destroy((err) => {
		if (err) {
			console.error(err);
			req.flash("Logout failed. Try again later", "error");
			return res.status(500).render("error");
		}
		req.flash("Logged out successfully", "info");
		return res.redirect("/");
	});
};
authRouter.get("/logout", logout);

/** @type {import("express").RequestHandler} */
const changePassword = async (req, res) => {
	res.locals.activePage = "profile";
	/** @type {string[]} */
	let errors = [];
	if (!req.body) res.sendStatus(400);
	const { currentPassword, password, passwordRetype } = req.body;
	const username = req.session.user?.username;
	if (typeof username !== "string") errors.push("You are not logged in.");
	if (typeof currentPassword !== "string") errors.push("Current password must be provided.");
	if (typeof password !== "string") errors.push("New password must be provided.");
	else if (password.length < 8 || password.length > 64)
		errors.push("Password be have between 8 and 64 characters long.");
	else if (password !== passwordRetype) errors.push("Passwords do not match");

	if (errors.length) {
		for (const err of errors) {
			req.flash(err, "error");
		}
		return res.status(422).render("profile");
	}

	/** @type {import("mongodb").Collection<UserDoc>} */
	const usersColl = db.collection("users");
	const user = await usersColl.findOne({ _id: username });
	if (!user) {
		req.flash("User does not exist.", "error");
		return res.redirect("/auth/login");
	}
	const passwordMatch = await argon2.verify(user.hash, currentPassword);
	if (!passwordMatch) {
		req.flash("Invalid password.", "error");
		return res.redirect("profile");
	}
	const hash = await argon2.hash(password);
	await usersColl.updateOne({ _id: username }, { $set: { hash } });
	req.flash("Password changed.", "success");
	res.redirect("/profile");
};
authRouter.post("/changePassword", [authenticated, changePassword]);
