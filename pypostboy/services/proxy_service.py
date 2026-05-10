"""Outbound HTTP proxy service."""

import json
from datetime import datetime, timezone

import requests as http_requests


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

    def __init__(self):
        super().__init__('Request timed out after 30 seconds')

    def to_payload(self):
        payload = super().to_payload()
        payload['body'] = 'Proxy error: Request timed out'
        return payload


class ProxyConnectionError(ProxyError):
    """Raised when the outbound request cannot connect."""

    status_text = 'Connection Error'


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
            if k and v:
                fetch_headers[k] = v

    if req_body and method not in ('GET', 'HEAD'):
        if content_type and content_type != 'multipart/form-data':
            fetch_headers['Content-Type'] = content_type

    start_time = datetime.now(timezone.utc)

    try:
        response = http_requests.request(
            method=method,
            url=url,
            headers=fetch_headers,
            data=req_body if req_body else None,
            allow_redirects=True,
            timeout=30
        )
    except http_requests.exceptions.Timeout as err:
        raise ProxyTimeoutError() from err
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
