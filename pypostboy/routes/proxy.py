"""Proxy API routes."""

from flask import Blueprint, request

from pypostboy.http.responses import error, ok
from pypostboy.services.proxy_service import ProxyError, proxy_http_request

bp = Blueprint('proxy', __name__)


@bp.route('/api/proxy', methods=['POST'])
def proxy_request():
    """Proxy an HTTP request."""
    try:
        return ok(proxy_http_request(request.get_json(silent=True) or {}))
    except ValueError as err:
        return error(err, 400)
    except ProxyError as err:
        return error(err, 500, details=err.to_payload())
