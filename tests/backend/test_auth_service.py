"""Focused authentication service tests."""
import pytest
from django.contrib.auth.hashers import check_password

from pypostboy.apps.core.models import User
from pypostboy.services import auth_service


def test_normalize_credentials_trims_username_and_optional_email():
    username, password, email = auth_service.normalize_credentials({
        "username": "  service-user  ",
        "password": " password with spaces ",
        "email": " service@example.test ",
    })

    assert username == "service-user"
    assert password == " password with spaces "
    assert email == "service@example.test"


def test_normalize_auth_identity_prefers_explicit_identity():
    identity, password = auth_service.normalize_auth_identity({
        "identity": " preferred@example.test ",
        "username": "fallback-user",
        "email": "fallback@example.test",
        "password": "password123",
    })

    assert identity == "preferred@example.test"
    assert password == "password123"


@pytest.mark.parametrize(
    ("password", "expected"),
    [("password", True), ("1234567", False), ("", False), (None, False)],
)
def test_validate_password_policy_enforces_minimum_length(password, expected):
    assert auth_service.validate_password_policy(password) is expected


def test_register_user_creates_local_user_with_hashed_credentials(app):
    registration = auth_service.register_user({
        "username": "service-register-user",
        "email": "service-register-user@example.test",
        "password": "password123",
    })

    user = User.objects.get(username="service-register-user")
    assert registration.user.id == user.id
    assert registration.recovery_key
    assert user.email == "service-register-user@example.test"
    assert user.password != "password123"
    assert check_password("password123", user.password)
    assert check_password(registration.recovery_key, user.recovery_key_hash)


def test_register_user_rejects_conflicting_username(app):
    auth_service.register_user({"username": "conflict-service-user", "password": "password123"})

    with pytest.raises(auth_service.RegistrationConflictError):
        auth_service.register_user({"username": "conflict-service-user", "password": "password456"})


def test_authenticate_with_rate_limit_records_and_clears_failures(app):
    auth_service.register_user({"username": "service-login-user", "password": "password123"})
    remote_addr = "203.0.113.10"

    with pytest.raises(auth_service.InvalidCredentialsError):
        auth_service.authenticate_with_rate_limit(
            {"username": "service-login-user", "password": "wrong"},
            remote_addr,
        )

    key = auth_service.auth_rate_limit_key(remote_addr, "service-login-user")
    assert auth_service.cache.get(key) == 1

    user = auth_service.authenticate_with_rate_limit(
        {"username": "service-login-user", "password": "password123"},
        remote_addr,
    )

    assert user.username == "service-login-user"
    assert auth_service.cache.get(key) is None


def test_verify_recovery_rehashes_legacy_key(app):
    registration = auth_service.register_user({"username": "service-legacy-recovery", "password": "password123"})
    user = User.objects.get(username="service-legacy-recovery")
    legacy_hash = auth_service._legacy_recovery_key_hash(registration.recovery_key)
    user.recovery_key_hash = legacy_hash
    user.save(update_fields=["recovery_key_hash"])

    verified = auth_service.verify_recovery(
        {"username": "service-legacy-recovery", "recovery_key": registration.recovery_key},
        "203.0.113.11",
    )
    verified.refresh_from_db()

    assert verified.id == user.id
    assert verified.recovery_key_hash != legacy_hash
    assert check_password(registration.recovery_key, verified.recovery_key_hash)


def test_reset_password_with_recovery_rotates_key_and_updates_password(app):
    registration = auth_service.register_user({"username": "service-reset-user", "password": "password123"})

    new_recovery_key = auth_service.reset_password_with_recovery(
        {
            "username": "service-reset-user",
            "recovery_key": registration.recovery_key,
            "new_password": "newpassword123",
        },
        "203.0.113.12",
    )

    user = User.objects.get(username="service-reset-user")
    assert new_recovery_key != registration.recovery_key
    assert check_password("newpassword123", user.password)
    assert check_password(new_recovery_key, user.recovery_key_hash)
    assert not auth_service.constant_time_recovery_match(registration.recovery_key, user.recovery_key_hash)
