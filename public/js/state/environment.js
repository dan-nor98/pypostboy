const ENV_STORAGE_KEY = 'postboy_env';
const ENV_STORAGE_PREFIX = ENV_STORAGE_KEY + '_user_';
const HISTORY_STORAGE_KEY = 'postboy_history';
const HISTORY_STORAGE_PREFIX = HISTORY_STORAGE_KEY + '_user_';

function isGuestUser(user) {
    return !user || user.is_guest === true;
}

function userStorageKey(prefix, user) {
    if (isGuestUser(user) || user.id === undefined || user.id === null) return null;
    return prefix + String(user.id);
}

function safeParseJson(value, fallback) {
    try {
        return JSON.parse(value || JSON.stringify(fallback));
    } catch (_err) {
        return fallback;
    }
}

export function loadEnvVars(user) {
    var key = userStorageKey(ENV_STORAGE_PREFIX, user);
    if (!key) return {};
    return safeParseJson(localStorage.getItem(key), {});
}

export function saveEnvVarsToStorage(envVars, user) {
    var key = userStorageKey(ENV_STORAGE_PREFIX, user);
    if (!key) return;
    localStorage.setItem(key, JSON.stringify(envVars));
}

export function loadHistory(user) {
    var key = userStorageKey(HISTORY_STORAGE_PREFIX, user);
    if (!key) return [];
    return safeParseJson(localStorage.getItem(key), []);
}

export function saveHistoryToStorage(history, user) {
    var key = userStorageKey(HISTORY_STORAGE_PREFIX, user);
    if (!key) return;
    localStorage.setItem(key, JSON.stringify(history));
}

export function clearLegacyGuestData() {
    localStorage.removeItem(ENV_STORAGE_KEY);
    localStorage.removeItem(HISTORY_STORAGE_KEY);
}
