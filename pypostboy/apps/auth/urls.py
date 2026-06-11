"""URL routes for auth API domain."""

from django.urls import path

from pypostboy.routes import auth

urlpatterns = [
    path('me', auth.current_user),
    path('csrf', auth.csrf_token),
    path('login', auth.login),
    path('register', auth.register),
    path('token', auth.token),
    path('recover/verify', auth.recover_verify),
    path('recover/reset', auth.recover_reset),
    path('logout', auth.logout),
]
