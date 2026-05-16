"""Minimal HTTP classes compatible with the subset PostBoy uses."""

import json
from http.cookies import SimpleCookie


class Http404(Exception):
    pass


class HttpResponse:
    status_code = 200
    charset = 'utf-8'

    def __init__(self, content=b'', status=200, content_type='text/html; charset=utf-8', headers=None):
        if isinstance(content, str):
            content = content.encode(self.charset)
        self.content = content
        self.status_code = status
        self.headers = {'Content-Type': content_type}
        self.cookies = SimpleCookie()
        if headers:
            self.headers.update(headers)

    def __setitem__(self, key, value):
        self.headers[key] = value

    def __getitem__(self, key):
        return self.headers[key]

    def set_cookie(
        self,
        key,
        value='',
        max_age=None,
        expires=None,
        path='/',
        domain=None,
        secure=False,
        httponly=False,
        samesite=None,
    ):
        self.cookies[key] = value
        if max_age is not None:
            self.cookies[key]['max-age'] = max_age
        if expires is not None:
            self.cookies[key]['expires'] = expires
        if path is not None:
            self.cookies[key]['path'] = path
        if domain is not None:
            self.cookies[key]['domain'] = domain
        if secure:
            self.cookies[key]['secure'] = True
        if httponly:
            self.cookies[key]['httponly'] = True
        if samesite:
            self.cookies[key]['samesite'] = samesite

    def delete_cookie(self, key, path='/', domain=None, samesite=None):
        self.set_cookie(
            key,
            '',
            max_age=0,
            expires='Thu, 01 Jan 1970 00:00:00 GMT',
            path=path,
            domain=domain,
            samesite=samesite,
        )


class JsonResponse(HttpResponse):
    def __init__(self, data, status=200, headers=None):
        super().__init__(
            json.dumps(data).encode('utf-8'),
            status=status,
            content_type='application/json',
            headers=headers,
        )


class FileResponse(HttpResponse):
    def __init__(self, fileobj, status=200, content_type='application/octet-stream', headers=None):
        try:
            content = fileobj.read()
        finally:
            fileobj.close()
        super().__init__(content, status=status, content_type=content_type, headers=headers)


class HttpResponseNotAllowed(HttpResponse):
    def __init__(self, permitted_methods):
        super().__init__(b'', status=405, content_type='text/plain')
        self.headers['Allow'] = ', '.join(permitted_methods)
