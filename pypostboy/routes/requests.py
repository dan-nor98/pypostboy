"""Request API routes."""

from flask import Blueprint, request

from db import Requests
from pypostboy.http.responses import error_response, success_response

bp = Blueprint('requests', __name__)


@bp.route('/api/requests/reorder', methods=['PUT'])
def reorder_requests():
    """Reorder requests within a collection."""
    try:
        body = request.get_json(silent=True) or {}
        collection_id = body.get('collection_id')
        if not collection_id:
            return error_response('collection_id required', 400)
        if 'ordered_ids' not in body:
            return error_response('ordered_ids required', 400)

        result = Requests.reorder(collection_id, body.get('ordered_ids'))
        return success_response(result)
    except Exception as err:
        return error_response(err, 400)


@bp.route('/api/requests/<int:id>', methods=['GET'])
def get_request(id):
    """Get single request."""
    try:
        req = Requests.get_by_id(id)
        if not req:
            return error_response('Request not found', 404)
        return success_response(req)
    except Exception as err:
        return error_response(err, 500)


@bp.route('/api/collections/<int:id>/requests', methods=['GET'])
def get_collection_requests(id):
    """Get all requests in a collection."""
    try:
        reqs = Requests.get_by_collection(id)
        return success_response(reqs)
    except Exception as err:
        return error_response(err, 500)


@bp.route('/api/requests', methods=['POST'])
def create_request():
    """Create a new request."""
    try:
        req = Requests.create(request.get_json(silent=True) or {})
        return success_response(req, 201)
    except Exception as err:
        return error_response(err, 400)


@bp.route('/api/requests/<int:id>', methods=['PUT'])
def update_request(id):
    """Update a request."""
    try:
        req = Requests.update(id, request.get_json(silent=True) or {})
        return success_response(req)
    except Exception as err:
        return error_response(err, 400)


@bp.route('/api/requests/<int:id>', methods=['DELETE'])
def delete_request(id):
    """Delete a request."""
    try:
        result = Requests.delete(id)
        return success_response(result)
    except Exception as err:
        return error_response(err, 400)


@bp.route('/api/requests/<int:id>/duplicate', methods=['POST'])
def duplicate_request(id):
    """Duplicate a request."""
    try:
        req = Requests.duplicate(id)
        return success_response(req)
    except Exception as err:
        return error_response(err, 400)


@bp.route('/api/requests/<int:id>/move', methods=['PUT'])
def move_request(id):
    """Move request to another collection."""
    try:
        body = request.get_json(silent=True) or {}
        collection_id = body.get('collection_id')
        if not collection_id:
            return error_response('collection_id required', 400)
        req = Requests.move(id, collection_id)
        return success_response(req)
    except Exception as err:
        return error_response(err, 400)
