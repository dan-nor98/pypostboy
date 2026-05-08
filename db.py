# ============================================================
#  PostBoy – SQLite Database (Python - Flask Edition)
#  Uses sqlite3 - built into Python, no extra dependencies
# ============================================================

import sqlite3
import json
import os
from datetime import datetime, timezone
from threading import Lock

DB_PATH = os.path.join(os.path.dirname(__file__), 'postboy-data.db')

class Database:
    _instance = None
    _lock = Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    instance = super().__new__(cls)
                    instance._initialized = False
                    cls._instance = instance
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self.conn = None
        self._ready = False
        self.init_database()
    
    def init_database(self):
        """Initialize database and create tables"""
        # Use WAL mode for better concurrent access
        self.conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA journal_mode=WAL")
        self.conn.execute("PRAGMA foreign_keys=ON")
        
        cursor = self.conn.cursor()
        
        # Create collections table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS collections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT DEFAULT '',
                parent_id INTEGER REFERENCES collections(id) ON DELETE CASCADE,
                sort_order INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        
        # Create requests table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                method TEXT NOT NULL DEFAULT 'GET',
                url TEXT DEFAULT '',
                headers TEXT DEFAULT '[]',
                body_type TEXT DEFAULT 'none',
                body_content TEXT DEFAULT '',
                body_raw_type TEXT DEFAULT 'application/json',
                form_data TEXT DEFAULT '[]',
                auth_type TEXT DEFAULT 'none',
                auth_data TEXT DEFAULT '{}',
                sort_order INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        
        # Create indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_collections_parent_id ON collections(parent_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_requests_collection_id ON requests(collection_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_collections_sort_order ON collections(sort_order)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_requests_sort_order ON requests(sort_order)")
        
        self.conn.commit()
        self._ready = True
        print(f'[DB] SQLite database initialized at {DB_PATH}')
    
    def is_ready(self):
        return self._ready
    
    def save(self):
        """Commit changes (sqlite3 auto-commits but this ensures it)"""
        if self.conn:
            self.conn.commit()


# ═══════════════════════════════════════════
#  HELPER FUNCTIONS
# ═══════════════════════════════════════════

def timestamp():
    return datetime.now(timezone.utc).isoformat()

def safe_parse(val, fallback=None):
    """Safely parse JSON string to object"""
    if val is None:
        return fallback
    if isinstance(val, (dict, list)):
        return val
    if isinstance(val, str):
        try:
            return json.loads(val)
        except (json.JSONDecodeError, TypeError):
            return fallback
    return fallback

def safe_stringify(val, fallback='[]'):
    """Safely convert object to JSON string"""
    if val is None:
        return fallback
    if isinstance(val, str):
        try:
            json.loads(val)
            return val
        except (json.JSONDecodeError, TypeError):
            return fallback
    try:
        return json.dumps(val)
    except (TypeError, ValueError):
        return fallback

def row_to_dict(row):
    """Convert sqlite3.Row to dict"""
    if row is None:
        return None
    return dict(row)

def rows_to_list(rows):
    """Convert list of sqlite3.Row to list of dicts"""
    return [dict(row) for row in rows]


# ═══════════════════════════════════════════
#  DATABASE ACCESS SINGLETON
# ═══════════════════════════════════════════

db = Database()


# ═══════════════════════════════════════════
#  COLLECTIONS
# ═══════════════════════════════════════════

class Collections:
    
    @staticmethod
    def get_all():
        """Get all collections in tree structure"""
        all_cols = db.conn.execute(
            "SELECT * FROM collections ORDER BY sort_order ASC, id ASC"
        ).fetchall()
        
        # Build map
        col_map = {}
        for c in all_cols:
            c_dict = dict(c)
            c_dict['children'] = []
            c_dict['requests'] = []
            col_map[c_dict['id']] = c_dict
        
        # Get all requests
        all_reqs = db.conn.execute(
            "SELECT * FROM requests ORDER BY sort_order ASC, id ASC"
        ).fetchall()
        
        for r in all_reqs:
            r_dict = dict(r)
            r_dict['headers'] = safe_parse(r_dict['headers'], [])
            r_dict['form_data'] = safe_parse(r_dict['form_data'], [])
            r_dict['auth_data'] = safe_parse(r_dict['auth_data'], {})
            if r_dict['collection_id'] in col_map:
                col_map[r_dict['collection_id']]['requests'].append(r_dict)
        
        # Build tree
        tree = []
        for c_dict in col_map.values():
            if c_dict['parent_id'] and c_dict['parent_id'] in col_map:
                col_map[c_dict['parent_id']]['children'].append(c_dict)
            elif not c_dict['parent_id']:
                tree.append(c_dict)
        
        return tree
    
    @staticmethod
    def get_by_id(id):
        """Get single collection by ID with children and requests"""
        col = db.conn.execute(
            "SELECT * FROM collections WHERE id = ?", (id,)
        ).fetchone()
        
        if not col:
            return None
        
        result = dict(col)
        result['children'] = []
        result['requests'] = []
        
        # Get children
        children = db.conn.execute(
            """SELECT * FROM collections 
               WHERE parent_id = ? 
               ORDER BY sort_order ASC, id ASC""",
            (id,)
        ).fetchall()
        
        result['children'] = rows_to_list(children)
        
        # Get requests
        reqs = db.conn.execute(
            """SELECT * FROM requests 
               WHERE collection_id = ? 
               ORDER BY sort_order ASC, id ASC""",
            (id,)
        ).fetchall()
        
        for r in reqs:
            r_dict = dict(r)
            r_dict['headers'] = safe_parse(r_dict['headers'], [])
            r_dict['form_data'] = safe_parse(r_dict['form_data'], [])
            r_dict['auth_data'] = safe_parse(r_dict['auth_data'], {})
            result['requests'].append(r_dict)
        
        return result
    
    @staticmethod
    def create(data=None):
        """Create a new collection"""
        data = data or {}
        name = data.get('name', 'New Collection')
        parent_id = data.get('parent_id', None)
        description = data.get('description', '')
        
        # Get max sort order
        if parent_id is not None:
            max_order_row = db.conn.execute(
                """SELECT COALESCE(MAX(sort_order), -1) as max_order 
                   FROM collections WHERE parent_id = ?""",
                (parent_id,)
            ).fetchone()
        else:
            max_order_row = db.conn.execute(
                """SELECT COALESCE(MAX(sort_order), -1) as max_order 
                   FROM collections WHERE parent_id IS NULL"""
            ).fetchone()
        
        max_order = max_order_row['max_order'] if max_order_row else -1
        
        cursor = db.conn.execute(
            """INSERT INTO collections (name, description, parent_id, sort_order, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (name, description, parent_id, max_order + 1, timestamp(), timestamp())
        )
        
        new_id = cursor.lastrowid
        
        return Collections.get_by_id(new_id)
    
    @staticmethod
    def update(id, data):
        """Update a collection"""
        col = Collections.get_by_id(id)
        if not col:
            raise ValueError('Collection not found')
        
        updates = []
        params = []
        
        if 'name' in data:
            updates.append('name = ?')
            params.append(data['name'])
        if 'description' in data:
            updates.append('description = ?')
            params.append(data['description'])
        if 'parent_id' in data:
            updates.append('parent_id = ?')
            params.append(data['parent_id'] or None)
        if 'sort_order' in data:
            updates.append('sort_order = ?')
            params.append(data['sort_order'])
        
        updates.append('updated_at = ?')
        params.append(timestamp())
        params.append(id)
        
        db.conn.execute(
            f"UPDATE collections SET {', '.join(updates)} WHERE id = ?",
            params
        )
        
        return Collections.get_by_id(id)
    
    @staticmethod
    def delete(id):
        """Delete a collection and all its children recursively"""
        # Get all child collection IDs
        ids_to_delete = [id]
        to_process = [id]
        
        while to_process:
            current_id = to_process.pop()
            children = db.conn.execute(
                "SELECT id FROM collections WHERE parent_id = ?",
                (current_id,)
            ).fetchall()
            
            for child in children:
                child_id = child['id']
                ids_to_delete.append(child_id)
                to_process.append(child_id)
        
        # Delete requests for all affected collections
        for col_id in ids_to_delete:
            db.conn.execute("DELETE FROM requests WHERE collection_id = ?", (col_id,))
        
        # Delete collections
        for col_id in ids_to_delete:
            db.conn.execute("DELETE FROM collections WHERE id = ?", (col_id,))
        
        db.save()
        
        return {'deleted': len(ids_to_delete)}
    
    @staticmethod
    def duplicate(id):
        """Duplicate a collection including all children and requests"""
        original = Collections.get_by_id(id)
        if not original:
            raise ValueError('Collection not found')
        
        new_col = Collections.create({
            'name': original['name'] + ' (copy)',
            'parent_id': original['parent_id'],
            'description': original['description'] or ''
        })
        
        # Duplicate requests
        reqs = db.conn.execute(
            "SELECT * FROM requests WHERE collection_id = ?", (id,)
        ).fetchall()
        
        for r in reqs:
            Requests.create({
                'collection_id': new_col['id'],
                'name': r['name'],
                'method': r['method'],
                'url': r['url'],
                'headers': safe_parse(r['headers'], []),
                'body_type': r['body_type'],
                'body_content': r['body_content'],
                'body_raw_type': r['body_raw_type'],
                'form_data': safe_parse(r['form_data'], []),
                'auth_type': r['auth_type'],
                'auth_data': safe_parse(r['auth_data'], {})
            })
        
        # Duplicate children recursively
        children = db.conn.execute(
            "SELECT * FROM collections WHERE parent_id = ?", (id,)
        ).fetchall()
        
        for child in children:
            _duplicate_collection_recursive(child['id'], new_col['id'])
        
        return Collections.get_by_id(new_col['id'])


def _duplicate_collection_recursive(original_id, new_parent_id):
    """Recursive helper for collection duplication"""
    original = db.conn.execute(
        "SELECT * FROM collections WHERE id = ?", (original_id,)
    ).fetchone()
    
    if not original:
        return
    
    new_col = Collections.create({
        'name': original['name'],
        'parent_id': new_parent_id,
        'description': original['description'] or ''
    })
    
    # Duplicate requests
    reqs = db.conn.execute(
        "SELECT * FROM requests WHERE collection_id = ?", (original_id,)
    ).fetchall()
    
    for r in reqs:
        Requests.create({
            'collection_id': new_col['id'],
            'name': r['name'],
            'method': r['method'],
            'url': r['url'],
            'headers': safe_parse(r['headers'], []),
            'body_type': r['body_type'],
            'body_content': r['body_content'],
            'body_raw_type': r['body_raw_type'],
            'form_data': safe_parse(r['form_data'], []),
            'auth_type': r['auth_type'],
            'auth_data': safe_parse(r['auth_data'], {})
        })
    
    # Process children
    children = db.conn.execute(
        "SELECT * FROM collections WHERE parent_id = ?", (original_id,)
    ).fetchall()
    
    for child in children:
        _duplicate_collection_recursive(child['id'], new_col['id'])


# ═══════════════════════════════════════════
#  REQUESTS
# ═══════════════════════════════════════════

class Requests:
    
    @staticmethod
    def get_by_id(id):
        """Get a single request by ID"""
        req = db.conn.execute(
            "SELECT * FROM requests WHERE id = ?", (id,)
        ).fetchone()
        
        if not req:
            return None
        
        result = dict(req)
        result['headers'] = safe_parse(result['headers'], [])
        result['form_data'] = safe_parse(result['form_data'], [])
        result['auth_data'] = safe_parse(result['auth_data'], {})
        return result
    
    @staticmethod
    def get_by_collection(collection_id):
        """Get all requests in a collection"""
        reqs = db.conn.execute(
            """SELECT * FROM requests 
               WHERE collection_id = ? 
               ORDER BY sort_order ASC, id ASC""",
            (collection_id,)
        ).fetchall()
        
        result = []
        for r in reqs:
            r_dict = dict(r)
            r_dict['headers'] = safe_parse(r_dict['headers'], [])
            r_dict['form_data'] = safe_parse(r_dict['form_data'], [])
            r_dict['auth_data'] = safe_parse(r_dict['auth_data'], {})
            result.append(r_dict)
        
        return result
    
    @staticmethod
    def create(data=None):
        """Create a new request"""
        data = data or {}
        if 'collection_id' not in data:
            raise ValueError('collection_id is required')
        
        # Get max sort order
        max_order_row = db.conn.execute(
            """SELECT COALESCE(MAX(sort_order), -1) as max_order 
               FROM requests WHERE collection_id = ?""",
            (data['collection_id'],)
        ).fetchone()
        
        max_order = max_order_row['max_order'] if max_order_row else -1
        
        cursor = db.conn.execute(
            """INSERT INTO requests (
                collection_id, name, method, url, headers,
                body_type, body_content, body_raw_type, form_data,
                auth_type, auth_data, sort_order, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                data['collection_id'],
                data.get('name', 'New Request'),
                data.get('method', 'GET').upper(),
                data.get('url', ''),
                safe_stringify(data.get('headers'), '[]'),
                data.get('body_type', 'none'),
                data.get('body_content', data.get('body_raw', '')),
                data.get('body_raw_type', 'application/json'),
                safe_stringify(data.get('form_data'), '[]'),
                data.get('auth_type', 'none'),
                safe_stringify(data.get('auth_data'), '{}'),
                max_order + 1,
                timestamp(),
                timestamp()
            )
        )
        
        new_id = cursor.lastrowid
        
        return Requests.get_by_id(new_id)
    
    @staticmethod
    def update(id, data):
        """Update a request"""
        req = Requests.get_by_id(id)
        if not req:
            raise ValueError('Request not found')
        
        updates = []
        params = []
        
        field_mapping = {
            'name': 'name',
            'method': 'method',
            'url': 'url',
            'body_type': 'body_type',
            'body_content': 'body_content',
            'body_raw': 'body_content',  # alias
            'body_raw_type': 'body_raw_type',
            'collection_id': 'collection_id',
            'sort_order': 'sort_order',
            'auth_type': 'auth_type'
        }
        
        for key, db_field in field_mapping.items():
            if key in data:
                value = data[key]
                if key == 'method':
                    value = value.upper()
                updates.append(f'{db_field} = ?')
                params.append(value)
        
        if 'headers' in data:
            updates.append('headers = ?')
            params.append(safe_stringify(data['headers'], '[]'))
        if 'form_data' in data:
            updates.append('form_data = ?')
            params.append(safe_stringify(data['form_data'], '[]'))
        if 'auth_data' in data:
            updates.append('auth_data = ?')
            params.append(safe_stringify(data['auth_data'], '{}'))
        
        updates.append('updated_at = ?')
        params.append(timestamp())
        params.append(id)
        
        db.conn.execute(
            f"UPDATE requests SET {', '.join(updates)} WHERE id = ?",
            params
        )
        
        return Requests.get_by_id(id)
    
    @staticmethod
    def delete(id):
        """Delete a request"""
        result = db.conn.execute(
            "SELECT id FROM requests WHERE id = ?", (id,)
        ).fetchone()
        
        if not result:
            return {'deleted': 0}
        
        db.conn.execute("DELETE FROM requests WHERE id = ?", (id,))
        
        return {'deleted': 1}
    
    @staticmethod
    def duplicate(id):
        """Duplicate a request"""
        original = Requests.get_by_id(id)
        if not original:
            raise ValueError('Request not found')
        
        return Requests.create({
            'collection_id': original['collection_id'],
            'name': original['name'] + ' (copy)',
            'method': original['method'],
            'url': original['url'],
            'headers': original['headers'],
            'body_type': original['body_type'],
            'body_content': original['body_content'],
            'body_raw_type': original['body_raw_type'],
            'form_data': original['form_data'],
            'auth_type': original['auth_type'],
            'auth_data': original['auth_data']
        })
    
    @staticmethod
    def move(id, new_collection_id):
        """Move request to another collection"""
        req = Requests.get_by_id(id)
        if not req:
            raise ValueError('Request not found')
        
        target_col = Collections.get_by_id(new_collection_id)
        if not target_col:
            raise ValueError('Target collection not found')
        
        db.conn.execute(
            "UPDATE requests SET collection_id = ?, updated_at = ? WHERE id = ?",
            (new_collection_id, timestamp(), id)
        )
        
        return Requests.get_by_id(id)