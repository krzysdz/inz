import * as express from "express";
import { WithId } from "mongodb";

declare interface UsersList {
	users: { username: string; role: UserDoc["role"] }[];
	/** Total number of users */
	count: number;
	/** Requested page number */
	page: number;
	/** Requested size = max number of elements in the `users` array. */
	size: number;
}

declare interface ChangeUserRole {
	role: UserDoc["role"];
}

declare interface CategoriesList {
	categories: WithId<CategoryDoc>[];
}

declare interface AdminErrorResponse {
	/** Error */
	error: string;
	/** Error detailed description */
	message: string;
}

declare type AdminResponse<R> = AdminErrorResponse | (R & { error: null });

export declare const adminRouter: express.Router;
