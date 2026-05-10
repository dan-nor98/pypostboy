"""Outbound HTTP proxy service."""

import json
from datetime import datetime, timezone

import requests as http_requests
from flask import current_app, has_app_context

from pypostboy.config import BaseConfig


HOP_BY_HOP_HEADERS = {
    'connection',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailer',
    'transfer-encoding',
    'upgrade',
}

REQUEST_CONTROLLED_HEADERS = HOP_BY_HOP_HEADERS | {
    'accept-encoding',
    'content-length',
    'host',
}


class ProxyError(Exception):
    """Base exception for proxy failures."""

    status_text = 'Error'

    def to_payload(self):
        message = str(self)
        return {
            'status': 0,
            'statusText': self.status_text,
            'error': message,
            'body': f'Proxy error: {message}'
        }


class ProxyTimeoutError(ProxyError):
    """Raised when an outbound request times out."""

    status_text = 'Timeout'

    def __init__(self, timeout):
        self.timeout = timeout
        super().__init__(f'Request timed out after {timeout} seconds')

    def to_payload(self):
        payload = super().to_payload()
        payload['body'] = 'Proxy error: Request timed out'
        return payload


class ProxyConnectionError(ProxyError):
    """Raised when the outbound request cannot connect."""

    status_text = 'Connection Error'


def get_proxy_timeout():
    """Return the configured outbound proxy timeout."""
    if has_app_context():
        return current_app.config.get('PROXY_TIMEOUT', BaseConfig.PROXY_TIMEOUT)
    return BaseConfig.PROXY_TIMEOUT


def proxy_http_request(body):
    """Proxy an outbound HTTP request and return a serializable response payload."""
    url = body.get('url')
    method = body.get('method', 'GET')
    headers = body.get('headers', {})
    req_body = body.get('body', None)
    content_type = body.get('contentType', None)

    if not url:
        raise ValueError('URL is required')

    fetch_headers = {}
    if isinstance(headers, dict):
        for k, v in headers.items():
            header_name = str(k).strip() if k else ''
            if header_name and v and header_name.lower() not in REQUEST_CONTROLLED_HEADERS:
                fetch_headers[header_name] = v

    # Do not forward client-provided compression preferences. If an imported
    # cURL/browser request includes ``Accept-Encoding: gzip, deflate, br, zstd``,
    # some servers return an encoded payload that the local environment may not
    # know how to decode, which makes the response viewer display mojibake.
    fetch_headers['Accept-Encoding'] = 'identity'

    if req_body and method not in ('GET', 'HEAD'):
        if content_type and content_type != 'multipart/form-data':
            fetch_headers['Content-Type'] = content_type

    start_time = datetime.now(timezone.utc)
    proxy_timeout = get_proxy_timeout()

    try:
        response = http_requests.request(
            method=method,
            url=url,
            headers=fetch_headers,
            data=req_body if req_body else None,
            allow_redirects=True,
            timeout=proxy_timeout
        )
    except http_requests.exceptions.Timeout as err:
        raise ProxyTimeoutError(proxy_timeout) from err
    except http_requests.exceptions.ConnectionError as err:
        raise ProxyConnectionError(str(err)) from err
    except Exception as err:
        raise ProxyError(str(err)) from err

    elapsed = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000

    resp_text = response.text
    try:
        parsed_body = response.json()
    except (json.JSONDecodeError, ValueError):
        parsed_body = resp_text

    return {
        'status': response.status_code,
        'statusText': response.reason,
        'headers': dict(response.headers),
        'body': parsed_body,
        'time': int(elapsed)
    }
