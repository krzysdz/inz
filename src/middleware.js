import { db } from "./db.js";

/** @type {import("express").RequestHandler} */
export function authenticated(req, res, next) {
	if (res.locals.loggedIn) return next();

	req.flash("Please log in first", "warning");
	res.status(401).render("errors/401");
}

/** @type {import("express").RequestHandler} */
export function adminOnly(_req, res, next) {
	if (res.locals.userRole === "admin") return next();

	res.status(403).render("errors/403");
}

/** @type {import("express").RequestHandler} */
export async function addCategoriesList(_req, res, next) {
	/** @type {import("mongodb").Collection<CategoryDoc>} */
	const categoriesCollection = db.collection("categories");
	/** @type {{name: string}[]} */ // @ts-ignore
	const categories = await categoriesCollection
		.find({}, { projection: { _id: 0, name: 1 } })
		.toArray();
	res.locals.categories = categories;
	next();
}
