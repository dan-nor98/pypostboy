"""Coverage for the local Django password hasher compatibility layer."""

import hashlib

import pytest

from django.contrib.auth.hashers import (
    check_password,
    is_password_usable,
    make_password,
)


def test_make_password_round_trip_without_werkzeug_dependency():
    encoded = make_password("password123")

    assert encoded.startswith("pbkdf2_sha256$")
    assert check_password("password123", encoded) is True
    assert check_password("wrong-password", encoded) is False


def test_make_password_supports_django_compatible_arguments():
    encoded = make_password("", salt="fixedsalt", hasher="pbkdf2_sha256")

    assert encoded.startswith("pbkdf2_sha256$720000$fixedsalt$")
    assert check_password("", encoded) is True


def test_make_password_rejects_unsupported_hashers():
    with pytest.raises(ValueError, match="Unsupported password hasher"):
        make_password("password123", hasher="argon2")


def test_none_passwords_are_unusable():
    encoded = make_password(None)

    assert encoded.startswith("!")
    assert is_password_usable(encoded) is False
    assert check_password("password123", encoded) is False


def test_check_password_accepts_legacy_werkzeug_scrypt_hashes():
    password = "password123"
    salt = "legacy-salt"
    digest = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt.encode("utf-8"),
        n=32768,
        r=8,
        p=1,
        maxmem=128 * 1024 * 1024,
    ).hex()
    encoded = f"scrypt:32768:8:1${salt}${digest}"

    assert check_password(password, encoded) is True


def test_check_password_setter_runs_for_legacy_hashes():
    upgraded = []
    password = "password123"
    salt = "legacy-salt"
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        260000,
    ).hex()
    encoded = f"pbkdf2:sha256:260000${salt}${digest}"

    assert check_password(password, encoded, setter=upgraded.append) is True
    assert upgraded == [password]
