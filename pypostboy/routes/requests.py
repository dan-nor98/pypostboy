"""Request API routes."""

from flask import Blueprint, request

from db import Requests
from pypostboy.auth import require_current_user
from pypostboy.http.responses import created, error, ok

bp = Blueprint('requests', __name__)


def _current_user_id():
    return require_current_user()['id']


def _status_for_error(err):
    return 404 if 'not found' in str(err).lower() else 400


@bp.route('/api/requests/reorder', methods=['PUT'])
def reorder_requests():
    """Reorder requests within a collection."""
    try:
        body = request.get_json(silent=True) or {}
        collection_id = body.get('collection_id')
        if not collection_id:
            return error('collection_id required', 400)
        if 'ordered_ids' not in body:
            return error('ordered_ids required', 400)

        result = Requests.reorder(collection_id, _current_user_id(), body.get('ordered_ids'))
        return ok(result)
    except Exception as err:
        return error(err, _status_for_error(err))


@bp.route('/api/requests/<int:id>', methods=['GET'])
def get_request(id):
    """Get single request."""
    try:
        req = Requests.get_by_id(id, _current_user_id())
        if not req:
            return error('Request not found', 404)
        return ok(req)
    except Exception as err:
        return error(err, 500)


@bp.route('/api/collections/<int:id>/requests', methods=['GET'])
def get_collection_requests(id):
    """Get all requests in a collection."""
    try:
        reqs = Requests.get_by_collection(id, _current_user_id())
        return ok(reqs)
    except ValueError as err:
        return error(err, 404)
    except Exception as err:
        return error(err, 500)


@bp.route('/api/requests', methods=['POST'])
def create_request():
    """Create a new request."""
    try:
        req = Requests.create(_current_user_id(), request.get_json(silent=True) or {})
        return created(req)
    except Exception as err:
        return error(err, _status_for_error(err))


@bp.route('/api/requests/<int:id>', methods=['PUT'])
def update_request(id):
    """Update a request."""
    try:
        req = Requests.update(id, _current_user_id(), request.get_json(silent=True) or {})
        return ok(req)
    except Exception as err:
        return error(err, _status_for_error(err))


@bp.route('/api/requests/<int:id>', methods=['DELETE'])
def delete_request(id):
    """Delete a request."""
    try:
        result = Requests.delete(id, _current_user_id())
        if result.get('deleted') == 0:
            return error('Request not found', 404)
        return ok(result)
    except Exception as err:
        return error(err, _status_for_error(err))


@bp.route('/api/requests/<int:id>/duplicate', methods=['POST'])
def duplicate_request(id):
    """Duplicate a request."""
    try:
        req = Requests.duplicate(id, _current_user_id())
        return ok(req)
    except Exception as err:
        return error(err, _status_for_error(err))


@bp.route('/api/requests/<int:id>/move', methods=['PUT'])
def move_request(id):
    """Move request to another collection."""
    try:
        body = request.get_json(silent=True) or {}
        collection_id = body.get('collection_id')
        if not collection_id:
            return error('collection_id required', 400)
        req = Requests.move(id, _current_user_id(), collection_id)
        return ok(req)
    except Exception as err:
        return error(err, _status_for_error(err))
