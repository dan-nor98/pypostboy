"""Import API routes."""

from flask import Blueprint, request

from pypostboy.http.responses import error, ok
from pypostboy.services.curl_parser import parse_curl_to_request
from pypostboy.services.import_service import import_postman_to_db

bp = Blueprint('imports', __name__)


@bp.route('/api/import', methods=['POST'])
def import_data():
    """Import Postman collection or cURL command."""
    try:
        body = request.get_json(silent=True) or {}
        data = body.get('data')
        import_type = body.get('type')

        if not data:
            return error('No data provided', 400)

        if import_type == 'postman':
            return ok(import_postman_to_db(data))
        if import_type == 'curl':
            return ok(parse_curl_to_request(data))
        return error('Unknown import type. Use "postman" or "curl".', 400)
    except Exception as err:
        return error(err, 400)
