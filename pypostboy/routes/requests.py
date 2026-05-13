"""Request API views."""

from django.views.decorators.csrf import csrf_exempt

from db import Requests
from pypostboy.auth import require_current_user
from pypostboy.djangoapp.request import json_body
from pypostboy.http.responses import created, error, ok


def _current_user_id(request):
    return require_current_user(request)['id']


def _status_for_error(err):
    return 404 if 'not found' in str(err).lower() else 400


@csrf_exempt
def reorder_requests(request):
    """Reorder requests within a collection."""
    try:
        body = json_body(request)
        collection_id = body.get('collection_id')
        if not collection_id:
            return error('collection_id required', 400)
        if 'ordered_ids' not in body:
            return error('ordered_ids required', 400)
        result = Requests.reorder(collection_id, _current_user_id(request), body.get('ordered_ids'))
        return ok(result)
    except Exception as err:
        return error(err, _status_for_error(err))


def get_request(request, id):
    """Get single request."""
    try:
        req = Requests.get_by_id(id, _current_user_id(request))
        if not req:
            return error('Request not found', 404)
        return ok(req)
    except Exception as err:
        return error(err, 500)


def get_collection_requests(request, id):
    """Get all requests in a collection."""
    try:
        reqs = Requests.get_by_collection(id, _current_user_id(request))
        return ok(reqs)
    except ValueError as err:
        return error(err, 404)
    except Exception as err:
        return error(err, 500)


@csrf_exempt
def create_request(request):
    """Create a new request."""
    try:
        req = Requests.create(_current_user_id(request), json_body(request))
        return created(req)
    except Exception as err:
        return error(err, _status_for_error(err))


@csrf_exempt
def update_request(request, id):
    """Update a request."""
    try:
        req = Requests.update(id, _current_user_id(request), json_body(request))
        return ok(req)
    except Exception as err:
        return error(err, _status_for_error(err))


@csrf_exempt
def delete_request(request, id):
    """Delete a request."""
    try:
        result = Requests.delete(id, _current_user_id(request))
        if result.get('deleted') == 0:
            return error('Request not found', 404)
        return ok(result)
    except Exception as err:
        return error(err, _status_for_error(err))


@csrf_exempt
def duplicate_request(request, id):
    """Duplicate a request."""
    try:
        req = Requests.duplicate(id, _current_user_id(request))
        return ok(req)
    except Exception as err:
        return error(err, _status_for_error(err))


@csrf_exempt
def move_request(request, id):
    """Move request to another collection."""
    try:
        body = json_body(request)
        collection_id = body.get('collection_id')
        if not collection_id:
            return error('collection_id required', 400)
        req = Requests.move(id, _current_user_id(request), collection_id)
        return ok(req)
    except Exception as err:
        return error(err, _status_for_error(err))
