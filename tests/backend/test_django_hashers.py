"""Coverage for site-packages Django password hashing."""

import base64
import hashlib

import pytest

from django.contrib.auth.hashers import (
    check_password,
    is_password_usable,
    make_password,
)


def test_make_password_round_trip_with_site_packages_django():
    encoded = make_password("password123")

    assert encoded.startswith("pbkdf2_sha256$")
    assert check_password("password123", encoded) is True
    assert check_password("wrong-password", encoded) is False


def test_make_password_supports_django_compatible_arguments():
    encoded = make_password("", salt="fixedsalt", hasher="pbkdf2_sha256")

    assert encoded.startswith("pbkdf2_sha256$720000$fixedsalt$")
    assert check_password("", encoded) is True


def test_make_password_rejects_unknown_hashers():
    with pytest.raises(ValueError, match="Unknown password hashing algorithm"):
        make_password("password123", hasher="not-a-hasher")


def test_none_passwords_are_unusable():
    encoded = make_password(None)

    assert encoded.startswith("!")
    assert is_password_usable(encoded) is False
    assert check_password("password123", encoded) is False


def test_check_password_accepts_older_django_pbkdf2_hashes():
    password = "password123"
    salt = "legacy-salt"
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        260000,
    )
    encoded = f"pbkdf2_sha256$260000${salt}${base64.b64encode(digest).decode('ascii').strip()}"

    assert check_password(password, encoded) is True


def test_check_password_setter_runs_for_older_django_hashes():
    upgraded = []
    password = "password123"
    salt = "legacy-salt"
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        260000,
    )
    encoded = f"pbkdf2_sha256$260000${salt}${base64.b64encode(digest).decode('ascii').strip()}"

    assert check_password(password, encoded, setter=upgraded.append) is True
    assert upgraded == [password]
