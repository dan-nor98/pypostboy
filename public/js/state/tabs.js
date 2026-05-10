const OPEN_TABS_STORAGE_KEY = 'postboy_open_tabs';

export function loadOpenTabsSnapshot() {
    return localStorage.getItem(OPEN_TABS_STORAGE_KEY);
}

export function saveOpenTabsSnapshot(snapshot) {
    localStorage.setItem(OPEN_TABS_STORAGE_KEY, JSON.stringify(snapshot));
}

export function clearOpenTabsSnapshot() {
    localStorage.removeItem(OPEN_TABS_STORAGE_KEY);
}
