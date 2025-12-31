export const resourceName = GetCurrentResourceName();
export const url = GetConvar('mongodb_url', 'null');
export const dbName = GetConvar('mongodb_database', 'null');

function parseJsonArrayConvar(name: string, fallback: string[] = []) {
    const raw = GetConvar(name, '');
    if (!raw) return fallback;
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.every((value) => typeof value === 'string')) {
            return parsed;
        }
    } catch {
        // TODO: log config parse error
    }
    return fallback;
}

function parseBooleanConvar(name: string, fallback: boolean) {
    const raw = GetConvar(name, '');
    if (!raw) return fallback;
    return raw === 'true' || raw === '1' || raw === 'yes';
}

function parseNumberConvar(name: string, fallback: number) {
    const raw = GetConvar(name, '');
    if (!raw) return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export const allowedResources = parseJsonArrayConvar('mongodb_allowed_resources', []);
export const allowedCollections = parseJsonArrayConvar('mongodb_allowed_collections', []);
export const allowFilterOperators = parseBooleanConvar('mongodb_allow_filter_operators', false);
export const allowUnsafeMassOps = parseBooleanConvar('mongodb_allow_unsafe_mass_ops', false);
export const defaultFindLimit = parseNumberConvar('mongodb_default_find_limit', 100);
export const maxFindLimit = parseNumberConvar('mongodb_max_find_limit', 1000);
export const defaultMaxTimeMS = parseNumberConvar('mongodb_default_max_time_ms', 5000);
