"""Django authentication backend backed by PostBoy's users table."""

from dataclasses import dataclass

from django.contrib.auth.backends import BaseBackend
from django.contrib.auth.hashers import check_password

from pypostboy.db.adapter import row_to_mapping
from pypostboy.db.connection import get_connection


@dataclass
class PostBoyAuthUser:
    id: int
    username: str
    email: str | None
    auth_provider: str | None = None
    is_active: bool = True

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    @property
    def is_staff(self):
        return False

    @property
    def is_superuser(self):
        return False

    def get_username(self):
        return self.username

    def get_session_auth_hash(self):
        return ""


class PostBoyAuthBackend(BaseBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        if not username or not password:
            return None
        row = get_connection().execute(
            "SELECT * FROM users WHERE username = ?",
            (username,),
        ).fetchone()
        if not row or not row["password_hash"] or not check_password(password, row["password_hash"]):
            return None
        return self._to_user(row)

    def get_user(self, user_id):
        row = get_connection().execute(
            "SELECT * FROM users WHERE id = ?",
            (int(user_id),),
        ).fetchone()
        if not row:
            return None
        return self._to_user(row)

    @staticmethod
    def _to_user(row):
        data = row_to_mapping(row)
        return PostBoyAuthUser(
            id=data["id"],
            username=data["username"],
            email=data.get("email"),
            auth_provider=data.get("auth_provider"),
        )
