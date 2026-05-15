"""cURL import parser."""

import base64
import json
import re
import shlex


_DATA_OPTIONS = ('--data', '--data-raw', '--data-binary', '--data-urlencode')
_FLAG_OPTIONS = {
    '--compressed', '-k', '--insecure', '-s', '--silent', '-S', '-L',
    '--location', '-v', '--verbose',
}
_LONG_CONSUME_VALUE_OPTIONS = {
    '--connect-timeout', '--max-time', '--output', '--user-agent', '--referer',
}
_SHORT_CONSUME_VALUE_OPTIONS = {'-o', '-A', '-e'}


def parse_curl_to_request(cmd):
    """Parse cURL command to request object."""
    cmd = _normalize_line_continuations(cmd).strip()

    method = 'GET'
    url = ''
    headers = []
    data = ''
    method_forced_by_option = False

    tokens = _tokenize(cmd)

    i = 0
    while i < len(tokens):
        t = tokens[i]
        if t == 'curl':
            i += 1
            continue

        long_name, long_value, has_long_value = _split_long_option(t)
        short_name, short_value, has_short_value = _split_short_option(t)

        if long_name == '--request':
            value, i = _option_value(tokens, i, long_value, has_long_value)
            method = value.upper()
            method_forced_by_option = True
        elif short_name == '-X':
            value, i = _option_value(tokens, i, short_value, has_short_value)
            method = value.upper()
            method_forced_by_option = True
        elif long_name == '--url':
            url, i = _option_value(tokens, i, long_value, has_long_value)
        elif long_name in ('--header',) or short_name == '-H':
            value, i = _option_value(
                tokens, i, long_value or short_value,
                has_long_value or has_short_value
            )
            _add_header(headers, value)
        elif long_name in _DATA_OPTIONS or short_name == '-d':
            value, i = _option_value(
                tokens, i, long_value or short_value,
                has_long_value or has_short_value
            )
            data = value
        elif long_name == '--user' or short_name == '-u':
            value, i = _option_value(
                tokens, i, long_value or short_value,
                has_long_value or has_short_value
            )
            encoded = base64.b64encode(value.encode()).decode()
            headers.append({
                'key': 'Authorization',
                'value': f'Basic {encoded}'
            })
        elif long_name == '--cookie' or short_name == '-b':
            value, i = _option_value(
                tokens, i, long_value or short_value,
                has_long_value or has_short_value
            )
            if _is_inline_cookie(value):
                _add_cookie_header(headers, value)
        elif t in ('-I', '--head'):
            method = 'HEAD'
            method_forced_by_option = True
        elif t in ('-G', '--get'):
            method = 'GET'
            method_forced_by_option = True
        elif long_name in _LONG_CONSUME_VALUE_OPTIONS:
            _, i = _option_value(tokens, i, long_value, has_long_value)
        elif short_name in _SHORT_CONSUME_VALUE_OPTIONS:
            _, i = _option_value(tokens, i, short_value, has_short_value)
        elif t in _FLAG_OPTIONS:
            pass
        elif t[0] != '-' and not url:
            url = t

        i += 1

    if data and method == 'GET' and not method_forced_by_option:
        method = 'POST'

    body_type = 'none'
    body_content = ''
    if data:
        body_content = data
        try:
            json.loads(data)
            body_type = 'json'
        except (json.JSONDecodeError, ValueError):
            body_type = 'text'

    return {
        'method': method,
        'url': url,
        'headers': headers,
        'body_type': body_type,
        'body_content': body_content
    }


def _normalize_line_continuations(cmd):
    """Replace shell line continuations with spaces before tokenizing."""
    return re.sub(r'\\\r?\n', ' ', cmd)


def _tokenize(cmd):
    """Tokenize a cURL command string using shell-compatible parsing."""
    try:
        return shlex.split(cmd)
    except ValueError as err:
        message = f'Invalid cURL command: unable to parse quoted arguments ({err}).'
        raise ValueError(message) from err


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
    for name in ('-X', '-H', '-d', '-u', '-b', '-o', '-A', '-e'):
        if token == name:
            return name, '', False
        if token.startswith(name) and len(token) > len(name):
            return name, token[len(name):], True
    return token, '', False


def _option_value(tokens, index, inline_value, has_inline_value):
    """Return the value for an option and the index it consumed through."""
    if has_inline_value:
        return inline_value, index
    next_index = index + 1
    return (tokens[next_index] if next_index < len(tokens) else ''), next_index


def _add_header(headers, value):
    """Append a header from a cURL header argument."""
    colon_index = value.find(':')
    if colon_index > 0:
        headers.append({
            'key': value[:colon_index].strip(),
            'value': value[colon_index + 1:].strip()
        })


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
    """Return True when the cURL cookie value looks like inline cookie data."""
    return bool(value and '=' in value and not value.startswith('@'))
