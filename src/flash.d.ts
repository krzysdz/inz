import * as express from "express"

declare global {
	namespace Express {
		interface Request {
			/** Adds a flash message to session */
			flash: (message: string, category?: string) => void;
			getFlashedMessages: (options: GetFlashedMessagesOptions & { withCategories: true }) => [string, string][];
			getFlashedMessages: (options: GetFlashedMessagesOptions & { withCategories?: false }) => string[];
			_flashes?: [string, string][];
		};
	}
}

interface GetFlashedMessagesOptions {
	categories?: string | string[];
	withCategories?: boolean;
};

export declare function flasher(): express.RequestHandler;

