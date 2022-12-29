import * as argon2 from "argon2";
import { Router } from "express";
import mongodb from "mongodb";
import { db } from "../db.js";
const { WriteError } = mongodb;

export const authRouter = Router();

authRouter.get("/register", (_req, res) => {
	return res.render("register");
});

/** @type {import("express").RequestHandler} */
const register = async (req, res) => {
	/** @type {string[]} */
	let errors = [];
	const username = req.body?.username;
	const password = req.body?.password;
	if (typeof username !== "string") errors.push("Username must be provided.");
	else if (username.length > 255) errors.push("Maximum username length is 255 characters.");
	if (typeof password !== "string") errors.push("Password must be provided.");
	else if (password.length < 8 || password.length > 64)
		errors.push("Password must have between 8 and 64 characters long.");

	if (errors.length) return res.render("register", { errors });

	/** @type {import("mongodb").Collection<UserDoc>} */
	const usersColl = db.collection("users");
	try {
		const hash = await argon2.hash(password);
		await usersColl.insertOne({ _id: username, hash, role: "user" });
		req.flash("You can now log in.");
		res.redirect("/auth/login");
	} catch (error) {
		if (error instanceof WriteError && error.code === 11000) errors.push("Username taken");
		else {
			console.error(error);
			errors.push(
				"Something went wrong. Try again later. If the problem persists, please contact administrators."
			);
		}
		res.render("register", { errors });
	}
};
authRouter.post("/register", register);

authRouter.get("/login", (_req, res) => {
	res.render("login");
});

/** @type {import("express").RequestHandler} */
const login = async (req, res) => {
	/** @type {string[]} */
	let errors = [];
	const username = req.body?.username;
	const password = req.body?.password;
	if (typeof username !== "string") errors.push("Username must be provided.");
	else if (username.length > 255) errors.push("Maximum username length is 255 characters.");
	if (typeof password !== "string") errors.push("Password must be provided.");
	else if (password.length < 8 || password.length > 64)
		errors.push("Password must have between 8 and 64 characters long.");

	if (errors.length) {
		for (const err of errors) {
			req.flash(err, "error");
		}
		return res.render("login");
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