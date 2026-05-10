"""Flask application factory for PostBoy."""

import os

from flask import Flask
from flask_cors import CORS
from werkzeug.utils import import_string

from pypostboy.config import DevelopmentConfig, ProductionConfig, TestingConfig
from pypostboy.db.connection import configure_database

CONFIG_BY_NAME = {
    'development': DevelopmentConfig,
    'dev': DevelopmentConfig,
    'testing': TestingConfig,
    'test': TestingConfig,
    'production': ProductionConfig,
    'prod': ProductionConfig,
}


def create_app(config=None):
    """Create and configure the PostBoy Flask app."""
    app = Flask(__name__, static_folder=None)
    load_config(app, config)
    CORS(app)

    configure_database(app.config)

    @app.after_request
    def remove_csp_headers(response):
        response.headers.pop('Content-Security-Policy', None)
        response.headers.pop('X-Content-Security-Policy', None)
        response.headers.pop('X-WebKit-CSP', None)
        response.headers['X-Content-Type-Options'] = 'nosniff'
        return response

    register_blueprints(app)
    return app


def load_config(app, config=None):
    """Load application configuration from defaults, names, objects, or dicts."""
    app.config.from_object(DevelopmentConfig)

    selected_config = config or os.environ.get('POSTBOY_CONFIG')
    if not selected_config:
        return

    if isinstance(selected_config, dict):
        app.config.update(selected_config)
        return

    if isinstance(selected_config, str):
        config_object = CONFIG_BY_NAME.get(selected_config.lower())
        if config_object is None:
            config_object = import_string(selected_config)
        app.config.from_object(config_object)
        return

    app.config.from_object(selected_config)


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
