"""Authentication helpers for resolving the current PostBoy user."""

from django.conf import settings
from django.core import signing

from pypostboy.db.connection import get_connection
from pypostboy.db.migrations import ensure_default_local_user
from pypostboy.djangoapp.context import get_current_request

API_TOKEN_SALT = 'pypostboy.api-token'
API_TOKEN_TYPE = 'api'
API_TOKEN_DEFAULT_MAX_AGE_SECONDS = 15 * 60


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


def api_token_max_age_seconds():
    """Return the configured short-lived API token lifetime in seconds."""
    return int(
        getattr(
            settings,
            'POSTBOY_API_TOKEN_MAX_AGE_SECONDS',
            API_TOKEN_DEFAULT_MAX_AGE_SECONDS,
        )
    )


def issue_api_token(user_id):
    """Issue a short-lived signed bearer token for non-browser API clients."""
    return signing.dumps(
        {'type': API_TOKEN_TYPE, 'user_id': int(user_id)},
        salt=API_TOKEN_SALT,
    )


def resolve_api_token(token, max_age=None):
    """Return the authenticated user id from a bearer token or raise an auth error."""
    if not token:
        raise AuthenticationError('Authentication required')
    try:
        payload = signing.loads(
            token,
            salt=API_TOKEN_SALT,
            max_age=api_token_max_age_seconds() if max_age is None else max_age,
        )
    except signing.SignatureExpired as exc:
        raise AuthenticationError('API token expired') from exc
    except signing.BadSignature as exc:
        raise AuthenticationError('Invalid API token') from exc

    if not isinstance(payload, dict) or payload.get('type') != API_TOKEN_TYPE:
        raise AuthenticationError('Invalid API token')

    user_id = payload.get('user_id')
    if _user_from_id(user_id) is None:
        raise AuthenticationError('Invalid API token')
    return user_id


def request_has_bearer_token(request):
    """Return True when the request carries a bearer token credential."""
    return _bearer_token_from_request(request) is not None


def _bearer_token_from_request(request):
    auth_header = request.headers.get('Authorization', '')
    scheme, separator, token = auth_header.partition(' ')
    if not separator or scheme.lower() != 'bearer' or not token.strip():
        return None
    return token.strip()


def _request_identity(request):
    """Resolve a trusted identity from a Django session or API bearer token."""
    if getattr(request, 'user', None) is not None and request.user.is_authenticated:
        return 'session', '_auth_user_id', request.user.id

    bearer_token = _bearer_token_from_request(request)
    if bearer_token is not None:
        return 'token', 'Authorization', resolve_api_token(bearer_token)

    return None, None, None


def _request_user_id(request):
    """Resolve an explicitly supplied user ID from session or bearer token."""
    _source, _name, value = _request_identity(request)
    return value


def get_current_user(request=None):
    """Return the current user from request state, falling back to local user.

    Browser clients identify a user only through Django's signed-cookie session.
    Non-browser clients may use short-lived signed bearer tokens. Unsigned legacy
    user-id headers and identity cookies are intentionally ignored.
    """
    request = request or get_current_request()
    if request is None:
        explicit_user_id = None
    else:
        cached = getattr(request, 'current_user', None)
        if cached is not None:
            return cached
        _identity_source, _identity_name, explicit_user_id = _request_identity(request)

    if explicit_user_id is None:
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
