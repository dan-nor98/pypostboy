"""Request dispatch for the local Django-compatible runtime."""

import importlib
from http.cookies import SimpleCookie

from django.conf import settings
from django.http import Http404, HttpResponse


class SessionStore(dict):
    modified = False


class Request:
    def __init__(self, path='/', method='GET', body=b'', headers=None, cookies=None, session=None):
        self.path = path
        self.method = method.upper()
        self.body = body or b''
        self.encoding = 'utf-8'
        self.headers = headers or {}
        self.COOKIES = cookies or {}
        self.session = session if session is not None else SessionStore()
        self.META = {}
        for key, value in self.headers.items():
            meta_name = 'HTTP_' + key.upper().replace('-', '_')
            self.META[meta_name] = value


class WSGIApplication:
    def __init__(self):
        self.urlconf = importlib.import_module(settings.ROOT_URLCONF)
        get_response = self._dispatch
        for dotted in reversed(getattr(settings, 'MIDDLEWARE', [])):
            middleware = import_string(dotted)
            get_response = middleware(get_response)
        self.get_response = get_response

    def _dispatch(self, request):
        for pattern in self.urlconf.urlpatterns:
            kwargs = pattern.match(request.path)
            if kwargs is not None:
                try:
                    return pattern.view(request, **kwargs)
                except Http404:
                    return HttpResponse(b'Not Found', status=404, content_type='text/plain')
        return HttpResponse(b'Not Found', status=404, content_type='text/plain')

    def handle(self, request):
        return self.get_response(request)

    def __call__(self, environ, start_response):
        path = environ.get('PATH_INFO') or '/'
        method = environ.get('REQUEST_METHOD') or 'GET'
        length = int(environ.get('CONTENT_LENGTH') or 0)
        body = environ['wsgi.input'].read(length) if length else b''
        headers = {}
        for key, value in environ.items():
            if key.startswith('HTTP_'):
                headers[key[5:].replace('_', '-').title()] = value
        cookies = {}
        if environ.get('HTTP_COOKIE'):
            cookie = SimpleCookie(environ['HTTP_COOKIE'])
            cookies = {k: morsel.value for k, morsel in cookie.items()}
        request = Request(path=path, method=method, body=body, headers=headers, cookies=cookies)
        response = self.handle(request)
        status = f'{response.status_code} OK'
        start_response(status, list(response.headers.items()))
        return [response.content]


def import_string(dotted_path):
    module_path, class_name = dotted_path.rsplit('.', 1)
    return getattr(importlib.import_module(module_path), class_name)
