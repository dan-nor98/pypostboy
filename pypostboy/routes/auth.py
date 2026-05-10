"""Authentication API routes for PostBoy."""

from flask import Blueprint, g, request, session
from werkzeug.security import check_password_hash, generate_password_hash

from pypostboy.auth import get_current_user
from pypostboy.db.connection import get_connection
from pypostboy.db.migrations import DEFAULT_LOCAL_USERNAME
from pypostboy.db.serializers import timestamp
from pypostboy.http.responses import created, error, ok

bp = Blueprint('auth', __name__, url_prefix='/api/auth')


def _public_user(user):
    """Return a client-safe user representation."""
    if not user:
        return None
    return {
        'id': user['id'],
        'username': user['username'],
        'email': user['email'],
        'auth_provider': user['auth_provider'],
        'is_guest': user['username'] == DEFAULT_LOCAL_USERNAME and not user['password_hash'],
    }


def _normalize_credentials(payload):
    username = (payload.get('username') or '').strip()
    password = payload.get('password') or ''
    email = (payload.get('email') or '').strip() or None
    return username, password, email


@bp.get('/me')
def current_user():
    """Return the current session/header/cookie resolved user."""
    return ok(_public_user(get_current_user()))


@bp.post('/login')
def login():
    """Start a session for a username/password user."""
    username, password, _email = _normalize_credentials(
        request.get_json(silent=True) or {}
    )
    if not username or not password:
        return error('Username and password are required', 400)

    user = get_connection().execute(
        'SELECT * FROM users WHERE username = ?',
        (username,),
    ).fetchone()
    if (
        not user
        or not user['password_hash']
        or not check_password_hash(user['password_hash'], password)
    ):
        return error('Invalid username or password', 401)

    session['user_id'] = user['id']
    g.current_user = dict(user)
    session.permanent = True
    return ok(_public_user(user))


@bp.post('/register')
def register():
    """Create a local username/password user and start a session."""
    username, password, email = _normalize_credentials(
        request.get_json(silent=True) or {}
    )
    if not username or not password:
        return error('Username and password are required', 400)
    if len(password) < 8:
        return error('Password must be at least 8 characters', 400)

    conn = get_connection()
    existing = conn.execute(
        'SELECT id FROM users WHERE username = ? OR (? IS NOT NULL AND email = ?)',
        (username, email, email),
    ).fetchone()
    if existing:
        return error('Username or email already exists', 409)

    now = timestamp()
    cursor = conn.execute(
        """INSERT INTO users (
            username, email, password_hash, auth_provider, auth_subject, created_at, updated_at
        ) VALUES (?, ?, ?, 'local', NULL, ?, ?)""",
        (username, email, generate_password_hash(password), now, now),
    )
    conn.commit()

    user = conn.execute(
        'SELECT * FROM users WHERE id = ?',
        (cursor.lastrowid,),
    ).fetchone()
    session['user_id'] = user['id']
    g.current_user = dict(user)
    session.permanent = True
    return created(_public_user(user))


@bp.post('/logout')
def logout():
    """Clear the current browser session."""
    session.pop('user_id', None)
    g.pop('current_user', None)
    return ok(_public_user(get_current_user()))
