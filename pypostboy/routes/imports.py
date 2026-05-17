"""Import API views."""

import logging

from django.views.decorators.csrf import csrf_exempt

from pypostboy.auth import require_current_user
from pypostboy.djangoapp.request import BadJsonBody, json_body
from pypostboy.http.responses import error, ok
from pypostboy.services.curl_parser import CurlParseError, parse_curl_to_request
from pypostboy.services.import_service import import_postman_to_db


logger = logging.getLogger(__name__)


def _log_user_id(request):
    current_user = getattr(request, 'current_user', None)
    if isinstance(current_user, dict):
        return current_user.get('id')
    return None


@csrf_exempt
def import_data(request):
    """Import Postman collection or cURL command."""
    import_type = None
    try:
        body = json_body(request, allow_blank=False)
        data = body.get('data')
        import_type = body.get('type')

        if not data:
            return error('No data provided', 400)

        if import_type == 'postman':
            return ok(import_postman_to_db(data, require_current_user(request)['id']))
        if import_type == 'curl':
            return ok(parse_curl_to_request(data))
        return error('Unknown import type. Use "postman" or "curl".', 400)
    except BadJsonBody:
        return error('Invalid JSON request body', 400)
    except CurlParseError as err:
        return error(err, 400, errors=err.errors, warnings=err.warnings)
    except Exception as err:
        logger.exception(
            'import_data failed: user_id=%s, import_type=%s',
            _log_user_id(request),
            import_type,
        )
        return error(err, 400)
