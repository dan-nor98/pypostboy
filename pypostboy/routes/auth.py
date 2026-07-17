"""Authentication API views for PostBoy."""
from django.contrib.auth import login as django_login, logout as django_logout
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt

from pypostboy.auth import AuthenticationError, api_token_max_age_seconds, get_current_user, issue_api_token
from pypostboy.djangoapp.request import BadJsonBody, json_body
from pypostboy.http.responses import created, error, ok
from pypostboy.services import auth_service

RECOVERY_REQUEST_RESPONSE = {
    "recovery_requested": True,
    "message": (
        "If the account exists, recovery instructions have been prepared. "
        "PyPostBoy is local-first and does not send email unless a notification adapter is configured."
    ),
}
AUTH_BACKEND = "pypostboy.djangoapp.auth_backend.PostBoyAuthBackend"


def _remote_addr(request):
    return request.META.get("REMOTE_ADDR")


def _service_error_response(exc):
    return error(exc.message, exc.status_code)


def _payload_or_error(request):
    try:
        return json_body(request, allow_blank=False), None
    except BadJsonBody:
        return None, error("Invalid JSON request body", 400)


def current_user(request):
    """Return the current session/header/cookie resolved user."""
    try:
        return ok(auth_service.public_user(get_current_user(request)))
    except AuthenticationError as err:
        return error(err, 401)


@ensure_csrf_cookie
def csrf_token(request):
    """Set and return CSRF token for SPA bootstrapping."""
    return ok({"csrf_token": get_token(request)})


def login(request):
    """Start a session for a username/password user."""
    payload, response = _payload_or_error(request)
    if response:
        return response
    try:
        user = auth_service.authenticate_with_rate_limit(payload, _remote_addr(request), request=request)
    except auth_service.AuthServiceError as exc:
        return _service_error_response(exc)

    django_login(request, user, backend=AUTH_BACKEND)
    request.current_user = auth_service.user_to_mapping(user)
    return ok(auth_service.public_user(user))


def register(request):
    """Create a local username/password user and start a session."""
    payload, response = _payload_or_error(request)
    if response:
        return response
    try:
        registration = auth_service.register_user(payload)
        user = auth_service.authenticate_with_rate_limit(
            {"username": registration.user.username, "password": payload.get("password") or ""},
            _remote_addr(request),
            request=request,
        )
    except auth_service.AuthServiceError as exc:
        return _service_error_response(exc)

    django_login(request, user, backend=AUTH_BACKEND)
    request.current_user = auth_service.user_to_mapping(registration.user)
    return created({
        "user": auth_service.public_user(registration.user),
        "recovery_key": registration.recovery_key,
    })


def recover_request(request):
    """Initiate forgot-password recovery without revealing account existence."""
    payload, response = _payload_or_error(request)
    if response:
        return response
    auth_service.request_recovery(payload)
    return ok(RECOVERY_REQUEST_RESPONSE)


def recover_verify(request):
    payload, response = _payload_or_error(request)
    if response:
        return response
    try:
        auth_service.verify_recovery(payload, _remote_addr(request))
    except auth_service.AuthServiceError as exc:
        return _service_error_response(exc)
    return ok({"valid": True})


def recover_reset(request):
    payload, response = _payload_or_error(request)
    if response:
        return response
    try:
        new_recovery_key = auth_service.reset_password_with_recovery(payload, _remote_addr(request))
    except auth_service.AuthServiceError as exc:
        return _service_error_response(exc)

    if hasattr(request, "current_user"):
        delattr(request, "current_user")
    return ok({"password_reset": True, "recovery_key": new_recovery_key})


@csrf_exempt
def token(request):
    """Issue a short-lived bearer token for non-browser API clients."""
    if request.method != "POST":
        return error("Method not allowed", 405)
    payload, response = _payload_or_error(request)
    if response:
        return response
    try:
        user = auth_service.authenticate_with_rate_limit(payload, _remote_addr(request), request=request)
    except auth_service.AuthServiceError as exc:
        return _service_error_response(exc)

    return ok({
        "token": issue_api_token(user.id),
        "token_type": "Bearer",
        "expires_in": api_token_max_age_seconds(),
    })


def logout(request):
    """Clear the current browser session."""
    django_logout(request)
    if hasattr(request, "current_user"):
        delattr(request, "current_user")
    return ok(auth_service.public_user(get_current_user(request)))
