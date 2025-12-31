import { ObjectId } from 'mongodb';

export function safeCallback(callback: any, ...args: any[]) {
    if (!callback) return;
    callback(...args);
}

function containsOperatorKeys(value: any): boolean {
    if (!value || typeof value !== "object") return false;
    if (Array.isArray(value)) {
        return value.some((item) => containsOperatorKeys(item));
    }
    for (const key of Object.keys(value)) {
        if (key.startsWith("$")) return true;
        if (containsOperatorKeys(value[key])) return true;
    }
    return false;
}

export function safeObjectArgument(object: any, options: { allowOperators?: boolean } = {}) {
    if (!object) return {};
    if (Array.isArray(object)) {
        if (object.length === 0) return {};
        if (!(typeof object[0] === "string" && Array.isArray(object[1]))) return object;

        let jsonString = object[0];
        const parameters = object[1];
        const placeholders = jsonString.split('?').length - 1;
        if (placeholders !== parameters.length) {
            throw new Error("Number of placeholders does not match number of parameters");
        }
        for (let i = 0; i < placeholders; i++) {
            const parameter = parameters[i];
            const serialized = JSON.stringify(parameter);
            jsonString = jsonString.replace('?', serialized);
        }
        try {
            object = JSON.parse(jsonString);
        } catch (error) {
            throw new Error("Invalid JSON string");
        }
    }
    if (typeof object !== "object") return {};
    if (!options.allowOperators && containsOperatorKeys(object)) {
        throw new Error("Operator keys are not allowed in this context");
    }
    if (object._id) object._id = new ObjectId(object._id);
    return object;
}

export function exportDocument(document: any) {
    if (!document) return;
    if (document._id && typeof document._id !== "string") {
        document._id = document._id.toString();
    }
    return document;
};

export function exportDocuments(documents: any) {
    if (!documents) return;
    if (!Array.isArray(documents)) return;
    return documents.map((document => exportDocument(document)));
}

export async function catchAndThrow(callback: any, error: any) {
    safeCallback(callback, true);
    throw new Error(error);
}
