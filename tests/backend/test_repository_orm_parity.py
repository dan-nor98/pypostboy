from pypostboy.repositories.collections import Collections
from pypostboy.repositories.requests import Requests
from pypostboy.repositories.request_instances import RequestInstances


def _seed(user_id):
    root = Collections.create(user_id, {'name': 'Root'})
    child = Collections.create(user_id, {'name': 'Child', 'parent_id': root['id']})
    req = Requests.create(user_id, {'collection_id': root['id'], 'name': 'Request A', 'headers':[{'k':'a','v':'b'}]})
    inst = RequestInstances.create(req['id'], user_id, {'name': 'Snap 1', 'response_body': {'ok': True}})
    return root, child, req, inst


def test_repository_read_parity_between_sql_and_orm(sqlite_connection, user_a):
    root, _child, req, inst = _seed(user_a['id'])

    Collections.use_orm_reads = False
    Requests.use_orm_reads = False
    RequestInstances.use_orm_reads = False
    baseline_tree = Collections.get_all(user_a['id'])
    baseline_collection = Collections.get_by_id(root['id'], user_a['id'])
    baseline_request = Requests.get_by_id(req['id'], user_a['id'])
    baseline_instances = RequestInstances.get_by_request(req['id'], user_a['id'])
    baseline_instance = RequestInstances.get_by_id(inst['id'], user_a['id'])

    Collections.use_orm_reads = True
    Requests.use_orm_reads = True
    RequestInstances.use_orm_reads = True
    orm_tree = Collections.get_all(user_a['id'])
    orm_collection = Collections.get_by_id(root['id'], user_a['id'])
    orm_request = Requests.get_by_id(req['id'], user_a['id'])
    orm_instances = RequestInstances.get_by_request(req['id'], user_a['id'])
    orm_instance = RequestInstances.get_by_id(inst['id'], user_a['id'])

    assert orm_tree == baseline_tree
    assert orm_collection == baseline_collection
    assert orm_request == baseline_request
    assert orm_instances == baseline_instances
    assert orm_instance == baseline_instance
