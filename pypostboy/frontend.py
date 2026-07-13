"""Static React frontend views for the PostBoy workspace.

Django serves the built Vite output directly so the Python backend can run as a
single local/container process after ``npm run frontend:build``. Deployments that
front the app with nginx may still serve these files from container static
configuration, but this module remains the backend fallback/source of truth.
"""

from pathlib import Path

from django.http import FileResponse, Http404, HttpResponse

ROOT_DIR = Path(__file__).resolve().parent.parent
FRONTEND_ROOT = ROOT_DIR / 'frontend'
DIST_ROOT = FRONTEND_ROOT / 'dist'

CONTENT_TYPES = {
    '.avif': 'image/avif',
    '.css': 'text/css',
    '.gif': 'image/gif',
    '.html': 'text/html',
    '.ico': 'image/x-icon',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.map': 'application/json',
    '.mjs': 'text/javascript',
    '.otf': 'font/otf',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ttf': 'font/ttf',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
}


def _resolve_dist_path(path):
    """Resolve a frontend dist path while rejecting traversal attempts."""
    dist_root = DIST_ROOT.resolve()
    target = (dist_root / path).resolve()
    try:
        target.relative_to(dist_root)
    except ValueError as exc:
        raise Http404('Asset not found') from exc
    return target


def _file_response(path):
    content_type = CONTENT_TYPES.get(path.suffix.lower(), 'application/octet-stream')
    return FileResponse(path.open('rb'), content_type=content_type)


def index(request):
    """Serve the built React application shell."""
    index_path = _resolve_dist_path('index.html')
    if not index_path.is_file():
        return HttpResponse(
            (
                '<!doctype html><title>PostBoy frontend not built</title>'
                '<h1>PostBoy frontend not built</h1>'
                '<p>Run <code>npm install</code> and '
                '<code>npm run frontend:build</code>, then restart '
                'the backend-served UI.</p>'
            ),
            content_type='text/html',
            status=200,
        )
    return _file_response(index_path)


def chrome_devtools_probe(request):
    """Return an empty response for Chrome DevTools automatic discovery probes."""
    return HttpResponse(status=204)


def asset(request, path):
    """Serve built frontend assets from ``frontend/dist``."""
    target = _resolve_dist_path(path)
    if not target.is_file():
        raise Http404('Asset not found')
    return _file_response(target)
