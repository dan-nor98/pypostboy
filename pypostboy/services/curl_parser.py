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
        elif long_name in ('--data-urlencode',):
            value, i = _option_value(tokens, i, long_value, has_long_value)
            body_parts.append(_encode_urlencoded_argument(value))
            has_urlencoded_data = True
            field = _form_field_from_assignment(value)
            if field:
                form_data.append(field)
        elif long_name in ('--data', '--data-raw', '--data-binary') or short_name == '-d':
            value, i = _option_value(
                tokens, i, long_value or short_value,
                has_long_value or has_short_value
            )
            body_parts.append(value)
        elif long_name in _FORM_OPTIONS or short_name == '-F':
            value, i = _option_value(
                tokens, i, long_value or short_value,
                has_long_value or has_short_value
            )
            has_form_data = True
            field = _form_field_from_assignment(value)
            if field:
                form_data.append(field)
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

    has_body = bool(body_parts or has_form_data)
    if has_body and method == 'GET' and not method_forced_by_option:
        method = 'POST'

    body_content = _build_body_content(body_parts, has_form_data)
    body_type = _infer_body_type(body_content, headers, has_urlencoded_data, has_form_data)

    result = {
        'method': method,
        'url': url,
        'headers': headers,
        'body_type': body_type,
        'body_content': body_content
    }
    if has_form_data or form_data:
        result['form_data'] = form_data
    return result


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
    for name in ('-X', '-H', '-d', '-F', '-u', '-b', '-o', '-A', '-e'):
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
