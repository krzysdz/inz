import { Router } from "express";
import { db } from "../db.js";

export const categoryRouter = Router();

categoryRouter.get("/", async (_req, res) => {
	res.locals.activePage = "categories";
	res.render("categories");
});

categoryRouter.get("/:name", async (req, res, next) => {
	const { name } = req.params;
	/** @type {import("mongodb").Collection<CategoryDoc>} */
	const categories = db.collection("categories");
	const category = await categories
		.aggregate(
			[
				{
					$match: {
						name: name,
					},
				},
				{
					$lookup: {
						from: "tasks",
						localField: "_id",
						foreignField: "categoryId",
						as: "tasks",
					},
				},
				{
					$project: {
						_id: 0,
						name: 1,
						description: {
							$ifNull: ["$descriptionProcessed", "$descriptionRaw"],
						},
						"tasks._id": 1,
						"tasks.name": 1,
					},
				},
			],
			{ collation: { locale: "en", strength: 2 } }
		)
		.next();
	if (!category) return next();

	res.render("category", { category });
});
