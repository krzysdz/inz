import * as express from "express";

declare global {
	namespace Express {
		interface Request {
			/** Adds a flash message to session. `error` is an alias for `danger`, `info` is an alias for `primary` */
			flash: (
				message: string,
				category?: "primary" | "info" | "success" | "warning" | "danger" | "error"
			) => void;
			getFlashedMessages: (
				options: GetFlashedMessagesOptions & { withCategories: true }
			) => [string, string][];
			getFlashedMessages: (
				options: GetFlashedMessagesOptions & { withCategories?: false }
			) => string[];
			_flashes?: [string, string][];
		}
	}
}

interface GetFlashedMessagesOptions {
	categories?: string | string[];
	withCategories?: boolean;
}

export declare function flasher(): express.RequestHandler;
