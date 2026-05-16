"""Signed-cookie session middleware shim."""

import base64
import hashlib
import hmac
import json
from django.conf import settings

_COOKIE_SALT = b'django.contrib.sessions.middleware.SessionMiddleware'


def _session_cookie_name():
    return getattr(settings, 'SESSION_COOKIE_NAME', 'sessionid')


def _session_cookie_samesite():
    return getattr(settings, 'SESSION_COOKIE_SAMESITE', 'Lax')


def _sign(value):
    secret = str(settings.SECRET_KEY).encode('utf-8')
    return hmac.new(secret + _COOKIE_SALT, value.encode('utf-8'), hashlib.sha256).hexdigest()


def _encode_session(session):
    payload = json.dumps(dict(session), separators=(',', ':'), sort_keys=True).encode('utf-8')
    value = base64.urlsafe_b64encode(payload).decode('ascii').rstrip('=')
    return f'{value}.{_sign(value)}'


def _decode_session(value):
    if not value or '.' not in value:
        return {}
    payload, signature = value.rsplit('.', 1)
    if not hmac.compare_digest(signature, _sign(payload)):
        return {}
    padding = '=' * (-len(payload) % 4)
    try:
        decoded = base64.urlsafe_b64decode((payload + padding).encode('ascii'))
        data = json.loads(decoded.decode('utf-8'))
    except (ValueError, TypeError, json.JSONDecodeError):
        return {}
    return data if isinstance(data, dict) else {}


def load_session(cookies):
    """Return a session store hydrated from a signed session cookie."""
    from django.core.handlers import SessionStore

    session = SessionStore(_decode_session((cookies or {}).get(_session_cookie_name())))
    session.modified = False
    return session


def save_session(response, session):
    """Persist a modified session store on the response as a signed cookie."""
    if not getattr(session, 'modified', False):
        return response

    name = _session_cookie_name()
    samesite = _session_cookie_samesite()
    path = getattr(settings, 'SESSION_COOKIE_PATH', '/')
    secure = getattr(settings, 'SESSION_COOKIE_SECURE', False)
    if session:
        response.set_cookie(
            name,
            _encode_session(session),
            path=path,
            httponly=True,
            samesite=samesite,
            secure=secure,
        )
    else:
        response.set_cookie(
            name,
            '',
            max_age=0,
            expires='Thu, 01 Jan 1970 00:00:00 GMT',
            path=path,
            httponly=True,
            samesite=samesite,
            secure=secure,
        )

    return response


class SessionMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        cookies = getattr(request, 'COOKIES', {})
        session_cookie = cookies.get(_session_cookie_name())
        if (
            not hasattr(request, 'session')
            or request.session is None
            or (session_cookie and not request.session)
        ):
            request.session = load_session(cookies)
        response = self.get_response(request)
        return save_session(response, request.session)
