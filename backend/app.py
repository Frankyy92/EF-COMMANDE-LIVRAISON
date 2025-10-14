import os
import datetime
import json
from flask import Flask, request, jsonify, send_file
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func
from flask_cors import CORS
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet


app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Enable CORS so that the frontend can communicate with the API seamlessly
CORS(app)


class StripBackendPrefixMiddleware:
    """Allow the application to be served under an optional /backend prefix."""

    def __init__(self, app, prefix='/backend'):
        self.app = app
        self.prefix = prefix.rstrip('/') or '/backend'

    def __call__(self, environ, start_response):
        path = environ.get('PATH_INFO', '') or '/'
        if path.startswith(self.prefix):
            new_path = path[len(self.prefix):]
            if not new_path:
                new_path = '/'
            elif not new_path.startswith('/'):
                new_path = f'/{new_path}'
            environ['PATH_INFO'] = new_path
        return self.app(environ, start_response)


app.wsgi_app = StripBackendPrefixMiddleware(app.wsgi_app)

db = SQLAlchemy(app)


###############################################################
# Database models
###############################################################

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    role = db.Column(db.String(20), nullable=False)  # admin, labo, boutique, livreur
    boutique_id = db.Column(db.Integer, db.ForeignKey('boutique.id'), nullable=True)
    logs = db.relationship('Log', backref='user', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'role': self.role,
            'boutique_id': self.boutique_id,
        }


class Boutique(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    address = db.Column(db.String(200), nullable=True)
    orders = db.relationship('Order', backref='boutique', lazy=True)
    users = db.relationship('User', backref='boutique_ref', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'address': self.address
        }


class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    products = db.relationship('Product', backref='category', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name
        }


class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('category.id'), nullable=False)
    order_items = db.relationship('OrderItem', backref='product', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'category_id': self.category_id
        }


class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, validated
    boutique_id = db.Column(db.Integer, db.ForeignKey('boutique.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    items = db.relationship('OrderItem', backref='order', cascade='all, delete-orphan', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date.isoformat(),
            'status': self.status,
            'boutique_id': self.boutique_id,
            'boutique_name': self.boutique.name if self.boutique else None,
            'items': [item.to_dict() for item in self.items]
        }


class OrderItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('order.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'order_id': self.order_id,
            'product_id': self.product_id,
            'quantity': self.quantity,
            'product_name': self.product.name if self.product else None
        }


class Log(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    action = db.Column(db.String(100), nullable=False)
    details = db.Column(db.String(500), nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'action': self.action,
            'details': self.details,
            'timestamp': self.timestamp.isoformat()
        }


###############################################################
# Utility functions
###############################################################

def log_action(user, action, details=None):
    """
    Helper to create a log entry and store in database.
    """
    log = Log(user_id=user.id if user else None, action=action, details=details)
    db.session.add(log)
    db.session.commit()


def get_user_from_request():
    """
    Extracts the current user from the request context. The preferred method is
    via the 'X-User-Id' header set by fetch() calls. For resources opened in a
    new browser tab (e.g. PDF exports) we also accept a "user_id" query string
    parameter so the download can be authorised without custom headers.
    """
    user_id = request.headers.get('X-User-Id') or request.args.get('user_id')
    if not user_id:
        return None
    try:
        return User.query.get(int(user_id))
    except (TypeError, ValueError):
        return None


###############################################################
# API endpoints
###############################################################

@app.before_first_request
def setup_database():
    # Create tables if they don't exist
    db.create_all()
    # Optionally import initial data if categories/products tables are empty
    if Category.query.count() == 0:
        import_initial_data()


@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    # Accept legacy "identifier" field as an alias for username
    username = data.get('username') or data.get('identifier')
    role = data.get('role')
    boutique_name = data.get('boutique_name')
    if not username or not role:
        return jsonify({'error': 'username and role required'}), 400
    user = User.query.filter_by(username=username).first()
    if not user:
        # Create boutique if provided and role is boutique
        boutique = None
        if role == 'boutique':
            if boutique_name:
                boutique = Boutique.query.filter_by(name=boutique_name).first()
                if not boutique:
                    boutique = Boutique(name=boutique_name)
                    db.session.add(boutique)
                    db.session.commit()
        user = User(username=username, role=role, boutique_id=boutique.id if boutique else None)
        db.session.add(user)
        db.session.commit()
    log_action(user, 'login')
    return jsonify({'user': user.to_dict()})


@app.route('/api/categories', methods=['GET', 'POST'])
def categories_endpoint():
    user = get_user_from_request()
    if request.method == 'GET':
        categories = Category.query.order_by(Category.name.asc()).all()
        return jsonify([c.to_dict() for c in categories])
    if request.method == 'POST':
        # Only admin can create category
        if not user or user.role != 'admin':
            return jsonify({'error': 'Not authorized'}), 403
        data = request.get_json() or {}
        name = data.get('name')
        if not name:
            return jsonify({'error': 'Name is required'}), 400
        if Category.query.filter(func.lower(Category.name) == name.lower()).first():
            return jsonify({'error': 'Category already exists'}), 400
        category = Category(name=name)
        db.session.add(category)
        db.session.commit()
        log_action(user, 'create_category', f'Created category {name}')
        return jsonify(category.to_dict()), 201


@app.route('/api/categories/<int:cat_id>', methods=['PUT', 'DELETE'])
def category_detail(cat_id):
    user = get_user_from_request()
    category = Category.query.get_or_404(cat_id)
    if request.method == 'PUT':
        if not user or user.role != 'admin':
            return jsonify({'error': 'Not authorized'}), 403
        data = request.get_json() or {}
        name = data.get('name')
        if name:
            category.name = name
            db.session.commit()
            log_action(user, 'update_category', f'Updated category {cat_id}')
        return jsonify(category.to_dict())
    elif request.method == 'DELETE':
        if not user or user.role != 'admin':
            return jsonify({'error': 'Not authorized'}), 403
        # When deleting category, cascade delete products under category
        for product in category.products:
            db.session.delete(product)
        db.session.delete(category)
        db.session.commit()
        log_action(user, 'delete_category', f'Deleted category {cat_id}')
        return jsonify({'message': 'Category deleted'})


@app.route('/api/boutiques', methods=['GET'])
def list_boutiques():
    user = get_user_from_request()
    if not user:
        return jsonify({'error': 'Authentication required'}), 401
    boutiques = Boutique.query.order_by(Boutique.name.asc()).all()
    return jsonify([b.to_dict() for b in boutiques])


@app.route('/api/products', methods=['GET', 'POST'])
def products_endpoint():
    user = get_user_from_request()
    if request.method == 'GET':
        category_id = request.args.get('category_id', type=int)
        query = Product.query
        if category_id:
            query = query.filter_by(category_id=category_id)
        products = query.order_by(Product.name.asc()).all()
        return jsonify([p.to_dict() for p in products])
    if request.method == 'POST':
        if not user or user.role != 'admin':
            return jsonify({'error': 'Not authorized'}), 403
        data = request.get_json() or {}
        name = data.get('name')
        category_id = data.get('category_id')
        if not name or not category_id:
            return jsonify({'error': 'name and category_id are required'}), 400
        if Product.query.filter(func.lower(Product.name) == name.lower()).first():
            return jsonify({'error': 'Product already exists'}), 400
        category = Category.query.get_or_404(category_id)
        product = Product(name=name, category=category)
        db.session.add(product)
        db.session.commit()
        log_action(user, 'create_product', f'Created product {name}')
        return jsonify(product.to_dict()), 201


@app.route('/api/products/<int:prod_id>', methods=['PUT', 'DELETE'])
def product_detail(prod_id):
    user = get_user_from_request()
    product = Product.query.get_or_404(prod_id)
    if request.method == 'PUT':
        if not user or user.role != 'admin':
            return jsonify({'error': 'Not authorized'}), 403
        data = request.get_json() or {}
        name = data.get('name')
        category_id = data.get('category_id')
        if name:
            product.name = name
        if category_id:
            product.category_id = category_id
        db.session.commit()
        log_action(user, 'update_product', f'Updated product {prod_id}')
        return jsonify(product.to_dict())
    elif request.method == 'DELETE':
        if not user or user.role != 'admin':
            return jsonify({'error': 'Not authorized'}), 403
        # Delete associated order items
        OrderItem.query.filter_by(product_id=prod_id).delete()
        db.session.delete(product)
        db.session.commit()
        log_action(user, 'delete_product', f'Deleted product {prod_id}')
        return jsonify({'message': 'Product deleted'})


@app.route('/api/orders', methods=['GET', 'POST'])
def orders_endpoint():
    user = get_user_from_request()
    if not user:
        return jsonify({'error': 'Authentication required'}), 401
    if request.method == 'GET':
        # optional filters: date
        date_str = request.args.get('date')
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        boutique_filter = request.args.get('boutique_id')
        query = Order.query
        if user.role == 'boutique':
            query = query.filter_by(boutique_id=user.boutique_id)
        elif boutique_filter:
            try:
                query = query.filter_by(boutique_id=int(boutique_filter))
            except (TypeError, ValueError):
                return jsonify({'error': 'Invalid boutique_id'}), 400
        if date_str:
            try:
                date_obj = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
                query = query.filter_by(date=date_obj)
            except ValueError:
                return jsonify({'error': 'Invalid date format (YYYY-MM-DD)'}), 400
        else:
            if start_date_str:
                try:
                    start_date = datetime.datetime.strptime(start_date_str, '%Y-%m-%d').date()
                    query = query.filter(Order.date >= start_date)
                except ValueError:
                    return jsonify({'error': 'Invalid start_date format (YYYY-MM-DD)'}), 400
            if end_date_str:
                try:
                    end_date = datetime.datetime.strptime(end_date_str, '%Y-%m-%d').date()
                    query = query.filter(Order.date <= end_date)
                except ValueError:
                    return jsonify({'error': 'Invalid end_date format (YYYY-MM-DD)'}), 400
        orders = query.order_by(Order.date.desc()).all()
        return jsonify([o.to_dict() for o in orders])
    elif request.method == 'POST':
        # Create or update an order
        data = request.get_json() or {}
        date_str = data.get('date')
        items = data.get('items')  # list of {product_id, quantity}
        if not date_str or not items:
            return jsonify({'error': 'date and items are required'}), 400
        try:
            date_obj = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid date format (YYYY-MM-DD)'}), 400
        # Only boutiques and admin can create orders
        if user.role not in ['boutique', 'admin']:
            return jsonify({'error': 'Not authorized to create orders'}), 403
        # Determine boutique_id: for admin, it must be provided in data; for boutique user, from user
        boutique_id = data.get('boutique_id') if user.role == 'admin' else user.boutique_id
        if not boutique_id:
            return jsonify({'error': 'boutique_id required'}), 400
        # Find existing order for this boutique/date
        order = Order.query.filter_by(date=date_obj, boutique_id=boutique_id).first()
        if not order:
            order = Order(date=date_obj, status='pending', boutique_id=boutique_id, user_id=user.id)
            db.session.add(order)
        # Clear current items
        order.items.clear()
        # Add order items
        for item in items:
            product_id = item.get('product_id')
            quantity = item.get('quantity')
            if not product_id or quantity is None:
                continue
            product = Product.query.get(product_id)
            if not product:
                continue
            order_item = OrderItem(order=order, product=product, quantity=int(quantity))
            db.session.add(order_item)
        db.session.commit()
        log_action(user, 'create_or_update_order', f'Order {order.id} for {date_str}')
        return jsonify(order.to_dict()), 201


@app.route('/api/orders/<int:order_id>', methods=['PUT'])
def update_order(order_id):
    user = get_user_from_request()
    if not user:
        return jsonify({'error': 'Authentication required'}), 401
    order = Order.query.get_or_404(order_id)
    # Only admin, labo, or boutique for own order can update
    if user.role == 'boutique' and order.boutique_id != user.boutique_id:
        return jsonify({'error': 'Not authorized'}), 403
    data = request.get_json() or {}
    status = data.get('status')
    items = data.get('items')
    if status:
        order.status = status
    if items:
        # replace items
        order.items.clear()
        for item in items:
            product_id = item.get('product_id')
            quantity = item.get('quantity')
            if not product_id or quantity is None:
                continue
            product = Product.query.get(product_id)
            if not product:
                continue
            order_item = OrderItem(order=order, product=product, quantity=int(quantity))
            db.session.add(order_item)
    db.session.commit()
    log_action(user, 'update_order', f'Order {order_id}')
    return jsonify(order.to_dict())


@app.route('/api/orders/<int:order_id>/finalize', methods=['POST'])
def finalize_order(order_id):
    user = get_user_from_request()
    if not user or user.role not in ['labo', 'admin']:
        return jsonify({'error': 'Not authorized'}), 403
    order = Order.query.get_or_404(order_id)
    order.status = 'validated'
    db.session.commit()
    log_action(user, 'finalize_order', f'Order {order_id}')
    return jsonify(order.to_dict())


@app.route('/api/labo/aggregate', methods=['GET'])
def aggregate_orders():
    user = get_user_from_request()
    if not user or user.role not in ['labo', 'admin']:
        return jsonify({'error': 'Not authorized'}), 403
    date_str = request.args.get('date')
    if not date_str:
        return jsonify({'error': 'date parameter is required (YYYY-MM-DD)'}), 400
    try:
        date_obj = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format (YYYY-MM-DD)'}), 400
    # aggregate by product across all orders for this date
    results = db.session.query(Product.id, Product.name, func.sum(OrderItem.quantity)) \
        .join(OrderItem) \
        .join(Order) \
        .filter(Order.date == date_obj) \
        .group_by(Product.id).all()
    data = []
    for prod_id, prod_name, total_qty in results:
        data.append({'product_id': prod_id, 'product_name': prod_name, 'total_quantity': int(total_qty or 0)})
    return jsonify(data)


@app.route('/api/labo/consolidation/validate', methods=['POST'])
def validate_consolidation():
    user = get_user_from_request()
    if not user or user.role not in ['labo', 'admin']:
        return jsonify({'error': 'Not authorized'}), 403
    data = request.get_json() or {}
    date_str = data.get('date')
    if not date_str:
        return jsonify({'error': 'date parameter is required (YYYY-MM-DD)'}), 400
    try:
        date_obj = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format (YYYY-MM-DD)'}), 400
    adjustments = data.get('adjustments') or {}
    orders = Order.query.filter_by(date=date_obj).all()
    for order in orders:
        order.status = 'validated'
    db.session.commit()
    details = {'date': date_str, 'adjustments': adjustments}
    log_action(user, 'validate_consolidation', json.dumps(details))
    return jsonify({'validated_orders': len(orders)})


@app.route('/api/labo/delivery/<string:date_str>', methods=['GET'])
def delivery_plan(date_str):
    user = get_user_from_request()
    if not user or user.role not in ['labo', 'admin', 'livreur']:
        return jsonify({'error': 'Not authorized'}), 403
    try:
        date_obj = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format (YYYY-MM-DD)'}), 400
    # gather orders with items and group by boutique
    orders = Order.query.filter_by(date=date_obj).all()
    result = []
    for order in orders:
        boutique = order.boutique
        items = []
        for item in order.items:
            items.append({
                'product_id': item.product_id,
                'product_name': item.product.name,
                'quantity': item.quantity
            })
        result.append({
            'boutique_id': boutique.id if boutique else None,
            'boutique_name': boutique.name,
            'boutique_address': boutique.address,
            'order_id': order.id,
            'status': order.status,
            'items': items
        })
    return jsonify(result)


@app.route('/api/labo/pdf/<string:date_str>', methods=['GET'])
def generate_production_pdf(date_str):
    """
    Generate a PDF summarising production or delivery plan for the given date.
    Provide ?type=production or ?type=delivery for different layouts.
    """
    user = get_user_from_request()
    if not user or user.role not in ['labo', 'admin', 'livreur']:
        return jsonify({'error': 'Not authorized'}), 403
    try:
        date_obj = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format (YYYY-MM-DD)'}), 400
    doc_type = request.args.get('type', 'production')
    boutique_id_param = request.args.get('boutique_id')
    boutique_filter = None
    if boutique_id_param is not None:
        try:
            boutique_filter = int(boutique_id_param)
        except (TypeError, ValueError):
            return jsonify({'error': 'Invalid boutique_id'}), 400
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    elements = []
    styles = getSampleStyleSheet()
    title = Paragraph(f"Plan {'de production' if doc_type=='production' else 'de livraison'} pour le {date_obj.isoformat()}", styles['Heading1'])
    elements.append(title)
    elements.append(Spacer(1, 12))
    if doc_type == 'production':
        # aggregated products
        data = [['Produit', 'Quantité Totale']]
        query = db.session.query(Product.name, func.sum(OrderItem.quantity)) \
            .join(OrderItem) \
            .join(Order) \
            .filter(Order.date == date_obj)
        if boutique_filter is not None:
            query = query.filter(Order.boutique_id == boutique_filter)
        aggregated = query.group_by(Product.name).all()
        for name, qty in aggregated:
            data.append([name, int(qty or 0)])
    else:
        # delivery plan: each boutique with items
        data = [['Boutique', 'Produit', 'Quantité']]
        order_query = Order.query.filter_by(date=date_obj)
        if boutique_filter is not None:
            order_query = order_query.filter_by(boutique_id=boutique_filter)
        orders = order_query.all()
        for order in orders:
            boutique_name = order.boutique.name
            for item in order.items:
                data.append([boutique_name, item.product.name, item.quantity])
    table = Table(data, repeatRows=1)
    # styling
    table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.lightgrey),
        ('TEXTCOLOR', (0,0), (-1,0), colors.black),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,0), 12),
        ('BACKGROUND', (0,1), (-1,-1), colors.whitesmoke),
        ('GRID', (0,0), (-1,-1), 0.5, colors.grey)
    ]))
    elements.append(table)
    doc.build(elements)
    buffer.seek(0)
    pdf_filename = f"{'production' if doc_type=='production' else 'livraison'}_{date_obj.isoformat()}.pdf"
    log_action(user, 'generate_pdf', f'{doc_type} for {date_str}')
    return send_file(
        buffer,
        mimetype='application/pdf',
        as_attachment=False,
        download_name=pdf_filename,
    )


@app.route('/api/logs', methods=['GET'])
def get_logs():
    user = get_user_from_request()
    if not user or user.role != 'admin':
        return jsonify({'error': 'Not authorized'}), 403
    logs = Log.query.order_by(Log.timestamp.desc()).limit(500).all()
    return jsonify([log.to_dict() for log in logs])


###############################################################
# Data import
###############################################################

def import_initial_data():
    """
    Import categories and products from the provided Excel matrix. The goal
    is to initialise the database with a reasonable set of categories and
    products. If parsing fails or yields no data, a small default catalogue
    is provided.
    """
    excel_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'Matrice Livraison x Arthur.xlsx')
    excel_path = os.path.abspath(excel_path)
    categories_created = {}
    try:
        import pandas as pd
        df = pd.ExcelFile(excel_path).parse('3102')
        # Predefined category markers within the spreadsheet
        predefined = {
            'VIENNOISERIE': 'Viennoiserie',
            'PETITS FOURS SEC': 'Petits Fours Sec',
            'PETITS FOURS': 'Petits Fours',
            'TRAITEUR': 'Traiteur',
            'PATISSERIE': 'Patisserie',
            'PÂTISSERIE': 'Patisserie',
            'GATEAU DE VOYAGE': 'Gateau De Voyage',
            'GÂTEAU DE VOYAGE': 'Gateau De Voyage',
            'PATISSERIE GROSSE PIECE': 'Patisserie Grosse Piece',
            'PATISSERIE GROSSE PIÈCE': 'Patisserie Grosse Piece',
            'CREME DE BASE': 'Creme De Base',
            'CRÈME DE BASE': 'Creme De Base',
            'AUTRES': 'Autres',
            'EVENEMENTS': 'Evenements',
            'ÉVÉNEMENTS': 'Evenements'
        }
        store_names = ['SURESNES', 'SAINT GERMAIN EN LAYE', 'SAINT-GERMAIN-EN-LAYE', 'NEUILLY', 'RUEIL', 'RUEIL-MALMAISON', 'RUEIL MALMAISON']
        def parse_column(series):
            current = None
            items = []
            for val in series:
                if pd.isna(val):
                    continue
                text = str(val).strip()
                if not text:
                    continue
                upper = text.upper()
                if any(key in upper for key in predefined.keys()):
                    # detect which category keyword appears
                    for key, proper in predefined.items():
                        if key in upper:
                            current = proper
                            if proper not in categories_created:
                                categories_created[proper] = []
                            break
                    continue
                if current and upper not in store_names and len(text) < 40:
                    categories_created[current].append(text.title())
        parse_column(df['PRODUIT'])
        if 'PRODUIT.1' in df.columns:
            parse_column(df['PRODUIT.1'])
        # Deduplicate and create entries
        if categories_created:
            for cat_name, prod_list in categories_created.items():
                # create category
                cat = Category(name=cat_name)
                db.session.add(cat)
                db.session.flush()  # assign id
                seen = set()
                for prod in prod_list:
                    if prod not in seen:
                        seen.add(prod)
                        product = Product(name=prod, category_id=cat.id)
                        db.session.add(product)
            db.session.commit()
            return
    except Exception as e:
        # if import fails, log but continue to default
        print('Import failed:', e)
    # Fallback default catalogue
    default_cats = {
        'Viennoiserie': ['Croissant', 'Pain Au Chocolat', 'Pain Aux Raisins'],
        'Patisserie': ['Éclair Chocolat', 'Tartelette Fraise', 'Religieuse'],
        'Traiteur': ['Quiche Lorraine', 'Croque Monsieur'],
        'Gateau De Voyage': ['Financier', 'Madeleine'],
        'Petits Fours Sec': ['Mendiants', 'Diamant Choco']
    }
    for cat_name, products in default_cats.items():
        cat = Category(name=cat_name)
        db.session.add(cat)
        db.session.flush()
        for prod in products:
            db.session.add(Product(name=prod, category_id=cat.id))
    db.session.commit()


if __name__ == '__main__':
    # When running directly, launch the Flask development server
    app.run(host='0.0.0.0', port=5000, debug=True)