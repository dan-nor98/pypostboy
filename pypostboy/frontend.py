"""Static React frontend views for the PostBoy workspace."""

from pathlib import Path

from django.http import FileResponse, Http404

ROOT_DIR = Path(__file__).resolve().parent.parent
FRONTEND_ROOT = ROOT_DIR / 'frontend'
DIST_ROOT = FRONTEND_ROOT / 'dist'
SOURCE_ROOT = FRONTEND_ROOT / 'src'

CONTENT_TYPES = {
    '.css': 'text/css',
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.mjs': 'text/javascript',
    '.svg': 'image/svg+xml',
}


def index(request):
    """Serve the React application shell."""
    index_path = DIST_ROOT / 'index.html'
    if not index_path.is_file():
        index_path = FRONTEND_ROOT / 'index.html'
    return FileResponse(index_path.open('rb'), content_type='text/html')


def asset(request, path):
    """Serve built frontend assets, falling back to source files for local development."""
    asset_root = DIST_ROOT if DIST_ROOT.is_dir() else SOURCE_ROOT
    target = (asset_root / path).resolve()
    try:
        target.relative_to(asset_root.resolve())
    except ValueError as exc:
        raise Http404('Asset not found') from exc
    if not target.is_file():
        raise Http404('Asset not found')
    content_type = CONTENT_TYPES.get(target.suffix, 'application/octet-stream')
    return FileResponse(target.open('rb'), content_type=content_type)
