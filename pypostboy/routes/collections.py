"""Collection API routes."""

from flask import Blueprint, request

from db import Collections
from pypostboy.http.responses import error_response, success_response

bp = Blueprint('collections', __name__)


@bp.route('/api/collections', methods=['GET'])
def get_collections():
    """List all collections (tree structure)."""
    try:
        return success_response(Collections.get_all())
    except Exception as err:
        return error_response(err, 500)


@bp.route('/api/collections/reorder', methods=['PUT'])
def reorder_collections():
    """Reorder collections that share the same parent."""
    try:
        body = request.get_json(silent=True) or {}
        if 'ordered_ids' not in body:
            return error_response('ordered_ids required', 400)

        result = Collections.reorder(body.get('parent_id'), body.get('ordered_ids'))
        return success_response(result)
    except Exception as err:
        return error_response(err, 400)


@bp.route('/api/collections/<int:id>', methods=['GET'])
def get_collection(id):
    """Get single collection with requests."""
    try:
        col = Collections.get_by_id(id)
        if not col:
            return error_response('Collection not found', 404)
        return success_response(col)
    except Exception as err:
        return error_response(err, 500)


@bp.route('/api/collections', methods=['POST'])
def create_collection():
    """Create a new collection."""
    try:
        col = Collections.create(request.get_json(silent=True) or {})
        return success_response(col, 201)
    except Exception as err:
        return error_response(err, 400)


@bp.route('/api/collections/<int:id>', methods=['PUT'])
def update_collection(id):
    """Update a collection."""
    try:
        col = Collections.update(id, request.get_json(silent=True) or {})
        return success_response(col)
    except Exception as err:
        return error_response(err, 400)


@bp.route('/api/collections/<int:id>', methods=['DELETE'])
def delete_collection(id):
    """Delete a collection."""
    try:
        result = Collections.delete(id)
        return success_response(result)
    except Exception as err:
        return error_response(err, 400)


@bp.route('/api/collections/<int:id>/duplicate', methods=['POST'])
def duplicate_collection(id):
    """Duplicate a collection."""
    try:
        col = Collections.duplicate(id)
        return success_response(col)
    except Exception as err:
        return error_response(err, 400)
