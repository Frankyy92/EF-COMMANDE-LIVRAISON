#!/usr/bin/env python3

"""
A lightweight RESTful API server implemented using only Python's standard
library. This server manages categories, products, boutiques, orders and
users for a bakery ordering system. It uses SQLite for persistence and
reads an initial catalogue from a JSON file (``categories_products.json``).

Endpoints (under the "/api" prefix) provide CRUD operations for categories
and products, order management (create/update/finalise), aggregation of
orders for the laboratory, delivery plans, user authentication by
identifier only, and log retrieval. Authentication is simplified: the
client must send an ``X-User-Id`` header with the identifier returned
from the ``/api/login`` endpoint. Users are associated with a role
(admin, labo, boutique, livreur) determining access rights.

This implementation avoids any external dependencies by using the
``http.server`` module for HTTP handling and ``sqlite3`` for data
storage. It is not intended for high-load production use but provides a
straightforward demonstration that can be deployed on platforms like
Render. For production deployment, consider using a more robust
framework (Flask, FastAPI, Express.js) and a proper authentication
mechanism.
"""

import json
import os
import sqlite3
import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

DATABASE_PATH = os.path.join(os.path.dirname(__file__), 'database.db')
CATALOGUE_JSON = os.path.join(os.path.dirname(__file__), '..', 'categories_products.json')


def init_db():
    """Create tables if they don't exist and populate initial data."""
    conn = sqlite3.connect(DATABASE_PATH)
    c = conn.cursor()
    # Enable foreign keys
    c.execute('PRAGMA foreign_keys = ON')
    # Create tables
    c.execute('''CREATE TABLE IF NOT EXISTS categories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL
                 )''')
    c.execute('''CREATE TABLE IF NOT EXISTS products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    category_id INTEGER NOT NULL,
                    FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE
                 )''')
    c.execute('''CREATE TABLE IF NOT EXISTS boutiques (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    address TEXT
                 )''')
    c.execute('''CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    role TEXT NOT NULL,
                    boutique_id INTEGER,
                    FOREIGN KEY(boutique_id) REFERENCES boutiques(id)
                 )''')
    c.execute('''CREATE TABLE IF NOT EXISTS orders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date TEXT NOT NULL,
                    status TEXT DEFAULT 'pending',
                    boutique_id INTEGER NOT NULL,
                    user_id INTEGER,
                    created_at TEXT,
                    updated_at TEXT,
                    FOREIGN KEY(boutique_id) REFERENCES boutiques(id),
                    FOREIGN KEY(user_id) REFERENCES users(id)
                 )''')
    c.execute('''CREATE TABLE IF NOT EXISTS order_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    order_id INTEGER NOT NULL,
                    product_id INTEGER NOT NULL,
                    quantity INTEGER NOT NULL,
                    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
                    FOREIGN KEY(product_id) REFERENCES products(id)
                 )''')
    c.execute('''CREATE TABLE IF NOT EXISTS logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    action TEXT NOT NULL,
                    details TEXT,
                    timestamp TEXT,
                    FOREIGN KEY(user_id) REFERENCES users(id)
                 )''')
    conn.commit()
    # Populate catalogue if empty
    c.execute('SELECT COUNT(*) FROM categories')
    if c.fetchone()[0] == 0:
        try:
            with open(CATALOGUE_JSON, encoding='utf-8') as f:
                catalogue = json.load(f)
            for category_name, products in catalogue.items():
                category_name_clean = category_name.strip()
                c.execute('INSERT INTO categories (name) VALUES (?)', (category_name_clean,))
                cat_id = c.lastrowid
                for prod in products:
                    # Skip obvious non-product entries (addresses, comments)
                    up = prod.upper()
                    if any(keyword in up for keyword in ['BOUTIQUE', 'DATE DE LIVRAISON', 'PRODUIT']):
                        continue
                    c.execute('INSERT OR IGNORE INTO products (name, category_id) VALUES (?, ?)', (prod.strip(), cat_id))
            conn.commit()
        except Exception as e:
            # Fallback to simple catalogue
            print('Failed to import catalogue:', e)
            fallback = {
                'Viennoiserie': ['Croissant', 'Pain Au Chocolat', 'Pain Aux Raisins'],
                'Patisserie': ['Éclair Chocolat', 'Tartelette Fraise', 'Religieuse'],
                'Traiteur': ['Quiche Lorraine', 'Croque Monsieur'],
                'Gateau De Voyage': ['Financier', 'Madeleine'],
                'Petits Fours Sec': ['Mendiants', 'Diamant Choco']
            }
            for category_name, products in fallback.items():
                c.execute('INSERT INTO categories (name) VALUES (?)', (category_name,))
                cat_id = c.lastrowid
                for prod in products:
                    c.execute('INSERT INTO products (name, category_id) VALUES (?, ?)', (prod, cat_id))
            conn.commit()
    conn.close()


def log_action(conn, user_id, action, details=None):
    """Insert a log entry into the logs table."""
    timestamp = datetime.datetime.utcnow().isoformat()
    conn.execute('INSERT INTO logs (user_id, action, details, timestamp) VALUES (?, ?, ?, ?)',
                 (user_id, action, details, timestamp))
    conn.commit()


class RequestHandler(BaseHTTPRequestHandler):
    server_version = "BakeryHTTP/0.1"

    def _parse_path(self):
        parsed = urlparse(self.path)
        raw_path = parsed.path or '/'
        if raw_path.startswith('/backend'):
            stripped = raw_path[len('/backend'):]
            if not stripped:
                raw_path = '/'
            else:
                raw_path = stripped if stripped.startswith('/') else f'/{stripped}'
        normalised = raw_path if raw_path == '/' else raw_path.rstrip('/')
        path_parts = normalised.lstrip('/').split('/') if normalised != '/' else ['']
        return parsed, raw_path, normalised, path_parts

    def _set_headers(self, status_code=200, content_type='application/json'):
        self.send_response(status_code)
        self.send_header('Content-Type', content_type)
        # Allow CORS for simplicity
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-User-Id')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.end_headers()

    def do_OPTIONS(self):
        # Respond to CORS preflight
        self._set_headers(200)

    def parse_json_body(self):
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length == 0:
            return {}
        try:
            body = self.rfile.read(content_length)
            return json.loads(body.decode('utf-8'))
        except Exception:
            return {}

    def get_user(self, conn):
        user_id = self.headers.get('X-User-Id')
        if not user_id:
            return None
        try:
            user_id = int(user_id)
        except ValueError:
            return None
        cur = conn.execute('SELECT id, username, role, boutique_id FROM users WHERE id=?', (user_id,))
        row = cur.fetchone()
        if row:
            return {
                'id': row[0],
                'username': row[1],
                'role': row[2],
                'boutique_id': row[3]
            }
        return None

    def handle_login(self, conn):
        data = self.parse_json_body()
        # Accept "identifier" as an alias for backward compatibility with older frontends
        username = data.get('username') or data.get('identifier')
        role = data.get('role')
        boutique_name = data.get('boutique_name')
        if not username or not role:
            self._set_headers(400)
            self.wfile.write(json.dumps({'error': 'username and role required'}).encode())
            return
        # Check if user exists
        cur = conn.execute('SELECT id, username, role, boutique_id FROM users WHERE username=?', (username,))
        row = cur.fetchone()
        if row:
    user_id = row[0]
    boutique_id = row[3]
    if row[2] == 'boutique' and boutique_id is None and boutique_name:
        cur2 = conn.execute('SELECT id FROM boutiques WHERE name=?', (boutique_name,))
        b = cur2.fetchone()
        if b:
            boutique_id = b[0]
        else:
            conn.execute('INSERT INTO boutiques (name) VALUES (?)', (boutique_name,))
            boutique_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
        conn.execute('UPDATE users SET boutique_id=? WHERE id=?', (boutique_id, user_id))
        conn.commit()
    log_action(conn, user_id, 'login')
    self._set_headers(200)
    self.wfile.write(json.dumps({'user': {'id': row[0], 'username': row[1], 'role': row[2], 'boutique_id': boutique_id}}).encode())
    return
        conn.execute('INSERT INTO users (username, role, boutique_id) VALUES (?, ?, ?)', (username, role, boutique_id))
        user_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
        conn.commit()
        log_action(conn, user_id, 'register', f'role={role}')
        self._set_headers(200)
        self.wfile.write(json.dumps({'user': {'id': user_id, 'username': username, 'role': role, 'boutique_id': boutique_id}}).encode())

    def list_categories(self, conn):
        cur = conn.execute('SELECT id, name FROM categories ORDER BY name ASC')
        categories = [{'id': row[0], 'name': row[1]} for row in cur.fetchall()]
        self._set_headers(200)
        self.wfile.write(json.dumps(categories).encode())

    def _has_catalog_permissions(self, user):
        return bool(user and user.get('role') in ('admin', 'labo'))

    def create_category(self, conn, user):
        data = self.parse_json_body()
        name = data.get('name')
        if not name:
            self._set_headers(400)
            self.wfile.write(json.dumps({'error': 'name is required'}).encode())
            return
        if not self._has_catalog_permissions(user):
            self._set_headers(403)
            self.wfile.write(json.dumps({'error': 'Not authorized'}).encode())
            return
        # Check for duplicate
        cur = conn.execute('SELECT id FROM categories WHERE lower(name)=lower(?)', (name,))
        if cur.fetchone():
            self._set_headers(400)
            self.wfile.write(json.dumps({'error': 'Category already exists'}).encode())
            return
        conn.execute('INSERT INTO categories (name) VALUES (?)', (name.strip(),))
        cat_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
        conn.commit()
        log_action(conn, user['id'], 'create_category', f'Category {name}')
        self._set_headers(201)
        self.wfile.write(json.dumps({'id': cat_id, 'name': name.strip()}).encode())

    def update_or_delete_category(self, conn, user, cat_id, method):
        # Ensure category exists
        cur = conn.execute('SELECT id, name FROM categories WHERE id=?', (cat_id,))
        cat = cur.fetchone()
        if not cat:
            self._set_headers(404)
            self.wfile.write(json.dumps({'error': 'Category not found'}).encode())
            return
        if not self._has_catalog_permissions(user):
            self._set_headers(403)
            self.wfile.write(json.dumps({'error': 'Not authorized'}).encode())
            return
        if method == 'PUT':
            data = self.parse_json_body()
            name = data.get('name')
            if name:
                conn.execute('UPDATE categories SET name=? WHERE id=?', (name.strip(), cat_id))
                conn.commit()
                log_action(conn, user['id'], 'update_category', f'Category {cat_id}')
            self._set_headers(200)
            self.wfile.write(json.dumps({'id': cat_id, 'name': name or cat[1]}).encode())
        elif method == 'DELETE':
            # Delete products in this category (cascade via ON DELETE should handle order_items)
            conn.execute('DELETE FROM categories WHERE id=?', (cat_id,))
            conn.commit()
            log_action(conn, user['id'], 'delete_category', f'Category {cat_id}')
            self._set_headers(200)
            self.wfile.write(json.dumps({'message': 'Category deleted'}).encode())

    def list_products(self, conn, category_id=None):
        if category_id is not None:
            cur = conn.execute('SELECT id, name, category_id FROM products WHERE category_id=? ORDER BY name ASC', (category_id,))
        else:
            cur = conn.execute('SELECT id, name, category_id FROM products ORDER BY name ASC')
        products = [{'id': row[0], 'name': row[1], 'category_id': row[2]} for row in cur.fetchall()]
        self._set_headers(200)
        self.wfile.write(json.dumps(products).encode())

    def create_product(self, conn, user):
        data = self.parse_json_body()
        name = data.get('name')
        category_id = data.get('category_id')
        if not self._has_catalog_permissions(user):
            self._set_headers(403)
            self.wfile.write(json.dumps({'error': 'Not authorized'}).encode())
            return
        if not name or not category_id:
            self._set_headers(400)
            self.wfile.write(json.dumps({'error': 'name and category_id are required'}).encode())
            return
        # Check duplicate
        cur = conn.execute('SELECT id FROM products WHERE lower(name)=lower(?)', (name,))
        if cur.fetchone():
            self._set_headers(400)
            self.wfile.write(json.dumps({'error': 'Product already exists'}).encode())
            return
        # Ensure category exists
        cur = conn.execute('SELECT id FROM categories WHERE id=?', (category_id,))
        if not cur.fetchone():
            self._set_headers(404)
            self.wfile.write(json.dumps({'error': 'Category not found'}).encode())
            return
        conn.execute('INSERT INTO products (name, category_id) VALUES (?, ?)', (name.strip(), category_id))
        prod_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
        conn.commit()
        log_action(conn, user['id'], 'create_product', f'Product {name}')
        self._set_headers(201)
        self.wfile.write(json.dumps({'id': prod_id, 'name': name.strip(), 'category_id': category_id}).encode())

    def update_or_delete_product(self, conn, user, prod_id, method):
        cur = conn.execute('SELECT id, name, category_id FROM products WHERE id=?', (prod_id,))
        product = cur.fetchone()
        if not product:
            self._set_headers(404)
            self.wfile.write(json.dumps({'error': 'Product not found'}).encode())
            return
        if not self._has_catalog_permissions(user):
            self._set_headers(403)
            self.wfile.write(json.dumps({'error': 'Not authorized'}).encode())
            return
        if method == 'PUT':
            data = self.parse_json_body()
            name = data.get('name')
            category_id = data.get('category_id')
            if name:
                conn.execute('UPDATE products SET name=? WHERE id=?', (name.strip(), prod_id))
            if category_id:
                conn.execute('UPDATE products SET category_id=? WHERE id=?', (category_id, prod_id))
            conn.commit()
            log_action(conn, user['id'], 'update_product', f'Product {prod_id}')
            self._set_headers(200)
            self.wfile.write(json.dumps({'id': prod_id, 'name': name or product[1], 'category_id': category_id or product[2]}).encode())
        elif method == 'DELETE':
            # delete product and associated order_items (cascade not specified for product so delete manually)
            conn.execute('DELETE FROM order_items WHERE product_id=?', (prod_id,))
            conn.execute('DELETE FROM products WHERE id=?', (prod_id,))
            conn.commit()
            log_action(conn, user['id'], 'delete_product', f'Product {prod_id}')
            self._set_headers(200)
            self.wfile.write(json.dumps({'message': 'Product deleted'}).encode())

    def list_or_create_orders(self, conn, user):
        if user is None:
            self._set_headers(401)
            self.wfile.write(json.dumps({'error': 'Authentication required'}).encode())
            return
        if self.command == 'GET':
            # Optional filters: date, start_date/end_date range, boutique_id
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            date_str = params.get('date', [None])[0]
            start_date = params.get('start_date', [None])[0]
            end_date = params.get('end_date', [None])[0]
            boutique_filter = params.get('boutique_id', [None])[0]
            query = 'SELECT id, date, status, boutique_id FROM orders'
            conditions = []
            values = []
            if user['role'] == 'boutique':
                conditions.append('boutique_id=?')
                values.append(user['boutique_id'])
            if boutique_filter:
                try:
                    boutique_filter_id = int(boutique_filter)
                except ValueError:
                    self._set_headers(400)
                    self.wfile.write(json.dumps({'error': 'Invalid boutique_id'}).encode())
                    return
                conditions.append('boutique_id=?')
                values.append(boutique_filter_id)
            if date_str:
                try:
                    datetime.datetime.strptime(date_str, '%Y-%m-%d')
                except ValueError:
                    self._set_headers(400)
                    self.wfile.write(json.dumps({'error': 'Invalid date format (YYYY-MM-DD)'}).encode())
                    return
                conditions.append('date=?')
                values.append(date_str)
            else:
                if start_date:
                    try:
                        datetime.datetime.strptime(start_date, '%Y-%m-%d')
                    except ValueError:
                        self._set_headers(400)
                        self.wfile.write(json.dumps({'error': 'Invalid start_date format (YYYY-MM-DD)'}).encode())
                        return
                    conditions.append('date>=?')
                    values.append(start_date)
                if end_date:
                    try:
                        datetime.datetime.strptime(end_date, '%Y-%m-%d')
                    except ValueError:
                        self._set_headers(400)
                        self.wfile.write(json.dumps({'error': 'Invalid end_date format (YYYY-MM-DD)'}).encode())
                        return
                    conditions.append('date<=?')
                    values.append(end_date)
            if conditions:
                query += ' WHERE ' + ' AND '.join(conditions)
            query += ' ORDER BY date DESC, id DESC'
            cur = conn.execute(query, tuple(values))
            orders = []
            for row in cur.fetchall():
                order_id, date, status, boutique_id = row
                # fetch boutique info if available
                boutique_name = None
                boutique_address = None
                if boutique_id:
                    cur_b = conn.execute('SELECT name, address FROM boutiques WHERE id=?', (boutique_id,))
                    b = cur_b.fetchone()
                    if b:
                        boutique_name, boutique_address = b
                # fetch items with names
                cur_items = conn.execute('''
                    SELECT oi.product_id, oi.quantity, p.name
                    FROM order_items oi
                    LEFT JOIN products p ON p.id = oi.product_id
                    WHERE oi.order_id=?
                ''', (order_id,))
                items = []
                for pid, qty, name in cur_items.fetchall():
                    items.append({'product_id': pid, 'quantity': qty, 'product_name': name or ''})
                orders.append({
                    'id': order_id,
                    'date': date,
                    'status': status,
                    'boutique_id': boutique_id,
                    'boutique_name': boutique_name,
                    'boutique_address': boutique_address,
                    'items': items
                })
            self._set_headers(200)
            self.wfile.write(json.dumps(orders).encode())
            return
        elif self.command == 'POST':
            # Create or update order
            data = self.parse_json_body()
            date_str = data.get('date')
            items = data.get('items')
            if not date_str or not items:
                self._set_headers(400)
                self.wfile.write(json.dumps({'error': 'date and items are required'}).encode())
                return
            # Only boutiques or admin can create
            if user['role'] not in ['boutique', 'admin']:
                self._set_headers(403)
                self.wfile.write(json.dumps({'error': 'Not authorized to create orders'}).encode())
                return
            # Determine boutique
            boutique_id = data.get('boutique_id') if user['role'] == 'admin' else user['boutique_id']
            if not boutique_id:
                self._set_headers(400)
                self.wfile.write(json.dumps({'error': 'boutique_id required'}).encode())
                return
            # Upsert order
            cur = conn.execute('SELECT id FROM orders WHERE date=? AND boutique_id=?', (date_str, boutique_id))
            row = cur.fetchone()
            if row:
                order_id = row[0]
                conn.execute('UPDATE orders SET updated_at=? WHERE id=?', (datetime.datetime.utcnow().isoformat(), order_id))
                # clear items
                conn.execute('DELETE FROM order_items WHERE order_id=?', (order_id,))
            else:
                conn.execute('INSERT INTO orders (date, status, boutique_id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
                             (date_str, 'pending', boutique_id, user['id'], datetime.datetime.utcnow().isoformat(), datetime.datetime.utcnow().isoformat()))
                order_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
            # insert items
            for item in items:
                product_id = item.get('product_id')
                quantity = item.get('quantity')
                if not product_id or quantity is None:
                    continue
                conn.execute('INSERT INTO order_items (order_id, product_id, quantity) VALUES (?, ?, ?)',
                             (order_id, product_id, int(quantity)))
            conn.commit()
            log_action(conn, user['id'], 'create_or_update_order', f'Order {order_id} for {date_str}')
            # return order
            cur_order = conn.execute('SELECT date, status, boutique_id FROM orders WHERE id=?', (order_id,)).fetchone()
            cur_items = conn.execute('''
                SELECT oi.product_id, oi.quantity, p.name
                FROM order_items oi
                LEFT JOIN products p ON p.id = oi.product_id
                WHERE oi.order_id=?
            ''', (order_id,))
            items_out = [{'product_id': pid, 'quantity': qty, 'product_name': name or ''}
                         for pid, qty, name in cur_items.fetchall()]
            boutique_name = None
            boutique_address = None
            if cur_order and cur_order[2]:
                cur_b = conn.execute('SELECT name, address FROM boutiques WHERE id=?', (cur_order[2],))
                b = cur_b.fetchone()
                if b:
                    boutique_name, boutique_address = b
            response = {
                'id': order_id,
                'date': cur_order[0] if cur_order else date_str,
                'status': cur_order[1] if cur_order else 'pending',
                'boutique_id': cur_order[2] if cur_order else boutique_id,
                'boutique_name': boutique_name,
                'boutique_address': boutique_address,
                'items': items_out
            }
            self._set_headers(201)
            self.wfile.write(json.dumps(response).encode())

    def list_boutiques(self, conn, user):
        if user is None:
            self._set_headers(401)
            self.wfile.write(json.dumps({'error': 'Authentication required'}).encode())
            return
        cur = conn.execute('SELECT id, name, address FROM boutiques ORDER BY name COLLATE NOCASE')
        boutiques = []
        for row in cur.fetchall():
            boutiques.append({'id': row[0], 'name': row[1], 'address': row[2]})
        self._set_headers(200)
        self.wfile.write(json.dumps(boutiques).encode())

    def update_or_finalize_order(self, conn, user, order_id, action):
        # Fetch order
        cur = conn.execute('SELECT id, date, status, boutique_id FROM orders WHERE id=?', (order_id,))
        order = cur.fetchone()
        if not order:
            self._set_headers(404)
            self.wfile.write(json.dumps({'error': 'Order not found'}).encode())
            return
        if action == 'update':
            # Only admin/labo or boutique own order
            if user is None:
                self._set_headers(401)
                self.wfile.write(json.dumps({'error': 'Authentication required'}).encode())
                return
            if user['role'] == 'boutique' and user['boutique_id'] != order[3]:
                self._set_headers(403)
                self.wfile.write(json.dumps({'error': 'Not authorized to update this order'}).encode())
                return
            data = self.parse_json_body()
            status = data.get('status')
            items = data.get('items')
            if status:
                conn.execute('UPDATE orders SET status=?, updated_at=? WHERE id=?',
                             (status, datetime.datetime.utcnow().isoformat(), order_id))
            if items:
                conn.execute('DELETE FROM order_items WHERE order_id=?', (order_id,))
                for item in items:
                    product_id = item.get('product_id')
                    quantity = item.get('quantity')
                    if product_id and quantity is not None:
                        conn.execute('INSERT INTO order_items (order_id, product_id, quantity) VALUES (?, ?, ?)',
                                     (order_id, product_id, int(quantity)))
            conn.commit()
            log_action(conn, user['id'], 'update_order', f'Order {order_id}')
            # Return updated order
            cur_items = conn.execute('''
                SELECT oi.product_id, oi.quantity, p.name
                FROM order_items oi
                LEFT JOIN products p ON p.id = oi.product_id
                WHERE oi.order_id=?
            ''', (order_id,))
            items_out = [{'product_id': pid, 'quantity': qty, 'product_name': name or ''}
                         for pid, qty, name in cur_items.fetchall()]
            new_status = status if status else order[2]
            boutique_name = None
            boutique_address = None
            if order[3]:
                cur_b = conn.execute('SELECT name, address FROM boutiques WHERE id=?', (order[3],))
                b = cur_b.fetchone()
                if b:
                    boutique_name, boutique_address = b
            self._set_headers(200)
            self.wfile.write(json.dumps({
                'id': order_id,
                'date': order[1],
                'status': new_status,
                'boutique_id': order[3],
                'boutique_name': boutique_name,
                'boutique_address': boutique_address,
                'items': items_out
            }).encode())
        elif action == 'finalize':
            # Only admin or labo
            if user is None or user['role'] not in ['admin', 'labo']:
                self._set_headers(403)
                self.wfile.write(json.dumps({'error': 'Not authorized to finalize order'}).encode())
                return
            conn.execute('UPDATE orders SET status=?, updated_at=? WHERE id=?', ('validated', datetime.datetime.utcnow().isoformat(), order_id))
            conn.commit()
            log_action(conn, user['id'], 'finalize_order', f'Order {order_id}')
            boutique_name = None
            boutique_address = None
            if order[3]:
                cur_b = conn.execute('SELECT name, address FROM boutiques WHERE id=?', (order[3],))
                b = cur_b.fetchone()
                if b:
                    boutique_name, boutique_address = b
            self._set_headers(200)
            self.wfile.write(json.dumps({
                'id': order_id,
                'date': order[1],
                'status': 'validated',
                'boutique_id': order[3],
                'boutique_name': boutique_name,
                'boutique_address': boutique_address
            }).encode())

    def aggregate(self, conn, user):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        date_str = params.get('date', [None])[0]
        if not date_str:
            self._set_headers(400)
            self.wfile.write(json.dumps({'error': 'date parameter is required (YYYY-MM-DD)'}).encode())
            return
        # Only labo or admin
        if user is None or user['role'] not in ['admin', 'labo']:
            self._set_headers(403)
            self.wfile.write(json.dumps({'error': 'Not authorized'}).encode())
            return
        cur = conn.execute('''SELECT p.id, p.name, SUM(oi.quantity) as total
                              FROM products p
                              JOIN order_items oi ON p.id = oi.product_id
                              JOIN orders o ON o.id = oi.order_id
                              WHERE o.date=?
                              GROUP BY p.id, p.name''', (date_str,))
        data = []
        for row in cur.fetchall():
            prod_id, name, total = row
            data.append({'product_id': prod_id, 'product_name': name, 'total_quantity': total or 0})
        self._set_headers(200)
        self.wfile.write(json.dumps(data).encode())

    def validate_consolidation(self, conn, user):
        if user is None or user['role'] not in ['admin', 'labo']:
            self._set_headers(403)
            self.wfile.write(json.dumps({'error': 'Not authorized'}).encode())
            return
        data = self.parse_json_body()
        date_str = data.get('date')
        if not date_str:
            self._set_headers(400)
            self.wfile.write(json.dumps({'error': 'date parameter is required (YYYY-MM-DD)'}).encode())
            return
        try:
            datetime.datetime.strptime(date_str, '%Y-%m-%d')
        except ValueError:
            self._set_headers(400)
            self.wfile.write(json.dumps({'error': 'Invalid date format (YYYY-MM-DD)'}).encode())
            return
        adjustments = data.get('adjustments') or {}
        cur = conn.execute('SELECT COUNT(*) FROM orders WHERE date=?', (date_str,))
        total = cur.fetchone()[0]
        conn.execute('UPDATE orders SET status=?, updated_at=? WHERE date=?',
                     ('validated', datetime.datetime.utcnow().isoformat(), date_str))
        conn.commit()
        if user:
            try:
                details = json.dumps({'date': date_str, 'adjustments': adjustments})
            except TypeError:
                details = json.dumps({'date': date_str})
            log_action(conn, user['id'], 'validate_consolidation', details)
        self._set_headers(200)
        self.wfile.write(json.dumps({'date': date_str, 'validated_orders': total}).encode())

    def delivery(self, conn, user, date_str):
        # Only labo/admin/livreur
        if user is None or user['role'] not in ['admin', 'labo', 'livreur']:
            self._set_headers(403)
            self.wfile.write(json.dumps({'error': 'Not authorized'}).encode())
            return
        # Get orders for date
        cur_orders = conn.execute('SELECT id, date, status, boutique_id FROM orders WHERE date=?', (date_str,))
        orders = []
        for o in cur_orders.fetchall():
            order_id, date, status, boutique_id = o
            # get boutique info
            cur_b = conn.execute('SELECT name, address FROM boutiques WHERE id=?', (boutique_id,))
            b = cur_b.fetchone()
            boutique_name = b[0] if b else None
            address = b[1] if b else None
            # items
            cur_items = conn.execute('SELECT product_id, quantity FROM order_items WHERE order_id=?', (order_id,))
            items = []
            for pid, qty in cur_items.fetchall():
                # fetch product name
                p = conn.execute('SELECT name FROM products WHERE id=?', (pid,)).fetchone()
                items.append({'product_id': pid, 'product_name': p[0] if p else '', 'quantity': qty})
            orders.append({'order_id': order_id,
                           'status': status,
                           'boutique_id': boutique_id,
                           'boutique_name': boutique_name,
                           'boutique_address': address,
                           'items': items})
        self._set_headers(200)
        self.wfile.write(json.dumps(orders).encode())

    def get_logs(self, conn, user):
        if user is None or user['role'] != 'admin':
            self._set_headers(403)
            self.wfile.write(json.dumps({'error': 'Not authorized'}).encode())
            return
        cur = conn.execute('SELECT id, user_id, action, details, timestamp FROM logs ORDER BY timestamp DESC LIMIT 500')
        logs = []
        for row in cur.fetchall():
            logs.append({'id': row[0], 'user_id': row[1], 'action': row[2], 'details': row[3], 'timestamp': row[4]})
        self._set_headers(200)
        self.wfile.write(json.dumps(logs).encode())

    def do_GET(self):
        parsed, raw_path, normalised, path_parts = self._parse_path()
        # Connect to DB per request for thread safety
        conn = sqlite3.connect(DATABASE_PATH)
        conn.execute('PRAGMA foreign_keys = ON')
        user = self.get_user(conn)
        try:
            if normalised == '/api/health':
                self._set_headers(200)
                self.wfile.write(json.dumps({'status': 'ok'}).encode())
                return
            if normalised == '/api/categories':
                return self.list_categories(conn)
            if normalised.startswith('/api/categories/'):
                pass  # Not used for GET
            if path_parts[0:1] == ['api'] and path_parts[1:2] == ['products']:
                # /api/products or /api/products?category_id=1
                params = parse_qs(parsed.query)
                cat_id = params.get('category_id', [None])[0]
                if cat_id is not None:
                    try:
                        cat_id = int(cat_id)
                    except ValueError:
                        cat_id = None
                return self.list_products(conn, cat_id)
            if self.path == '/api/boutiques':
                return self.list_boutiques(conn, user)
            if self.path.startswith('/api/orders'):
                # /api/orders or /api/orders?date=YYYY-MM-DD
                return self.list_or_create_orders(conn, user)
            if normalised.startswith('/api/labo/aggregate'):
                return self.aggregate(conn, user)
            if normalised.startswith('/api/labo/delivery/'):
                # /api/labo/delivery/<date>
                date_str = path_parts[-1]
                return self.delivery(conn, user, date_str)
            if normalised == '/api/logs':
                return self.get_logs(conn, user)
            # default: 404
            self._set_headers(404)
            self.wfile.write(json.dumps({'error': 'Not found'}).encode())
        finally:
            conn.close()

    def do_POST(self):
        parsed, raw_path, normalised, path_parts = self._parse_path()
        conn = sqlite3.connect(DATABASE_PATH)
        conn.execute('PRAGMA foreign_keys = ON')
        user = self.get_user(conn)
        try:
            if normalised == '/api/login':
                return self.handle_login(conn)
            if normalised == '/api/categories':
                return self.create_category(conn, user)
            if normalised == '/api/products':
                return self.create_product(conn, user)
            if normalised == '/api/orders':
                return self.list_or_create_orders(conn, user)
            # finalize order
            if len(path_parts) >= 4 and path_parts[0] == 'api' and path_parts[1] == 'orders' and path_parts[3] == 'finalize':
                try:
                    order_id = int(path_parts[2])
                except ValueError:
                    self._set_headers(400)
                    self.wfile.write(json.dumps({'error': 'Invalid order id'}).encode())
                    return
                return self.update_or_finalize_order(conn, user, order_id, 'finalize')
            if self.path == '/api/labo/consolidation/validate':
                return self.validate_consolidation(conn, user)
            # Not found
            self._set_headers(404)
            self.wfile.write(json.dumps({'error': 'Not found'}).encode())
        finally:
            conn.close()

    def do_PUT(self):
        parsed, raw_path, normalised, path_parts = self._parse_path()
        conn = sqlite3.connect(DATABASE_PATH)
        conn.execute('PRAGMA foreign_keys = ON')
        user = self.get_user(conn)
        try:
            # /api/categories/<id>
            if len(path_parts) >= 3 and path_parts[0] == 'api' and path_parts[1] == 'categories':
                try:
                    cat_id = int(path_parts[2])
                except ValueError:
                    self._set_headers(400)
                    self.wfile.write(json.dumps({'error': 'Invalid category id'}).encode())
                    return
                return self.update_or_delete_category(conn, user, cat_id, 'PUT')
            # /api/products/<id>
            if len(path_parts) >= 3 and path_parts[0] == 'api' and path_parts[1] == 'products':
                try:
                    prod_id = int(path_parts[2])
                except ValueError:
                    self._set_headers(400)
                    self.wfile.write(json.dumps({'error': 'Invalid product id'}).encode())
                    return
                return self.update_or_delete_product(conn, user, prod_id, 'PUT')
            # /api/orders/<id>
            if len(path_parts) >= 3 and path_parts[0] == 'api' and path_parts[1] == 'orders':
                try:
                    order_id = int(path_parts[2])
                except ValueError:
                    self._set_headers(400)
                    self.wfile.write(json.dumps({'error': 'Invalid order id'}).encode())
                    return
                return self.update_or_finalize_order(conn, user, order_id, 'update')
            self._set_headers(404)
            self.wfile.write(json.dumps({'error': 'Not found'}).encode())
        finally:
            conn.close()

    def do_DELETE(self):
        parsed, raw_path, normalised, path_parts = self._parse_path()
        conn = sqlite3.connect(DATABASE_PATH)
        conn.execute('PRAGMA foreign_keys = ON')
        user = self.get_user(conn)
        try:
            # /api/categories/<id>
            if len(path_parts) >= 3 and path_parts[0] == 'api' and path_parts[1] == 'categories':
                try:
                    cat_id = int(path_parts[2])
                except ValueError:
                    self._set_headers(400)
                    self.wfile.write(json.dumps({'error': 'Invalid category id'}).encode())
                    return
                return self.update_or_delete_category(conn, user, cat_id, 'DELETE')
            # /api/products/<id>
            if len(path_parts) >= 3 and path_parts[0] == 'api' and path_parts[1] == 'products':
                try:
                    prod_id = int(path_parts[2])
                except ValueError:
                    self._set_headers(400)
                    self.wfile.write(json.dumps({'error': 'Invalid product id'}).encode())
                    return
                return self.update_or_delete_product(conn, user, prod_id, 'DELETE')
            self._set_headers(404)
            self.wfile.write(json.dumps({'error': 'Not found'}).encode())
        finally:
            conn.close()


def run_server(host='0.0.0.0', port=8000):
    """
    Launch the HTTP server. The port can be specified via the PORT
    environment variable to make the service Render-friendly.
    """
    # If an environment variable named PORT is set, override the port
    env_port = os.environ.get('PORT')
    if env_port:
        try:
            port = int(env_port)
        except ValueError:
            pass
    init_db()
    with ThreadingHTTPServer((host, port), RequestHandler) as httpd:
        print(f'Serving on {host}:{port}')
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == '__main__':
    run_server()
