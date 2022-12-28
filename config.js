/**
 * MongoDB connection string.
 * https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/connect/
 */
export const DB_URL = "mongodb://127.0.0.1:27017";
/** Database name. */
export const DB_NAME = "inz";
/** Session cookie secret. Should be configured using environmental value. */
export const SECRET = process.env.SECRET || "default_secret";
