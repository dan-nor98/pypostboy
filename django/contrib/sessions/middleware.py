"""Signed-cookie session middleware shim."""


class SessionMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not hasattr(request, 'session') or request.session is None:
            request.session = {}
        return self.get_response(request)
