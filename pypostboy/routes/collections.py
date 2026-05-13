"""Collection API views."""

from django.views.decorators.csrf import csrf_exempt

from db import Collections
from pypostboy.auth import require_current_user
from pypostboy.djangoapp.request import json_body
from pypostboy.http.responses import created, error, ok


def _current_user_id(request):
    return require_current_user(request)['id']


def _status_for_error(err):
    return 404 if 'not found' in str(err).lower() else 400


def get_collections(request):
    """List all collections (tree structure)."""
    try:
        return ok(Collections.get_all(_current_user_id(request)))
    except Exception as err:
        return error(err, 500)


@csrf_exempt
def reorder_collections(request):
    """Reorder collections that share the same parent."""
    try:
        body = json_body(request)
        if 'ordered_ids' not in body:
            return error('ordered_ids required', 400)
        result = Collections.reorder(body.get('parent_id'), _current_user_id(request), body.get('ordered_ids'))
        return ok(result)
    except Exception as err:
        return error(err, _status_for_error(err))


def get_collection(request, id):
    """Get single collection with requests."""
    try:
        col = Collections.get_by_id(id, _current_user_id(request))
        if not col:
            return error('Collection not found', 404)
        return ok(col)
    except Exception as err:
        return error(err, 500)


@csrf_exempt
def create_collection(request):
    """Create a new collection."""
    try:
        col = Collections.create(_current_user_id(request), json_body(request))
        return created(col)
    except Exception as err:
        return error(err, _status_for_error(err))


@csrf_exempt
def update_collection(request, id):
    """Update a collection."""
    try:
        col = Collections.update(id, _current_user_id(request), json_body(request))
        return ok(col)
    except Exception as err:
        return error(err, _status_for_error(err))


@csrf_exempt
def delete_collection(request, id):
    """Delete a collection."""
    try:
        result = Collections.delete(id, _current_user_id(request))
        if result.get('deleted') == 0:
            return error('Collection not found', 404)
        return ok(result)
    except Exception as err:
        return error(err, _status_for_error(err))


@csrf_exempt
def duplicate_collection(request, id):
    """Duplicate a collection."""
    try:
        col = Collections.duplicate(id, _current_user_id(request))
        return ok(col)
    except Exception as err:
        return error(err, _status_for_error(err))
