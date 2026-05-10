import { highlightJson } from '../utils/format.js';

export function renderResponseBody(element, body) {
    if (!element) return;

    if (typeof body === 'object' && body !== null) {
        element.innerHTML = highlightJson(JSON.stringify(body, null, 2));
        return;
    }

    var str = String(body || '');
    try {
        var parsed = JSON.parse(str);
        element.innerHTML = highlightJson(JSON.stringify(parsed, null, 2));
    } catch (e) {
        element.textContent = str;
    }
}
