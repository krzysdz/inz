import { Router, default as express } from "express";
import { db } from "../db.js";
import { adminOnly } from "../middleware.js";

export const adminRouter = Router();
adminRouter.use(adminOnly);
adminRouter.use(express.json({ strict: true }));

adminRouter.get("/", (_req, res) => {
	res.locals.activePage = "admin panel";
	res.render("admin");
});

adminRouter.get(
	"/users",
	async (req, /** @type {express.Response<AdminResponse<UsersList>>} */ res) => {
		const { page: pageStr, size: sizeStr } = req.query ?? {};
		let page, size;
		try {
			// @ts-ignore
			page = Number.parseInt(pageStr);
			// @ts-ignore
			size = Number.parseInt(sizeStr);
		} catch (error) {
			return res.status(422).json({
				error: "Invalid data",
				message: "page and size must be integers if provided",
			});
		}
		if (page < 1 || size < 1)
			return res
				.status(422)
				.json({ error: "Invalid data", message: "page and size must be >= 1" });

		/** @type {import("mongodb").Collection<UserDoc>} */
		const collection = db.collection("users");
		const users = collection
			.find(
				{},
				{
					projection: { _id: 1, role: 1 },
					sort: { role: 1, _id: 1 },
					skip: size * (page - 1),
					limit: size,
				}
			)
			.map(({ _id, role }) => ({ username: _id, role }))
			.toArray();
		const totalUsers = collection.estimatedDocumentCount();
		res.json({ error: null, users: await users, count: await totalUsers, page, size });
	}
);

adminRouter.patch(
	"/users/:username",
	async (req, /** @type {express.Response<AdminResponse<ChangeUserRole>>} */ res) => {
		const { username } = req.params;
		const role = req.body?.role ?? "";
		if (!["user", "admin"].includes(role))
			return res
				.status(422)
				.json({ error: "Invalid data", message: "Role must be either user or admin" });

		/** @type {import("mongodb").Collection<UserDoc>} */
		const collection = db.collection("users");
		const result = await collection.updateOne({ _id: username }, { $set: { role } });
		if (result.modifiedCount === 0)
			return res.status(404).json({ error: "Not found", message: "User does not exist" });
		res.json({ error: null, role });
	}
);

adminRouter.delete(
	"/users/:username",
	async (req, /** @type {express.Response<AdminResponse<{}>>} */ res) => {
		const { username } = req.params;
		if (username === res.locals.username)
			return res.status(418).json({
				error: "I'm a teapot",
				message: "Refusing to brew a coffee. Why are you trying to do this?",
			});

		/** @type {import("mongodb").Collection<UserDoc>} */
		const collection = db.collection("users");
		const result = await collection.deleteOne({ _id: username });
		if (result.deletedCount === 0)
			return res.status(404).json({ error: "Not found", message: "User does not exist" });
		res.json({ error: null });
	}
);

/**
 * @template R
 * @typedef {import("./admin").AdminResponse<R>} AdminResponse<R>
 */
/** @typedef {import("./admin").UsersList} UsersList */
/** @typedef {import("./admin").ChangeUserRole} ChangeUserRole */
