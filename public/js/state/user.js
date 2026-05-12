import { apiClient } from '../api/client.js';

const listeners = [];
const EXPLICIT_GUEST_STORAGE_KEY = 'postboy_explicit_guest';

function loadExplicitGuestChoice() {
    try {
        return sessionStorage.getItem(EXPLICIT_GUEST_STORAGE_KEY) === 'true';
    } catch (_err) {
        return false;
    }
}

function saveExplicitGuestChoice(value) {
    try {
        if (value) {
            sessionStorage.setItem(EXPLICIT_GUEST_STORAGE_KEY, 'true');
        } else {
            sessionStorage.removeItem(EXPLICIT_GUEST_STORAGE_KEY);
        }
    } catch (_err) {
        // Ignore storage failures so auth still works in restricted browsers.
    }
}

export const userState = {
    currentUser: null,
    loading: true,
    error: '',
    initialized: false,
    explicitGuest: loadExplicitGuestChoice()
};

let authReadyPromise = null;

function snapshot() {
    return {
        currentUser: userState.currentUser,
        loading: userState.loading,
        error: userState.error,
        initialized: userState.initialized,
        explicitGuest: userState.explicitGuest
    };
}

function notify() {
    var state = snapshot();
    listeners.forEach(function(listener) {
        listener(state);
    });
}

function setAuthState(nextState) {
    Object.assign(userState, nextState);
    notify();
}

function setExplicitGuestChoice(value) {
    saveExplicitGuestChoice(value);
    setAuthState({ explicitGuest: value });
}

export function isExplicitGuestSession(state) {
    var authState = state || userState;
    return !!(authState.currentUser && authState.currentUser.is_guest && authState.explicitGuest);
}

export function canUseWorkspace(state) {
    var authState = state || userState;
    var user = authState.currentUser;
    return !!(user && (!user.is_guest || authState.explicitGuest));
}

export function subscribeToUserState(listener) {
    listeners.push(listener);
    listener(snapshot());

    return function unsubscribe() {
        var index = listeners.indexOf(listener);
        if (index >= 0) listeners.splice(index, 1);
    };
}

export function initializeCurrentUser() {
    if (authReadyPromise) return authReadyPromise;

    setAuthState({ loading: true, error: '' });
    authReadyPromise = apiClient.getCurrentUser()
        .then(function(user) {
            setAuthState({ currentUser: user, loading: false, error: '', initialized: true });
            authReadyPromise = Promise.resolve(user);
            return user;
        })
        .catch(function(err) {
            setAuthState({ currentUser: null, loading: false, error: err.message, initialized: true });
            authReadyPromise = Promise.resolve(null);
            return null;
        });

    return authReadyPromise;
}

export function waitForAuth() {
    return initializeCurrentUser();
}

export async function continueAsGuest() {
    setAuthState({ loading: true, error: '' });
    var user = await apiClient.getCurrentUser()
        .then(function(currentUser) {
            setExplicitGuestChoice(true);
            setAuthState({ currentUser: currentUser, loading: false, error: '', initialized: true });
            authReadyPromise = Promise.resolve(currentUser);
            return currentUser;
        })
        .catch(function(err) {
            setAuthState({ currentUser: null, loading: false, error: err.message, initialized: true });
            authReadyPromise = Promise.resolve(null);
            throw err;
        });
    return user;
}

export async function loginUser(credentials) {
    setAuthState({ loading: true, error: '' });
    try {
        var user = await apiClient.login(credentials);
        saveExplicitGuestChoice(false);
        setAuthState({ currentUser: user, loading: false, error: '', initialized: true, explicitGuest: false });
        authReadyPromise = Promise.resolve(user);
        return user;
    } catch (err) {
        setAuthState({ loading: false, error: err.message, initialized: true });
        throw err;
    }
}

export async function registerUser(credentials) {
    setAuthState({ loading: true, error: '' });
    try {
        var user = await apiClient.register(credentials);
        saveExplicitGuestChoice(false);
        setAuthState({ currentUser: user, loading: false, error: '', initialized: true, explicitGuest: false });
        authReadyPromise = Promise.resolve(user);
        return user;
    } catch (err) {
        setAuthState({ loading: false, error: err.message, initialized: true });
        throw err;
    }
}

export async function logoutUser() {
    setAuthState({ loading: true, error: '' });
    try {
        var user = await apiClient.logout();
        saveExplicitGuestChoice(false);
        setAuthState({ currentUser: user, loading: false, error: '', initialized: true, explicitGuest: false });
        authReadyPromise = Promise.resolve(user);
        return user;
    } catch (err) {
        saveExplicitGuestChoice(false);
        setAuthState({ currentUser: null, loading: false, error: err.message, initialized: true, explicitGuest: false });
        authReadyPromise = Promise.resolve(null);
        throw err;
    }
}
