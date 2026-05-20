"""Outbound HTTP proxy service."""

import json
import logging
import os
from datetime import datetime, timezone
from urllib.parse import urlsplit

import requests as http_requests
from django.conf import settings

from pypostboy.config import BaseConfig


logger = logging.getLogger(__name__)


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


class ProxyTlsError(ProxyConnectionError):
    """Raised when TLS certificate verification fails for an outbound request."""

    status_text = 'TLS Error'


def _safe_url_parts(url):
    """Return non-secret URL parts for outbound request logging."""
    try:
        parsed = urlsplit(url)
    except ValueError:
        return '', ''
    return parsed.hostname or '', parsed.path or '/'


def get_proxy_timeout():
    """Return the configured outbound proxy timeout."""
    if not settings.configured:
        return BaseConfig.PROXY_TIMEOUT
    return getattr(settings, 'PROXY_TIMEOUT', BaseConfig.PROXY_TIMEOUT)


def proxy_http_request(body):
    """Proxy an outbound HTTP request and return a serializable response payload."""
    url = body.get('url')
    method = body.get('method', 'GET')
    headers = body.get('headers', {})
    req_body = body.get('body', None)
    content_type = body.get('contentType', None)
    verify_ssl = body.get('verifySsl', True)

    if not isinstance(verify_ssl, bool):
        raise ValueError('verifySsl must be a boolean when provided')

    if not url:
        raise ValueError('URL is required')

    fetch_headers = {}
    skipped_headers_count = 0
    if isinstance(headers, dict):
        for k, v in headers.items():
            header_name = str(k).strip() if k else ''
            if not header_name or not v:
                continue
            if header_name.lower() in REQUEST_CONTROLLED_HEADERS:
                skipped_headers_count += 1
                continue
            fetch_headers[header_name] = v

    # Do not forward client-provided compression preferences. If an imported
    # cURL/browser request includes ``Accept-Encoding: gzip, deflate, br, zstd``,
    # some servers return an encoded payload that the local environment may not
    # know how to decode, which makes the response viewer display mojibake.
    fetch_headers['Accept-Encoding'] = 'identity'

    is_multipart_form_data = _is_multipart_form_data(content_type)
    if is_multipart_form_data:
        if _remove_header(fetch_headers, 'content-type'):
            skipped_headers_count += 1
    elif req_body and method not in ('GET', 'HEAD') and content_type:
        fetch_headers['Content-Type'] = content_type

    files = None
    opened_files = []
    request_data = req_body if req_body else None
    if is_multipart_form_data and method not in ('GET', 'HEAD'):
        files = _multipart_files_from_form_data(body.get('formData', []), opened_files)
        request_data = None

    start_time = datetime.now(timezone.utc)
    proxy_timeout = get_proxy_timeout()
    url_hostname, url_path = _safe_url_parts(url)

    logger.info(
        'Proxy outbound request started: method=%s host=%s path=%s skipped_headers_count=%s',
        method,
        url_hostname,
        url_path,
        skipped_headers_count,
    )

    try:
        if not verify_ssl:
            logger.warning(
                'Proxy outbound TLS verification disabled: method=%s host=%s path=%s',
                method,
                url_hostname,
                url_path,
            )

        response = http_requests.request(
            method=method,
            url=url,
            headers=fetch_headers,
            data=request_data,
            files=files,
            allow_redirects=True,
            timeout=proxy_timeout,
            verify=verify_ssl
        )
    except http_requests.exceptions.Timeout as err:
        elapsed = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
        logger.warning(
            'Proxy outbound request timed out: method=%s host=%s path=%s elapsed_ms=%s timeout=%s skipped_headers_count=%s',
            method,
            url_hostname,
            url_path,
            int(elapsed),
            proxy_timeout,
            skipped_headers_count,
        )
        raise ProxyTimeoutError(proxy_timeout) from err
    except http_requests.exceptions.SSLError as err:
        elapsed = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
        logger.warning(
            'Proxy outbound TLS verification failed: method=%s host=%s path=%s elapsed_ms=%s skipped_headers_count=%s',
            method,
            url_hostname,
            url_path,
            int(elapsed),
            skipped_headers_count,
        )
        raise ProxyTlsError(
            'TLS certificate verification failed for ' + (url_hostname or 'the upstream host')
            + '. Verify the server certificate chain or provide a trusted CA bundle.'
        ) from err
    except (
        http_requests.exceptions.MissingSchema,
        http_requests.exceptions.InvalidSchema,
        http_requests.exceptions.InvalidURL,
    ) as err:
        elapsed = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
        logger.warning(
            'Proxy outbound URL validation failed: method=%s host=%s path=%s elapsed_ms=%s skipped_headers_count=%s',
            method,
            url_hostname,
            url_path,
            int(elapsed),
            skipped_headers_count,
        )
        raise ValueError('URL must include a valid http:// or https:// scheme') from err
    except http_requests.exceptions.ConnectionError as err:
        elapsed = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
        logger.warning(
            'Proxy outbound connection failed: method=%s host=%s path=%s elapsed_ms=%s skipped_headers_count=%s',
            method,
            url_hostname,
            url_path,
            int(elapsed),
            skipped_headers_count,
        )
        raise ProxyConnectionError(str(err)) from err
    except Exception as err:
        elapsed = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
        logger.exception(
            'Proxy outbound request failed: method=%s host=%s path=%s elapsed_ms=%s skipped_headers_count=%s',
            method,
            url_hostname,
            url_path,
            int(elapsed),
            skipped_headers_count,
        )
        raise ProxyError(str(err)) from err
    finally:
        for file_obj in opened_files:
            file_obj.close()

    elapsed = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
    logger.info(
        'Proxy outbound request completed: method=%s host=%s path=%s elapsed_ms=%s status=%s skipped_headers_count=%s',
        method,
        url_hostname,
        url_path,
        int(elapsed),
        response.status_code,
        skipped_headers_count,
    )

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


def _is_multipart_form_data(content_type):
    """Return whether a content type identifies multipart form data."""
    media_type = str(content_type or '').split(';', 1)[0].strip().lower()
    return media_type == 'multipart/form-data'


def _remove_header(headers, header_name):
    """Remove a header from a dict using case-insensitive matching."""
    removed = False
    for existing_name in list(headers):
        if existing_name.lower() == header_name:
            headers.pop(existing_name, None)
            removed = True
    return removed


def _multipart_files_from_form_data(form_data, opened_files):
    """Return requests-compatible multipart fields from serialized editor form data."""
    multipart_fields = []
    if not isinstance(form_data, list):
        return multipart_fields

    for field in form_data:
        if not isinstance(field, dict):
            continue
        key = str(field.get('key', '')).strip()
        if not key:
            continue
        value = '' if field.get('value') is None else str(field.get('value'))
        file_tuple = _multipart_file_tuple(value, opened_files)
        multipart_fields.append((key, file_tuple if file_tuple else (None, value)))
    return multipart_fields


def _multipart_file_tuple(value, opened_files):
    """Return a requests file tuple for cURL-style @path values when readable."""
    if not value.startswith('@') or value.startswith('@@'):
        return None

    file_path = value[1:]
    if not file_path or not os.path.isfile(file_path):
        return None

    file_obj = open(file_path, 'rb')
    opened_files.append(file_obj)
    return (os.path.basename(file_path), file_obj)
