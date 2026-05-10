import { apiClient } from '../api/client.js';

const listeners = [];

export const userState = {
    currentUser: null,
    loading: true,
    error: '',
    initialized: false
};

let authReadyPromise = null;

function snapshot() {
    return {
        currentUser: userState.currentUser,
        loading: userState.loading,
        error: userState.error,
        initialized: userState.initialized
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

export async function loginUser(credentials) {
    setAuthState({ loading: true, error: '' });
    try {
        var user = await apiClient.login(credentials);
        setAuthState({ currentUser: user, loading: false, error: '', initialized: true });
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
        setAuthState({ currentUser: user, loading: false, error: '', initialized: true });
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
        setAuthState({ currentUser: user, loading: false, error: '', initialized: true });
        authReadyPromise = Promise.resolve(user);
        return user;
    } catch (err) {
        setAuthState({ currentUser: null, loading: false, error: err.message, initialized: true });
        authReadyPromise = Promise.resolve(null);
        throw err;
    }
}
