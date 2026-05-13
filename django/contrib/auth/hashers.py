"""Password hasher compatibility with no optional third-party dependency.

The real Django package provides these helpers when it is installed. The local
fallback runtime only needs the small ``make_password``/``check_password`` API
surface used by PostBoy, so it stores new passwords in Django's PBKDF2-SHA256
format and verifies the Werkzeug formats that older PostBoy databases may
already contain.
"""

import base64
import hashlib
import hmac
import secrets

PBKDF2_ALGORITHM = 'pbkdf2_sha256'
PBKDF2_ITERATIONS = 720000


def _pbkdf2(password, salt, iterations):
    digest = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        int(iterations),
    )
    return base64.b64encode(digest).decode('ascii').strip()


def make_password(password):
    """Return a Django-compatible PBKDF2-SHA256 password hash."""
    salt = secrets.token_urlsafe(12)
    encoded = _pbkdf2(password, salt, PBKDF2_ITERATIONS)
    return f'{PBKDF2_ALGORITHM}${PBKDF2_ITERATIONS}${salt}${encoded}'


def _check_django_pbkdf2(password, encoded):
    algorithm, iterations, salt, digest = encoded.split('$', 3)
    if algorithm != PBKDF2_ALGORITHM:
        return False
    candidate = _pbkdf2(password, salt, iterations)
    return hmac.compare_digest(candidate, digest)


def _check_werkzeug_pbkdf2(password, encoded):
    method, salt, digest = encoded.split('$', 2)
    parts = method.split(':')
    if len(parts) != 3 or parts[:2] != ['pbkdf2', 'sha256']:
        return False
    candidate = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        int(parts[2]),
    ).hex()
    return hmac.compare_digest(candidate, digest)


def _check_werkzeug_scrypt(password, encoded):
    method, salt, digest = encoded.split('$', 2)
    parts = method.split(':')
    if len(parts) != 4 or parts[0] != 'scrypt':
        return False
    candidate = hashlib.scrypt(
        password.encode('utf-8'),
        salt=salt.encode('utf-8'),
        n=int(parts[1]),
        r=int(parts[2]),
        p=int(parts[3]),
        maxmem=128 * 1024 * 1024,
    ).hex()
    return hmac.compare_digest(candidate, digest)


def check_password(password, encoded):
    """Return whether ``password`` matches a supported encoded hash."""
    if not password or not encoded:
        return False
    try:
        if encoded.startswith(f'{PBKDF2_ALGORITHM}$'):
            return _check_django_pbkdf2(password, encoded)
        if encoded.startswith('pbkdf2:sha256:'):
            return _check_werkzeug_pbkdf2(password, encoded)
        if encoded.startswith('scrypt:'):
            return _check_werkzeug_scrypt(password, encoded)
    except (TypeError, ValueError, OverflowError):
        return False
    return False
