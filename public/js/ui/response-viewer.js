import { detectBodyFormat, highlightByFormat, highlightJson } from '../utils/format.js';

function getHeaderValue(headers, name) {
    if (!headers || !name) return '';
    var target = name.toLowerCase();

    if (typeof headers === 'string') {
        var lines = headers.split(/\r?\n/);
        for (var i = 0; i < lines.length; i++) {
            var idx = lines[i].indexOf(':');
            if (idx > -1 && lines[i].slice(0, idx).trim().toLowerCase() === target) {
                return lines[i].slice(idx + 1).trim();
            }
        }
        return '';
    }

    var keys = Object.keys(headers);
    for (var j = 0; j < keys.length; j++) {
        if (keys[j].toLowerCase() === target) return headers[keys[j]];
    }
    return '';
}


function getResponseCodeElement(element) {
    if (!element) return null;
    return element.querySelector('code') || element;
}

function getLineNumbersElement(element) {
    if (!element || !element.parentElement) return null;
    return element.parentElement.querySelector('.response-line-numbers');
}

function getLineCount(text) {
    if (text === '') return 1;
    return text.split('\n').length;
}

function updateResponseLineNumbers(element) {
    var codeElement = getResponseCodeElement(element);
    var lineNumbersElement = getLineNumbersElement(element);
    if (!codeElement || !lineNumbersElement) return;

    var lineCount = getLineCount(codeElement.textContent || '');
    var lines = [];
    for (var i = 1; i <= lineCount; i++) {
        lines.push(i);
    }
    lineNumbersElement.textContent = lines.join('\n');
}

function normalizeBody(body) {
    if (typeof body === 'object' && body !== null) {
        return {
            text: JSON.stringify(body, null, 2),
            format: 'json'
        };
    }

    return {
        text: String(body || ''),
        format: ''
    };
}

export function renderResponseBody(element, body, headers) {
    if (!element) return;

    var codeElement = getResponseCodeElement(element);
    if (!codeElement) return;

    var normalized = normalizeBody(body);
    if (normalized.format === 'json') {
        codeElement.innerHTML = highlightJson(normalized.text);
        updateResponseLineNumbers(element);
        return;
    }

    var contentType = getHeaderValue(headers, 'content-type');
    var format = detectBodyFormat(normalized.text, contentType);
    if (format === 'json') {
        try {
            codeElement.innerHTML = highlightJson(JSON.stringify(JSON.parse(normalized.text), null, 2));
            updateResponseLineNumbers(element);
            return;
        } catch (e) {
            // Fall through to safe escaped text highlighting when the content type claims JSON but parsing fails.
        }
    }
    codeElement.innerHTML = highlightByFormat(normalized.text, format);
    updateResponseLineNumbers(element);
}
