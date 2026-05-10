"""Postman import service."""

from db import Collections, Requests


def import_postman_to_db(data, user_id=None):
    """Import Postman collection into database for a user."""
    info = data.get('info', {})
    collection_name = info.get('name', 'Imported Collection')
    items = data.get('item', [])

    root_col = Collections.create(user_id, {
        'name': collection_name,
        'description': info.get('description', '')
    })

    def process_items(items, parent_collection_id):
        for item in items:
            if 'item' in item and isinstance(item['item'], list):
                sub_col = Collections.create(user_id, {
                    'name': item.get('name', 'Folder'),
                    'description': item.get('description', ''),
                    'parent_id': parent_collection_id
                })
                process_items(item['item'], sub_col['id'])
            elif 'request' in item:
                req = item['request']
                method = (req.get('method', 'GET')).upper()
                url = req.get('url', {})
                if isinstance(url, dict):
                    url = url.get('raw', '')
                elif not isinstance(url, str):
                    url = ''

                headers = [
                    {'key': h.get('key', ''), 'value': h.get('value', '')}
                    for h in req.get('header', [])
                ]

                body_type = 'none'
                body_content = ''
                form_data = []

                body = req.get('body', {})
                if body:
                    mode = body.get('mode', '')
                    if mode == 'raw':
                        body_content = body.get('raw', '')
                        raw_options = body.get('options', {}).get('raw', {})
                        lang = raw_options.get('language', '')
                        if lang == 'json':
                            body_type = 'json'
                        elif lang == 'xml':
                            body_type = 'xml'
                        else:
                            body_type = 'text'
                    elif mode == 'urlencoded':
                        body_type = 'form-urlencoded'
                        form_data = [
                            {'key': p.get('key', ''), 'value': p.get('value', '')}
                            for p in body.get('urlencoded', [])
                        ]
                    elif mode == 'formdata':
                        body_type = 'form-data'
                        form_data = [
                            {'key': p.get('key', ''), 'value': p.get('value', '')}
                            for p in body.get('formdata', [])
                        ]

                auth_type = 'none'
                auth_data = {}
                auth = req.get('auth', {})
                if auth:
                    if auth.get('type') == 'bearer':
                        auth_type = 'bearer'
                        bearer_arr = auth.get('bearer', [])
                        token_entry = next((b for b in bearer_arr if b.get('key') == 'token'), None)
                        auth_data = {'token': token_entry['value'] if token_entry else ''}
                    elif auth.get('type') == 'basic':
                        auth_type = 'basic'
                        basic_arr = auth.get('basic', [])
                        user_entry = next((b for b in basic_arr if b.get('key') == 'username'), None)
                        pass_entry = next((b for b in basic_arr if b.get('key') == 'password'), None)
                        auth_data = {
                            'username': user_entry['value'] if user_entry else '',
                            'password': pass_entry['value'] if pass_entry else ''
                        }

                Requests.create(user_id, {
                    'collection_id': parent_collection_id,
                    'name': item.get('name', url or 'Untitled'),
                    'method': method,
                    'url': url,
                    'headers': headers,
                    'body_type': body_type,
                    'body_content': body_content,
                    'form_data': form_data,
                    'auth_type': auth_type,
                    'auth_data': auth_data
                })

    process_items(items, root_col['id'])
    return Collections.get_by_id(root_col['id'], user_id)
