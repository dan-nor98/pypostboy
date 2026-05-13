"""Password hasher compatibility backed by Werkzeug."""

from werkzeug.security import check_password_hash, generate_password_hash


def make_password(password):
    return generate_password_hash(password)


def check_password(password, encoded):
    return check_password_hash(encoded, password)
