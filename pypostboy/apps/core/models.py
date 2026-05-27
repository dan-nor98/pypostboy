from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, UserManager
from django.db import models


class User(AbstractBaseUser, PermissionsMixin):
    username = models.TextField(unique=True)
    email = models.TextField(unique=True, null=True)
    # Map Django password field to existing users.password_hash column.
    password = models.TextField(db_column='password_hash', null=True)
    auth_provider = models.TextField(default='local')
    auth_subject = models.TextField(null=True)
    recovery_key_hash = models.TextField(null=True)
    recovery_key_created_at = models.TextField(null=True)
    recovery_key_rotated_at = models.TextField(null=True)
    created_at = models.TextField()
    updated_at = models.TextField()

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        db_table = 'users'
        managed = False


class Collection(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    name = models.TextField()
    description = models.TextField(default='')
    parent = models.ForeignKey('self', null=True, on_delete=models.CASCADE, db_column='parent_id')
    sort_order = models.IntegerField(default=0)
    created_at = models.TextField()
    updated_at = models.TextField()

    class Meta:
        db_table = 'collections'
        managed = False


class Request(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    collection = models.ForeignKey(Collection, on_delete=models.CASCADE, db_column='collection_id')
    name = models.TextField()
    method = models.TextField(default='GET')
    url = models.TextField(default='')
    headers = models.TextField(default='[]')
    body_type = models.TextField(default='none')
    body_content = models.TextField(default='')
    body_raw_type = models.TextField(default='application/json')
    form_data = models.TextField(default='[]')
    auth_type = models.TextField(default='none')
    auth_data = models.TextField(default='{}')
    sort_order = models.IntegerField(default=0)
    created_at = models.TextField()
    updated_at = models.TextField()

    class Meta:
        db_table = 'requests'
        managed = False


class RequestInstance(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    request = models.ForeignKey(Request, on_delete=models.CASCADE, db_column='request_id')
    name = models.TextField()
    method = models.TextField(default='GET')
    url = models.TextField(default='')
    headers = models.TextField(default='[]')
    body_type = models.TextField(default='none')
    body_content = models.TextField(default='')
    body_raw_type = models.TextField(default='application/json')
    form_data = models.TextField(default='[]')
    auth_type = models.TextField(default='none')
    auth_data = models.TextField(default='{}')
    response_status = models.IntegerField(null=True)
    response_status_text = models.TextField(default='')
    response_headers = models.TextField(default='{}')
    response_body = models.TextField(null=True)
    response_time_ms = models.IntegerField(null=True)
    response_size = models.TextField(default='')
    created_at = models.TextField()
    updated_at = models.TextField()

    class Meta:
        db_table = 'request_instances'
        managed = False
