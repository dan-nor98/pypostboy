const OPEN_TABS_STORAGE_KEY = 'postboy_open_tabs';
const OPEN_TABS_STORAGE_PREFIX = OPEN_TABS_STORAGE_KEY + '_user_';

function isGuestUser(user) {
    return !user || user.is_guest === true;
}

function openTabsStorageKey(user) {
    if (isGuestUser(user) || user.id === undefined || user.id === null) return null;
    return OPEN_TABS_STORAGE_PREFIX + String(user.id);
}

export function loadOpenTabsSnapshot(user) {
    var key = openTabsStorageKey(user);
    if (!key) return null;
    return localStorage.getItem(key);
}

export function saveOpenTabsSnapshot(snapshot, user) {
    var key = openTabsStorageKey(user);
    clearLegacyOpenTabsSnapshot();
    if (!key) return;
    localStorage.setItem(key, JSON.stringify(snapshot));
}

export function clearOpenTabsSnapshot(user) {
    var key = openTabsStorageKey(user);
    clearLegacyOpenTabsSnapshot();
    if (!key) return;
    localStorage.removeItem(key);
}

export function clearLegacyOpenTabsSnapshot() {
    localStorage.removeItem(OPEN_TABS_STORAGE_KEY);
}
