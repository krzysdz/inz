/** @type {import("express").RequestHandler} */
export function authenticated(req, res, next) {
	if (res.locals.loggedIn) return next();

	req.flash("Please log in first", "warning");
	res.status(401).render("errors/401");
}

/** @type {import("express").RequestHandler} */
export function adminOnly(req, res, next) {
	if (res.locals.userRole === "admin") return next();

	res.status(403).render("errors/403");
}
