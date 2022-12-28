import "express-session";

declare module "express-session" {
	interface SessionData {
		flashes?: [string, string][];
		user?: {
			username: string;
			role: UserDoc["role"]
		};
	}
}
