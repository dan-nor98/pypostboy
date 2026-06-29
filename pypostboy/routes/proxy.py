"""Proxy API views."""

import logging

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from pypostboy.djangoapp.request import json_body
from pypostboy.services.proxy_service import ProxyError, proxy_http_request


logger = logging.getLogger(__name__)


def _log_user_id(request):
    current_user = getattr(request, 'current_user', None)
    if isinstance(current_user, dict):
        return current_user.get('id')
    return None


@csrf_exempt
def proxy_request(request):
    """Proxy an HTTP request."""
    try:
        return JsonResponse(proxy_http_request(json_body(request)))
    except ValueError as err:
        return JsonResponse({'error': str(err)}, status=400)
    except ProxyError as err:
        logger.exception('proxy_request failed: user_id=%s', _log_user_id(request))
        return JsonResponse(err.to_payload(), status=500)
