"""Collection API routes."""

from flask import Blueprint, request

from db import Collections
from pypostboy.auth import require_current_user
from pypostboy.http.responses import created, error, ok

bp = Blueprint('collections', __name__)


def _current_user_id():
    return require_current_user()['id']


def _status_for_error(err):
    return 404 if 'not found' in str(err).lower() else 400


@bp.route('/api/collections', methods=['GET'])
def get_collections():
    """List all collections (tree structure)."""
    try:
        return ok(Collections.get_all(_current_user_id()))
    except Exception as err:
        return error(err, 500)


@bp.route('/api/collections/reorder', methods=['PUT'])
def reorder_collections():
    """Reorder collections that share the same parent."""
    try:
        body = request.get_json(silent=True) or {}
        if 'ordered_ids' not in body:
            return error('ordered_ids required', 400)

        result = Collections.reorder(body.get('parent_id'), _current_user_id(), body.get('ordered_ids'))
        return ok(result)
    except Exception as err:
        return error(err, _status_for_error(err))


@bp.route('/api/collections/<int:id>', methods=['GET'])
def get_collection(id):
    """Get single collection with requests."""
    try:
        col = Collections.get_by_id(id, _current_user_id())
        if not col:
            return error('Collection not found', 404)
        return ok(col)
    except Exception as err:
        return error(err, 500)


@bp.route('/api/collections', methods=['POST'])
def create_collection():
    """Create a new collection."""
    try:
        col = Collections.create(_current_user_id(), request.get_json(silent=True) or {})
        return created(col)
    except Exception as err:
        return error(err, _status_for_error(err))


@bp.route('/api/collections/<int:id>', methods=['PUT'])
def update_collection(id):
    """Update a collection."""
    try:
        col = Collections.update(id, _current_user_id(), request.get_json(silent=True) or {})
        return ok(col)
    except Exception as err:
        return error(err, _status_for_error(err))


@bp.route('/api/collections/<int:id>', methods=['DELETE'])
def delete_collection(id):
    """Delete a collection."""
    try:
        result = Collections.delete(id, _current_user_id())
        if result.get('deleted') == 0:
            return error('Collection not found', 404)
        return ok(result)
    except Exception as err:
        return error(err, _status_for_error(err))


@bp.route('/api/collections/<int:id>/duplicate', methods=['POST'])
def duplicate_collection(id):
    """Duplicate a collection."""
    try:
        col = Collections.duplicate(id, _current_user_id())
        return ok(col)
    except Exception as err:
        return error(err, _status_for_error(err))
