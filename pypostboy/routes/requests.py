"""Request API views."""

import logging

from django.views.decorators.csrf import csrf_exempt

from db import Requests
from pypostboy.auth import require_current_user
from pypostboy.djangoapp.request import BadJsonBody, json_body
from pypostboy.http.responses import created, error, ok


logger = logging.getLogger(__name__)


def _current_user_id(request):
    return require_current_user(request)['id']


def _status_for_error(err):
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


@csrf_exempt
def reorder_requests(request):
    """Reorder requests within a collection."""
    collection_id = None
    try:
        body = json_body(request, allow_blank=False)
        collection_id = body.get('collection_id')
        if not collection_id:
            return error('collection_id required', 400)
        if 'ordered_ids' not in body:
            return error('ordered_ids required', 400)
        result = Requests.reorder(collection_id, _current_user_id(request), body.get('ordered_ids'))
        return ok(result)
    except BadJsonBody:
        return error('Invalid JSON request body', 400)
    except Exception as err:
        _log_exception('reorder_requests', request, collection_id=collection_id)
        return error(err, _status_for_error(err))


def get_request(request, id):
    """Get single request."""
    try:
        req = Requests.get_by_id(id, _current_user_id(request))
        if not req:
            return error('Request not found', 404)
        return ok(req)
    except Exception as err:
        _log_exception('get_request', request, request_id=id)
        return error(err, 500)


def get_collection_requests(request, id):
    """Get all requests in a collection."""
    try:
        reqs = Requests.get_by_collection(id, _current_user_id(request))
        return ok(reqs)
    except ValueError as err:
        return error(err, 404)
    except Exception as err:
        _log_exception('get_collection_requests', request, collection_id=id)
        return error(err, 500)


@csrf_exempt
def create_request(request):
    """Create a new request."""
    try:
        req = Requests.create(_current_user_id(request), json_body(request, allow_blank=False))
        return created(req)
    except BadJsonBody:
        return error('Invalid JSON request body', 400)
    except Exception as err:
        _log_exception('create_request', request)
        return error(err, _status_for_error(err))


@csrf_exempt
def update_request(request, id):
    """Update a request."""
    try:
        req = Requests.update(id, _current_user_id(request), json_body(request))
        return ok(req)
    except BadJsonBody:
        return error('Invalid JSON request body', 400)
    except Exception as err:
        _log_exception('update_request', request, request_id=id)
        return error(err, _status_for_error(err))


@csrf_exempt
def delete_request(request, id):
    """Delete a request."""
    try:
        result = Requests.delete(id, _current_user_id(request))
        if result.get('deleted') == 0:
            return error('Request not found', 404)
        return ok(result)
    except BadJsonBody:
        return error('Invalid JSON request body', 400)
    except Exception as err:
        _log_exception('delete_request', request, request_id=id)
        return error(err, _status_for_error(err))


@csrf_exempt
def duplicate_request(request, id):
    """Duplicate a request."""
    try:
        req = Requests.duplicate(id, _current_user_id(request))
        return ok(req)
    except BadJsonBody:
        return error('Invalid JSON request body', 400)
    except Exception as err:
        _log_exception('duplicate_request', request, request_id=id)
        return error(err, _status_for_error(err))


@csrf_exempt
def move_request(request, id):
    """Move request to another collection."""
    collection_id = None
    try:
        body = json_body(request, allow_blank=False)
        collection_id = body.get('collection_id')
        if not collection_id:
            return error('collection_id required', 400)
        req = Requests.move(id, _current_user_id(request), collection_id)
        return ok(req)
    except BadJsonBody:
        return error('Invalid JSON request body', 400)
    except Exception as err:
        _log_exception('move_request', request, request_id=id, collection_id=collection_id)
        return error(err, _status_for_error(err))
