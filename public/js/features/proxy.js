export function parseResponseTimeMs(value) {
    var match = String(value || '').match(/-?\d+/);
    return match ? parseInt(match[0], 10) : null;
}
