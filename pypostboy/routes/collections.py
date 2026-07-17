"""Collection API views."""

import logging

from django.views.decorators.csrf import csrf_exempt

from db import Collections
from pypostboy.repositories.collections import DuplicateCollectionNameError
from pypostboy.auth import require_current_user
from pypostboy.djangoapp.request import BadJsonBody, json_body
from pypostboy.http.responses import created, error, ok
from pypostboy.services.export_service import export_collection as export_collection_data


logger = logging.getLogger(__name__)


def _current_user_id(request):
    return require_current_user(request)['id']


def _status_for_error(err):
    if isinstance(err, DuplicateCollectionNameError):
        return 409
    return 404 if 'not found' in str(err).lower() else 400


def _log_user_id(request):
    current_user = getattr(request, 'current_user', None)
    if isinstance(current_user, dict):
        return current_user.get('id')
    return None


def _log_exception(route_name, request, **context):
    details = ', '.join(
        f'{key}={value}' for key, value in context.items() if value is not None
    )
    if details:
        details = f', {details}'
    logger.exception(
        '%s failed: user_id=%s%s',
        route_name,
        _log_user_id(request),
        details,
    )


def get_collections(request):
    """List all collections (tree structure)."""
    try:
        return ok(Collections.get_all(_current_user_id(request)))
    except Exception as err:
        _log_exception('get_collections', request)
        return error(err, 500)


@csrf_exempt
def reorder_collections(request):
    """Reorder collections that share the same parent."""
    parent_id = None
    try:
        body = json_body(request, allow_blank=False)
        parent_id = body.get('parent_id')
        if 'ordered_ids' not in body:
            return error('ordered_ids required', 400)
        result = Collections.reorder(parent_id, _current_user_id(request), body.get('ordered_ids'))
        return ok(result)
    except BadJsonBody:
        return error('Invalid JSON request body', 400)
    except Exception as err:
        _log_exception('reorder_collections', request, parent_id=parent_id)
        return error(err, _status_for_error(err))


def get_collection(request, id):
    """Get single collection with requests."""
    try:
        col = Collections.get_by_id(id, _current_user_id(request))
        if not col:
            return error('Collection not found', 404)
        return ok(col)
    except Exception as err:
        _log_exception('get_collection', request, collection_id=id)
        return error(err, 500)


@csrf_exempt
def create_collection(request):
    """Create a new collection."""
    try:
        col = Collections.create(_current_user_id(request), json_body(request))
        return created(col)
    except BadJsonBody:
        return error('Invalid JSON request body', 400)
    except Exception as err:
        _log_exception('create_collection', request)
        return error(err, _status_for_error(err))


@csrf_exempt
def update_collection(request, id):
    """Update a collection."""
    try:
        col = Collections.update(id, _current_user_id(request), json_body(request))
        return ok(col)
    except BadJsonBody:
        return error('Invalid JSON request body', 400)
    except Exception as err:
        _log_exception('update_collection', request, collection_id=id)
        return error(err, _status_for_error(err))


@csrf_exempt
def delete_collection(request, id):
    """Delete a collection."""
    try:
        result = Collections.delete(id, _current_user_id(request))
        if result.get('deleted') == 0:
            return error('Collection not found', 404)
        return ok(result)
    except BadJsonBody:
        return error('Invalid JSON request body', 400)
    except Exception as err:
        _log_exception('delete_collection', request, collection_id=id)
        return error(err, _status_for_error(err))


@csrf_exempt
def duplicate_collection(request, id):
    """Duplicate a collection."""
    try:
        col = Collections.duplicate(id, _current_user_id(request))
        return ok(col)
    except BadJsonBody:
        return error('Invalid JSON request body', 400)
    except Exception as err:
        _log_exception('duplicate_collection', request, collection_id=id)
        return error(err, _status_for_error(err))


def export_collection(request, id):
    """Export a collection tree as Postman v2.1 JSON."""
    try:
        return ok(export_collection_data(id, _current_user_id(request)))
    except Exception as err:
        _log_exception('export_collection', request, collection_id=id)
        return error(err, _status_for_error(err))
