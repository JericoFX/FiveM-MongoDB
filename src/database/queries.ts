import { getCollection } from ".";
import { InsertOneResult, InsertManyResult, UpdateResult, Document, DeleteResult } from "mongodb";
import * as utils from "../utils";
import { catchAndThrow } from "../utils";
import {
    allowedResources,
    allowedCollections,
    allowFilterOperators,
    allowUnsafeMassOps,
    defaultFindLimit,
    maxFindLimit,
    defaultMaxTimeMS,
} from "../config";

function isAuthorized() {
    if (!allowedResources.length) return true;
    const invokingResource = GetInvokingResource();
    if (!invokingResource) return false;
    return allowedResources.includes(invokingResource);
}

function assertAuthorized(callback: any) {
    if (!isAuthorized()) {
        catchAndThrow(callback, "Unauthorized resource");
        return false;
    }
    return true;
}

function isCollectionAllowed(collectionName: string) {
    if (!allowedCollections.length) return true;
    return allowedCollections.includes(collectionName);
}

function assertCollection(collectionName: any, callback: any) {
    if (!collectionName || typeof collectionName !== "string") {
        catchAndThrow(callback, "No collection provided");
        return false;
    }
    if (!isCollectionAllowed(collectionName)) {
        catchAndThrow(callback, "Collection not allowed");
        return false;
    }
    return true;
}

function isEmptyFilter(filter: any) {
    if (!filter || typeof filter !== "object") return true;
    return Object.keys(filter).length === 0;
}

export async function find(params: any, callback: any) {
    params = params || {};
    if (!assertAuthorized(callback)) return;
    if (!assertCollection(params.collection, callback)) return;
    const collection = await getCollection(params.collection);
    try {
        let options = utils.safeObjectArgument(params.options, { allowOperators: true });
        let filter = utils.safeObjectArgument(params.filter, { allowOperators: allowFilterOperators });
        if (typeof options.limit !== "number") {
            options.limit = defaultFindLimit;
        }
        if (typeof options.limit === "number") {
            options.limit = Math.min(Math.max(options.limit, 1), maxFindLimit);
        }
        if (typeof options.maxTimeMS !== "number") {
            options.maxTimeMS = defaultMaxTimeMS;
        }
        collection.find(filter, options).toArray().then((documents: any) => {
            utils.safeCallback(callback, false, utils.exportDocuments(documents));
        }).catch((error: any) => {
            catchAndThrow(callback, error);
        });
    } catch (error) {
        catchAndThrow(callback, error);
    }
}

export async function findOne(params: any, callback: any) {
    params = params || {};
    if (!assertAuthorized(callback)) return;
    if (!assertCollection(params.collection, callback)) return;
    const collection = await getCollection(params.collection);
    try {
        let filter = utils.safeObjectArgument(params.filter, { allowOperators: allowFilterOperators });
        let options = utils.safeObjectArgument(params.options, { allowOperators: true });

        collection.findOne(filter, options).then((document: any) => {
            utils.safeCallback(callback, false, utils.exportDocument(document));
        }).catch((error: any) => {
            catchAndThrow(callback, error);
        });
    } catch (error) {
        catchAndThrow(callback, error);
    }
}

export async function insertOne(params: any, callback: any) {
    params = params || {};
    if (!assertAuthorized(callback)) return;
    if (!assertCollection(params.collection, callback)) return;
    const collection = await getCollection(params.collection);
    try {
        let document = utils.safeObjectArgument(params.document, { allowOperators: true });
        collection.insertOne(document).then((result: InsertOneResult) => {
            let resultObject = {
                acknowledged: result.acknowledged,
                insertedId: result.insertedId.toString(),
            }
            utils.safeCallback(callback, false, resultObject);
        }).catch((error: any) => {
            catchAndThrow(callback, error);
        });
    } catch (error) {
        catchAndThrow(callback, error);
    }
}

export async function insertMany(params: any, callback: any) {
    params = params || {};
    if (!assertAuthorized(callback)) return;
    if (!assertCollection(params.collection, callback)) return;
    const collection = await getCollection(params.collection);
    try {
        let documents = utils.safeObjectArgument(params.documents, { allowOperators: true });
        collection.insertMany(documents).then((result: InsertManyResult) => {
            let resultObject = {
                acknowledged: result.acknowledged,
                insertedCount: result.insertedCount,
                insertedIds: {},
            };
            let insertedIds: any = {};
            for (let key in result.insertedIds) {
                insertedIds[key] = result.insertedIds[key].toString();
            }
            resultObject.insertedIds = insertedIds;
            utils.safeCallback(callback, false, resultObject);
        }).catch((error: any) => {
            catchAndThrow(callback, error);
        });
    } catch (error) {
        catchAndThrow(callback, error);
    }
}

async function dbUpdate(one: boolean, params: any, callback: any) {
    params = params || {};
    if (!assertAuthorized(callback)) return;
    if (!assertCollection(params.collection, callback)) return;
    const collection = await getCollection(params.collection);
    try {
        let filter = utils.safeObjectArgument(params.filter, { allowOperators: allowFilterOperators });
        let update = utils.safeObjectArgument(params.update, { allowOperators: true });
        let options = utils.safeObjectArgument(params.options, { allowOperators: true });
        if (!one && !allowUnsafeMassOps && isEmptyFilter(filter)) {
            catchAndThrow(callback, "Unsafe mass update requires a filter");
            return;
        }
        const promise = one ? collection.updateOne(filter, update, options) : collection.updateMany(filter, update, options)
        promise.then((result: UpdateResult | Document) => {
            let resultObject = {
                acknowledged: result.acknowledged,
                matchedCount: result.matchedCount,
                modifiedCount: result.modifiedCount,
                upsertedCount: result.upsertedCount,
                upsertedId: result.upsertedId ? result.upsertedId.toString() : null,
            }
            utils.safeCallback(callback, false, resultObject);
        }).catch((error: any) => {
            catchAndThrow(callback, error);
        });
    } catch (error) {
        catchAndThrow(callback, error);
    }
}

export async function updateOne(params: any, callback: any) {
    return dbUpdate(true, params, callback);
}

export async function updateMany(params: any, callback: any) {
    return dbUpdate(false, params, callback);
}

async function dbDelete(one: boolean, params: any, callback: any) {
    params = params || {};
    if (!assertAuthorized(callback)) return;
    if (!assertCollection(params.collection, callback)) return;
    const collection = await getCollection(params.collection);
    try {
        let filter = utils.safeObjectArgument(params.filter, { allowOperators: allowFilterOperators });
        let options = utils.safeObjectArgument(params.options, { allowOperators: true });
        if (!one && !allowUnsafeMassOps && isEmptyFilter(filter)) {
            catchAndThrow(callback, "Unsafe mass delete requires a filter");
            return;
        }

        const promise = one ? collection.deleteOne(filter, options) : collection.deleteMany(filter, options);
        promise.then((result: DeleteResult) => {
            let resultObject = {
                acknowledged: result.acknowledged,
                deletedCount: result.deletedCount,
            }
            utils.safeCallback(callback, false, resultObject);
        }).catch((error: any) => {
            catchAndThrow(callback, error);
        });
    } catch (error) {
        catchAndThrow(callback, error);
    }
}

export async function deleteOne(params: any, callback: any) {
    return dbDelete(true, params, callback);
}

export async function deleteMany(params: any, callback: any) {
    return dbDelete(false, params, callback);
}

export async function count(params: any, callback: any) {
    params = params || {};
    if (!assertAuthorized(callback)) return;
    if (!assertCollection(params.collection, callback)) return;
    const collection = await getCollection(params.collection);
    try {
        let filter = utils.safeObjectArgument(params.filter, { allowOperators: allowFilterOperators });
        let options = utils.safeObjectArgument(params.options, { allowOperators: true });
        if (typeof options.maxTimeMS !== "number") {
            options.maxTimeMS = defaultMaxTimeMS;
        }

        collection.countDocuments(filter, options).then((count: number) => {
            utils.safeCallback(callback, false, count);
        }).catch((error: any) => {
            catchAndThrow(callback, error);
        });
    } catch (error) {
        catchAndThrow(callback, error);
    }
}
