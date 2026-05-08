# ============================================================
#  PostBoy – Flask Edition
#  Proxy Server with Collections CRUD
# ============================================================

import os
import json
import re
import base64
from datetime import datetime, timezone
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests as http_requests

from db import (
    db, Collections, Requests, RequestInstances, 
    safe_parse, timestamp
    )

# ─── Import helpers ─────────────────────────────────────────

def import_postman_to_db(data):
    """Import Postman collection into database"""
    info = data.get('info', {})
    collection_name = info.get('name', 'Imported Collection')
    items = data.get('item', [])
    
    root_col = Collections.create({
        'name': collection_name,
        'description': info.get('description', '')
    })
    
    def process_items(items, parent_collection_id):
        for item in items:
            if 'item' in item and isinstance(item['item'], list):
                # It's a folder → create sub-collection
                sub_col = Collections.create({
                    'name': item.get('name', 'Folder'),
                    'description': item.get('description', ''),
                    'parent_id': parent_collection_id
                })
                process_items(item['item'], sub_col['id'])
            elif 'request' in item:
                # It's a request
                req = item['request']
                method = (req.get('method', 'GET')).upper()
                url = req.get('url', {})
                if isinstance(url, dict):
                    url = url.get('raw', '')
                elif not isinstance(url, str):
                    url = ''
                
                headers = [{'key': h.get('key', ''), 'value': h.get('value', '')} 
                          for h in req.get('header', [])]
                
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
                        form_data = [{'key': p.get('key', ''), 'value': p.get('value', '')} 
                                    for p in body.get('urlencoded', [])]
                    elif mode == 'formdata':
                        body_type = 'form-data'
                        form_data = [{'key': p.get('key', ''), 'value': p.get('value', '')} 
                                    for p in body.get('formdata', [])]
                
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
                
                Requests.create({
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
    return Collections.get_by_id(root_col['id'])


def parse_curl_to_request(cmd):
    """Parse cURL command to request object"""
    cmd = re.sub(r'\\\n', ' ', cmd)
    cmd = re.sub(r'\\\r\n', ' ', cmd)
    cmd = cmd.strip()
    
    method = 'GET'
    url = ''
    headers = []
    data = ''
    
    tokens = _tokenize(cmd)
    
    i = 0
    while i < len(tokens):
        t = tokens[i]
        if t == 'curl':
            i += 1
            continue
        if t in ('-X', '--request'):
            i += 1
            method = (tokens[i] if i < len(tokens) else '').upper()
        elif t in ('-H', '--header'):
            i += 1
            hdr = tokens[i] if i < len(tokens) else ''
            ci = hdr.find(':')
            if ci > 0:
                headers.append({
                    'key': hdr[:ci].strip(),
                    'value': hdr[ci+1:].strip()
                })
        elif t in ('-d', '--data', '--data-raw', '--data-binary', '--data-urlencode'):
            i += 1
            data = tokens[i] if i < len(tokens) else ''
        elif t in ('-u', '--user'):
            i += 1
            cred = tokens[i] if i < len(tokens) else ''
            encoded = base64.b64encode(cred.encode()).decode()
            headers.append({
                'key': 'Authorization',
                'value': f'Basic {encoded}'
            })
        elif t == '--url':
            i += 1
            url = tokens[i] if i < len(tokens) else ''
        elif t in ('--compressed', '-k', '--insecure', '-s', '--silent', 
                    '-S', '-L', '--location', '-v', '--verbose'):
            pass  # Skip these flags
        elif t[0] != '-' and not url:
            url = t
        
        i += 1
    
    if data and method == 'GET':
        method = 'POST'
    
    body_type = 'none'
    body_content = ''
    if data:
        body_content = data
        try:
            json.loads(data)
            body_type = 'json'
        except (json.JSONDecodeError, ValueError):
            body_type = 'text'
    
    return {
        'method': method,
        'url': url,
        'headers': headers,
        'body_type': body_type,
        'body_content': body_content
    }


def _tokenize(cmd):
    """Tokenize a cURL command string"""
    tokens = []
    i = 0
    while i < len(cmd):
        while i < len(cmd) and cmd[i] == ' ':
            i += 1
        if i >= len(cmd):
            break
        
        if cmd[i] in ("'", '"'):
            quote = cmd[i]
            i += 1
            tok = ''
            while i < len(cmd) and cmd[i] != quote:
                if cmd[i] == '\\' and i + 1 < len(cmd):
                    i += 1
                    tok += cmd[i]
                else:
                    tok += cmd[i]
                i += 1
            i += 1  # Skip closing quote
            tokens.append(tok)
        else:
            tok = ''
            while i < len(cmd) and cmd[i] != ' ':
                tok += cmd[i]
                i += 1
            tokens.append(tok)
    
    return tokens


# ═══════════════════════════════════════════
#  FLASK APPLICATION
# ═══════════════════════════════════════════

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(BASE_DIR, 'public')

app = Flask(__name__, static_folder=None)
CORS(app)

# Increase max request size to 10MB
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024

# ─── Remove security headers that cause CSP issues ──────────
@app.after_request
def remove_csp_headers(response):
    response.headers.pop('Content-Security-Policy', None)
    response.headers.pop('X-Content-Security-Policy', None)
    response.headers.pop('X-WebKit-CSP', None)
    response.headers['X-Content-Type-Options'] = 'nosniff'
    return response


# ─── Favicon route ──────────────────────────────────────────
@app.route('/favicon.ico')
def favicon():
    # Minimal 1x1 transparent PNG in base64
    favicon_data = base64.b64decode(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
    )
    response = app.response_class(
        response=favicon_data,
        mimetype='image/png',
        headers={'Cache-Control': 'public, max-age=604800'}
    )
    return response


# ═══════════════════════════════════════════════════════════════
#  COLLECTIONS API
# ═══════════════════════════════════════════════════════════════

@app.route('/api/collections', methods=['GET'])
def get_collections():
    """List all collections (tree structure)"""
    try:
        collections = Collections.get_all()
        return jsonify({'success': True, 'data': collections})
    except Exception as err:
        return jsonify({'success': False, 'error': str(err)}), 500


@app.route('/api/collections/reorder', methods=['PUT'])
def reorder_collections():
    """Reorder collections that share the same parent."""
    try:
        body = request.get_json(silent=True) or {}
        if 'ordered_ids' not in body:
            return jsonify({'success': False, 'error': 'ordered_ids required'}), 400

        result = Collections.reorder(body.get('parent_id'), body.get('ordered_ids'))
        return jsonify({'success': True, 'data': result})
    except Exception as err:
        return jsonify({'success': False, 'error': str(err)}), 400


@app.route('/api/collections/<int:id>', methods=['GET'])
def get_collection(id):
    """Get single collection with requests"""
    try:
        col = Collections.get_by_id(id)
        if not col:
            return jsonify({'success': False, 'error': 'Collection not found'}), 404
        return jsonify({'success': True, 'data': col})
    except Exception as err:
        return jsonify({'success': False, 'error': str(err)}), 500


@app.route('/api/collections', methods=['POST'])
def create_collection():
    """Create a new collection"""
    try:
        col = Collections.create(request.get_json(silent=True) or {})
        return jsonify({'success': True, 'data': col}), 201
    except Exception as err:
        return jsonify({'success': False, 'error': str(err)}), 400


@app.route('/api/collections/<int:id>', methods=['PUT'])
def update_collection(id):
    """Update a collection"""
    try:
        col = Collections.update(id, request.get_json(silent=True) or {})
        return jsonify({'success': True, 'data': col})
    except Exception as err:
        return jsonify({'success': False, 'error': str(err)}), 400


@app.route('/api/collections/<int:id>', methods=['DELETE'])
def delete_collection(id):
    """Delete a collection"""
    try:
        result = Collections.delete(id)
        return jsonify({'success': True, 'data': result})
    except Exception as err:
        return jsonify({'success': False, 'error': str(err)}), 400


@app.route('/api/collections/<int:id>/duplicate', methods=['POST'])
def duplicate_collection(id):
    """Duplicate a collection"""
    try:
        col = Collections.duplicate(id)
        return jsonify({'success': True, 'data': col})
    except Exception as err:
        return jsonify({'success': False, 'error': str(err)}), 400


# ═══════════════════════════════════════════════════════════════
#  REQUESTS API
# ═══════════════════════════════════════════════════════════════

@app.route('/api/requests/reorder', methods=['PUT'])
def reorder_requests():
    """Reorder requests within a collection."""
    try:
        body = request.get_json(silent=True) or {}
        collection_id = body.get('collection_id')
        if not collection_id:
            return jsonify({'success': False, 'error': 'collection_id required'}), 400
        if 'ordered_ids' not in body:
            return jsonify({'success': False, 'error': 'ordered_ids required'}), 400

        result = Requests.reorder(collection_id, body.get('ordered_ids'))
        return jsonify({'success': True, 'data': result})
    except Exception as err:
        return jsonify({'success': False, 'error': str(err)}), 400


@app.route('/api/requests/<int:id>', methods=['GET'])
def get_request(id):
    """Get single request"""
    try:
        req = Requests.get_by_id(id)
        if not req:
            return jsonify({'success': False, 'error': 'Request not found'}), 404
        return jsonify({'success': True, 'data': req})
    except Exception as err:
        return jsonify({'success': False, 'error': str(err)}), 500


@app.route('/api/collections/<int:id>/requests', methods=['GET'])
def get_collection_requests(id):
    """Get all requests in a collection"""
    try:
        reqs = Requests.get_by_collection(id)
        return jsonify({'success': True, 'data': reqs})
    except Exception as err:
        return jsonify({'success': False, 'error': str(err)}), 500


@app.route('/api/requests', methods=['POST'])
def create_request():
    """Create a new request"""
    try:
        req = Requests.create(request.get_json(silent=True) or {})
        return jsonify({'success': True, 'data': req}), 201
    except Exception as err:
        return jsonify({'success': False, 'error': str(err)}), 400


@app.route('/api/requests/<int:id>', methods=['PUT'])
def update_request(id):
    """Update a request"""
    try:
        req = Requests.update(id, request.get_json(silent=True) or {})
        return jsonify({'success': True, 'data': req})
    except Exception as err:
        return jsonify({'success': False, 'error': str(err)}), 400


@app.route('/api/requests/<int:id>', methods=['DELETE'])
def delete_request(id):
    """Delete a request"""
    try:
        result = Requests.delete(id)
        return jsonify({'success': True, 'data': result})
    except Exception as err:
        return jsonify({'success': False, 'error': str(err)}), 400


@app.route('/api/requests/<int:id>/duplicate', methods=['POST'])
def duplicate_request(id):
    """Duplicate a request"""
    try:
        req = Requests.duplicate(id)
        return jsonify({'success': True, 'data': req})
    except Exception as err:
        return jsonify({'success': False, 'error': str(err)}), 400


@app.route('/api/requests/<int:id>/move', methods=['PUT'])
def move_request(id):
    """Move request to another collection"""
    try:
        body = request.get_json(silent=True) or {}
        collection_id = body.get('collection_id')
        if not collection_id:
            return jsonify({'success': False, 'error': 'collection_id required'}), 400
        req = Requests.move(id, collection_id)
        return jsonify({'success': True, 'data': req})
    except Exception as err:
        return jsonify({'success': False, 'error': str(err)}), 400


# ═══════════════════════════════════════════════════════════════
#  REQUEST INSTANCES API
# ═══════════════════════════════════════════════════════════════

@app.route('/api/requests/<int:id>/instances', methods=['GET'])
def get_request_instances(id):
    """Get saved instances for a request"""
    try:
        instances = RequestInstances.get_by_request(id)
        return jsonify({'success': True, 'data': instances})
    except ValueError as err:
        return jsonify({'success': False, 'error': str(err)}), 404
    except Exception as err:
        return jsonify({'success': False, 'error': str(err)}), 500


@app.route('/api/requests/<int:id>/instances', methods=['POST'])
def create_request_instance(id):
    """Create a saved instance for a request"""
    try:
        instance = RequestInstances.create(id, request.get_json(silent=True) or {})
        return jsonify({'success': True, 'data': instance}), 201
    except Exception as err:
        return jsonify({'success': False, 'error': str(err)}), 400


@app.route('/api/request-instances/<int:instance_id>', methods=['GET'])
def get_request_instance(instance_id):
    """Get a saved request instance"""
    try:
        instance = RequestInstances.get_by_id(instance_id)
        if not instance:
            return jsonify({'success': False, 'error': 'Request instance not found'}), 404
        return jsonify({'success': True, 'data': instance})
    except Exception as err:
        return jsonify({'success': False, 'error': str(err)}), 500


@app.route('/api/request-instances/<int:instance_id>', methods=['PUT'])
def update_request_instance(instance_id):
    """Update a saved request instance"""
    try:
        instance = RequestInstances.update(instance_id, request.get_json(silent=True) or {})
        return jsonify({'success': True, 'data': instance})
    except Exception as err:
        return jsonify({'success': False, 'error': str(err)}), 400


@app.route('/api/request-instances/<int:instance_id>', methods=['DELETE'])
def delete_request_instance(instance_id):
    """Delete a saved request instance"""
    try:
        result = RequestInstances.delete(instance_id)
        return jsonify({'success': True, 'data': result})
    except Exception as err:
        return jsonify({'success': False, 'error': str(err)}), 400


# ═══════════════════════════════════════════════════════════════
#  IMPORT — Postman collection / cURL into DB
# ═══════════════════════════════════════════════════════════════

@app.route('/api/import', methods=['POST'])
def import_data():
    """Import Postman collection or cURL command"""
    try:
        body = request.get_json(silent=True) or {}
        data = body.get('data')
        import_type = body.get('type')
        
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        if import_type == 'postman':
            imported = import_postman_to_db(data)
            return jsonify({'success': True, 'data': imported})
        elif import_type == 'curl':
            parsed = parse_curl_to_request(data)
            return jsonify({'success': True, 'data': parsed})
        else:
            return jsonify({
                'success': False, 
                'error': 'Unknown import type. Use "postman" or "curl".'
            }), 400
    except Exception as err:
        return jsonify({'success': False, 'error': str(err)}), 400


# ═══════════════════════════════════════════════════════════════
#  PROXY ENDPOINT
# ═══════════════════════════════════════════════════════════════

@app.route('/api/proxy', methods=['POST'])
def proxy_request():
    """Proxy an HTTP request"""
    body = request.get_json(silent=True) or {}
    url = body.get('url')
    method = body.get('method', 'GET')
    headers = body.get('headers', {})
    req_body = body.get('body', None)
    content_type = body.get('contentType', None)
    
    if not url:
        return jsonify({'error': 'URL is required'}), 400
    
    try:
        fetch_headers = {}
        
        # Process headers
        if isinstance(headers, dict):
            for k, v in headers.items():
                if k and v:
                    fetch_headers[k] = v
        
        if req_body and method not in ('GET', 'HEAD'):
            if content_type and content_type != 'multipart/form-data':
                fetch_headers['Content-Type'] = content_type
        
        # Make the request
        start_time = datetime.now(timezone.utc)
        
        response = http_requests.request(
            method=method,
            url=url,
            headers=fetch_headers,
            data=req_body if req_body else None,
            allow_redirects=True,
            timeout=30
        )
        
        elapsed = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
        
        # Get response headers
        resp_headers = dict(response.headers)
        
        # Parse response body
        resp_text = response.text
        try:
            parsed_body = response.json()
        except (json.JSONDecodeError, ValueError):
            parsed_body = resp_text
        
        return jsonify({
            'status': response.status_code,
            'statusText': response.reason,
            'headers': resp_headers,
            'body': parsed_body,
            'time': int(elapsed)
        })
    except http_requests.exceptions.Timeout:
        return jsonify({
            'status': 0,
            'statusText': 'Timeout',
            'error': 'Request timed out after 30 seconds',
            'body': 'Proxy error: Request timed out'
        }), 500
    except http_requests.exceptions.ConnectionError as err:
        return jsonify({
            'status': 0,
            'statusText': 'Connection Error',
            'error': str(err),
            'body': f'Proxy error: {str(err)}'
        }), 500
    except Exception as err:
        return jsonify({
            'status': 0,
            'statusText': 'Error',
            'error': str(err),
            'body': f'Proxy error: {str(err)}'
        }), 500


# ═══════════════════════════════════════════════════════════════
#  STATIC FILES & SPA CATCH-ALL
# ═══════════════════════════════════════════════════════════════

@app.route('/')
def index():
    """Serve the main index.html"""
    return send_from_directory(PUBLIC_DIR, 'index.html')


@app.route('/<path:path>')
def serve_static(path):
    """Serve static files and fallback to index.html for SPA"""
    # Check if file exists in public folder
    full_path = os.path.join(PUBLIC_DIR, path)
    if os.path.isfile(full_path):
        return send_from_directory(PUBLIC_DIR, path)
    # SPA fallback
    return send_from_directory(PUBLIC_DIR, 'index.html')


# ═══════════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════════

if __name__ == '__main__':
    import sys
    
    port = int(os.environ.get('PORT', 3001))
    
    print('')
    print('  ╔══════════════════════════════════════╗')
    print('  ║   📮 PostBoy is running!              ║')
    print(f'  ║   http://localhost:{port}               ║')
    print('  ║   SQLite DB: postboy-data.db          ║')
    print('  ╚══════════════════════════════════════╝')
    print('')
    
    # Try to start server with port fallback
    max_attempts = 5
    for attempt in range(max_attempts):
        try:
            app.run(
                host='0.0.0.0',
                port=port,
                debug=False,
                use_reloader=False
            )
            break
        except OSError as e:
            if e.errno == 48 or 'Address already in use' in str(e):  # EADDRINUSE
                if attempt < max_attempts - 1:
                    original_port = port
                    port += 1
                    print(f'  ⚠️  Port {original_port} busy, trying {port}...')
                else:
                    print(f'  ❌ Could not find available port after {max_attempts} attempts')
                    sys.exit(1)
            else:
                print(f'Server error: {e}')
                sys.exit(1)