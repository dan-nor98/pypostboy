"""Authentication helpers for resolving the current PostBoy user."""

from pypostboy.db.connection import get_connection
from pypostboy.db.migrations import ensure_default_local_user
from pypostboy.djangoapp.context import get_current_request

USER_ID_HEADER_NAMES = ('HTTP_X_POSTBOY_USER_ID', 'HTTP_X_USER_ID')
USER_ID_COOKIE_NAMES = ('postboy_user_id', 'user_id')
INVALID_IDENTITY_COOKIES_ATTR = '_postboy_invalid_identity_cookies'


def _mark_invalid_identity_cookies(request):
    """Mark legacy identity cookies for deletion on the response."""
    invalid_cookies = set(getattr(request, INVALID_IDENTITY_COOKIES_ATTR, ()))
    invalid_cookies.update(USER_ID_COOKIE_NAMES)
    setattr(request, INVALID_IDENTITY_COOKIES_ATTR, invalid_cookies)


def legacy_identity_cookies_to_clear(request):
    """Return legacy identity cookies that should be cleared from the response."""
    return tuple(getattr(request, INVALID_IDENTITY_COOKIES_ATTR, ()))


def clear_legacy_identity_cookies(response, cookie_names=USER_ID_COOKIE_NAMES):
    """Expire legacy identity cookies that predate session-backed auth."""
    for cookie_name in cookie_names:
        response.delete_cookie(cookie_name)
    return response


class AuthenticationError(Exception):
    """Raised when a request cannot be associated with a valid user."""


def _conn():
    return get_connection()


def _user_from_id(user_id):
    """Return a user row for an integer ID, or ``None`` when absent/invalid."""
    try:
        normalized_id = int(user_id)
    except (TypeError, ValueError):
        return None

    return _conn().execute(
        "SELECT * FROM users WHERE id = ?",
        (normalized_id,)
    ).fetchone()


def _request_identity(request):
    """Resolve an explicitly supplied identity with its source metadata."""
    value = request.session.get('user_id')
    if value:
        return 'session', 'user_id', value

    for header_name in USER_ID_HEADER_NAMES:
        value = request.META.get(header_name)
        if value:
            return 'header', header_name, value

    for cookie_name in USER_ID_COOKIE_NAMES:
        value = request.COOKIES.get(cookie_name)
        if value:
            return 'cookie', cookie_name, value

    return None, None, None


def _request_user_id(request):
    """Resolve an explicitly supplied user ID from session, headers, or cookies."""
    _source, _name, value = _request_identity(request)
    return value


def get_current_user(request=None):
    """Return the current user from request state, falling back to local user.

    API clients can identify a user through ``X-Postboy-User-Id``/``X-User-Id``,
    Django signed-cookie session ``user_id``, or ``postboy_user_id``/``user_id``
    cookies. When no explicit identity is supplied, the default local user is
    returned to keep single-user/local installations and legacy tests working.
    """
    request = request or get_current_request()
    if request is None:
        explicit_user_id = None
        cached = None
    else:
        cached = getattr(request, 'current_user', None)
        if cached is not None:
            return cached
        identity_source, _identity_name, explicit_user_id = _request_identity(request)

    if explicit_user_id is None:
        explicit_user_id = ensure_default_local_user(_conn().cursor())
        _conn().commit()

    user = _user_from_id(explicit_user_id)
    if user is None and request is not None and identity_source == 'cookie':
        _mark_invalid_identity_cookies(request)
        explicit_user_id = ensure_default_local_user(_conn().cursor())
        _conn().commit()
        user = _user_from_id(explicit_user_id)

    current_user = dict(user) if user else None
    if request is not None:
        request.current_user = current_user
    return current_user


def require_current_user(request=None):
    """Return the current user or raise when request identity is invalid."""
    user = get_current_user(request)
    if not user:
        raise AuthenticationError('Authentication required')
    return user
