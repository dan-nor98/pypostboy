"""Django middleware for request context, API auth, and shared headers."""

from pypostboy.auth import (
    AuthenticationError,
    clear_legacy_identity_cookies,
    get_current_user,
    legacy_identity_cookies_to_clear,
)
from pypostboy.db.connection import get_connection
from pypostboy.djangoapp.context import reset_current_request, set_current_request
from pypostboy.http.responses import error


def _rollback_database_transaction():
    """Best-effort cleanup for the shared application database connection."""
    connection = get_connection()
    rollback = getattr(connection, 'rollback', None)
    if rollback:
        rollback()


def _safe_rollback_database_transaction():
    """Rollback without masking the request error being handled."""
    try:
        _rollback_database_transaction()
    except Exception:
        pass


class PostBoyMiddleware:
    """Bind request context, enforce API identity, and set shared headers."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        is_api_request = request.path.startswith('/api/')
        token = set_current_request(request)
        try:
            if is_api_request:
                _safe_rollback_database_transaction()
                try:
                    get_current_user()
                except AuthenticationError as err:
                    response = error(err, 401)
                else:
                    response = self.get_response(request)
            else:
                response = self.get_response(request)
        except Exception:
            _safe_rollback_database_transaction()
            raise
        finally:
            reset_current_request(token)

        if is_api_request:
            _safe_rollback_database_transaction()

        clear_legacy_identity_cookies(
            response,
            legacy_identity_cookies_to_clear(request),
        )
        response.headers.pop('Content-Security-Policy', None)
        response.headers.pop('X-Content-Security-Policy', None)
        response.headers.pop('X-WebKit-CSP', None)
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
        return response
