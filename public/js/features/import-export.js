export function tokenize(cmd) {
    var tokens = [];
    var i = 0;
    while (i < cmd.length) {
        while (i < cmd.length && /\s/.test(cmd[i])) i++;
        if (i >= cmd.length) break;
        if (cmd[i] === '$' && cmd[i + 1] === "'") {
            var ansiTok = '';
            i += 2;
            while (i < cmd.length) {
                if (cmd[i] === "'") {
                    if (i + 1 < cmd.length && cmd[i + 1] === "'") {
                        ansiTok += "'";
                        i += 2;
                        continue;
                    }
                    i++;
                    break;
                }
                if (cmd[i] === '\\' && i + 1 < cmd.length) {
                    ansiTok += decodeAnsiCQuoteEscape(cmd[i + 1]);
                    i += 2;
                    continue;
                }
                ansiTok += cmd[i];
                i++;
            }
            tokens.push(ansiTok);
        } else if (cmd[i] === "'" || cmd[i] === '"') {
            var q = cmd[i++];
            var tok = '';
            while (i < cmd.length && cmd[i] !== q) {
                if (cmd[i] === '\\' && i + 1 < cmd.length) { tok += cmd[++i]; }
                else tok += cmd[i];
                i++;
            }
            i++;
            tokens.push(tok);
        } else if (cmd[i] === '$' && cmd[i+1] === '(') {
            var depth = 1;
            i += 2;
            while (i < cmd.length && depth > 0) {
                if (cmd[i] === '(') depth++;
                if (cmd[i] === ')') depth--;
                i++;
            }
            tokens.push('$(...)');
        } else {
            var tok2 = '';
            while (i < cmd.length && !/\s/.test(cmd[i])) { tok2 += cmd[i++]; }
            tokens.push(tok2);
        }
    }
    return tokens;
}

function decodeAnsiCQuoteEscape(char) {
    var escapes = {
        "'": "'",
        '\\': '\\',
        'a': '\u0007',
        'b': '\b',
        'f': '\f',
        'n': '\n',
        'r': '\r',
        't': '\t',
        'v': '\v'
    };
    return Object.prototype.hasOwnProperty.call(escapes, char) ? escapes[char] : '\\' + char;
}

export function normalizeParsedImportPayload(payload) {
    payload = payload || {};
    return {
        method: String(payload.method || 'GET').toUpperCase(),
        url: payload.url || '',
        headers: Array.isArray(payload.headers) ? payload.headers : [],
        body_type: payload.body_type || 'none',
        body_content: payload.body_content || '',
        form_data: Array.isArray(payload.form_data) ? payload.form_data : []
    };
}

export function applyParsedImportPayload(payload, editor) {
    var parsed = normalizeParsedImportPayload(payload);
    editor.setMethod(parsed.method);
    editor.setUrl(parsed.url);
    editor.syncParamsFromUrl();

    editor.clearHeaders();
    parsed.headers.forEach(function(header) {
        editor.addHeaderRow(header.key || '', header.value || '');
    });
    editor.ensureHeaderRow();

    editor.setBodyType(parsed.body_type);
    editor.setBodyContent(parsed.body_content);

    editor.clearFormData();
    parsed.form_data.forEach(function(field) {
        editor.addFormDataRow(field.key || '', field.value || '');
    });

    return parsed;
}

export function parseCurlFallback(cmd) {
    cmd = (cmd || '').replace(/\\\r?\n/g, ' ').trim();
    var tokens = tokenize(cmd);
    var payload = {
        method: 'GET',
        url: '',
        headers: [],
        body_type: 'none',
        body_content: '',
        form_data: []
    };
    var methodForced = false;

    for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i];
        var next;
        if (token === 'curl') continue;

        if (token === '-X' || token === '--request') {
            payload.method = (tokens[++i] || payload.method).toUpperCase();
            methodForced = true;
            continue;
        }
        if (token.indexOf('--request=') === 0) {
            payload.method = token.substring('--request='.length).toUpperCase();
            methodForced = true;
            continue;
        }
        if (token.indexOf('-X') === 0 && token.length > 2) {
            payload.method = token.substring(2).toUpperCase();
            methodForced = true;
            continue;
        }

        if (token === '--url') {
            payload.url = tokens[++i] || '';
            continue;
        }
        if (token.indexOf('--url=') === 0) {
            payload.url = token.substring('--url='.length);
            continue;
        }

        if (token === '-H' || token === '--header') {
            next = tokens[++i] || '';
            addFallbackHeader(payload.headers, next);
            continue;
        }
        if (token.indexOf('--header=') === 0) {
            addFallbackHeader(payload.headers, token.substring('--header='.length));
            continue;
        }
        if (token.indexOf('-H') === 0 && token.length > 2) {
            addFallbackHeader(payload.headers, token.substring(2));
            continue;
        }

        if (['-d', '--data', '--data-raw', '--data-binary', '--data-urlencode'].indexOf(token) !== -1) {
            next = tokens[++i] || '';
            payload.body_content = payload.body_content ? payload.body_content + '&' + next : next;
            payload.body_type = token === '--data-urlencode' ? 'form-urlencoded' : detectFallbackBodyType(payload.body_content, payload.headers);
            continue;
        }
        if (token.indexOf('--data=') === 0 || token.indexOf('--data-raw=') === 0 || token.indexOf('--data-binary=') === 0 || token.indexOf('--data-urlencode=') === 0) {
            next = token.substring(token.indexOf('=') + 1);
            payload.body_content = payload.body_content ? payload.body_content + '&' + next : next;
            payload.body_type = token.indexOf('--data-urlencode=') === 0 ? 'form-urlencoded' : detectFallbackBodyType(payload.body_content, payload.headers);
            continue;
        }
        if (token.indexOf('-d') === 0 && token.length > 2) {
            next = token.substring(2);
            payload.body_content = payload.body_content ? payload.body_content + '&' + next : next;
            payload.body_type = detectFallbackBodyType(payload.body_content, payload.headers);
            continue;
        }

        if (token === '-F' || token === '--form') {
            addFallbackFormField(payload.form_data, tokens[++i] || '');
            payload.body_type = 'form-data';
            payload.body_content = '';
            continue;
        }
        if (token.indexOf('--form=') === 0) {
            addFallbackFormField(payload.form_data, token.substring('--form='.length));
            payload.body_type = 'form-data';
            payload.body_content = '';
            continue;
        }
        if (token.indexOf('-F') === 0 && token.length > 2) {
            addFallbackFormField(payload.form_data, token.substring(2));
            payload.body_type = 'form-data';
            payload.body_content = '';
            continue;
        }

        if (token === '-I' || token === '--head') {
            payload.method = 'HEAD';
            methodForced = true;
            continue;
        }
        if (token === '-G' || token === '--get') {
            payload.method = 'GET';
            methodForced = true;
            continue;
        }

        if (token.charAt(0) !== '-' && !payload.url) payload.url = token;
    }

    if ((payload.body_content || payload.form_data.length) && payload.method === 'GET' && !methodForced) {
        payload.method = 'POST';
    }

    return normalizeParsedImportPayload(payload);
}

function addFallbackHeader(headers, value) {
    var colonIndex = value.indexOf(':');
    if (colonIndex <= 0) return;
    headers.push({
        key: value.substring(0, colonIndex).trim(),
        value: value.substring(colonIndex + 1).trim()
    });
}

function addFallbackFormField(formData, value) {
    var equalIndex = value.indexOf('=');
    if (equalIndex <= 0) return;
    formData.push({
        key: value.substring(0, equalIndex),
        value: value.substring(equalIndex + 1)
    });
}

function detectFallbackBodyType(value, headers) {
    var contentType = '';
    headers.some(function(header) {
        if ((header.key || '').toLowerCase() === 'content-type') {
            contentType = (header.value || '').toLowerCase();
            return true;
        }
        return false;
    });

    if (contentType.indexOf('application/json') !== -1) return 'json';
    if (contentType.indexOf('application/x-www-form-urlencoded') !== -1) return 'form-urlencoded';
    if (contentType.indexOf('/xml') !== -1 || contentType.indexOf('+xml') !== -1) return 'xml';

    try {
        JSON.parse(value);
        return 'json';
    } catch (e) {
        if (/^\s*<[^>]+>/.test(value)) return 'xml';
        if (/^[^=&]+=[^&]*(?:&[^=&]+=[^&]*)*$/.test(value)) return 'form-urlencoded';
        return 'text';
    }
}
