"""One-shot database startup initialization helpers."""

from pypostboy.app import load_config
from pypostboy.db.connection import configure_database


def initialize_database_from_config(config=None):
    """Run the configured database initialization path once."""
    config_dict = load_config(config)
    configure_database(config_dict)
    return config_dict
