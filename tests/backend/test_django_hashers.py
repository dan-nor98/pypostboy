"""Coverage for the local Django password hasher compatibility layer."""

import hashlib

from django.contrib.auth.hashers import check_password, make_password


def test_make_password_round_trip_without_werkzeug_dependency():
    encoded = make_password("password123")

    assert encoded.startswith("pbkdf2_sha256$")
    assert check_password("password123", encoded) is True
    assert check_password("wrong-password", encoded) is False


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
