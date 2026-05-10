"""Authentication helpers for resolving the current PostBoy user."""

from flask import g, request, session

from pypostboy.db.connection import get_connection
from pypostboy.db.migrations import ensure_default_local_user

USER_ID_HEADER_NAMES = ('X-Postboy-User-Id', 'X-User-Id')
USER_ID_COOKIE_NAMES = ('postboy_user_id', 'user_id')


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



def _request_user_id():
    """Resolve an explicitly supplied user ID from headers, session, or cookies."""
    for header_name in USER_ID_HEADER_NAMES:
        value = request.headers.get(header_name)
        if value:
            return value

    value = session.get('user_id')
    if value:
        return value

    for cookie_name in USER_ID_COOKIE_NAMES:
        value = request.cookies.get(cookie_name)
        if value:
            return value

    return None



def get_current_user():
    """Return the current user from request state, falling back to local user.

    API clients can identify a user through ``X-Postboy-User-Id``/``X-User-Id``,
    Flask session ``user_id``, or ``postboy_user_id``/``user_id`` cookies. When
    no explicit identity is supplied, the default local user is returned to keep
    single-user/local installations and legacy tests working.
    """
    cached = getattr(g, 'current_user', None)
    if cached is not None:
        return cached

    explicit_user_id = _request_user_id()
    if explicit_user_id is None:
        explicit_user_id = ensure_default_local_user(_conn().cursor())
        _conn().commit()

    user = _user_from_id(explicit_user_id)
    g.current_user = dict(user) if user else None
    return g.current_user



def require_current_user():
    """Return the current user or raise when request identity is invalid."""
    user = get_current_user()
    if not user:
        raise AuthenticationError('Authentication required')
    return user
