"""Request snapshot/instance API routes."""

from flask import Blueprint, request

from db import RequestInstances
from pypostboy.auth import require_current_user
from pypostboy.http.responses import created, error, ok

bp = Blueprint('instances', __name__)


def _current_user_id():
    return require_current_user()['id']


def _status_for_error(err):
    return 404 if 'not found' in str(err).lower() else 400


@bp.route('/api/requests/<int:id>/instances', methods=['GET'])
def get_request_instances(id):
    """Get saved instances for a request."""
    try:
        instances = RequestInstances.get_by_request(id, _current_user_id())
        return ok(instances)
    except ValueError as err:
        return error(err, 404)
    except Exception as err:
        return error(err, 500)


@bp.route('/api/requests/<int:id>/instances', methods=['POST'])
def create_request_instance(id):
    """Create a saved instance for a request."""
    try:
        instance = RequestInstances.create(id, _current_user_id(), request.get_json(silent=True) or {})
        return created(instance)
    except Exception as err:
        return error(err, _status_for_error(err))


@bp.route('/api/request-instances/<int:instance_id>', methods=['GET'])
def get_request_instance(instance_id):
    """Get a saved request instance."""
    try:
        instance = RequestInstances.get_by_id(instance_id, _current_user_id())
        if not instance:
            return error('Request instance not found', 404)
        return ok(instance)
    except Exception as err:
        return error(err, 500)


@bp.route('/api/request-instances/<int:instance_id>', methods=['PUT'])
def update_request_instance(instance_id):
    """Update a saved request instance."""
    try:
        instance = RequestInstances.update(instance_id, _current_user_id(), request.get_json(silent=True) or {})
        return ok(instance)
    except Exception as err:
        return error(err, _status_for_error(err))


@bp.route('/api/request-instances/<int:instance_id>', methods=['DELETE'])
def delete_request_instance(instance_id):
    """Delete a saved request instance."""
    try:
        result = RequestInstances.delete(instance_id, _current_user_id())
        if result.get('deleted') == 0:
            return error('Request instance not found', 404)
        return ok(result)
    except Exception as err:
        return error(err, _status_for_error(err))
