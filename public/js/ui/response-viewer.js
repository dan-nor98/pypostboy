import { detectBodyFormat, escapeHtml, highlightByFormat, highlightJson } from '../utils/format.js';

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

function isJsonTreeLineHidden(line, root) {
    var node = line.parentElement;
    while (node && node !== root) {
        if (node.classList && node.classList.contains('json-tree-children')) {
            var parentNode = node.parentElement;
            if (parentNode && parentNode.classList && parentNode.classList.contains('is-collapsed')) return true;
        }
        node = node.parentElement;
    }
    return false;
}

function getVisibleJsonTreeLineCount(codeElement) {
    if (!codeElement.querySelectorAll) return 0;
    var lines = codeElement.querySelectorAll('.json-tree-line');
    if (!lines.length) return 0;

    var count = 0;
    for (var i = 0; i < lines.length; i++) {
        if (!isJsonTreeLineHidden(lines[i], codeElement)) count += 1;
    }
    return count || 1;
}

function updateResponseLineNumbers(element) {
    var codeElement = getResponseCodeElement(element);
    var lineNumbersElement = getLineNumbersElement(element);
    if (!codeElement || !lineNumbersElement) return;

    var isJsonTree = !!(
        (codeElement.classList && codeElement.classList.contains && codeElement.classList.contains('json-tree'))
        || (typeof codeElement.innerHTML === 'string' && codeElement.innerHTML.indexOf('json-tree-line') > -1)
    );
    var lineCount = isJsonTree
        ? (getVisibleJsonTreeLineCount(codeElement) || getLineCount((codeElement.dataset && codeElement.dataset.rawBody) || codeElement.textContent || ''))
        : getLineCount(codeElement.textContent || '');
    var lines = [];
    for (var i = 1; i <= lineCount; i++) {
        lines.push('<span>' + i + '</span>');
    }
    lineNumbersElement.innerHTML = lines.join('\n');
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

function isContainer(value) {
    return value !== null && typeof value === 'object';
}

function isArray(value) {
    return Object.prototype.toString.call(value) === '[object Array]';
}


function renderJsonKey(key) {
    if (key === null || key === undefined) return '';
    return '<span class="json-key">' + escapeHtml(JSON.stringify(String(key))) + ':</span> ';
}

function renderJsonPrimitive(value) {
    return highlightJson(JSON.stringify(value));
}

function renderJsonToggle(type, childCount) {
    var label = type === 'array' ? 'Toggle array with ' : 'Toggle object with ';
    label += childCount + (childCount === 1 ? ' child' : ' children');
    return '<button class="json-tree-toggle" type="button" aria-expanded="true" aria-label="' + escapeHtml(label) + '">▾</button>';
}

function renderJsonNode(value, key, depth, hasTrailingComma) {
    var trailingComma = hasTrailingComma ? ',' : '';
    var indent = ' style="--json-depth: ' + depth + '"';

    if (!isContainer(value)) {
        return '<div class="json-tree-line"' + indent + '>' + renderJsonKey(key) + renderJsonPrimitive(value) + trailingComma + '</div>';
    }

    var arrayValue = isArray(value);
    var keys = arrayValue ? value.map(function(_, index) { return index; }) : Object.keys(value);
    var childCount = keys.length;
    var openToken = arrayValue ? '[' : '{';
    var closeToken = arrayValue ? ']' : '}';
    var summary = arrayValue ? '[…]' : '{…}';
    var type = arrayValue ? 'array' : 'object';
    var html = '<div class="json-tree-node" data-json-type="' + type + '">';

    html += '<div class="json-tree-line"' + indent + '>';
    if (childCount) html += renderJsonToggle(type, childCount);
    else html += '<span class="json-tree-toggle-spacer"></span>';
    html += renderJsonKey(key);
    html += '<span class="json-tree-open">' + openToken + '</span>';
    html += '<span class="json-tree-summary" aria-hidden="true">' + summary + trailingComma + '</span>';
    html += '</div>';

    html += '<div class="json-tree-children">';
    for (var i = 0; i < keys.length; i++) {
        var childKey = keys[i];
        html += renderJsonNode(value[childKey], arrayValue ? null : childKey, depth + 1, i < keys.length - 1);
    }
    html += '<div class="json-tree-line json-tree-close"' + indent + '>' + closeToken + trailingComma + '</div>';
    html += '</div>';
    html += '</div>';
    return html;
}

function renderJsonTree(value) {
    if (!isContainer(value)) return highlightJson(JSON.stringify(value, null, 2));
    return renderJsonNode(value, null, 0, false);
}

function setRawResponseText(element, codeElement, text) {
    var rawText = String(text || '');
    if (element) {
        element.dataset = element.dataset || {};
        element.dataset.rawBody = rawText;
    }
    if (codeElement && codeElement !== element) {
        codeElement.dataset = codeElement.dataset || {};
        codeElement.dataset.rawBody = rawText;
    }
}

function setCodeMode(codeElement, isJsonTree) {
    if (codeElement.classList && codeElement.classList.toggle) codeElement.classList.toggle('json-tree', isJsonTree);
}

function renderParsedJson(element, codeElement, value) {
    var prettyJson = JSON.stringify(value, null, 2);
    setRawResponseText(element, codeElement, prettyJson);
    setCodeMode(codeElement, isContainer(value));
    codeElement.innerHTML = renderJsonTree(value);
    updateResponseLineNumbers(element);
}

export function toggleJsonTreeNode(element, toggle) {
    if (!element || !toggle) return;

    var codeElement = getResponseCodeElement(element);
    var node = toggle.closest('.json-tree-node');
    if (!codeElement || !node || !codeElement.contains(node)) return;

    var collapsed = !node.classList.contains('is-collapsed');
    node.classList.toggle('is-collapsed', collapsed);
    toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    toggle.textContent = collapsed ? '▸' : '▾';
    updateResponseLineNumbers(element);
}

export function renderResponseBody(element, body, headers) {
    if (!element) return;

    var codeElement = getResponseCodeElement(element);
    if (!codeElement) return;
    if (codeElement.classList && codeElement.classList.remove) codeElement.classList.remove('response-issue');

    var normalized = normalizeBody(body);
    if (normalized.format === 'json') {
        renderParsedJson(element, codeElement, JSON.parse(normalized.text));
        return;
    }

    var contentType = getHeaderValue(headers, 'content-type');
    var format = detectBodyFormat(normalized.text, contentType);
    if (format === 'json') {
        try {
            renderParsedJson(element, codeElement, JSON.parse(normalized.text));
            return;
        } catch (e) {
            // Fall through to safe escaped text highlighting when the content type claims JSON but parsing fails.
        }
    }

    setRawResponseText(element, codeElement, normalized.text);
    setCodeMode(codeElement, false);
    codeElement.innerHTML = highlightByFormat(normalized.text, format);
    updateResponseLineNumbers(element);
}

function renderIssueMetaRow(label, value) {
    return '<div class="response-issue-row"><span class="response-issue-row-label">' + escapeHtml(label) + '</span><span class="response-issue-row-value">' + escapeHtml(value || 'Not available') + '</span></div>';
}

export function renderResponseIssue(element, issue) {
    if (!element || !issue) return;

    var codeElement = getResponseCodeElement(element);
    if (!codeElement) return;

    var variant = issue.variant || 'error';
    var icon = issue.icon || '⛔';
    var title = issue.title || 'Request failed';
    var message = issue.message || 'The request could not be completed.';
    var severityLabel = variant === 'warning' ? 'Warning' : (variant === 'info' ? 'Info' : 'Error');
    var likelyCause = issue.likelyCause || 'No likely cause was provided.';
    var suggestedFix = issue.suggestedFix || 'Retry the request and verify your settings.';
    var detailsText = issue.detailsText || '';
    var cta = issue.cta || null;

    setRawResponseText(element, codeElement, detailsText);
    setCodeMode(codeElement, false);
    if (codeElement.classList && codeElement.classList.add) codeElement.classList.add('response-issue');
    codeElement.innerHTML = ''
        + '<section class="response-issue-card response-issue-' + escapeHtml(variant) + '" role="alert" aria-live="polite">'
        + '<header class="response-issue-header"><span class="response-issue-icon" aria-hidden="true">' + escapeHtml(icon) + '</span><h4 class="response-issue-title">' + escapeHtml(title) + '</h4><span class="response-issue-severity" aria-label="Severity">' + escapeHtml(severityLabel) + '</span></header>'
        + '<p class="response-issue-message">' + escapeHtml(message) + '</p>'
        + renderIssueMetaRow('Likely cause', likelyCause)
        + renderIssueMetaRow('Suggested fix', suggestedFix)
        + (cta && cta.label ? '<button class="response-issue-cta btn-secondary" type="button" data-action="' + escapeHtml(cta.action || '') + '">' + escapeHtml(cta.label) + '</button>' : '')
        + '<details class="response-issue-details"><summary>Details</summary><pre>' + escapeHtml(detailsText) + '</pre></details>'
        + '</section>';
    updateResponseLineNumbers(element);
}
