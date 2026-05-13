"""Proxy API views."""

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from pypostboy.djangoapp.request import json_body
from pypostboy.services.proxy_service import ProxyError, proxy_http_request


@csrf_exempt
def proxy_request(request):
    """Proxy an HTTP request."""
    try:
        return JsonResponse(proxy_http_request(json_body(request)))
    except ValueError as err:
        return JsonResponse({'error': str(err)}, status=400)
    except ProxyError as err:
        return JsonResponse(err.to_payload(), status=500)
