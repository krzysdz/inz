import { Router } from "express";

export const profileRouter = Router();

profileRouter.get("/", (_req, res) => {
	res.locals.activePage = "profile";
	res.render("profile");
});
