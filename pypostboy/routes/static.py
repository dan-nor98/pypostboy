"""Static file and SPA fallback routes."""

import base64
import os

from flask import Blueprint, current_app, send_from_directory

bp = Blueprint('static_routes', __name__)


@bp.route('/favicon.ico')
def favicon():
    """Serve a minimal transparent PNG favicon."""
    favicon_data = base64.b64decode(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
    )
    return current_app.response_class(
        response=favicon_data,
        mimetype='image/png',
        headers={'Cache-Control': 'public, max-age=604800'}
    )


@bp.route('/')
def index():
    """Serve the main index.html."""
    return send_from_directory(current_app.config['PUBLIC_DIR'], 'index.html')


@bp.route('/<path:path>')
def serve_static(path):
    """Serve static files and fallback to index.html for SPA."""
    public_dir = current_app.config['PUBLIC_DIR']
    full_path = os.path.join(public_dir, path)
    if os.path.isfile(full_path):
        return send_from_directory(public_dir, path)
    return send_from_directory(public_dir, 'index.html')
