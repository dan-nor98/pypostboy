"""Small test client for the local Django-compatible runtime."""

from pypostboy._compat.django_shim.core.handlers import Request, SessionStore
from pypostboy._compat.django_shim.core.wsgi import get_wsgi_application


class Client:
    def __init__(self):
        self.application = get_wsgi_application()
        self.session = SessionStore()
        self.cookies = {}

    def _request(self, method, path, data=None, content_type=None, **kwargs):
        headers = dict(kwargs.pop('headers', {}) or {})
        for key, value in list(kwargs.items()):
            if key.startswith('HTTP_'):
                headers[key[5:].replace('_', '-').title()] = value
        if isinstance(data, str):
            body = data.encode('utf-8')
        elif data is None:
            body = b''
        else:
            body = data
        if content_type:
            headers['Content-Type'] = content_type
        request = Request(
            path=path,
            method=method,
            body=body,
            headers=headers,
            cookies=self.cookies,
            session=self.session,
        )
        return self.application.handle(request)

    def get(self, path, **kwargs):
        return self._request('GET', path, **kwargs)

    def post(self, path, data=None, content_type=None, **kwargs):
        return self._request('POST', path, data=data, content_type=content_type, **kwargs)

    def put(self, path, data=None, content_type=None, **kwargs):
        return self._request('PUT', path, data=data, content_type=content_type, **kwargs)

    def delete(self, path, data=None, content_type=None, **kwargs):
        return self._request('DELETE', path, data=data, content_type=content_type, **kwargs)
