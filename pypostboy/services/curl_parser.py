"""cURL import parser."""

import base64
import json
import re
import shlex
from urllib.parse import quote_plus

_FORM_OPTIONS = ('--form',)
_FLAG_OPTIONS = {
    '--compressed', '-k', '--insecure', '-s', '--silent', '-S', '-L',
    '--location', '-v', '--verbose',
}
_LONG_CONSUME_VALUE_OPTIONS = {
    '--connect-timeout', '--max-time', '--output', '--user-agent', '--referer',
}
_SHORT_CONSUME_VALUE_OPTIONS = {'-o', '-A', '-e'}
_DATA_OPTIONS = ('--data', '--data-raw', '--data-binary')
_JSON_OPTIONS = ('--json',)


class CurlParseError(ValueError):
    """Raised when a cURL command cannot be safely imported."""

    def __init__(self, message, errors=None, warnings=None):
        super().__init__(message)
        self.errors = errors or [_issue('invalid_curl', message)]
        self.warnings = warnings or []


def parse_curl_to_request(cmd):
    """Parse cURL command to request object."""
    cmd = _normalize_line_continuations(cmd).strip()

    method = 'GET'
    url = ''
    headers = []
    body_parts = []
    has_urlencoded_data = False
    form_data = []
    has_form_data = False
    has_json_data = False
    method_forced_by_option = False
    errors = []
    warnings = []

    tokens = _tokenize(cmd)

    i = 0
    while i < len(tokens):
        t = tokens[i]
        if t == 'curl':
            i += 1
            continue
        if t == '':
            if not url:
                errors.append(_issue('empty_url', 'The cURL command contains an empty URL.'))
            i += 1
            continue

        long_name, long_value, has_long_value = _split_long_option(t)
        short_name, short_value, has_short_value = _split_short_option(t)

        if long_name == '--request':
            value, i = _option_value(tokens, i, long_value, has_long_value, '--request', errors)
            if value:
                method = value.upper()
                method_forced_by_option = True
        elif short_name == '-X':
            value, i = _option_value(tokens, i, short_value, has_short_value, '-X', errors)
            if value:
                method = value.upper()
                method_forced_by_option = True
        elif long_name == '--url':
            url, i = _option_value(
                tokens, i, long_value, has_long_value, '--url', errors,
                error_code='empty_url'
            )
        elif long_name in ('--header',) or short_name == '-H':
            option = long_name or short_name
            value, i = _option_value(
                tokens, i, long_value or short_value,
                has_long_value or has_short_value, option, errors,
                error_code='missing_header_value'
            )
            if value:
                _add_header(headers, value)
        elif long_name in ('--data-urlencode',):
            value, i = _option_value(tokens, i, long_value, has_long_value, '--data-urlencode', errors, error_code='missing_body_value')
            if value:
                body_parts.append(_encode_urlencoded_argument(value))
                has_urlencoded_data = True
                field = _form_field_from_assignment(value)
                if field:
                    form_data.append(field)
        elif long_name in _DATA_OPTIONS or short_name == '-d':
            option = long_name or short_name
            value, i = _option_value(
                tokens, i, long_value or short_value,
                has_long_value or has_short_value, option, errors,
                error_code='missing_body_value'
            )
            if value:
                body_parts.append(value)
        elif long_name in _JSON_OPTIONS:
            value, i = _option_value(
                tokens, i, long_value, has_long_value, long_name, errors,
                error_code='missing_body_value'
            )
            if value:
                body_parts.append(value)
                has_json_data = True
        elif long_name in _FORM_OPTIONS or short_name == '-F':
            option = long_name or short_name
            value, i = _option_value(
                tokens, i, long_value or short_value,
                has_long_value or has_short_value, option, errors,
                error_code='missing_form_value'
            )
            if value:
                has_form_data = True
                field = _form_field_from_assignment(value)
                if field:
                    form_data.append(field)
        elif long_name == '--user' or short_name == '-u':
            option = long_name or short_name
            value, i = _option_value(
                tokens, i, long_value or short_value,
                has_long_value or has_short_value, option, errors
            )
            if value:
                encoded = base64.b64encode(value.encode()).decode()
                headers.append({
                    'key': 'Authorization',
                    'value': f'Basic {encoded}'
                })
        elif long_name == '--cookie' or short_name == '-b':
            option = long_name or short_name
            value, i = _option_value(
                tokens, i, long_value or short_value,
                has_long_value or has_short_value, option, errors
            )
            if value and _is_inline_cookie(value):
                _add_cookie_header(headers, value)
        elif t in ('-I', '--head'):
            method = 'HEAD'
            method_forced_by_option = True
        elif t in ('-G', '--get'):
            method = 'GET'
            method_forced_by_option = True
        elif long_name in _LONG_CONSUME_VALUE_OPTIONS:
            _, i = _option_value(tokens, i, long_value, has_long_value, long_name, errors)
        elif short_name in _SHORT_CONSUME_VALUE_OPTIONS:
            _, i = _option_value(tokens, i, short_value, has_short_value, short_name, errors)
        elif t in _FLAG_OPTIONS:
            pass
        elif t[0] != '-' and not url:
            url = t
        elif t[0] == '-':
            warnings.append(_issue(
                'unsupported_option',
                f'Unsupported cURL option {t} was ignored. Import accuracy may be limited.',
                option=t
            ))

        i += 1

    if not url and not _has_issue(errors, 'empty_url'):
        errors.append(_issue('missing_url', 'The cURL command must include a URL before it can be imported.'))
    elif url and not str(url).strip():
        errors.append(_issue('empty_url', 'The cURL command contains an empty URL.'))

    if errors:
        raise CurlParseError('Unable to import cURL command.', errors=errors, warnings=warnings)

    has_body = bool(body_parts or has_form_data)
    if has_body and method == 'GET' and not method_forced_by_option:
        method = 'POST'

    body_content = _build_body_content(body_parts, has_form_data)
    if has_json_data:
        _ensure_header(headers, 'Content-Type', 'application/json')
        _ensure_header(headers, 'Accept', 'application/json')
    body_type = (
        'json'
        if has_json_data and body_content
        else _infer_body_type(body_content, headers, has_urlencoded_data, has_form_data)
    )

    result = {
        'method': method,
        'url': url,
        'headers': headers,
        'body_type': body_type,
        'body_content': body_content,
        'form_data': form_data
    }
    if warnings:
        result['warnings'] = warnings
    return result


def _issue(code, message, option=None):
    """Return a structured parser issue."""
    issue = {'code': code, 'message': message}
    if option:
        issue['option'] = option
    return issue


def _normalize_line_continuations(cmd):
    """Replace shell line continuations with spaces before tokenizing."""
    cmd = re.sub(r'\\\r?\n', ' ', cmd or '')

    normalized = []
    index = 0
    quote = None
    length = len(cmd)

    while index < length:
        char = cmd[index]

        if quote:
            normalized.append(char)
            if char == '\\' and quote == '"' and index + 1 < length:
                index += 1
                normalized.append(cmd[index])
            elif char == quote:
                quote = None
            index += 1
            continue

        if char in ('"', "'"):
            quote = char
            normalized.append(char)
            index += 1
            continue

        literal_newline_length = _literal_newline_separator_length(cmd, index)
        if literal_newline_length:
            normalized.append(' ')
            index += literal_newline_length
            continue

        normalized.append(char)
        index += 1

    return ''.join(normalized)


def _literal_newline_separator_length(cmd, index):
    """Return the length of a literal escaped newline used as an arg separator."""
    if cmd.startswith('\\r\\n', index):
        sequence_length = 4
    elif cmd.startswith('\\n', index):
        sequence_length = 2
    else:
        return 0

    if index > 0 and not cmd[index - 1].isspace():
        return 0

    next_index = index + sequence_length
    if next_index < len(cmd) and not cmd[next_index].isspace():
        return 0

    return sequence_length

def _has_issue(errors, code):
    """Return whether an issue with the given code already exists."""
    return any(error.get('code') == code for error in errors)


def _normalize_ansi_c_quoted_strings(cmd):
    """Convert Bash ANSI-C quoted strings into shlex-compatible quoted strings."""
    if not cmd or "$'" not in cmd:
        return cmd

    normalized = []
    index = 0
    length = len(cmd)
    while index < length:
        if cmd[index:index + 2] != "$'":
            normalized.append(cmd[index])
            index += 1
            continue

        start = index
        index += 2
        value = []
        while index < length:
            char = cmd[index]
            if char == "'":
                if index + 1 < length and cmd[index + 1] == "'":
                    value.append("'")
                    index += 2
                    continue
                normalized.append(shlex.quote(''.join(value)))
                index += 1
                break
            if char == '\\' and index + 1 < length:
                value.append(_decode_ansi_c_escape(cmd[index + 1]))
                index += 2
                continue
            value.append(char)
            index += 1
        else:
            normalized.append(cmd[start:])
            break

    return ''.join(normalized)


def _decode_ansi_c_escape(char):
    """Decode the ANSI-C escapes most commonly seen in copied cURL commands."""
    escapes = {
        "'": "'",
        '\\': '\\',
        'a': '\a',
        'b': '\b',
        'f': '\f',
        'n': '\n',
        'r': '\r',
        't': '\t',
        'v': '\v',
    }
    return escapes.get(char, f'\\{char}')


def _tokenize(cmd):
    """Tokenize a cURL command string using shell-compatible parsing."""
    try:
        return shlex.split(_normalize_ansi_c_quoted_strings(cmd))
    except ValueError as err:
        message = f'Invalid cURL command: unable to parse quoted arguments ({err}).'
        raise CurlParseError(message, errors=[_issue('invalid_quoting', message)]) from err


def _split_long_option(token):
    """Return long option name, inline value, and whether one was supplied."""
    if not token.startswith('--'):
        return None, '', False
    name, separator, value = token.partition('=')
    return name, value, bool(separator)


def _split_short_option(token):
    """Return supported short option name and attached value, when present."""
    if not token.startswith('-') or token.startswith('--'):
        return None, '', False
    for name in ('-X', '-H', '-d', '-F', '-u', '-b', '-o', '-A', '-e'):
        if token == name:
            return name, '', False
        if token.startswith(name) and len(token) > len(name):
            return name, token[len(name):], True
    return token, '', False


def _option_value(tokens, index, inline_value, has_inline_value, option, errors, error_code='missing_option_value'):
    """Return the value for an option and the index it consumed through."""
    if has_inline_value:
        if inline_value == '':
            errors.append(_issue(error_code, f'The {option} option requires a value.', option=option))
        return inline_value, index

    next_index = index + 1
    if next_index >= len(tokens) or tokens[next_index] == '' or _looks_like_option(tokens[next_index]):
        errors.append(_issue(error_code, f'The {option} option requires a value.', option=option))
        return '', index
    return tokens[next_index], next_index


def _looks_like_option(token):
    """Return whether a token appears to start the next cURL option."""
    return bool(token and token.startswith('-'))


def _build_body_content(body_parts, has_form_data):
    """Build request body content from cURL data options."""
    if has_form_data:
        return ''
    if len(body_parts) > 1:
        return '&'.join(body_parts)
    if body_parts:
        return body_parts[0]
    return ''


def _infer_body_type(body_content, headers, has_urlencoded_data, has_form_data):
    """Infer the editor body type for parsed cURL data."""
    if has_form_data:
        return 'form-data'
    if not body_content:
        return 'none'

    content_type = _content_type(headers)
    if 'multipart/form-data' in content_type:
        return 'form-data'
    if 'application/json' in content_type or _is_json(body_content):
        return 'json'
    if _is_xml_content_type(content_type) or _looks_like_xml(body_content):
        return 'xml'
    if has_urlencoded_data or 'application/x-www-form-urlencoded' in content_type:
        return 'form-urlencoded'
    if _looks_like_form_urlencoded(body_content):
        return 'form-urlencoded'
    if content_type.startswith('text/'):
        return 'text'
    return 'text'


def _content_type(headers):
    """Return the lower-cased content type header value, if present."""
    for header in headers:
        if header['key'].lower() == 'content-type':
            return header['value'].lower()
    return ''


def _is_json(value):
    """Return whether value is valid JSON."""
    try:
        json.loads(value)
        return True
    except (json.JSONDecodeError, ValueError):
        return False


def _is_xml_content_type(content_type):
    """Return whether content type represents XML."""
    media_type = content_type.split(';', 1)[0].strip()
    return media_type.endswith('/xml') or media_type.endswith('+xml')


def _looks_like_xml(value):
    """Return whether a body looks like XML or HTML-style markup."""
    return bool(re.match(r'\s*<[^>]+>', value))


def _looks_like_form_urlencoded(value):
    """Return whether a body looks like URL-encoded form data."""
    if not value or value.lstrip().startswith(('{', '[')) or _looks_like_xml(value):
        return False
    pairs = value.split('&')
    return all('=' in pair and pair.split('=', 1)[0] for pair in pairs)


def _encode_urlencoded_argument(value):
    """Encode a --data-urlencode argument the way cURL posts key/value data."""
    field = _form_field_from_assignment(value)
    if not field:
        return quote_plus(value)
    return f"{quote_plus(field['key'])}={quote_plus(field['value'])}"


def _form_field_from_assignment(value):
    """Return a structured form field from a key=value cURL argument.

    cURL form arguments use the value text after the first ``=`` exactly as
    provided, including file upload markers such as ``@/tmp/avatar.png``.
    """
    equal_index = value.find('=')
    if equal_index <= 0:
        return None
    return {
        'key': value[:equal_index],
        'value': value[equal_index + 1:]
    }


def _add_header(headers, value):
    """Append a header from a cURL header argument."""
    colon_index = value.find(':')
    if colon_index > 0:
        headers.append({
            'key': value[:colon_index].strip(),
            'value': value[colon_index + 1:].strip()
        })


def _ensure_header(headers, key, value):
    """Append a header unless one with the same name already exists."""
    if not any(header['key'].lower() == key.lower() for header in headers):
        headers.append({'key': key, 'value': value})


def _add_cookie_header(headers, value):
    """Add inline cURL cookies to the request as a Cookie header."""
    for header in headers:
        if header['key'].lower() == 'cookie':
            if header['value']:
                header['value'] = f"{header['value']}; {value}"
            else:
                header['value'] = value
            return
    headers.append({'key': 'Cookie', 'value': value})


def _is_inline_cookie(value):
    """Return whether a cURL cookie value is an inline cookie header."""
    return '=' in value or ';' in value
