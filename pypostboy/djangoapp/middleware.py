"""Django middleware for request context, API auth, and shared headers."""

from pypostboy.auth import AuthenticationError, get_current_user
from pypostboy.djangoapp.context import reset_current_request, set_current_request
from pypostboy.http.responses import error


class PostBoyMiddleware:
    """Bind request context, enforce API identity, and set shared headers."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        token = set_current_request(request)
        try:
            if request.path.startswith('/api/'):
                try:
                    get_current_user()
                except AuthenticationError as err:
                    response = error(err, 401)
                else:
                    response = self.get_response(request)
            else:
                response = self.get_response(request)
        finally:
            reset_current_request(token)

        response.headers.pop('Content-Security-Policy', None)
        response.headers.pop('X-Content-Security-Policy', None)
        response.headers.pop('X-WebKit-CSP', None)
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
        return response
