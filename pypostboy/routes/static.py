"""Static file and SPA fallback views."""

import base64
import mimetypes
import os

from django.conf import settings
from django.http import FileResponse, Http404, HttpResponse

from pypostboy.http.responses import error


def favicon(request):
    """Serve a minimal transparent PNG favicon."""
    favicon_data = base64.b64decode(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
    )
    return HttpResponse(
        favicon_data,
        content_type='image/png',
        headers={'Cache-Control': 'public, max-age=604800'},
    )


def _serve_file(path):
    content_type, _encoding = mimetypes.guess_type(path)
    return FileResponse(open(path, 'rb'), content_type=content_type or 'application/octet-stream')


def index(request):
    """Serve the main index.html."""
    return _serve_file(os.path.join(settings.PUBLIC_DIR, 'index.html'))


def serve_static(request, path):
    """Serve static files and fallback to index.html for SPA."""
    dashboard_index_path = os.path.join(settings.PUBLIC_DIR, 'dashboard', 'index.html')
    if path in {'dashboard', 'dashboard/'}:
        if not os.path.isfile(dashboard_index_path):
            raise Http404()
        return _serve_file(dashboard_index_path)
    if path.startswith('dashboard/') and not os.path.splitext(path)[1]:
        if not os.path.isfile(dashboard_index_path):
            raise Http404()
        return _serve_file(dashboard_index_path)

    if path.startswith('api/'):
        return error('API endpoint not found', status=404)

    public_dir = settings.PUBLIC_DIR
    safe_path = os.path.normpath(path).lstrip(os.sep)
    full_path = os.path.abspath(os.path.join(public_dir, safe_path))
    if not full_path.startswith(os.path.abspath(public_dir) + os.sep):
        raise Http404()
    if os.path.isfile(full_path):
        return _serve_file(full_path)
    if os.path.splitext(path)[1]:
        raise Http404()
    return _serve_file(os.path.join(public_dir, 'index.html'))
