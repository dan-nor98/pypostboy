export function formatByteCount(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function highlightJson(json) {
    if (typeof json !== 'string') json = JSON.stringify(json, undefined, 2);
    json = escapeHtml(json);
    return json.replace(/(&quot;(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\])*?&quot;(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function(match) {
        var cls = 'json-number';
        if (/^&quot;/.test(match)) cls = /:$/.test(match) ? 'json-key' : 'json-string';
        else if (/true|false/.test(match)) cls = 'json-boolean';
        else if (/null/.test(match)) cls = 'json-null';
        return '<span class="' + cls + '">' + match + '</span>';
    });
}

export function highlightXml(xml) {
    var escaped = escapeHtml(xml);
    return escaped.replace(/(&lt;\/?)([\w:-]+)([\s\S]*?)(\/?&gt;)/g, function(match, open, tag, attrs, close) {
        attrs = attrs.replace(/([\w:-]+)(=)(\&quot;.*?\&quot;|\&#039;.*?\&#039;|[^\s]+)/g, function(attrMatch, name, equals, value) {
            return '<span class="syntax-attr-name">' + name + '</span>' + equals + '<span class="syntax-attr-value">' + value + '</span>';
        });
        return '<span class="syntax-tag">' + open + tag + '</span>' + attrs + '<span class="syntax-tag">' + close + '</span>';
    });
}

export function highlightHeaders(headers) {
    return escapeHtml(headers).replace(/^([^:\n]+)(:)(.*)$/gm, function(match, name, separator, value) {
        return '<span class="syntax-header-name">' + name + '</span>' + separator + '<span class="syntax-header-value">' + value + '</span>';
    });
}

export function highlightPlainText(text) {
    return escapeHtml(text)
        .replace(/\b(https?:\/\/[^\s<]+)\b/g, '<span class="syntax-url">$1</span>')
        .replace(/\b([A-Z][A-Z0-9_-]{2,})\b/g, '<span class="syntax-keyword">$1</span>')
        .replace(/\b(-?\d+(?:\.\d+)?)\b/g, '<span class="json-number">$1</span>');
}

export function detectBodyFormat(text, contentType) {
    var normalizedType = String(contentType || '').toLowerCase();
    var trimmed = String(text || '').trim();

    if (/json|javascript|problem\+json|ld\+json/.test(normalizedType)) return 'json';
    if (/xml|html|svg|xhtml|rss|atom/.test(normalizedType)) return 'markup';
    if (/http|message\/rfc822/.test(normalizedType)) return 'headers';
    if (/text\/plain|text\/csv|application\/x-www-form-urlencoded/.test(normalizedType)) return 'text';

    if (!trimmed) return 'text';
    if (/^(HTTP\/\d(?:\.\d)? \d{3}|[A-Za-z0-9-]+\s*:)/.test(trimmed)) return 'headers';
    if (/^</.test(trimmed) && />\s*$/.test(trimmed)) return 'markup';
    if (/^[{[]/.test(trimmed)) return 'json';
    return 'text';
}

export function highlightByFormat(text, format) {
    if (format === 'json') return highlightJson(text);
    if (format === 'markup') return highlightXml(text);
    if (format === 'headers') return highlightHeaders(text);
    return highlightPlainText(text);
}
