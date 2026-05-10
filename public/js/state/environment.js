const ENV_STORAGE_KEY = 'postboy_env';
const HISTORY_STORAGE_KEY = 'postboy_history';

export function loadEnvVars() {
    return JSON.parse(localStorage.getItem(ENV_STORAGE_KEY) || '{}');
}

export function saveEnvVarsToStorage(envVars) {
    localStorage.setItem(ENV_STORAGE_KEY, JSON.stringify(envVars));
}

export function loadHistory() {
    return JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || '[]');
}

export function saveHistoryToStorage(history) {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
}
