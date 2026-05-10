"""Flask application factory for PostBoy."""

import os

from flask import Flask
from flask_cors import CORS

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_DIR = os.path.join(BASE_DIR, 'public')


def create_app(config=None):
    """Create and configure the PostBoy Flask app."""
    app = Flask(__name__, static_folder=None)
    CORS(app)

    app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024
    app.config['PUBLIC_DIR'] = PUBLIC_DIR
    if config:
        app.config.update(config)

    @app.after_request
    def remove_csp_headers(response):
        response.headers.pop('Content-Security-Policy', None)
        response.headers.pop('X-Content-Security-Policy', None)
        response.headers.pop('X-WebKit-CSP', None)
        response.headers['X-Content-Type-Options'] = 'nosniff'
        return response

    register_blueprints(app)
    return app


def register_blueprints(app):
    """Register route blueprints while preserving existing URL paths."""
    from pypostboy.routes.collections import bp as collections_bp
    from pypostboy.routes.imports import bp as imports_bp
    from pypostboy.routes.instances import bp as instances_bp
    from pypostboy.routes.proxy import bp as proxy_bp
    from pypostboy.routes.requests import bp as requests_bp
    from pypostboy.routes.static import bp as static_bp

    app.register_blueprint(collections_bp)
    app.register_blueprint(requests_bp)
    app.register_blueprint(instances_bp)
    app.register_blueprint(imports_bp)
    app.register_blueprint(proxy_bp)
    app.register_blueprint(static_bp)
