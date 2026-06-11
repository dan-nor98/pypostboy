"""CSRF helpers for browser sessions and non-browser API token clients."""

from pypostboy.auth import request_has_bearer_token


class PostBoyTokenCsrfExemptMiddleware:
    """Skip CSRF checks only for requests that use API bearer tokens.

    Browser clients continue to use Django sessions and CSRF tokens. Non-browser
    clients authenticate with short-lived bearer tokens instead of cookies, so
    CSRF protection does not apply to those requests.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith('/api/') and request_has_bearer_token(request):
            request._dont_enforce_csrf_checks = True
        return self.get_response(request)
