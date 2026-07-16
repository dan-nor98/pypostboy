"""Django authentication backend backed by PostBoy's users table."""

from django.contrib.auth.backends import BaseBackend
from django.contrib.auth.hashers import check_password
from django.db.models import Q

from pypostboy.apps.core.models import User


class PostBoyAuthBackend(BaseBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        identity = (kwargs.get("identity") or username or kwargs.get("email") or "").strip()
        if not identity or not password:
            return None
        try:
            user = User.objects.get(Q(username=identity) | Q(email=identity))
        except (User.DoesNotExist, User.MultipleObjectsReturned):
            return None
        if not user.password or not check_password(password, user.password):
            return None
        return user

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=int(user_id))
        except (TypeError, ValueError, User.DoesNotExist):
            return None
