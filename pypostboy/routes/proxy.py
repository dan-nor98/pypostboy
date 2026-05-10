"""Proxy API routes."""

from flask import Blueprint, jsonify, request

from pypostboy.services.proxy_service import ProxyError, proxy_http_request

bp = Blueprint('proxy', __name__)


@bp.route('/api/proxy', methods=['POST'])
def proxy_request():
    """Proxy an HTTP request."""
    try:
        return jsonify(proxy_http_request(request.get_json(silent=True) or {}))
    except ValueError as err:
        return jsonify({'error': str(err)}), 400
    except ProxyError as err:
        return jsonify(err.to_payload()), 500
