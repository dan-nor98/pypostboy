"""Outbound HTTP proxy service."""

import json
import logging
import os
import re
from datetime import datetime, timezone
from urllib.parse import urlsplit, urlunsplit

import requests as http_requests
from django.conf import settings

from pypostboy.config import BaseConfig, get_proxy_settings


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

# RFC 9110 allows recipients to combine duplicate field lines with commas only
# when the field's grammar uses list syntax. Set-Cookie is the common explicit
# exception and is response-only for this client, so duplicate outbound rows for
# non-list fields are rejected instead of being collapsed unsafely.
NON_COMBINABLE_REQUEST_HEADERS = {
    'authorization',
    'content-type',
    'cookie',
    'if-match',
    'if-none-match',
    'if-modified-since',
    'if-unmodified-since',
    'range',
    'referer',
    'set-cookie',
    'user-agent',
}

LOOPBACK_HOSTNAMES = {'localhost', '127.0.0.1', '::1'}

# Proxy responses larger than this are not copied to the browser in full.
# The payload keeps the original byte count and truncation metadata so the
# frontend can render a safe preview instead of freezing on huge documents.
MAX_RESPONSE_BODY_BYTES = 1_000_000
TEXT_CONTENT_TYPES = {
    'text/plain',
    'text/csv',
    'text/markdown',
}
HTML_XML_CONTENT_TYPES = {
    'text/html',
    'application/xhtml+xml',
    'application/xml',
    'text/xml',
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


class ProxyDisabledError(ProxyError):
    """Raised when outbound proxying is disabled by configuration."""

    status_text = 'Proxy Disabled'

    def to_payload(self):
        payload = super().to_payload()
        payload['body'] = 'Proxy error: Outbound proxying is disabled'
        return payload


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


def _rewrite_loopback_url_for_host(url):
    """Map loopback URLs to the Docker host when explicitly configured."""
    host_gateway = os.environ.get('POSTBOY_PROXY_LOCALHOST_HOST', '').strip()
    if not host_gateway:
        return url

    try:
        parsed = urlsplit(url)
        port = parsed.port
    except ValueError:
        return url

    if parsed.hostname not in LOOPBACK_HOSTNAMES:
        return url

    user_info, separator, _ = parsed.netloc.rpartition('@')
    authority = f'{user_info}@' if separator else ''
    authority += host_gateway
    if port is not None:
        authority += f':{port}'

    return urlunsplit((parsed.scheme, authority, parsed.path, parsed.query, parsed.fragment))


def get_proxy_config():
    """Return current proxy configuration, honoring Django settings when present."""
    configured = get_proxy_settings()
    if settings.configured:
        configured['enabled'] = getattr(settings, 'PROXY_ENABLED', configured['enabled'])
        configured['mode'] = 'enabled' if configured['enabled'] else 'disabled'
        configured['target'] = getattr(settings, 'PROXY_TARGET', configured['target'])
        configured['transport'] = getattr(settings, 'PROXY_TRANSPORT', configured['transport'])
        configured['authPolicy'] = getattr(settings, 'PROXY_AUTH_POLICY', configured['authPolicy'])
    return configured


def get_proxy_timeout():
    """Return the configured outbound proxy timeout."""
    if not settings.configured:
        return BaseConfig.PROXY_TIMEOUT
    return getattr(settings, 'PROXY_TIMEOUT', BaseConfig.PROXY_TIMEOUT)


def proxy_http_request(body):
    """Proxy an outbound HTTP request and return a serializable response payload."""
    proxy_config = get_proxy_config()
    if not proxy_config.get('enabled'):
        raise ProxyDisabledError('Outbound proxying is disabled by backend configuration')

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

    url = _rewrite_loopback_url_for_host(url)

    fetch_headers, skipped_headers_count = _prepare_outbound_headers(headers)

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

    body_payload = _serialize_response_body(response)

    return {
        'status': response.status_code,
        'statusText': response.reason,
        'headers': dict(response.headers),
        'headerList': _serialize_response_headers(response),
        'body': body_payload['body'],
        'contentType': body_payload['contentType'],
        'bodyType': body_payload['bodyType'],
        'isBinary': body_payload['isBinary'],
        'isTruncated': body_payload['isTruncated'],
        'isJsonValid': body_payload['isJsonValid'],
        'size': body_payload['size'],
        'originalSize': body_payload['originalSize'],
        'truncatedSize': body_payload['truncatedSize'],
        'time': int(elapsed)
    }


def _serialize_response_headers(response):
    """Return response headers as ordered rows while preserving duplicates."""
    raw_headers = getattr(getattr(response, 'raw', None), 'headers', None)
    rows = []

    if raw_headers is not None:
        for name in raw_headers.keys():
            values = raw_headers.getlist(name) if hasattr(raw_headers, 'getlist') else [raw_headers.get(name)]
            for value in values:
                rows.append({'name': str(name), 'value': _normalize_header_value(value)})

    if not rows:
        rows = [
            {'name': str(name), 'value': _normalize_header_value(value)}
            for name, value in (getattr(response, 'headers', {}) or {}).items()
        ]

    return rows


def _normalize_header_value(value):
    """Unfold multiline header values and keep them safe for single-row display."""
    return re.sub(r'\r?\n[ \t]*', ' ', str(value or ''))


def _serialize_response_body(response):
    """Return content-type-aware, JSON-serializable response body metadata."""
    headers = getattr(response, 'headers', {}) or {}
    content_type = headers.get('Content-Type') or headers.get('content-type') or ''
    media_type = content_type.split(';', 1)[0].strip().lower()
    raw_body = getattr(response, 'content', b'')
    if raw_body is None:
        raw_body = b''
    if isinstance(raw_body, str):
        raw_body = raw_body.encode(_response_encoding(response), errors='replace')

    original_size = len(raw_body)
    is_truncated = original_size > MAX_RESPONSE_BODY_BYTES
    display_bytes = raw_body[:MAX_RESPONSE_BODY_BYTES]
    size = len(display_bytes)

    body_type = _classify_response_body(media_type)
    if not display_bytes:
        return {
            'body': '',
            'contentType': content_type,
            'bodyType': 'empty',
            'isBinary': False,
            'isTruncated': False,
            'isJsonValid': False,
            'size': size,
            'originalSize': original_size,
            'truncatedSize': size,
        }

    if body_type == 'binary':
        return {
            'body': '',
            'contentType': content_type,
            'bodyType': 'binary',
            'isBinary': True,
            'isTruncated': is_truncated,
            'isJsonValid': False,
            'size': size,
            'originalSize': original_size,
            'truncatedSize': size,
        }

    text = display_bytes.decode(_response_encoding(response), errors='replace')
    is_json_valid = False
    if body_type == 'json':
        body = text
        try:
            json.loads(text)
            is_json_valid = True
        except (json.JSONDecodeError, ValueError):
            is_json_valid = False
    elif body_type in {'text', 'markup'}:
        body = text
    else:
        body = ''

    return {
        'body': body,
        'contentType': content_type,
        'bodyType': body_type,
        'isBinary': False,
        'isTruncated': is_truncated,
        'isJsonValid': is_json_valid,
        'size': size,
        'originalSize': original_size,
        'truncatedSize': size,
    }


def _classify_response_body(media_type):
    """Classify a response media type into a safe viewer category."""
    if not media_type:
        return 'text'
    if media_type == 'application/json' or media_type.endswith('+json'):
        return 'json'
    if media_type in HTML_XML_CONTENT_TYPES or media_type.endswith('+xml'):
        return 'markup'
    if media_type.startswith('text/') or media_type in TEXT_CONTENT_TYPES:
        return 'text'
    if media_type.startswith(('image/', 'audio/', 'video/')) or media_type in {
        'application/octet-stream',
        'application/pdf',
        'application/zip',
        'application/gzip',
    }:
        return 'binary'
    return 'unsupported'


def _response_encoding(response):
    """Return a safe text encoding for response content bytes."""
    return getattr(response, 'encoding', None) or 'utf-8'


def _is_multipart_form_data(content_type):
    """Return whether a content type identifies multipart form data."""
    media_type = str(content_type or '').split(';', 1)[0].strip().lower()
    return media_type == 'multipart/form-data'


def _prepare_outbound_headers(headers):
    """Return requests-compatible headers after applying duplicate rules."""
    fetch_headers = {}
    header_names_by_lower = {}
    skipped_headers_count = 0

    for header_name, header_value in _iter_header_rows(headers):
        lower_name = header_name.lower()
        if lower_name in REQUEST_CONTROLLED_HEADERS:
            skipped_headers_count += 1
            continue
        existing_name = header_names_by_lower.get(lower_name)
        if existing_name:
            if lower_name in NON_COMBINABLE_REQUEST_HEADERS:
                raise ValueError(
                    f'Duplicate header {header_name} is not supported; HTTP does not define safe comma-combining for this field'
                )
            fetch_headers[existing_name] = f'{fetch_headers[existing_name]}, {header_value}'
            continue
        header_names_by_lower[lower_name] = header_name
        fetch_headers[header_name] = header_value

    return fetch_headers, skipped_headers_count


def _iter_header_rows(headers):
    """Yield enabled, non-empty outbound header rows in user order."""
    if isinstance(headers, dict):
        iterable = ({'enabled': True, 'key': key, 'value': value} for key, value in headers.items())
    elif isinstance(headers, list):
        iterable = headers
    else:
        return

    for header in iterable:
        if isinstance(header, (list, tuple)):
            enabled, key, value = (header if len(header) > 2 else (True, header[0] if header else '', header[1] if len(header) > 1 else ''))
        elif isinstance(header, dict):
            enabled = header.get('enabled', True)
            key = header.get('key', '')
            value = header.get('value', '')
        else:
            continue
        header_name = str(key).strip() if key else ''
        header_value = '' if value is None else str(value)
        if enabled is False or not header_name or not header_value:
            continue
        yield header_name, header_value


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
