"""Authentication helpers for resolving the current PostBoy user."""

from django.conf import settings
from django.core import signing

from pypostboy.apps.core.models import User
from pypostboy.db.migrations import DEFAULT_LOCAL_EMAIL, DEFAULT_LOCAL_USERNAME
from pypostboy.db.serializers import timestamp
from pypostboy.djangoapp.context import get_current_request

API_TOKEN_SALT = 'pypostboy.api-token'
API_TOKEN_TYPE = 'api'
API_TOKEN_DEFAULT_MAX_AGE_SECONDS = 15 * 60


class AuthenticationError(Exception):
    """Raised when a request cannot be associated with a valid user."""


def _user_to_mapping(user):
    """Return a user model as the dict shape expected by repository code."""
    if user is None:
        return None
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'password_hash': user.password,
        'auth_provider': user.auth_provider,
        'auth_subject': user.auth_subject,
        'recovery_key_hash': user.recovery_key_hash,
        'recovery_key_created_at': user.recovery_key_created_at,
        'recovery_key_rotated_at': user.recovery_key_rotated_at,
        'credentials_updated_at': user.credentials_updated_at,
        'created_at': user.created_at,
        'updated_at': user.updated_at,
        'last_login': user.last_login,
        'is_superuser': user.is_superuser,
        'is_staff': user.is_staff,
        'is_active': user.is_active,
    }


def _user_from_id(user_id):
    """Return a user model for an integer ID, or ``None`` when absent/invalid."""
    try:
        normalized_id = int(user_id)
    except (TypeError, ValueError):
        return None

    return User.objects.filter(pk=normalized_id).first()


def _default_local_user():
    """Return the default local user, creating it through Django's ORM if needed."""
    now = timestamp()
    user, _created = User.objects.get_or_create(
        username=DEFAULT_LOCAL_USERNAME,
        defaults={
            'email': DEFAULT_LOCAL_EMAIL,
            'password': None,
            'auth_provider': 'local',
            'auth_subject': None,
            'created_at': now,
            'updated_at': now,
            'credentials_updated_at': now,
        },
    )
    return user


def api_token_max_age_seconds():
    """Return the configured short-lived API token lifetime in seconds."""
    return int(
        getattr(
            settings,
            'POSTBOY_API_TOKEN_MAX_AGE_SECONDS',
            API_TOKEN_DEFAULT_MAX_AGE_SECONDS,
        )
    )


def _token_credentials_updated_at(user):
    """Return the credential freshness marker embedded in API tokens."""
    return user.credentials_updated_at or user.updated_at or ''


def issue_api_token(user_id):
    """Issue a short-lived signed bearer token for non-browser API clients."""
    user = _user_from_id(user_id)
    if user is None:
        raise AuthenticationError('Authentication required')
    return signing.dumps(
        {
            'type': API_TOKEN_TYPE,
            'user_id': int(user_id),
            'credentials_updated_at': _token_credentials_updated_at(user),
        },
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
    user = _user_from_id(user_id)
    if user is None:
        raise AuthenticationError('Invalid API token')
    if payload.get('credentials_updated_at') != _token_credentials_updated_at(user):
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


def get_authenticated_user(request=None):
    """Return the explicitly authenticated request user or raise.

    Unlike :func:`get_current_user`, this strict resolver never falls back to
    the default local user. Protected API routes should call this path so each
    request is backed by either an authenticated Django session or a valid
    bearer token.
    """
    request = request or get_current_request()
    if request is None:
        raise AuthenticationError('Authentication required')

    cached = getattr(request, 'current_user', None)
    if cached is not None:
        return cached

    _identity_source, _identity_name, explicit_user_id = _request_identity(request)
    if explicit_user_id is None:
        raise AuthenticationError('Authentication required')

    user = _user_from_id(explicit_user_id)
    if user is None:
        raise AuthenticationError('Authentication required')

    current_user = _user_to_mapping(user)
    request.current_user = current_user
    return current_user

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

    user = _default_local_user() if explicit_user_id is None else _user_from_id(explicit_user_id)
    current_user = _user_to_mapping(user) if user else None
    if request is not None:
        request.current_user = current_user
    return current_user


def require_current_user(request=None):
    """Return the explicitly authenticated user or raise."""
    return get_authenticated_user(request)
