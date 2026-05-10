"""cURL import parser."""

import base64
import json
import re


def parse_curl_to_request(cmd):
    """Parse cURL command to request object."""
    cmd = re.sub(r'\\\n', ' ', cmd)
    cmd = re.sub(r'\\\r\n', ' ', cmd)
    cmd = cmd.strip()

    method = 'GET'
    url = ''
    headers = []
    data = ''

    tokens = _tokenize(cmd)

    i = 0
    while i < len(tokens):
        t = tokens[i]
        if t == 'curl':
            i += 1
            continue
        if t in ('-X', '--request'):
            i += 1
            method = (tokens[i] if i < len(tokens) else '').upper()
        elif t in ('-H', '--header'):
            i += 1
            hdr = tokens[i] if i < len(tokens) else ''
            ci = hdr.find(':')
            if ci > 0:
                headers.append({
                    'key': hdr[:ci].strip(),
                    'value': hdr[ci+1:].strip()
                })
        elif t in ('-d', '--data', '--data-raw', '--data-binary', '--data-urlencode'):
            i += 1
            data = tokens[i] if i < len(tokens) else ''
        elif t in ('-u', '--user'):
            i += 1
            cred = tokens[i] if i < len(tokens) else ''
            encoded = base64.b64encode(cred.encode()).decode()
            headers.append({
                'key': 'Authorization',
                'value': f'Basic {encoded}'
            })
        elif t == '--url':
            i += 1
            url = tokens[i] if i < len(tokens) else ''
        elif t in ('--compressed', '-k', '--insecure', '-s', '--silent',
                   '-S', '-L', '--location', '-v', '--verbose'):
            pass
        elif t[0] != '-' and not url:
            url = t

        i += 1

    if data and method == 'GET':
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


def _tokenize(cmd):
    """Tokenize a cURL command string."""
    tokens = []
    i = 0
    while i < len(cmd):
        while i < len(cmd) and cmd[i] == ' ':
            i += 1
        if i >= len(cmd):
            break

        if cmd[i] in ("'", '"'):
            quote = cmd[i]
            i += 1
            tok = ''
            while i < len(cmd) and cmd[i] != quote:
                if cmd[i] == '\\' and i + 1 < len(cmd):
                    i += 1
                    tok += cmd[i]
                else:
                    tok += cmd[i]
                i += 1
            i += 1
            tokens.append(tok)
        else:
            tok = ''
            while i < len(cmd) and cmd[i] != ' ':
                tok += cmd[i]
                i += 1
            tokens.append(tok)

    return tokens
