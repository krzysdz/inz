/// <reference types="@types/node" />

import type { MongoClient, Db } from "mongodb";

declare global {
	var __client: MongoClient | undefined;
}

export declare let db: Db;
export declare let client: MongoClient;
