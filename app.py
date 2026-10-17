"""
MotoCraft 2-Wheeler Motors & Workshop Management Application
Full-Stack Python + MySQL Backend with Responsive Single-Page UI
"""

import os
import json
from datetime import datetime, date
from flask import Flask, request, jsonify, render_template_string, session, redirect, url_for
import database

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'motocraft-secret-key-2026')

# Initialize DB on start
database.init_database()

# -----------------------------------------------------------------------------
# HELPER FUNCTIONS & BUSINESS LOGIC
# -----------------------------------------------------------------------------

def calculate_stock_aging(date_added_str):
    try:
        added = datetime.strptime(str(date_added_str), '%Y-%m-%d').date()
        days = (date.today() - added).days
        if days > 60:
            return days, "CRITICAL", "High lot age (>60d). Price markdown recommended."
        elif days > 30:
            return days, "SLOW", "Moderate aging (>30d). Showcase in weekend promotion."
        return days, "FRESH", "Fresh showroom stock."
    except Exception:
        return 0, "FRESH", "Standard retail listing."

def format_inr(val):
    try:
        val = float(val)
        return f"{val:,.2f}"
    except Exception:
        return "0.00"

# -----------------------------------------------------------------------------
# AUTHENTICATION API ROUTES
# -----------------------------------------------------------------------------

@app.route('/api/auth/login', methods=['POST'])
def api_login():
    data = request.json or {}
    identifier = data.get('identifier', '').strip()  # email or username
    password = data.get('password', '')

    # 1. Check Hardcoded Admin Credentials
    if (identifier.lower() in ['admin', 'admin@motocraft.com']) and password == 'admin123':
        session['user_id'] = 1
        session['user_name'] = 'System Administrator'
        session['user_email'] = 'admin@motocraft.com'
        session['user_role'] = 'admin'
        return jsonify({
            'success': True,
            'user': {
                'id': 1,
                'name': 'System Administrator',
                'email': 'admin@motocraft.com',
                'role': 'admin'
            }
        })

    # 2. Check Customer / DB Users
    pwd_hash = database.hash_password(password)
    user = database.execute_query(
        "SELECT * FROM users WHERE (email = %s OR phone = %s) AND password_hash = %s",
        (identifier, identifier, pwd_hash),
        fetch="one"
    )

    if user:
        session['user_id'] = user['id']
        session['user_name'] = user['name']
        session['user_email'] = user['email']
        session['user_role'] = user['role']
        session['bike_reg_number'] = user.get('bike_reg_number')
        session['bike_model'] = user.get('bike_model')

        return jsonify({
            'success': True,
            'user': {
                'id': user['id'],
                'name': user['name'],
                'email': user['email'],
                'phone': user['phone'],
                'role': user['role'],
                'bike_model': user.get('bike_model'),
                'bike_reg_number': user.get('bike_reg_number')
            }
        })

    return jsonify({'success': False, 'error': 'Invalid credentials. Please verify email/phone and password.'}), 401

@app.route('/api/auth/register', methods=['POST'])
def api_register():
    data = request.json or {}
    name = data.get('name', '').strip()
    email = data.get('email', '').strip()
    phone = data.get('phone', '').strip()
    password = data.get('password', '')
    bike_model = data.get('bike_model', '').strip()
    bike_reg = data.get('bike_reg_number', '').strip().upper()

    if not name or not email or not password:
        return jsonify({'success': False, 'error': 'Name, email, and password are required.'}), 400

    existing = database.execute_query("SELECT id FROM users WHERE email = %s", (email,), fetch="one")
    if existing:
        return jsonify({'success': False, 'error': 'An account with this email already exists.'}), 409

    pwd_hash = database.hash_password(password)
    new_id = database.execute_query(
        """INSERT INTO users (name, email, phone, password_hash, role, bike_model, bike_reg_number)
           VALUES (%s, %s, %s, %s, 'customer', %s, %s)""",
        (name, email, phone, pwd_hash, bike_model, bike_reg),
        fetch="insert"
    )

    session['user_id'] = new_id
    session['user_name'] = name
    session['user_email'] = email
    session['user_role'] = 'customer'
    session['bike_reg_number'] = bike_reg
    session['bike_model'] = bike_model

    return jsonify({
        'success': True,
        'user': {
            'id': new_id,
            'name': name,
            'email': email,
            'phone': phone,
            'role': 'customer',
            'bike_model': bike_model,
            'bike_reg_number': bike_reg
        }
    })

@app.route('/api/auth/me', methods=['GET'])
def api_me():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'authenticated': False, 'user': None})
    return jsonify({
        'authenticated': True,
        'user': {
            'id': session.get('user_id'),
            'name': session.get('user_name'),
            'email': session.get('user_email'),
            'role': session.get('user_role'),
            'bike_reg_number': session.get('bike_reg_number'),
            'bike_model': session.get('bike_model')
        }
    })

@app.route('/api/auth/logout', methods=['POST'])
def api_logout():
    session.clear()
    return jsonify({'success': True})

# -----------------------------------------------------------------------------
# DASHBOARD API ROUTES
# -----------------------------------------------------------------------------

@app.route('/api/dashboard/stats', methods=['GET'])
def api_dashboard_stats():
    # Total Bike Sales Revenue
    bike_sales_res = database.execute_query("SELECT SUM(grand_total) as total, SUM(gross_profit) as profit FROM sales WHERE sale_type = 'BIKE'", fetch="one")
    bike_sales_rev = float(bike_sales_res.get('total') or 0.0) if bike_sales_res else 0.0
    bike_sales_profit = float(bike_sales_res.get('profit') or 0.0) if bike_sales_res else 0.0

    # Total Spares Sales Revenue
    spares_sales_res = database.execute_query("SELECT SUM(grand_total) as total, SUM(gross_profit) as profit FROM sales WHERE sale_type = 'SPARES'", fetch="one")
    spares_sales_rev = float(spares_sales_res.get('total') or 0.0) if spares_sales_res else 0.0

    # Workshop Billing Revenue
    bills_res = database.execute_query("SELECT SUM(grand_total) as total, COUNT(*) as cnt FROM service_bills WHERE payment_status = 'Paid'", fetch="one")
    bills_rev = float(bills_res.get('total') or 0.0) if bills_res else 0.0

    # Pending Bills
    pending_bills_res = database.execute_query("SELECT SUM(grand_total) as total, COUNT(*) as cnt FROM service_bills WHERE payment_status = 'Pending'", fetch="one")
    pending_bills_amt = float(pending_bills_res.get('total') or 0.0) if pending_bills_res else 0.0
    pending_bills_count = int(pending_bills_res.get('cnt') or 0) if pending_bills_res else 0

    # Bikes in Stock
    bikes_in_stock_res = database.execute_query("SELECT COUNT(*) as cnt, SUM(selling_price) as val FROM bikes_inventory WHERE stock_status = 'In Showroom'", fetch="one")
    bikes_in_stock = int(bikes_in_stock_res.get('cnt') or 0) if bikes_in_stock_res else 0
    bikes_stock_value = float(bikes_in_stock_res.get('val') or 0.0) if bikes_in_stock_res else 0.0

    # Low Stock Spares Count
    low_spares_res = database.execute_query("SELECT COUNT(*) as cnt FROM spares_inventory WHERE stock_quantity <= reorder_level", fetch="one")
    low_spares_count = int(low_spares_res.get('cnt') or 0) if low_spares_res else 0

    # Total Combined Revenue
    total_revenue = bike_sales_rev + spares_sales_rev + bills_rev

    # Recent Transactions
    recent_sales = database.execute_query("SELECT * FROM sales ORDER BY id DESC LIMIT 5", fetch="all")
    recent_bills = database.execute_query("SELECT * FROM service_bills ORDER BY id DESC LIMIT 5", fetch="all")
    service_alerts = database.execute_query("SELECT * FROM service_alerts WHERE status = 'Pending' ORDER BY id DESC LIMIT 6", fetch="all")

    return jsonify({
        'total_revenue': total_revenue,
        'bike_sales_revenue': bike_sales_rev,
        'spares_sales_revenue': spares_sales_rev,
        'workshop_revenue': bills_rev,
        'total_profit': bike_sales_profit,
        'pending_bills_amount': pending_bills_amt,
        'pending_bills_count': pending_bills_count,
        'bikes_in_stock': bikes_in_stock,
        'bikes_stock_value': bikes_stock_value,
        'low_spares_count': low_spares_count,
        'recent_sales': recent_sales,
        'recent_bills': recent_bills,
        'service_alerts': service_alerts,
        'db_info': database.get_db_info()
    })

# -----------------------------------------------------------------------------
# SALES MODULE API ROUTES
# -----------------------------------------------------------------------------

@app.route('/api/sales', methods=['GET', 'POST'])
def api_sales():
    if request.method == 'GET':
        sales = database.execute_query("SELECT * FROM sales ORDER BY id DESC", fetch="all")
        return jsonify({'sales': sales})

    # Record New Sale
    data = request.json or {}
    sale_type = data.get('sale_type', 'BIKE')  # 'BIKE' or 'SPARES'
    customer_name = data.get('customer_name', '').strip()
    customer_phone = data.get('customer_phone', '').strip()
    customer_email = data.get('customer_email', '').strip()
    payment_mode = data.get('payment_mode', 'UPI')
    discount = float(data.get('discount') or 0.0)
    tax_amount = float(data.get('tax_amount') or 0.0)

    sale_number = f"SL-2026-{datetime.now().strftime('%m%d%H%M%S')[-6:]}"
    today_str = date.today().strftime('%Y-%m-%d')

    if sale_type == 'BIKE':
        bike_id = int(data.get('bike_id'))
        bike = database.execute_query("SELECT * FROM bikes_inventory WHERE id = %s", (bike_id,), fetch="one")
        if not bike:
            return jsonify({'success': False, 'error': 'Selected bike not found.'}), 404

        selling_price = float(data.get('selling_price') or bike['selling_price'])
        total_cost = float(bike['purchase_price']) + float(bike['refurb_cost'])
        gross_profit = selling_price - total_cost - discount
        grand_total = selling_price - discount + tax_amount

        item_details = f"{bike['year']} {bike['make']} {bike['model']} (Reg: {bike['reg_number']})"

        # Mark bike as Sold in inventory
        database.execute_query(
            "UPDATE bikes_inventory SET stock_status = 'Sold' WHERE id = %s",
            (bike_id,),
            fetch="update"
        )

        sale_id = database.execute_query(
            """INSERT INTO sales
               (sale_number, sale_type, customer_name, customer_phone, customer_email, bike_id, item_details, subtotal, tax_amount, discount, grand_total, gross_profit, payment_mode, sold_by, sale_date)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (sale_number, 'BIKE', customer_name, customer_phone, customer_email, bike_id, item_details, selling_price, tax_amount, discount, grand_total, gross_profit, payment_mode, session.get('user_name', 'Admin'), today_str),
            fetch="insert"
        )

        return jsonify({'success': True, 'sale_id': sale_id, 'sale_number': sale_number, 'grand_total': grand_total})

    else:
        # Spares counter sale
        parts = data.get('parts', [])  # list of {spare_id, qty}
        subtotal = 0.0
        total_cost = 0.0
        items_summary = []

        for p in parts:
            spare_id = int(p.get('spare_id'))
            qty = int(p.get('qty', 1))
            sp = database.execute_query("SELECT * FROM spares_inventory WHERE id = %s", (spare_id,), fetch="one")
            if sp:
                price = float(sp['selling_price'])
                cost = float(sp['purchase_cost'])
                subtotal += price * qty
                total_cost += cost * qty
                items_summary.append(f"{sp['name']} (x{qty})")
                # Deduct inventory stock
                database.execute_query(
                    "UPDATE spares_inventory SET stock_quantity = MAX(0, stock_quantity - %s) WHERE id = %s",
                    (qty, spare_id),
                    fetch="update"
                )

        grand_total = subtotal - discount + tax_amount
        gross_profit = subtotal - total_cost - discount

        sale_id = database.execute_query(
            """INSERT INTO sales
               (sale_number, sale_type, customer_name, customer_phone, customer_email, bike_id, item_details, subtotal, tax_amount, discount, grand_total, gross_profit, payment_mode, sold_by, sale_date)
               VALUES (%s, %s, %s, %s, %s, NULL, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (sale_number, 'SPARES', customer_name, customer_phone, customer_email, ", ".join(items_summary), subtotal, tax_amount, discount, grand_total, gross_profit, payment_mode, session.get('user_name', 'Admin'), today_str),
            fetch="insert"
        )

        return jsonify({'success': True, 'sale_id': sale_id, 'sale_number': sale_number, 'grand_total': grand_total})

# -----------------------------------------------------------------------------
# INVENTORY MODULE API ROUTES
# -----------------------------------------------------------------------------

@app.route('/api/inventory/bikes', methods=['GET', 'POST'])
def api_bikes_inventory():
    if request.method == 'GET':
        bikes = database.execute_query("SELECT * FROM bikes_inventory ORDER BY id DESC", fetch="all")
        # Augment with calculated aging and margins
        augmented = []
        for b in bikes:
            days, category, rec = calculate_stock_aging(b['date_added'])
            cost = float(b['purchase_price']) + float(b['refurb_cost'])
            selling = float(b['selling_price'])
            profit = selling - cost
            margin_pct = round((profit / selling * 100), 2) if selling > 0 else 0.0
            
            b_dict = dict(b)
            b_dict['aging_days'] = days
            b_dict['aging_category'] = category
            b_dict['recommendation'] = rec
            b_dict['total_cost'] = cost
            b_dict['gross_profit'] = profit
            b_dict['margin_pct'] = margin_pct
            augmented.append(b_dict)
        return jsonify({'bikes': augmented})

    # Add New Bike
    data = request.json or {}
    make = data.get('make', '').strip()
    model = data.get('model', '').strip()
    year = int(data.get('year', 2023))
    reg_number = data.get('reg_number', '').strip().upper()
    engine_cc = int(data.get('engine_cc', 150))
    kms_driven = int(data.get('kms_driven', 10000))
    fuel_type = data.get('fuel_type', 'Petrol')
    category = data.get('category', 'Cruiser')
    owners_count = int(data.get('owners_count', 1))
    color = data.get('color', 'Black')
    purchase_price = float(data.get('purchase_price', 0.0))
    refurb_cost = float(data.get('refurb_cost', 0.0))
    selling_price = float(data.get('selling_price', 0.0))
    insurance_valid = data.get('insurance_valid_until', '2027-10-15')
    rc_status = data.get('rc_status', 'Verified & Clear')
    inspection_score = int(data.get('inspection_score', 39))
    notes = data.get('notes', '')
    today_str = date.today().strftime('%Y-%m-%d')

    new_id = database.execute_query(
        """INSERT INTO bikes_inventory
           (make, model, year, reg_number, engine_cc, kms_driven, fuel_type, category, owners_count, color, purchase_price, refurb_cost, selling_price, stock_status, date_added, insurance_valid_until, rc_status, inspection_score, notes)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'In Showroom', %s, %s, %s, %s, %s)""",
        (make, model, year, reg_number, engine_cc, kms_driven, fuel_type, category, owners_count, color, purchase_price, refurb_cost, selling_price, today_str, insurance_valid, rc_status, inspection_score, notes),
        fetch="insert"
    )

    return jsonify({'success': True, 'bike_id': new_id})

@app.route('/api/inventory/bikes/<int:bike_id>/status', methods=['POST'])
def api_update_bike_status(bike_id):
    data = request.json or {}
    new_status = data.get('status', 'In Showroom')
    database.execute_query(
        "UPDATE bikes_inventory SET stock_status = %s WHERE id = %s",
        (new_status, bike_id),
        fetch="update"
    )
    return jsonify({'success': True})

@app.route('/api/inventory/spares', methods=['GET', 'POST'])
def api_spares_inventory():
    if request.method == 'GET':
        spares = database.execute_query("SELECT * FROM spares_inventory ORDER BY id ASC", fetch="all")
        return jsonify({'spares': spares})

    data = request.json or {}
    name = data.get('name', '').strip()
    sku = data.get('sku', '').strip().upper()
    category = data.get('category', 'Engine & Transmission')
    brand = data.get('brand', 'OEM')
    compatible_bikes = data.get('compatible_bikes', '')
    stock_quantity = int(data.get('stock_quantity', 0))
    reorder_level = int(data.get('reorder_level', 5))
    purchase_cost = float(data.get('purchase_cost', 0.0))
    selling_price = float(data.get('selling_price', 0.0))
    rack_location = data.get('rack_location', 'Bay A')

    new_id = database.execute_query(
        """INSERT INTO spares_inventory
           (name, sku, category, brand, compatible_bikes, stock_quantity, reorder_level, purchase_cost, selling_price, rack_location)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        (name, sku, category, brand, compatible_bikes, stock_quantity, reorder_level, purchase_cost, selling_price, rack_location),
        fetch="insert"
    )

    return jsonify({'success': True, 'spare_id': new_id})

@app.route('/api/inventory/spares/<int:spare_id>/restock', methods=['POST'])
def api_restock_spare(spare_id):
    data = request.json or {}
    qty = int(data.get('quantity', 10))
    database.execute_query(
        "UPDATE spares_inventory SET stock_quantity = stock_quantity + %s WHERE id = %s",
        (qty, spare_id),
        fetch="update"
    )
    return jsonify({'success': True})

# -----------------------------------------------------------------------------
# BILLING MODULE API ROUTES
# -----------------------------------------------------------------------------

@app.route('/api/billing', methods=['GET', 'POST'])
def api_billing():
    if request.method == 'GET':
        bills = database.execute_query("SELECT * FROM service_bills ORDER BY id DESC", fetch="all")
        return jsonify({'bills': bills})

    data = request.json or {}
    customer_name = data.get('customer_name', '').strip()
    customer_phone = data.get('customer_phone', '').strip()
    customer_email = data.get('customer_email', '').strip()
    bike_reg = data.get('bike_reg_number', '').strip().upper()
    bike_model = data.get('bike_model', '').strip()
    current_km = int(data.get('current_km', 10000))
    service_type = data.get('service_type', 'Periodic Routine Maintenance')
    technician_name = data.get('technician_name', 'Vikram Shinde (Master Tech)')
    labor_charges = float(data.get('labor_charges', 0.0))
    discount = float(data.get('discount', 0.0))
    tax_rate = float(data.get('tax_rate', 18.0))
    payment_status = data.get('payment_status', 'Pending')
    payment_mode = data.get('payment_mode', 'UPI')
    notes = data.get('notes', '')

    parts = data.get('parts', [])  # list of {spare_id, name, qty, price}
    parts_subtotal = 0.0
    for p in parts:
        qty = int(p.get('qty', 1))
        price = float(p.get('price', 0.0))
        parts_subtotal += (qty * price)
        # Deduct inventory if spare_id provided
        if p.get('spare_id'):
            database.execute_query(
                "UPDATE spares_inventory SET stock_quantity = MAX(0, stock_quantity - %s) WHERE id = %s",
                (qty, int(p['spare_id'])),
                fetch="update"
            )

    pre_tax = max(0.0, labor_charges + parts_subtotal - discount)
    tax_amount = round((pre_tax * tax_rate) / 100.0, 2)
    grand_total = pre_tax + tax_amount

    bill_number = f"INV-2026-{datetime.now().strftime('%m%d%H%M%S')[-6:]}"
    today_str = date.today().strftime('%Y-%m-%d')
    parts_json = json.dumps(parts)

    bill_id = database.execute_query(
        """INSERT INTO service_bills
           (bill_number, customer_name, customer_phone, customer_email, bike_reg_number, bike_model, current_km, service_type, technician_name, labor_charges, parts_json, parts_subtotal, discount, tax_rate, tax_amount, grand_total, payment_status, payment_mode, notes, bill_date)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        (bill_number, customer_name, customer_phone, customer_email, bike_reg, bike_model, current_km, service_type, technician_name, labor_charges, parts_json, parts_subtotal, discount, tax_rate, tax_amount, grand_total, payment_status, payment_mode, notes, today_str),
        fetch="insert"
    )

    return jsonify({'success': True, 'bill_id': bill_id, 'bill_number': bill_number, 'grand_total': grand_total})

@app.route('/api/billing/<int:bill_id>/pay', methods=['POST'])
def api_pay_bill(bill_id):
    data = request.json or {}
    payment_mode = data.get('payment_mode', 'UPI')
    database.execute_query(
        "UPDATE service_bills SET payment_status = 'Paid', payment_mode = %s WHERE id = %s",
        (payment_mode, bill_id),
        fetch="update"
    )
    return jsonify({'success': True})

# -----------------------------------------------------------------------------
# REPORTS MODULE API ROUTES
# -----------------------------------------------------------------------------

@app.route('/api/reports', methods=['GET'])
def api_reports():
    # 1. Sales Breakdown
    sales = database.execute_query("SELECT * FROM sales ORDER BY sale_date DESC", fetch="all")
    total_sales_val = sum(float(s['grand_total']) for s in sales)
    total_sales_profit = sum(float(s['gross_profit']) for s in sales)

    # 2. Workshop Labor & Invoicing
    bills = database.execute_query("SELECT * FROM service_bills ORDER BY bill_date DESC", fetch="all")
    total_billed = sum(float(b['grand_total']) for b in bills)
    total_labor = sum(float(b['labor_charges']) for b in bills)
    total_parts_billed = sum(float(b['parts_subtotal']) for b in bills)
    paid_bills_count = sum(1 for b in bills if b['payment_status'] == 'Paid')
    pending_bills_count = len(bills) - paid_bills_count

    # 3. Inventory Capital Locked
    bikes = database.execute_query("SELECT * FROM bikes_inventory", fetch="all")
    bikes_cost_locked = sum(float(b['purchase_price']) + float(b['refurb_cost']) for b in bikes if b['stock_status'] != 'Sold')
    bikes_expected_rev = sum(float(b['selling_price']) for b in bikes if b['stock_status'] != 'Sold')

    spares = database.execute_query("SELECT * FROM spares_inventory", fetch="all")
    spares_cost_locked = sum(float(s['purchase_cost']) * int(s['stock_quantity']) for s in spares)
    spares_retail_val = sum(float(s['selling_price']) * int(s['stock_quantity']) for s in spares)

    return jsonify({
        'total_sales_revenue': total_sales_val,
        'total_sales_profit': total_sales_profit,
        'total_workshop_billed': total_billed,
        'total_labor_revenue': total_labor,
        'total_parts_billed': total_parts_billed,
        'paid_bills_count': paid_bills_count,
        'pending_bills_count': pending_bills_count,
        'bikes_cost_locked': bikes_cost_locked,
        'bikes_expected_revenue': bikes_expected_rev,
        'spares_cost_locked': spares_cost_locked,
        'spares_retail_value': spares_retail_val,
        'total_inventory_investment': bikes_cost_locked + spares_cost_locked
    })

# -----------------------------------------------------------------------------
# SERVICE ALERTS API ROUTES
# -----------------------------------------------------------------------------

@app.route('/api/alerts/dispatch', methods=['POST'])
def api_dispatch_alert():
    data = request.json or {}
    alert_id = data.get('alert_id')
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    if alert_id:
        database.execute_query(
            "UPDATE service_alerts SET status = 'Dispatched' WHERE id = %s",
            (alert_id,),
            fetch="update"
        )
    return jsonify({'success': True, 'message': 'Notification dispatched via WhatsApp & SMS Gateway.'})

# -----------------------------------------------------------------------------
# FRONTEND TEMPLATE ROUTE (HTML & SPA)
# -----------------------------------------------------------------------------

@app.route('/')
def index():
    return render_template_string(HTML_TEMPLATE)

# -----------------------------------------------------------------------------
# COMPREHENSIVE UI TEMPLATE WITH EMBEDDED DASHBOARD, SALES, INVENTORY, BILLING, REPORT
# -----------------------------------------------------------------------------

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MotoCraft - 2-Wheeler Motors & Workshop Management</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
            display: ['Outfit', 'sans-serif'],
            mono: ['JetBrains Mono', 'Plus Jakarta Sans', 'system-ui', 'monospace']
          },
          colors: {
            neutral: {
              950: '#0a0a0a',
              900: '#141414',
              850: '#1c1c1c',
              800: '#262626'
            }
          }
        }
      }
    }
  </script>
  <style>
    body { background-color: #0a0a0a; color: #f5f5f5; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #141414; }
    ::-webkit-scrollbar-thumb { background: #2e2e2e; border-radius: 3px; }
    .currency-symbol { font-family: system-ui, -apple-system, sans-serif; font-weight: 700; margin-right: 2px; }
  </style>
</head>
<body class="bg-neutral-950 text-neutral-100 min-h-screen font-sans flex flex-col selection:bg-amber-500 selection:text-neutral-950">

  <!-- TOP HEADER (3-Zone Contract) -->
  <header class="sticky top-0 z-40 w-full bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
      
      <!-- Zone 1: Brand Wordmark -->
      <a href="javascript:void(0)" onclick="switchTab('dashboard')" class="flex items-center gap-2.5 text-neutral-100 shrink-0">
        <div class="w-8 h-8 rounded-lg bg-amber-500 text-neutral-950 flex items-center justify-center font-black text-lg tracking-tighter">
          MC
        </div>
        <span class="text-xl font-bold font-display tracking-tight text-neutral-100">
          MotoCraft<span class="text-amber-500">.</span>
        </span>
      </a>

      <!-- Zone 2: Navigation Links (Dashboard, Sales, Inventory, Billing, Report) -->
      <nav id="nav-container" class="hidden md:flex items-center gap-6 text-sm font-medium">
        <button onclick="switchTab('dashboard')" id="nav-dashboard" class="nav-item text-amber-400 font-semibold py-1 relative whitespace-nowrap">Dashboard</button>
        <button onclick="switchTab('sales')" id="nav-sales" class="nav-item text-neutral-400 hover:text-neutral-200 py-1 relative whitespace-nowrap">Sales</button>
        <button onclick="switchTab('inventory')" id="nav-inventory" class="nav-item text-neutral-400 hover:text-neutral-200 py-1 relative whitespace-nowrap">Inventory</button>
        <button onclick="switchTab('billing')" id="nav-billing" class="nav-item text-neutral-400 hover:text-neutral-200 py-1 relative whitespace-nowrap">Billing</button>
        <button onclick="switchTab('report')" id="nav-report" class="nav-item text-neutral-400 hover:text-neutral-200 py-1 relative whitespace-nowrap">Reports</button>
        <button onclick="switchTab('customer-portal')" id="nav-customer-portal" class="nav-item text-neutral-400 hover:text-neutral-200 py-1 relative whitespace-nowrap">Customer View</button>
      </nav>

      <!-- Zone 3: Auth & DB Indicator -->
      <div class="flex items-center gap-3 shrink-0">
        <button onclick="openDbModal()" class="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] font-mono text-neutral-300 hover:text-white" title="MySQL Connection Details">
          <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span id="db-badge">MySQL / SQLite</span>
        </button>

        <div id="auth-actions">
          <!-- Rendered via JS -->
        </div>
      </div>
    </div>
  </header>

  <!-- MAIN CONTAINER -->
  <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">

    <!-- SUB-MODULE: 1. DASHBOARD -->
    <div id="tab-dashboard" class="tab-pane space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <div class="text-xs font-mono text-amber-400">Workshop & Sales Operations</div>
          <h1 class="text-2xl sm:text-3xl font-extrabold font-display text-neutral-100">Management Dashboard</h1>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="openNewSaleModal('BIKE')" class="px-3.5 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-colors shadow-sm">+ New Bike Sale</button>
          <button onclick="openNewBillModal()" class="px-3.5 py-2 text-xs font-semibold rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors">+ Create Bill</button>
        </div>
      </div>

      <!-- KPI Grid -->
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs">
        <div class="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <div class="text-neutral-500 font-medium">Total Shop Revenue</div>
          <div class="text-2xl font-bold font-mono text-neutral-100 mt-1"><span class="currency-symbol text-amber-400">₹</span><span id="stat-total-rev">0</span></div>
          <div class="text-[11px] text-emerald-400 mt-1">Bike Sales + Spares + Service</div>
        </div>

        <div class="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <div class="text-neutral-500 font-medium">Bikes in Showroom</div>
          <div class="text-2xl font-bold font-mono text-neutral-100 mt-1"><span id="stat-bikes-count">0</span> Units</div>
          <div class="text-[11px] text-neutral-400 mt-1 font-mono">₹<span id="stat-bikes-val">0</span> Inventory Capital</div>
        </div>

        <div class="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <div class="text-neutral-500 font-medium">Service Workshop Invoiced</div>
          <div class="text-2xl font-bold font-mono text-amber-400 mt-1"><span class="currency-symbol">₹</span><span id="stat-workshop-rev">0</span></div>
          <div class="text-[11px] text-neutral-400 mt-1">Paid repair tickets</div>
        </div>

        <div class="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <div class="text-neutral-500 font-medium">Low Spares Alerts</div>
          <div class="text-2xl font-bold font-mono text-rose-400 mt-1"><span id="stat-low-spares">0</span> SKUs</div>
          <div class="text-[11px] text-neutral-400 mt-1">Under reorder threshold</div>
        </div>

        <div class="p-4 rounded-xl bg-neutral-900 border border-neutral-800 col-span-2 lg:col-span-1">
          <div class="text-neutral-500 font-medium">Unpaid Pending Bills</div>
          <div class="text-2xl font-bold font-mono text-amber-400 mt-1"><span class="currency-symbol">₹</span><span id="stat-pending-bills">0</span></div>
          <div class="text-[11px] text-neutral-400 mt-1"><span id="stat-pending-count">0</span> pending payment</div>
        </div>
      </div>

      <!-- Automated Service Alerts Section -->
      <div class="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <h2 class="text-base font-bold font-display text-neutral-100">Automated Service & Maintenance Alerts</h2>
          </div>
          <span class="text-xs font-mono text-neutral-400">Telemetry rule: 3,000 km / 90 days limit</span>
        </div>
        <div id="dashboard-alerts-list" class="space-y-2.5 text-xs">
          <!-- Loaded via JS -->
        </div>
      </div>

      <!-- Recent Transactions Split -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Recent Sales -->
        <div class="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-neutral-200">Recent Sales Transactions</h3>
            <button onclick="switchTab('sales')" class="text-xs text-amber-400 hover:underline">View All Sales &rarr;</button>
          </div>
          <div id="dashboard-recent-sales" class="space-y-2 text-xs"></div>
        </div>

        <!-- Recent Bills -->
        <div class="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-neutral-200">Recent Service Bills</h3>
            <button onclick="switchTab('billing')" class="text-xs text-amber-400 hover:underline">View All Bills &rarr;</button>
          </div>
          <div id="dashboard-recent-bills" class="space-y-2 text-xs"></div>
        </div>
      </div>
    </div>

    <!-- SUB-MODULE: 2. SALES MODULE -->
    <div id="tab-sales" class="tab-pane hidden space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <div class="text-xs font-mono text-amber-400">Point of Sale & Vehicle Transactions</div>
          <h1 class="text-2xl sm:text-3xl font-extrabold font-display text-neutral-100">Sales Module</h1>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="openNewSaleModal('BIKE')" class="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-colors shadow-sm">+ Sell Pre-Owned Bike</button>
          <button onclick="openNewSaleModal('SPARES')" class="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors">+ Sell Spare Parts</button>
        </div>
      </div>

      <!-- Sales Table -->
      <div class="rounded-xl border border-neutral-800 bg-neutral-900 overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-neutral-800 bg-neutral-950 text-neutral-400 font-mono">
              <th class="p-3.5">Invoice #</th>
              <th class="p-3.5">Date</th>
              <th class="p-3.5">Type</th>
              <th class="p-3.5">Customer</th>
              <th class="p-3.5">Item Description</th>
              <th class="p-3.5">Payment</th>
              <th class="p-3.5">Grand Total</th>
              <th class="p-3.5">Gross Profit</th>
              <th class="p-3.5">Receipt</th>
            </tr>
          </thead>
          <tbody id="sales-table-body" class="divide-y divide-neutral-850">
            <!-- Rendered via JS -->
          </tbody>
        </table>
      </div>
    </div>

    <!-- SUB-MODULE: 3. INVENTORY MODULE -->
    <div id="tab-inventory" class="tab-pane hidden space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <div class="text-xs font-mono text-amber-400">Asset & Stockroom Tracking</div>
          <h1 class="text-2xl sm:text-3xl font-extrabold font-display text-neutral-100">Inventory Module</h1>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="openAddBikeModal()" class="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-colors shadow-sm">+ Add Pre-Owned Bike</button>
          <button onclick="openAddSpareModal()" class="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors">+ Add Spare SKU</button>
        </div>
      </div>

      <!-- Inventory Sub-Tabs -->
      <div class="flex items-center gap-2 border-b border-neutral-800 pb-2">
        <button onclick="switchInventorySubTab('bikes')" id="subtab-bikes-btn" class="px-4 py-1.5 text-xs font-bold rounded-lg bg-amber-500 text-neutral-950">Pre-Owned Bikes</button>
        <button onclick="switchInventorySubTab('spares')" id="subtab-spares-btn" class="px-4 py-1.5 text-xs font-medium rounded-lg bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white">Spare Parts & Fluids</button>
      </div>

      <!-- Bikes Inventory Table -->
      <div id="inventory-bikes-view" class="rounded-xl border border-neutral-800 bg-neutral-900 overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-neutral-800 bg-neutral-950 text-neutral-400 font-mono">
              <th class="p-3.5">Make & Model</th>
              <th class="p-3.5">Registration</th>
              <th class="p-3.5">Year / Kms</th>
              <th class="p-3.5">Purchase Cost</th>
              <th class="p-3.5">Refurb Cost</th>
              <th class="p-3.5">Selling Price</th>
              <th class="p-3.5">Net Profit Margin</th>
              <th class="p-3.5">Lot Age</th>
              <th class="p-3.5">Status</th>
              <th class="p-3.5">Action</th>
            </tr>
          </thead>
          <tbody id="bikes-table-body" class="divide-y divide-neutral-850">
            <!-- Loaded via JS -->
          </tbody>
        </table>
      </div>

      <!-- Spares Inventory Table -->
      <div id="inventory-spares-view" class="hidden rounded-xl border border-neutral-800 bg-neutral-900 overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-neutral-800 bg-neutral-950 text-neutral-400 font-mono">
              <th class="p-3.5">SKU</th>
              <th class="p-3.5">Part Name</th>
              <th class="p-3.5">Brand / Category</th>
              <th class="p-3.5">Bay Location</th>
              <th class="p-3.5">Cost / Retail</th>
              <th class="p-3.5">In Stock</th>
              <th class="p-3.5">Status</th>
              <th class="p-3.5">Quick Action</th>
            </tr>
          </thead>
          <tbody id="spares-table-body" class="divide-y divide-neutral-850">
            <!-- Loaded via JS -->
          </tbody>
        </table>
      </div>
    </div>

    <!-- SUB-MODULE: 4. BILLING MODULE -->
    <div id="tab-billing" class="tab-pane hidden space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <div class="text-xs font-mono text-amber-400">Tax Invoicing & Workshop Job Tickets</div>
          <h1 class="text-2xl sm:text-3xl font-extrabold font-display text-neutral-100">Billing Module</h1>
        </div>
        <button onclick="openNewBillModal()" class="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-colors shadow-sm">+ Create Service Bill</button>
      </div>

      <!-- Bills Table -->
      <div class="rounded-xl border border-neutral-800 bg-neutral-900 overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-neutral-800 bg-neutral-950 text-neutral-400 font-mono">
              <th class="p-3.5">Invoice #</th>
              <th class="p-3.5">Bill Date</th>
              <th class="p-3.5">Customer</th>
              <th class="p-3.5">Vehicle Reg & Model</th>
              <th class="p-3.5">Service Type</th>
              <th class="p-3.5">Labor</th>
              <th class="p-3.5">Parts</th>
              <th class="p-3.5">GST (18%)</th>
              <th class="p-3.5">Grand Total</th>
              <th class="p-3.5">Payment</th>
              <th class="p-3.5">Actions</th>
            </tr>
          </thead>
          <tbody id="bills-table-body" class="divide-y divide-neutral-850">
            <!-- Loaded via JS -->
          </tbody>
        </table>
      </div>
    </div>

    <!-- SUB-MODULE: 5. REPORT MODULE -->
    <div id="tab-report" class="tab-pane hidden space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <div class="text-xs font-mono text-amber-400">Financial Intelligence & Unit Economics</div>
          <h1 class="text-2xl sm:text-3xl font-extrabold font-display text-neutral-100">Reporting & Analytics</h1>
        </div>
        <button onclick="window.print()" class="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 flex items-center gap-1.5">
          <span>Print / Save PDF Report</span>
        </button>
      </div>

      <!-- Reports KPI Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
        <div class="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <div class="text-neutral-500">Gross Sales Revenue</div>
          <div class="text-xl font-bold font-mono text-neutral-100 mt-1"><span class="currency-symbol text-amber-400">₹</span><span id="rpt-sales-rev">0</span></div>
          <div class="text-[11px] text-emerald-400 mt-1">Realized Gross Profit: ₹<span id="rpt-sales-profit">0</span></div>
        </div>

        <div class="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <div class="text-neutral-500">Workshop Invoicing</div>
          <div class="text-xl font-bold font-mono text-amber-400 mt-1"><span class="currency-symbol">₹</span><span id="rpt-workshop-rev">0</span></div>
          <div class="text-[11px] text-neutral-400 mt-1">Labor: ₹<span id="rpt-labor-rev">0</span> · Spares: ₹<span id="rpt-parts-rev">0</span></div>
        </div>

        <div class="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <div class="text-neutral-500">Total Inventory Capital Locked</div>
          <div class="text-xl font-bold font-mono text-neutral-200 mt-1"><span class="currency-symbol">₹</span><span id="rpt-capital-locked">0</span></div>
          <div class="text-[11px] text-neutral-400 mt-1">Bikes: ₹<span id="rpt-bike-cost">0</span> · Spares: ₹<span id="rpt-spares-cost">0</span></div>
        </div>

        <div class="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <div class="text-neutral-500">Invoice Collection Efficiency</div>
          <div class="text-xl font-bold font-mono text-emerald-400 mt-1"><span id="rpt-paid-count">0</span> / <span id="rpt-total-bills">0</span> Paid</div>
          <div class="text-[11px] text-neutral-400 mt-1"><span id="rpt-pending-count">0</span> pending collections</div>
        </div>
      </div>

      <!-- Detailed Breakdown Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4 text-xs">
          <h3 class="text-sm font-bold text-neutral-100 font-display">Revenue Channels Breakdown</h3>
          <div class="space-y-3">
            <div>
              <div class="flex justify-between text-neutral-300 mb-1">
                <span>Pre-Owned Bike Sales</span>
                <span class="font-mono text-neutral-100 font-semibold" id="rpt-bar-bike-text">64%</span>
              </div>
              <div class="w-full h-2 rounded-full bg-neutral-950 overflow-hidden">
                <div class="h-full bg-amber-500 rounded-full" style="width: 64%"></div>
              </div>
            </div>

            <div>
              <div class="flex justify-between text-neutral-300 mb-1">
                <span>Workshop Service & Labor</span>
                <span class="font-mono text-neutral-100 font-semibold" id="rpt-bar-serv-text">24%</span>
              </div>
              <div class="w-full h-2 rounded-full bg-neutral-950 overflow-hidden">
                <div class="h-full bg-emerald-500 rounded-full" style="width: 24%"></div>
              </div>
            </div>

            <div>
              <div class="flex justify-between text-neutral-300 mb-1">
                <span>Direct Spare Parts & Consumables</span>
                <span class="font-mono text-neutral-100 font-semibold" id="rpt-bar-spares-text">12%</span>
              </div>
              <div class="w-full h-2 rounded-full bg-neutral-950 overflow-hidden">
                <div class="h-full bg-sky-500 rounded-full" style="width: 12%"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3 text-xs">
          <h3 class="text-sm font-bold text-neutral-100 font-display">Workshop Master Technicians Audit</h3>
          <div class="space-y-2">
            <div class="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex justify-between items-center">
              <div>
                <div class="font-bold text-neutral-200">Vikram Shinde</div>
                <div class="text-[11px] text-neutral-500">Master Tech · 18 Jobs Done</div>
              </div>
              <div class="font-mono text-emerald-400 font-semibold">99.2% QC Score</div>
            </div>
            <div class="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex justify-between items-center">
              <div>
                <div class="font-bold text-neutral-200">Sanjay Rawat</div>
                <div class="text-[11px] text-neutral-500">Service Specialist · 14 Jobs Done</div>
              </div>
              <div class="font-mono text-emerald-400 font-semibold">98.0% QC Score</div>
            </div>
            <div class="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex justify-between items-center">
              <div>
                <div class="font-bold text-neutral-200">Anand Patel</div>
                <div class="text-[11px] text-neutral-500">Electrical & Diagnostics · 11 Jobs</div>
              </div>
              <div class="font-mono text-emerald-400 font-semibold">99.5% QC Score</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- SUB-MODULE: 6. CUSTOMER PORTAL -->
    <div id="tab-customer-portal" class="tab-pane hidden space-y-6">
      <div class="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div class="text-xs font-mono text-amber-400">Customer Self-Service Hub</div>
            <h1 class="text-2xl font-bold font-display text-neutral-100 mt-0.5">My Bike & Service History</h1>
            <p class="text-xs text-neutral-400 mt-1">Check your bike's service logs, download tax invoices, and track live maintenance status.</p>
          </div>
          <button onclick="openNewBillModal()" class="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-500 text-neutral-950 hover:bg-amber-400 shrink-0">
            Book Next Service
          </button>
        </div>

        <!-- Customer Vehicle Strip -->
        <div class="p-4 rounded-xl bg-neutral-950 border border-neutral-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <div class="text-neutral-500">Registered Vehicle</div>
            <div class="text-sm font-bold text-neutral-100 mt-0.5" id="cust-bike-model">Royal Enfield Classic 350</div>
            <div class="font-mono text-amber-400 text-xs" id="cust-bike-reg">MH 12 AB 4589</div>
          </div>
          <div>
            <div class="text-neutral-500">Service Due Telemetry</div>
            <div class="text-xs text-rose-400 font-semibold mt-0.5">Overdue: 3,400 km / 124 days</div>
            <div class="text-[11px] text-neutral-400">Scheduled maintenance recommended</div>
          </div>
          <div>
            <div class="text-neutral-500">Insurance Status</div>
            <div class="text-xs text-emerald-400 font-semibold mt-0.5">Valid Policy (Cashless)</div>
            <div class="text-[11px] text-neutral-400">Expires: 2027-04-15</div>
          </div>
        </div>
      </div>

      <!-- Customer Invoices List -->
      <div class="space-y-3">
        <h3 class="text-sm font-bold text-neutral-200">My Maintenance Invoices & Receipts</h3>
        <div id="customer-invoices-list" class="space-y-3 text-xs"></div>
      </div>
    </div>

  </main>

  <!-- MODAL: SIGN IN / SIGN UP -->
  <div id="modal-auth" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm hidden flex items-center justify-center p-4">
    <div class="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-4">
      <div class="flex items-center justify-between border-b border-neutral-800 pb-3">
        <h3 id="auth-modal-title" class="text-lg font-bold font-display text-neutral-100">Sign In to MotoCraft</h3>
        <button onclick="closeModal('modal-auth')" class="text-xs px-2 py-1 rounded bg-neutral-800 text-neutral-400 hover:text-white">&times;</button>
      </div>

      <!-- Quick 1-Click Fill Demo Credentials for instant testing -->
      <div class="p-3 bg-neutral-950 rounded-xl border border-neutral-800 space-y-1.5 text-xs">
        <div class="text-[11px] font-mono text-neutral-400 uppercase font-semibold">1-Click Test Credentials:</div>
        <div class="flex gap-2">
          <button onclick="fillAdminCreds()" class="flex-1 py-1.5 px-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 font-semibold text-[11px]">
            Fill Admin (admin123)
          </button>
          <button onclick="fillCustomerCreds()" class="flex-1 py-1.5 px-2 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px]">
            Fill Customer
          </button>
        </div>
      </div>

      <!-- Sign In Form -->
      <form id="form-login" onsubmit="handleLoginSubmit(event)" class="space-y-3 text-xs">
        <div>
          <label class="block text-neutral-400 mb-1">Email or Username</label>
          <input type="text" id="login-identifier" required placeholder="admin@motocraft.com or customer@example.com" class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-amber-500">
        </div>
        <div>
          <label class="block text-neutral-400 mb-1">Password</label>
          <input type="password" id="login-password" required placeholder="••••••••" class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-amber-500">
        </div>
        <button type="submit" class="w-full py-2.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-colors shadow-sm">
          Sign In
        </button>
      </form>

      <!-- Toggle to Register -->
      <div class="text-center text-xs text-neutral-400 pt-2 border-t border-neutral-800">
        <span>Need a customer account?</span>
        <button onclick="toggleAuthMode('register')" class="text-amber-400 hover:underline font-semibold ml-1">Sign Up</button>
      </div>

      <!-- Register Form (Hidden by default) -->
      <form id="form-register" onsubmit="handleRegisterSubmit(event)" class="space-y-3 text-xs hidden">
        <div>
          <label class="block text-neutral-400 mb-1">Full Name</label>
          <input type="text" id="reg-name" required placeholder="e.g. Arun Nair" class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-amber-500">
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-neutral-400 mb-1">Email</label>
            <input type="email" id="reg-email" required placeholder="arun@example.com" class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-amber-500">
          </div>
          <div>
            <label class="block text-neutral-400 mb-1">Mobile</label>
            <input type="tel" id="reg-phone" required placeholder="+91 98200 12345" class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-amber-500">
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-neutral-400 mb-1">Bike Model</label>
            <input type="text" id="reg-bike-model" placeholder="Royal Enfield / Yamaha" class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-amber-500">
          </div>
          <div>
            <label class="block text-neutral-400 mb-1">Reg Plate (RC)</label>
            <input type="text" id="reg-bike-reg" placeholder="MH 12 AB 4589" class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 uppercase font-mono focus:outline-none focus:border-amber-500">
          </div>
        </div>
        <div>
          <label class="block text-neutral-400 mb-1">Create Password</label>
          <input type="password" id="reg-password" required placeholder="At least 6 characters" class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-amber-500">
        </div>
        <button type="submit" class="w-full py-2.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm">
          Create Customer Account
        </button>
        <div class="text-center text-xs text-neutral-400 pt-1">
          <span>Already registered?</span>
          <button type="button" onclick="toggleAuthMode('login')" class="text-amber-400 hover:underline font-semibold ml-1">Sign In</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: NEW SALE (Bike or Spares) -->
  <div id="modal-sale" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm hidden flex items-center justify-center p-4">
    <div class="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-4">
      <div class="flex items-center justify-between border-b border-neutral-800 pb-3">
        <h3 id="sale-modal-title" class="text-lg font-bold font-display text-neutral-100">Record 2-Wheeler Sale</h3>
        <button onclick="closeModal('modal-sale')" class="text-xs px-2 py-1 rounded bg-neutral-800 text-neutral-400 hover:text-white">&times;</button>
      </div>

      <form id="form-sale" onsubmit="handleSaleSubmit(event)" class="space-y-3 text-xs">
        <input type="hidden" id="sale-type" value="BIKE">

        <div id="sale-bike-field">
          <label class="block text-neutral-400 mb-1 font-medium">Select Showroom Bike *</label>
          <select id="sale-bike-id" class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-amber-500" onchange="updateSaleBikePrice()">
            <!-- Populated via JS -->
          </select>
        </div>

        <div id="sale-spares-field" class="hidden">
          <label class="block text-neutral-400 mb-1 font-medium">Select Spare Part *</label>
          <select id="sale-spare-id" class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-amber-500">
            <!-- Populated via JS -->
          </select>
          <div class="mt-2">
            <label class="block text-neutral-400 mb-1">Quantity</label>
            <input type="number" id="sale-spare-qty" min="1" value="1" class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 font-mono">
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-neutral-400 mb-1">Customer Full Name *</label>
            <input type="text" id="sale-cust-name" required placeholder="e.g. Ramesh Kulkarni" class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-amber-500">
          </div>
          <div>
            <label class="block text-neutral-400 mb-1">Mobile Phone *</label>
            <input type="tel" id="sale-cust-phone" required placeholder="+91 98200 44556" class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-amber-500">
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-neutral-400 mb-1">Agreed Selling Price (₹) *</label>
            <input type="number" id="sale-price" required class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 font-mono focus:outline-none focus:border-amber-500">
          </div>
          <div>
            <label class="block text-neutral-400 mb-1">Payment Method</label>
            <select id="sale-payment-mode" class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100">
              <option value="UPI">Instant UPI / QR</option>
              <option value="Cash">Cash at Counter</option>
              <option value="Bank Transfer">NEFT / Bank Transfer</option>
              <option value="Card">Debit / Credit Card</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-neutral-400 mb-1">Discount (₹)</label>
          <input type="number" id="sale-discount" value="0" class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 font-mono">
        </div>

        <button type="submit" class="w-full py-2.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-colors shadow-sm">
          Confirm Transaction & Generate Bill
        </button>
      </form>
    </div>
  </div>

  <!-- MODAL: NEW BILLING / JOB TICKET -->
  <div id="modal-bill" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm hidden flex items-center justify-center p-4">
    <div class="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-4">
      <div class="flex items-center justify-between border-b border-neutral-800 pb-3">
        <h3 class="text-lg font-bold font-display text-neutral-100">Create Workshop Service Bill</h3>
        <button onclick="closeModal('modal-bill')" class="text-xs px-2 py-1 rounded bg-neutral-800 text-neutral-400 hover:text-white">&times;</button>
      </div>

      <form id="form-bill" onsubmit="handleBillSubmit(event)" class="space-y-3 text-xs">
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-neutral-400 mb-1">Customer Name *</label>
            <input type="text" id="bill-cust-name" required placeholder="e.g. Rahul Verma" class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-amber-500">
          </div>
          <div>
            <label class="block text-neutral-400 mb-1">Customer Phone *</label>
            <input type="tel" id="bill-cust-phone" required placeholder="+91 98231 45678" class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-amber-500">
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-neutral-400 mb-1">Bike Reg Plate (RC) *</label>
            <input type="text" id="bill-bike-reg" required placeholder="MH 12 AB 4589" class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 uppercase font-mono focus:outline-none focus:border-amber-500">
          </div>
          <div>
            <label class="block text-neutral-400 mb-1">Bike Model *</label>
            <input type="text" id="bill-bike-model" required placeholder="Royal Enfield Classic 350" class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-amber-500">
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-neutral-400 mb-1">Service Package *</label>
            <select id="bill-service-type" class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100">
              <option value="Periodic Routine Maintenance">Periodic Routine Maintenance</option>
              <option value="Full Engine Tune-Up & Overhaul">Full Engine Tune-Up & Overhaul</option>
              <option value="Brake Overhaul & Fluid Bleed">Brake Overhaul & Fluid Bleed</option>
              <option value="Electricals & Battery Service">Electricals & Battery Service</option>
              <option value="Accident Crash Repair">Accident Crash Repair</option>
            </select>
          </div>
          <div>
            <label class="block text-neutral-400 mb-1">Labor Charges (₹) *</label>
            <input type="number" id="bill-labor" required value="750" class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 font-mono">
          </div>
        </div>

        <div>
          <label class="block text-neutral-400 mb-1">Add Spare Part from Inventory</label>
          <div class="flex gap-2">
            <select id="bill-spare-select" class="flex-1 px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100"></select>
            <button type="button" onclick="addPartToBillList()" class="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200">+ Add</button>
          </div>
        </div>

        <!-- Selected parts preview table -->
        <div id="bill-parts-preview" class="p-2.5 bg-neutral-950 rounded-lg border border-neutral-850 space-y-1 font-mono text-[11px] max-h-24 overflow-y-auto">
          <div class="text-neutral-500 italic">No spare parts added to this bill.</div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-neutral-400 mb-1">Payment Status</label>
            <select id="bill-status" class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100">
              <option value="Paid">Paid / Settled</option>
              <option value="Pending">Pending Collection</option>
            </select>
          </div>
          <div>
            <label class="block text-neutral-400 mb-1">Discount (₹)</label>
            <input type="number" id="bill-discount" value="0" class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 font-mono">
          </div>
        </div>

        <button type="submit" class="w-full py-2.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-colors shadow-sm">
          Save & Issue Official Bill
        </button>
      </form>
    </div>
  </div>

  <!-- MODAL: ADD PRE-OWNED BIKE TO INVENTORY -->
  <div id="modal-add-bike" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm hidden flex items-center justify-center p-4">
    <div class="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-4">
      <div class="flex items-center justify-between border-b border-neutral-800 pb-3">
        <h3 class="text-lg font-bold font-display text-neutral-100">Add Pre-Owned Bike to Inventory</h3>
        <button onclick="closeModal('modal-add-bike')" class="text-xs px-2 py-1 rounded bg-neutral-800 text-neutral-400 hover:text-white">&times;</button>
      </div>

      <form id="form-add-bike" onsubmit="handleAddBikeSubmit(event)" class="space-y-3 text-xs">
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-neutral-400 mb-1">Make Brand *</label>
            <input type="text" id="nb-make" required placeholder="Royal Enfield / Yamaha" class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100">
          </div>
          <div>
            <label class="block text-neutral-400 mb-1">Model & Trim *</label>
            <input type="text" id="nb-model" required placeholder="Classic 350 / R15 V4" class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100">
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2">
          <div>
            <label class="block text-neutral-400 mb-1">Year</label>
            <input type="number" id="nb-year" value="2023" class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 font-mono">
          </div>
          <div>
            <label class="block text-neutral-400 mb-1">Reg Plate (RC) *</label>
            <input type="text" id="nb-reg" required placeholder="MH 12 XY 9911" class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 uppercase font-mono">
          </div>
          <div>
            <label class="block text-neutral-400 mb-1">Category</label>
            <select id="nb-category" class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100">
              <option value="Cruiser">Cruiser</option>
              <option value="Sport">Sport</option>
              <option value="Scooter">Scooter</option>
              <option value="Street Naked">Street Naked</option>
              <option value="Commuter">Commuter</option>
              <option value="Electric">Electric</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2">
          <div>
            <label class="block text-neutral-400 mb-1">Purchase Price (₹)</label>
            <input type="number" id="nb-purchase" required value="100000" class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 font-mono">
          </div>
          <div>
            <label class="block text-neutral-400 mb-1">Refurb Expenses (₹)</label>
            <input type="number" id="nb-refurb" required value="5000" class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 font-mono">
          </div>
          <div>
            <label class="block text-neutral-400 mb-1">Selling Target (₹)</label>
            <input type="number" id="nb-selling" required value="130000" class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 font-mono">
          </div>
        </div>

        <button type="submit" class="w-full py-2.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-colors shadow-sm">
          Save Bike to Showroom Inventory
        </button>
      </form>
    </div>
  </div>

  <!-- MODAL: ADD SPARE PART SKU -->
  <div id="modal-add-spare" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm hidden flex items-center justify-center p-4">
    <div class="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-4">
      <div class="flex items-center justify-between border-b border-neutral-800 pb-3">
        <h3 class="text-lg font-bold font-display text-neutral-100">Add Spare Part SKU to Inventory</h3>
        <button onclick="closeModal('modal-add-spare')" class="text-xs px-2 py-1 rounded bg-neutral-800 text-neutral-400 hover:text-white">&times;</button>
      </div>

      <form id="form-add-spare" onsubmit="handleAddSpareSubmit(event)" class="space-y-3 text-xs">
        <div>
          <label class="block text-neutral-400 mb-1">Part Name *</label>
          <input type="text" id="nsp-name" required placeholder="e.g. Motul 7100 10W-50 / Brembo Brake Pads" class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100">
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-neutral-400 mb-1">SKU Code *</label>
            <input type="text" id="nsp-sku" required placeholder="MOT-7100-10W50" class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 font-mono uppercase">
          </div>
          <div>
            <label class="block text-neutral-400 mb-1">Brand</label>
            <input type="text" id="nsp-brand" required placeholder="Motul / Brembo / OEM" class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100">
          </div>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <div>
            <label class="block text-neutral-400 mb-1">Stock Quantity</label>
            <input type="number" id="nsp-qty" required value="10" class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 font-mono">
          </div>
          <div>
            <label class="block text-neutral-400 mb-1">Cost (₹)</label>
            <input type="number" id="nsp-cost" required value="500" class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 font-mono">
          </div>
          <div>
            <label class="block text-neutral-400 mb-1">Selling Price (₹)</label>
            <input type="number" id="nsp-price" required value="750" class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 font-mono">
          </div>
        </div>
        <div>
          <label class="block text-neutral-400 mb-1">Compatible Bike Models</label>
          <input type="text" id="nsp-compat" placeholder="Royal Enfield Classic 350, KTM Duke 250" class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100">
        </div>
        <button type="submit" class="w-full py-2.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-colors shadow-sm">
          Save SKU to Stockroom
        </button>
      </form>
    </div>
  </div>

  <!-- MODAL: INVOICE PRINT VIEW -->
  <div id="modal-invoice-view" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm hidden flex items-center justify-center p-4">
    <div class="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-4">
      <div class="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div>
          <div class="text-xs font-mono text-amber-400">Official Workshop Tax Invoice</div>
          <h3 id="inv-modal-number" class="text-lg font-bold font-display text-neutral-100">INV-2026-0644</h3>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="window.print()" class="text-xs px-2.5 py-1 rounded bg-neutral-800 text-neutral-300 hover:text-white">Print</button>
          <button onclick="closeModal('modal-invoice-view')" class="text-xs px-2.5 py-1 rounded bg-neutral-800 text-neutral-400 hover:text-white">&times;</button>
        </div>
      </div>

      <div id="inv-modal-content" class="space-y-3 text-xs"></div>

      <div class="pt-2 text-center text-[10px] text-neutral-500 border-t border-neutral-800 font-mono">
        MotoCraft Motors & Workshop · Plot 42 Wakad, Pune · GSTIN: 27AABCM9102K1Z9
      </div>
    </div>
  </div>

  <!-- MODAL: MYSQL DATABASE STATUS & INFO -->
  <div id="modal-db-info" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm hidden flex items-center justify-center p-4">
    <div class="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-4">
      <div class="flex items-center justify-between border-b border-neutral-800 pb-3">
        <h3 class="text-lg font-bold font-display text-neutral-100">Database Engine Architecture</h3>
        <button onclick="closeModal('modal-db-info')" class="text-xs px-2 py-1 rounded bg-neutral-800 text-neutral-400 hover:text-white">&times;</button>
      </div>

      <div class="space-y-3 text-xs">
        <div class="p-3 bg-neutral-950 rounded-xl border border-neutral-800 space-y-1.5 font-mono">
          <div class="text-amber-400 font-bold">Active Engine: <span id="db-engine-name">MySQL / SQLite</span></div>
          <div class="text-neutral-400 text-[11px]" id="db-engine-status">Connected</div>
        </div>

        <div class="space-y-2 text-neutral-300">
          <p>This application is engineered with pure <strong>MySQL 8.0 DDL & queries</strong> via PyMySQL. If an external MySQL server is active on the network, it connects automatically.</p>
          <p class="text-neutral-400">A complete, standalone <code>schema.sql</code> file is included in the project root for direct import into MySQL Workbench, phpMyAdmin, AWS RDS, or GCP Cloud SQL.</p>
        </div>

        <div class="pt-2">
          <a href="/schema.sql" download class="block text-center py-2 px-3 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700">
            Download schema.sql for MySQL
          </a>
        </div>
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <footer class="border-t border-neutral-800 bg-neutral-950 mt-12 py-6 text-xs text-neutral-500">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div>© 2026 MotoCraft Motors & Workshop Management. Python + MySQL Engine.</div>
      <div class="font-mono text-[11px] text-neutral-400">Hardcoded Admin: admin / admin123</div>
    </div>
  </footer>

  <!-- APPLICATION CLIENT JAVASCRIPT -->
  <script>
    let currentUser = null;
    let activeBillParts = [];
    let allSparesList = [];
    let allBikesList = [];

    // Initialize App
    document.addEventListener('DOMContentLoaded', () => {
      checkAuth();
      loadDashboard();
      loadSparesList();
      loadBikesList();
    });

    // Navigation Tab Switcher
    function switchTab(tabId) {
      document.querySelectorAll('.tab-pane').forEach(el => el.classList.add('hidden'));
      document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('text-amber-400', 'font-semibold');
        el.classList.add('text-neutral-400');
      });

      const targetPane = document.getElementById(`tab-${tabId}`);
      if (targetPane) targetPane.classList.remove('hidden');

      const targetNav = document.getElementById(`nav-${tabId}`);
      if (targetNav) {
        targetNav.classList.remove('text-neutral-400');
        targetNav.classList.add('text-amber-400', 'font-semibold');
      }

      // Load specific module data
      if (tabId === 'dashboard') loadDashboard();
      if (tabId === 'sales') loadSales();
      if (tabId === 'inventory') loadInventory();
      if (tabId === 'billing') loadBilling();
      if (tabId === 'report') loadReports();
      if (tabId === 'customer-portal') loadCustomerPortal();
    }

    function switchInventorySubTab(sub) {
      if (sub === 'bikes') {
        document.getElementById('inventory-bikes-view').classList.remove('hidden');
        document.getElementById('inventory-spares-view').classList.add('hidden');
        document.getElementById('subtab-bikes-btn').className = 'px-4 py-1.5 text-xs font-bold rounded-lg bg-amber-500 text-neutral-950';
        document.getElementById('subtab-spares-btn').className = 'px-4 py-1.5 text-xs font-medium rounded-lg bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white';
      } else {
        document.getElementById('inventory-bikes-view').classList.add('hidden');
        document.getElementById('inventory-spares-view').classList.remove('hidden');
        document.getElementById('subtab-spares-btn').className = 'px-4 py-1.5 text-xs font-bold rounded-lg bg-amber-500 text-neutral-950';
        document.getElementById('subtab-bikes-btn').className = 'px-4 py-1.5 text-xs font-medium rounded-lg bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white';
      }
    }

    // Modal Helpers
    function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
    function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

    // Auth state check
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        const container = document.getElementById('auth-actions');
        if (data.authenticated && data.user) {
          currentUser = data.user;
          container.innerHTML = `
            <div class="flex items-center gap-2">
              <span class="text-xs text-neutral-300 font-mono hidden sm:inline">${data.user.name} (${data.user.role})</span>
              <button onclick="handleLogout()" class="px-3 py-1.5 text-xs rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white">Logout</button>
            </div>
          `;
        } else {
          currentUser = null;
          container.innerHTML = `
            <button onclick="openModal('modal-auth')" class="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-sm">
              Sign In
            </button>
          `;
        }
      } catch (e) {
        console.error(e);
      }
    }

    function toggleAuthMode(mode) {
      if (mode === 'register') {
        document.getElementById('form-login').classList.add('hidden');
        document.getElementById('form-register').classList.remove('hidden');
        document.getElementById('auth-modal-title').innerText = 'Create Customer Account';
      } else {
        document.getElementById('form-register').classList.add('hidden');
        document.getElementById('form-login').classList.remove('hidden');
        document.getElementById('auth-modal-title').innerText = 'Sign In to MotoCraft';
      }
    }

    function fillAdminCreds() {
      document.getElementById('login-identifier').value = 'admin@motocraft.com';
      document.getElementById('login-password').value = 'admin123';
    }

    function fillCustomerCreds() {
      document.getElementById('login-identifier').value = 'rahul@example.com';
      document.getElementById('login-password').value = 'customer123';
    }

    async function handleLoginSubmit(e) {
      e.preventDefault();
      const identifier = document.getElementById('login-identifier').value;
      const password = document.getElementById('login-password').value;
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, password })
        });
        const data = await res.json();
        if (data.success) {
          closeModal('modal-auth');
          checkAuth();
          if (data.user.role === 'customer') switchTab('customer-portal');
          else switchTab('dashboard');
        } else {
          alert(data.error || 'Login failed');
        }
      } catch (err) {
        alert('Authentication error');
      }
    }

    async function handleRegisterSubmit(e) {
      e.preventDefault();
      const payload = {
        name: document.getElementById('reg-name').value,
        email: document.getElementById('reg-email').value,
        phone: document.getElementById('reg-phone').value,
        password: document.getElementById('reg-password').value,
        bike_model: document.getElementById('reg-bike-model').value,
        bike_reg_number: document.getElementById('reg-bike-reg').value
      };
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          closeModal('modal-auth');
          checkAuth();
          switchTab('customer-portal');
        } else {
          alert(data.error || 'Registration failed');
        }
      } catch (err) {
        alert('Error registering');
      }
    }

    async function handleLogout() {
      await fetch('/api/auth/logout', { method: 'POST' });
      currentUser = null;
      checkAuth();
      switchTab('dashboard');
    }

    // 1. DASHBOARD LOAD
    async function loadDashboard() {
      try {
        const res = await fetch('/api/dashboard/stats');
        const d = await res.json();

        document.getElementById('stat-total-rev').innerText = Number(d.total_revenue).toLocaleString('en-IN');
        document.getElementById('stat-bikes-count').innerText = d.bikes_in_stock;
        document.getElementById('stat-bikes-val').innerText = (Number(d.bikes_stock_value) / 100000).toFixed(1) + 'L';
        document.getElementById('stat-workshop-rev').innerText = Number(d.workshop_revenue).toLocaleString('en-IN');
        document.getElementById('stat-low-spares').innerText = d.low_spares_count;
        document.getElementById('stat-pending-bills').innerText = Number(d.pending_bills_amount).toLocaleString('en-IN');
        document.getElementById('stat-pending-count').innerText = d.pending_bills_count;

        if (d.db_info) {
          document.getElementById('db-badge').innerText = `${d.db_info.engine} Engine`;
          document.getElementById('db-engine-name').innerText = `${d.db_info.engine} (${d.db_info.status})`;
        }

        // Automated alerts
        const alertsContainer = document.getElementById('dashboard-alerts-list');
        alertsContainer.innerHTML = d.service_alerts.map(a => `
          <div class="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div class="flex items-center gap-2">
                <strong class="text-neutral-200">${a.customer_name}</strong>
                <span class="font-mono text-neutral-400">(${a.bike_reg} · ${a.bike_model})</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-mono ${a.alert_type === 'SERVICE_OVERDUE' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-amber-950 text-amber-300 border border-amber-800'}">${a.alert_type}</span>
              </div>
              <div class="text-neutral-300 mt-0.5">${a.message}</div>
            </div>
            <button onclick="dispatchAlert(${a.id}, '${a.phone}')" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 shrink-0">
              Send Alert (WhatsApp/SMS)
            </button>
          </div>
        `).join('') || '<div class="text-neutral-500 italic">No pending alerts. All vehicles up to date!</div>';

        // Recent sales
        const salesContainer = document.getElementById('dashboard-recent-sales');
        salesContainer.innerHTML = d.recent_sales.map(s => `
          <div class="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800/80 flex justify-between items-center">
            <div>
              <div class="font-semibold text-neutral-200">${s.item_details}</div>
              <div class="text-[11px] text-neutral-500">${s.customer_name} · ${s.payment_mode}</div>
            </div>
            <div class="font-mono font-bold text-amber-400">₹${Number(s.grand_total).toLocaleString('en-IN')}</div>
          </div>
        `).join('') || '<div class="text-neutral-500">No sales recorded yet.</div>';

        // Recent bills
        const billsContainer = document.getElementById('dashboard-recent-bills');
        billsContainer.innerHTML = d.recent_bills.map(b => `
          <div class="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800/80 flex justify-between items-center">
            <div>
              <div class="font-semibold text-neutral-200">${b.customer_name} · ${b.bike_reg_number}</div>
              <div class="text-[11px] text-neutral-500">${b.service_type} (${b.bill_number})</div>
            </div>
            <div class="text-right">
              <div class="font-mono font-bold text-neutral-200">₹${Number(b.grand_total).toLocaleString('en-IN')}</div>
              <div class="text-[10px] font-mono ${b.payment_status === 'Paid' ? 'text-emerald-400' : 'text-amber-400'}">${b.payment_status}</div>
            </div>
          </div>
        `).join('') || '<div class="text-neutral-500">No service bills created yet.</div>';

      } catch (e) {
        console.error(e);
      }
    }

    // 2. SALES MODULE LOAD
    async function loadSales() {
      try {
        const res = await fetch('/api/sales');
        const data = await res.json();
        const tbody = document.getElementById('sales-table-body');
        tbody.innerHTML = data.sales.map(s => `
          <tr class="hover:bg-neutral-850/50">
            <td class="p-3.5 font-mono text-amber-400 font-bold">${s.sale_number}</td>
            <td class="p-3.5 font-mono text-neutral-400">${s.sale_date}</td>
            <td class="p-3.5"><span class="px-2 py-0.5 rounded text-[10px] font-mono ${s.sale_type === 'BIKE' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-sky-950 text-sky-300 border border-sky-800'}">${s.sale_type}</span></td>
            <td class="p-3.5"><div class="font-semibold text-neutral-200">${s.customer_name}</div><div class="text-[11px] text-neutral-500">${s.customer_phone}</div></td>
            <td class="p-3.5 text-neutral-300 max-w-xs truncate">${s.item_details}</td>
            <td class="p-3.5 font-mono text-neutral-400">${s.payment_mode}</td>
            <td class="p-3.5 font-mono font-bold text-neutral-100">₹${Number(s.grand_total).toLocaleString('en-IN')}</td>
            <td class="p-3.5 font-mono text-emerald-400 font-semibold">₹${Number(s.gross_profit).toLocaleString('en-IN')}</td>
            <td class="p-3.5"><button onclick="viewSaleReceipt('${s.sale_number}', '${s.customer_name}', '${s.item_details}', ${s.grand_total}, '${s.payment_mode}', '${s.sale_date}')" class="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300">Receipt</button></td>
          </tr>
        `).join('');
      } catch (e) {
        console.error(e);
      }
    }

    // 3. INVENTORY MODULE LOAD
    async function loadInventory() {
      try {
        // Load Bikes
        const bikesRes = await fetch('/api/inventory/bikes');
        const bikesData = await bikesRes.json();
        allBikesList = bikesData.bikes;

        const bikesBody = document.getElementById('bikes-table-body');
        bikesBody.innerHTML = allBikesList.map(b => `
          <tr class="hover:bg-neutral-850/50">
            <td class="p-3.5"><div class="font-bold text-neutral-200">${b.model}</div><div class="text-[11px] text-neutral-500">${b.make} · ${b.category}</div></td>
            <td class="p-3.5 font-mono text-neutral-300">${b.reg_number}</td>
            <td class="p-3.5 font-mono text-neutral-400">${b.year} · ${b.kms_driven.toLocaleString()} km</td>
            <td class="p-3.5 font-mono text-neutral-400">₹${Number(b.purchase_price).toLocaleString('en-IN')}</td>
            <td class="p-3.5 font-mono text-neutral-400">₹${Number(b.refurb_cost).toLocaleString('en-IN')}</td>
            <td class="p-3.5 font-mono font-bold text-neutral-100">₹${Number(b.selling_price).toLocaleString('en-IN')}</td>
            <td class="p-3.5 font-mono"><div class="text-emerald-400 font-bold">₹${Number(b.gross_profit).toLocaleString('en-IN')}</div><div class="text-[10px] text-neutral-500">${b.margin_pct}% margin</div></td>
            <td class="p-3.5 font-mono text-neutral-400">${b.aging_days}d (${b.aging_category})</td>
            <td class="p-3.5"><span class="px-2 py-0.5 rounded text-[10px] font-mono ${b.stock_status === 'In Showroom' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-neutral-800 text-neutral-400 border border-neutral-700'}">${b.stock_status}</span></td>
            <td class="p-3.5">
              ${b.stock_status === 'In Showroom' 
                ? `<button onclick="markBikeSold(${b.id})" class="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300">Mark Sold</button>`
                : `<button onclick="markBikeInShowroom(${b.id})" class="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300">Re-list</button>`}
            </td>
          </tr>
        `).join('');

        // Load Spares
        const sparesRes = await fetch('/api/inventory/spares');
        const sparesData = await sparesRes.json();
        allSparesList = sparesData.spares;

        const sparesBody = document.getElementById('spares-table-body');
        sparesBody.innerHTML = allSparesList.map(s => {
          const isLow = s.stock_quantity <= s.reorder_level;
          return `
            <tr class="hover:bg-neutral-850/50">
              <td class="p-3.5 font-mono text-amber-400 font-semibold">${s.sku}</td>
              <td class="p-3.5"><div class="font-bold text-neutral-200">${s.name}</div><div class="text-[11px] text-neutral-500 max-w-xs truncate">${s.compatible_bikes}</div></td>
              <td class="p-3.5 text-neutral-300">${s.brand} · ${s.category}</td>
              <td class="p-3.5 font-mono text-neutral-400">${s.rack_location}</td>
              <td class="p-3.5 font-mono">₹${s.purchase_cost} / <strong class="text-amber-400">₹${s.selling_price}</strong></td>
              <td class="p-3.5 font-mono font-bold text-sm ${isLow ? 'text-rose-400' : 'text-neutral-100'}">${s.stock_quantity} Units</td>
              <td class="p-3.5"><span class="px-2 py-0.5 rounded text-[10px] font-mono ${isLow ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'}">${isLow ? 'Low Stock' : 'Adequate'}</span></td>
              <td class="p-3.5"><button onclick="restockSpare(${s.id})" class="px-2.5 py-1 text-[11px] rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-medium">+10 Restock</button></td>
            </tr>
          `;
        }).join('');

      } catch (e) {
        console.error(e);
      }
    }

    // 4. BILLING MODULE LOAD
    async function loadBilling() {
      try {
        const res = await fetch('/api/billing');
        const data = await res.json();
        const tbody = document.getElementById('bills-table-body');
        tbody.innerHTML = data.bills.map(b => `
          <tr class="hover:bg-neutral-850/50">
            <td class="p-3.5 font-mono text-amber-400 font-bold">${b.bill_number}</td>
            <td class="p-3.5 font-mono text-neutral-400">${b.bill_date}</td>
            <td class="p-3.5"><div class="font-semibold text-neutral-200">${b.customer_name}</div><div class="text-[11px] text-neutral-500">${b.customer_phone}</div></td>
            <td class="p-3.5 font-mono"><div class="text-neutral-200">${b.bike_reg_number}</div><div class="text-[11px] text-neutral-500">${b.bike_model}</div></td>
            <td class="p-3.5 text-neutral-300">${b.service_type}</td>
            <td class="p-3.5 font-mono">₹${Number(b.labor_charges).toLocaleString('en-IN')}</td>
            <td class="p-3.5 font-mono">₹${Number(b.parts_subtotal).toLocaleString('en-IN')}</td>
            <td class="p-3.5 font-mono text-neutral-400">₹${Number(b.tax_amount).toLocaleString('en-IN')}</td>
            <td class="p-3.5 font-mono font-bold text-amber-400 text-sm">₹${Number(b.grand_total).toLocaleString('en-IN')}</td>
            <td class="p-3.5"><span class="px-2 py-0.5 rounded text-[10px] font-mono ${b.payment_status === 'Paid' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'}">${b.payment_status}</span></td>
            <td class="p-3.5 flex items-center gap-1.5">
              <button onclick="viewInvoiceDetails(${JSON.stringify(b).replace(/"/g, '&quot;')})" class="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300">View</button>
              ${b.payment_status === 'Pending' ? `<button onclick="markBillPaid(${b.id})" class="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">Pay</button>` : ''}
            </td>
          </tr>
        `).join('');
      } catch (e) {
        console.error(e);
      }
    }

    // 5. REPORTS MODULE LOAD
    async function loadReports() {
      try {
        const res = await fetch('/api/reports');
        const d = await res.json();

        document.getElementById('rpt-sales-rev').innerText = Number(d.total_sales_revenue).toLocaleString('en-IN');
        document.getElementById('rpt-sales-profit').innerText = Number(d.total_sales_profit).toLocaleString('en-IN');
        document.getElementById('rpt-workshop-rev').innerText = Number(d.total_workshop_billed).toLocaleString('en-IN');
        document.getElementById('rpt-labor-rev').innerText = Number(d.total_labor_revenue).toLocaleString('en-IN');
        document.getElementById('rpt-parts-rev').innerText = Number(d.total_parts_billed).toLocaleString('en-IN');

        document.getElementById('rpt-capital-locked').innerText = Number(d.total_inventory_investment).toLocaleString('en-IN');
        document.getElementById('rpt-bike-cost').innerText = Number(d.bikes_cost_locked).toLocaleString('en-IN');
        document.getElementById('rpt-spares-cost').innerText = Number(d.spares_cost_locked).toLocaleString('en-IN');

        document.getElementById('rpt-paid-count').innerText = d.paid_bills_count;
        document.getElementById('rpt-total-bills').innerText = d.paid_bills_count + d.pending_bills_count;
        document.getElementById('rpt-pending-count').innerText = d.pending_bills_count;
      } catch (e) {
        console.error(e);
      }
    }

    // 6. CUSTOMER PORTAL LOAD
    async function loadCustomerPortal() {
      try {
        const res = await fetch('/api/billing');
        const data = await res.json();
        const container = document.getElementById('customer-invoices-list');

        container.innerHTML = data.bills.map(b => `
          <div class="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <div class="flex items-center gap-2 font-mono">
                <span class="text-amber-400 font-bold">${b.bill_number}</span>
                <span class="text-neutral-500">·</span>
                <span class="text-neutral-400">${b.bill_date}</span>
                <span class="px-2 py-0.5 rounded text-[10px] ${b.payment_status === 'Paid' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'}">${b.payment_status}</span>
              </div>
              <div class="font-bold text-neutral-100 mt-1">${b.service_type}</div>
              <div class="text-neutral-400 text-[11px] mt-0.5">${b.notes || 'Routine maintenance and inspection'}</div>
            </div>
            <div class="flex items-center gap-3">
              <div class="text-right">
                <div class="font-mono text-base font-bold text-neutral-100">₹${Number(b.grand_total).toLocaleString('en-IN')}</div>
                <div class="text-[10px] text-neutral-500 font-mono">${b.payment_mode}</div>
              </div>
              <button onclick="viewInvoiceDetails(${JSON.stringify(b).replace(/"/g, '&quot;')})" class="px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white">Print Invoice</button>
            </div>
          </div>
        `).join('') || '<div class="text-neutral-500">No service invoices on record for this vehicle.</div>';
      } catch (e) {
        console.error(e);
      }
    }

    // Action Helpers
    async function markBikeSold(bikeId) {
      await fetch(`/api/inventory/bikes/${bikeId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Sold' })
      });
      loadInventory();
      loadDashboard();
    }

    async function markBikeInShowroom(bikeId) {
      await fetch(`/api/inventory/bikes/${bikeId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'In Showroom' })
      });
      loadInventory();
      loadDashboard();
    }

    async function restockSpare(spareId) {
      await fetch(`/api/inventory/spares/${spareId}/restock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: 10 })
      });
      loadInventory();
      loadDashboard();
    }

    async function markBillPaid(billId) {
      await fetch(`/api/billing/${billId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_mode: 'UPI' })
      });
      loadBilling();
      loadDashboard();
    }

    async function dispatchAlert(alertId, phone) {
      await fetch('/api/alerts/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_id: alertId })
      });
      alert(`Automated WhatsApp & SMS service dispatch sent to ${phone}!`);
      loadDashboard();
    }

    // Modals Population
    async function loadSparesList() {
      const res = await fetch('/api/inventory/spares');
      const data = await res.json();
      allSparesList = data.spares;
      const billSelect = document.getElementById('bill-spare-select');
      const saleSelect = document.getElementById('sale-spare-id');
      if (billSelect) {
        billSelect.innerHTML = allSparesList.map(s => `<option value="${s.id}">${s.name} - ₹${s.selling_price} (Stock: ${s.stock_quantity})</option>`).join('');
      }
      if (saleSelect) {
        saleSelect.innerHTML = allSparesList.map(s => `<option value="${s.id}">${s.name} - ₹${s.selling_price} (Stock: ${s.stock_quantity})</option>`).join('');
      }
    }

    async function loadBikesList() {
      const res = await fetch('/api/inventory/bikes');
      const data = await res.json();
      allBikesList = data.bikes.filter(b => b.stock_status === 'In Showroom');
      const saleBikeSelect = document.getElementById('sale-bike-id');
      if (saleBikeSelect) {
        saleBikeSelect.innerHTML = allBikesList.map(b => `<option value="${b.id}">${b.year} ${b.make} ${b.model} (${b.reg_number}) - ₹${b.selling_price}</option>`).join('') || '<option value="">No bikes currently in showroom</option>';
        updateSaleBikePrice();
      }
    }

    function updateSaleBikePrice() {
      const sel = document.getElementById('sale-bike-id');
      const bike = allBikesList.find(b => b.id == sel.value);
      if (bike) {
        document.getElementById('sale-price').value = bike.selling_price;
      }
    }

    function openNewSaleModal(type) {
      document.getElementById('sale-type').value = type;
      if (type === 'BIKE') {
        document.getElementById('sale-modal-title').innerText = 'Record Pre-Owned Bike Sale';
        document.getElementById('sale-bike-field').classList.remove('hidden');
        document.getElementById('sale-spares-field').classList.add('hidden');
        loadBikesList();
      } else {
        document.getElementById('sale-modal-title').innerText = 'Record Spare Parts Counter Sale';
        document.getElementById('sale-bike-field').classList.add('hidden');
        document.getElementById('sale-spares-field').classList.remove('hidden');
        loadSparesList();
      }
      openModal('modal-sale');
    }

    function openNewBillModal() {
      activeBillParts = [];
      renderBillPartsPreview();
      loadSparesList();
      openModal('modal-bill');
    }

    function openAddBikeModal() { openModal('modal-add-bike'); }
    function openAddSpareModal() { openModal('modal-add-spare'); }
    function openDbModal() { openModal('modal-db-info'); }

    function addPartToBillList() {
      const select = document.getElementById('bill-spare-select');
      const spareId = select.value;
      const spare = allSparesList.find(s => s.id == spareId);
      if (spare) {
        activeBillParts.push({ spare_id: spare.id, name: spare.name, qty: 1, price: spare.selling_price });
        renderBillPartsPreview();
      }
    }

    function renderBillPartsPreview() {
      const container = document.getElementById('bill-parts-preview');
      if (activeBillParts.length === 0) {
        container.innerHTML = '<div class="text-neutral-500 italic">No spare parts added to this bill.</div>';
        return;
      }
      container.innerHTML = activeBillParts.map((p, idx) => `
        <div class="flex justify-between items-center text-neutral-300">
          <span>${p.name} (x${p.qty})</span>
          <div class="flex items-center gap-2">
            <span>₹${p.price * p.qty}</span>
            <button type="button" onclick="activeBillParts.splice(${idx}, 1); renderBillPartsPreview();" class="text-rose-400 hover:text-rose-300">&times;</button>
          </div>
        </div>
      `).join('');
    }

    async function handleSaleSubmit(e) {
      e.preventDefault();
      const type = document.getElementById('sale-type').value;
      const payload = {
        sale_type: type,
        customer_name: document.getElementById('sale-cust-name').value,
        customer_phone: document.getElementById('sale-cust-phone').value,
        payment_mode: document.getElementById('sale-payment-mode').value,
        discount: Number(document.getElementById('sale-discount').value || 0),
        tax_amount: 0.0
      };

      if (type === 'BIKE') {
        payload.bike_id = document.getElementById('sale-bike-id').value;
        payload.selling_price = Number(document.getElementById('sale-price').value);
      } else {
        const spareId = document.getElementById('sale-spare-id').value;
        const qty = Number(document.getElementById('sale-spare-qty').value || 1);
        payload.parts = [{ spare_id: spareId, qty: qty }];
      }

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        closeModal('modal-sale');
        alert(`Sale #${data.sale_number} recorded successfully! Total: ₹${Number(data.grand_total).toLocaleString('en-IN')}`);
        loadSales();
        loadDashboard();
      } else {
        alert(data.error || 'Sale failed');
      }
    }

    async function handleBillSubmit(e) {
      e.preventDefault();
      const payload = {
        customer_name: document.getElementById('bill-cust-name').value,
        customer_phone: document.getElementById('bill-cust-phone').value,
        bike_reg_number: document.getElementById('bill-bike-reg').value,
        bike_model: document.getElementById('bill-bike-model').value,
        service_type: document.getElementById('bill-service-type').value,
        labor_charges: Number(document.getElementById('bill-labor').value || 0),
        discount: Number(document.getElementById('bill-discount').value || 0),
        payment_status: document.getElementById('bill-status').value,
        parts: activeBillParts
      };

      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        closeModal('modal-bill');
        alert(`Service Invoice #${data.bill_number} generated! Grand Total: ₹${Number(data.grand_total).toLocaleString('en-IN')}`);
        loadBilling();
        loadDashboard();
      }
    }

    async function handleAddBikeSubmit(e) {
      e.preventDefault();
      const payload = {
        make: document.getElementById('nb-make').value,
        model: document.getElementById('nb-model').value,
        year: Number(document.getElementById('nb-year').value),
        reg_number: document.getElementById('nb-reg').value,
        category: document.getElementById('nb-category').value,
        purchase_price: Number(document.getElementById('nb-purchase').value),
        refurb_cost: Number(document.getElementById('nb-refurb').value),
        selling_price: Number(document.getElementById('nb-selling').value)
      };

      const res = await fetch('/api/inventory/bikes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        closeModal('modal-add-bike');
        alert('Bike added to showroom stock!');
        loadInventory();
        loadDashboard();
      }
    }

    async function handleAddSpareSubmit(e) {
      e.preventDefault();
      const payload = {
        name: document.getElementById('nsp-name').value,
        sku: document.getElementById('nsp-sku').value,
        brand: document.getElementById('nsp-brand').value,
        stock_quantity: Number(document.getElementById('nsp-qty').value),
        purchase_cost: Number(document.getElementById('nsp-cost').value),
        selling_price: Number(document.getElementById('nsp-price').value),
        compatible_bikes: document.getElementById('nsp-compat').value
      };

      const res = await fetch('/api/inventory/spares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        closeModal('modal-add-spare');
        alert('Spare part SKU added to stockroom!');
        loadInventory();
        loadDashboard();
      }
    }

    function viewInvoiceDetails(bill) {
      document.getElementById('inv-modal-number').innerText = bill.bill_number;
      let parts = [];
      try {
        parts = typeof bill.parts_json === 'string' ? JSON.parse(bill.parts_json) : (bill.parts_json || []);
      } catch (e) {
        parts = [];
      }

      document.getElementById('inv-modal-content').innerHTML = `
        <div class="space-y-1.5 font-mono text-neutral-300">
          <div class="flex justify-between"><span class="text-neutral-500">Billed To:</span> <strong>${bill.customer_name} (${bill.customer_phone})</strong></div>
          <div class="flex justify-between"><span class="text-neutral-500">Vehicle:</span> <span>${bill.bike_model} (${bill.bike_reg_number})</span></div>
          <div class="flex justify-between"><span class="text-neutral-500">Date:</span> <span>${bill.bill_date}</span></div>
          <div class="flex justify-between"><span class="text-neutral-500">Service:</span> <span>${bill.service_type}</span></div>
          <div class="flex justify-between"><span class="text-neutral-500">Status:</span> <span class="text-amber-400 font-bold">${bill.payment_status} (${bill.payment_mode})</span></div>
        </div>

        <div class="pt-2 border-t border-neutral-800 space-y-1">
          <div class="font-semibold text-neutral-400 uppercase text-[10px] font-mono">Itemized Charges:</div>
          <div class="flex justify-between text-neutral-200"><span>Technician Labor</span> <span>₹${Number(bill.labor_charges).toLocaleString('en-IN')}</span></div>
          ${parts.map(p => `<div class="flex justify-between text-neutral-300"><span>${p.name} (x${p.qty})</span> <span>₹${Number(p.price * p.qty).toLocaleString('en-IN')}</span></div>`).join('')}
          <div class="flex justify-between text-neutral-400"><span>GST / Taxes (18%)</span> <span>₹${Number(bill.tax_amount).toLocaleString('en-IN')}</span></div>
          <div class="flex justify-between text-sm font-bold text-neutral-100 pt-2 border-t border-neutral-800">
            <span>Grand Total</span>
            <span class="text-amber-400 font-mono text-base">₹${Number(bill.grand_total).toLocaleString('en-IN')}</span>
          </div>
        </div>
      `;
      openModal('modal-invoice-view');
    }

    function viewSaleReceipt(number, customer, item, total, mode, date) {
      document.getElementById('inv-modal-number').innerText = number;
      document.getElementById('inv-modal-content').innerHTML = `
        <div class="space-y-1.5 font-mono text-neutral-300">
          <div class="flex justify-between"><span class="text-neutral-500">Customer:</span> <strong>${customer}</strong></div>
          <div class="flex justify-between"><span class="text-neutral-500">Item:</span> <span>${item}</span></div>
          <div class="flex justify-between"><span class="text-neutral-500">Date:</span> <span>${date}</span></div>
          <div class="flex justify-between"><span class="text-neutral-500">Payment:</span> <span>${mode} (Paid in Full)</span></div>
          <div class="flex justify-between text-sm font-bold text-neutral-100 pt-3 border-t border-neutral-800">
            <span>Total Amount</span>
            <span class="text-amber-400 font-mono text-base">₹${Number(total).toLocaleString('en-IN')}</span>
          </div>
        </div>
      `;
      openModal('modal-invoice-view');
    }
  </script>
</body>
</html>
"""

if __name__ == '__main__':
    print("Starting MotoCraft Flask Server on host 0.0.0.0, port 3000...")
    app.run(host='0.0.0.0', port=3000, debug=False)
