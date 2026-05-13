"""Minimal HTTP classes compatible with the subset PostBoy uses."""

import json


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
        if headers:
            self.headers.update(headers)

    def __setitem__(self, key, value):
        self.headers[key] = value

    def __getitem__(self, key):
        return self.headers[key]


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
