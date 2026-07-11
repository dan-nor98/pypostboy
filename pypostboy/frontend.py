"""Static React frontend views for the PostBoy workspace."""

from pathlib import Path

from django.http import FileResponse, Http404

ROOT_DIR = Path(__file__).resolve().parent.parent
FRONTEND_ROOT = ROOT_DIR / 'frontend'


def index(request):
    """Serve the React application shell."""
    return FileResponse((ROOT_DIR / 'index.html').open('rb'), content_type='text/html')


def asset(request, path):
    """Serve checked-in frontend source assets for the local React app."""
    target = (FRONTEND_ROOT / path).resolve()
    try:
        target.relative_to(FRONTEND_ROOT.resolve())
    except ValueError as exc:
        raise Http404('Asset not found') from exc
    if not target.is_file():
        raise Http404('Asset not found')
    content_type = 'text/css' if target.suffix == '.css' else 'text/javascript'
    return FileResponse(target.open('rb'), content_type=content_type)
