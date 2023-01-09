/**
 * MongoDB connection string.
 * https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/connect/
 */
export const DB_URL = "mongodb://127.0.0.1:27017/?replicaSet=rs0";
/** Database name. */
export const DB_NAME = "inz";
/** Session cookie secret. Should be configured using environmental value. */
export const SECRET = process.env.SECRET || "default_secret";
/** Path to the nginx binary. */
export const NGINX_BIN = "nginx";
/** Domain used for hosting challenges. */
export const TASKS_DOMAIN = "krzysdz-inz-challenges.ovh";
/** Lowest port number for the tasks. */
export const TASK_PORT_START = 12500;
/** Prefix used when naming containers. */
export const CONTAINER_PREFIX = "inz_challenge-";
