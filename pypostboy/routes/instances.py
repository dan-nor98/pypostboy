"""Request snapshot/instance API views."""

import logging

from django.views.decorators.csrf import csrf_exempt

from db import RequestInstances
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


def get_request_instances(request, id):
    """Get saved instances for a request."""
    try:
        instances = RequestInstances.get_by_request(id, _current_user_id(request))
        return ok(instances)
    except ValueError as err:
        return error(err, 404)
    except Exception as err:
        _log_exception('get_request_instances', request, request_id=id)
        return error(err, 500)


@csrf_exempt
def create_request_instance(request, id):
    """Create a saved instance for a request."""
    try:
        instance = RequestInstances.create(
            id, _current_user_id(request), json_body(request, allow_blank=False)
        )
        return created(instance)
    except BadJsonBody:
        return error('Invalid JSON request body', 400)
    except Exception as err:
        _log_exception('create_request_instance', request, request_id=id)
        return error(err, _status_for_error(err))


def get_request_instance(request, instance_id):
    """Get a saved request instance."""
    try:
        instance = RequestInstances.get_by_id(instance_id, _current_user_id(request))
        if not instance:
            return error('Request instance not found', 404)
        return ok(instance)
    except Exception as err:
        _log_exception('get_request_instance', request, instance_id=instance_id)
        return error(err, 500)


@csrf_exempt
def update_request_instance(request, instance_id):
    """Update a saved request instance."""
    try:
        instance = RequestInstances.update(instance_id, _current_user_id(request), json_body(request))
        return ok(instance)
    except BadJsonBody:
        return error('Invalid JSON request body', 400)
    except Exception as err:
        _log_exception('update_request_instance', request, instance_id=instance_id)
        return error(err, _status_for_error(err))


@csrf_exempt
def delete_request_instance(request, instance_id):
    """Delete a saved request instance."""
    try:
        result = RequestInstances.delete(instance_id, _current_user_id(request))
        if result.get('deleted') == 0:
            return error('Request instance not found', 404)
        return ok(result)
    except BadJsonBody:
        return error('Invalid JSON request body', 400)
    except Exception as err:
        _log_exception('delete_request_instance', request, instance_id=instance_id)
        return error(err, _status_for_error(err))
