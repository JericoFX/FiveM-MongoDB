import { MongoClient, Db } from "mongodb";
import { url, dbName } from "../config"
import { logger } from "../logger";

const mongoClient = new MongoClient(url);
let db: Db;
let connected: boolean = false;
let connectionPromise: Promise<void> | null = null;
let connectionError: Error | null = null;

function connectOnce() {
    if (connectionPromise) return connectionPromise;
    connectionPromise = mongoClient.connect().then(() => {
        db = mongoClient.db(dbName);
        connected = true;
        logger(`Connected to database "${dbName}"`);
    }).catch((error: any) => {
        connectionError = error instanceof Error ? error : new Error(String(error));
        logger(`Error connecting to database "${dbName}": ${error}`, "ERROR");
        throw connectionError;
    });
    return connectionPromise;
}


async function waitForConnection(timeoutMs = 10000) {
    if (isConnected()) return;
    if (connectionError) throw connectionError;
    const connectPromise = connectOnce();
    if (timeoutMs <= 0) {
        await connectPromise;
        return;
    }
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<void>((_, reject) => {
        timeoutHandle = setTimeout(() => {
            reject(new Error(`MongoDB connection timed out after ${timeoutMs}ms`));
        }, timeoutMs);
    });
    try {
        await Promise.race([connectPromise, timeoutPromise]);
    } finally {
        if (timeoutHandle) clearTimeout(timeoutHandle);
    }
}

export function isConnected() {
    return connected;
}

export async function getCollection(collectionName: string) {
    if (!isConnected()) await waitForConnection();
    return db.collection(collectionName);
}
