"""Password hasher compatibility with no optional third-party dependency.

The real Django package provides these helpers when it is installed. The local
fallback runtime only needs the password APIs used by PostBoy, so it stores new
passwords in Django's PBKDF2-SHA256 format and verifies both Django hashes and
Werkzeug hashes created by older PostBoy releases.
"""

import base64
import hashlib
import hmac
import secrets
import string

PBKDF2_ALGORITHM = 'pbkdf2_sha256'
PBKDF2_ITERATIONS = 720000
RANDOM_STRING_CHARS = string.ascii_letters + string.digits
UNUSABLE_PASSWORD_PREFIX = '!'
UNUSABLE_PASSWORD_SUFFIX_LENGTH = 40
WERKZEUG_SCRYPT_MAXMEM = 128 * 1024 * 1024


def get_random_string(length, allowed_chars=RANDOM_STRING_CHARS):
    """Return a securely generated random string."""
    return ''.join(secrets.choice(allowed_chars) for _ in range(length))


def _pbkdf2(password, salt, iterations):
    digest = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        int(iterations),
    )
    return base64.b64encode(digest).decode('ascii').strip()


def make_password(password, salt=None, hasher='default'):
    """Return a Django-compatible PBKDF2-SHA256 password hash.

    ``salt`` and ``hasher`` are accepted for source compatibility with Django's
    public API. This lightweight fallback supports Django's default PBKDF2-SHA256
    hasher only; ``None`` passwords are encoded as unusable passwords.
    """
    if password is None:
        return UNUSABLE_PASSWORD_PREFIX + get_random_string(UNUSABLE_PASSWORD_SUFFIX_LENGTH)
    if hasher not in ('default', PBKDF2_ALGORITHM):
        raise ValueError(f'Unsupported password hasher: {hasher}')
    salt = salt or get_random_string(22)
    encoded = _pbkdf2(password, salt, PBKDF2_ITERATIONS)
    return f'{PBKDF2_ALGORITHM}${PBKDF2_ITERATIONS}${salt}${encoded}'


def is_password_usable(encoded):
    """Return whether an encoded password can be checked."""
    return encoded is not None and not str(encoded).startswith(UNUSABLE_PASSWORD_PREFIX)


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
        maxmem=WERKZEUG_SCRYPT_MAXMEM,
    ).hex()
    return hmac.compare_digest(candidate, digest)


def _needs_update(encoded, preferred):
    """Return whether a verified password should be rewritten."""
    if preferred not in ('default', PBKDF2_ALGORITHM):
        return False
    if not encoded.startswith(f'{PBKDF2_ALGORITHM}$'):
        return True
    try:
        _algorithm, iterations, _salt, _digest = encoded.split('$', 3)
        return int(iterations) < PBKDF2_ITERATIONS
    except (TypeError, ValueError):
        return True


def check_password(password, encoded, setter=None, preferred='default'):
    """Return whether ``password`` matches a supported encoded hash.

    The optional ``setter`` and ``preferred`` parameters mirror Django's public
    API. When a legacy or low-iteration hash verifies successfully, ``setter`` is
    called so callers can persist an upgraded hash.
    """
    if password is None or not is_password_usable(encoded):
        return False

    verified = False
    try:
        if encoded.startswith(f'{PBKDF2_ALGORITHM}$'):
            verified = _check_django_pbkdf2(password, encoded)
        elif encoded.startswith('pbkdf2:sha256:'):
            verified = _check_werkzeug_pbkdf2(password, encoded)
        elif encoded.startswith('scrypt:'):
            verified = _check_werkzeug_scrypt(password, encoded)
    except (TypeError, ValueError, OverflowError):
        return False

    if verified and setter and _needs_update(encoded, preferred):
        setter(password)
    return verified
