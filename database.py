"""
Database Management Layer for MotoCraft 2-Wheeler Shop
Supports both MySQL (via PyMySQL) and embedded SQLite fallback.
"""

import os
import sqlite3
import hashlib
from datetime import datetime, date

# MySQL Configuration from Environment
MYSQL_HOST = os.environ.get('MYSQL_HOST', 'localhost')
MYSQL_PORT = int(os.environ.get('MYSQL_PORT', 3306))
MYSQL_USER = os.environ.get('MYSQL_USER', 'root')
MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD', 'root')
MYSQL_DB = os.environ.get('MYSQL_DB', 'motocraft_db')

SQLITE_PATH = os.path.join(os.path.dirname(__file__), 'moto_craft.db')

# State tracker
DB_ENGINE = "SQLite"  # or "MySQL"
DB_STATUS_MESSAGE = "Initialized"
_MYSQL_CHECKED = False
_MYSQL_AVAILABLE = False

def hash_password(password: str) -> str:
    """Hash password using SHA-256 for secure storage"""
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def probe_mysql_port():
    """Quick 0.1s socket probe to see if MySQL port is open"""
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(0.1)
        s.connect((MYSQL_HOST, MYSQL_PORT))
        s.close()
        return True
    except Exception:
        return False

def check_mysql_connection():
    """Attempts to connect to MySQL database"""
    global _MYSQL_CHECKED, _MYSQL_AVAILABLE
    if _MYSQL_CHECKED and not _MYSQL_AVAILABLE:
        return None

    if not probe_mysql_port():
        _MYSQL_CHECKED = True
        _MYSQL_AVAILABLE = False
        return None

    try:
        import pymysql
        conn = pymysql.connect(
            host=MYSQL_HOST,
            port=MYSQL_PORT,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor,
            connect_timeout=0.5
        )
        with conn.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{MYSQL_DB}`")
        conn.select_db(MYSQL_DB)
        _MYSQL_CHECKED = True
        _MYSQL_AVAILABLE = True
        return conn
    except Exception as e:
        _MYSQL_CHECKED = True
        _MYSQL_AVAILABLE = False
        return None

def get_connection():
    """Returns an active database connection (MySQL if available, else SQLite)"""
    global DB_ENGINE, DB_STATUS_MESSAGE
    
    mysql_conn = check_mysql_connection()
    if mysql_conn:
        DB_ENGINE = "MySQL"
        DB_STATUS_MESSAGE = f"Connected to MySQL ({MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB})"
        return mysql_conn
    
    # SQLite Fallback
    DB_ENGINE = "SQLite"
    DB_STATUS_MESSAGE = "Connected to Local Relational SQLite (MySQL ready)"
    conn = sqlite3.connect(SQLITE_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def execute_query(sql, params=None, fetch="all"):
    """Generic query executor compatible with both MySQL and SQLite"""
    conn = get_connection()
    params = params or ()
    
    # Translate parameter markers if necessary (%s for MySQL, ? for SQLite)
    is_sqlite = (DB_ENGINE == "SQLite")
    if is_sqlite:
        sql = sql.replace('%s', '?')
    else:
        sql = sql.replace('?', '%s')
        
    try:
        if is_sqlite:
            cursor = conn.cursor()
            cursor.execute(sql, params)
            if fetch == "all":
                rows = cursor.fetchall()
                res = [dict(row) for row in rows]
            elif fetch == "one":
                row = cursor.fetchone()
                res = dict(row) if row else None
            elif fetch == "insert":
                conn.commit()
                res = cursor.lastrowid
            else:
                conn.commit()
                res = cursor.rowcount
            cursor.close()
            conn.close()
            return res
        else:
            # PyMySQL
            with conn.cursor() as cursor:
                cursor.execute(sql, params)
                if fetch == "all":
                    res = cursor.fetchall()
                elif fetch == "one":
                    res = cursor.fetchone()
                elif fetch == "insert":
                    conn.commit()
                    res = cursor.lastrowid
                else:
                    conn.commit()
                    res = cursor.rowcount
            conn.close()
            return res
    except Exception as err:
        conn.close()
        raise err

def init_database():
    """Initializes tables and seeds starting data"""
    conn = get_connection()
    is_sqlite = (DB_ENGINE == "SQLite")
    
    # DDL statements (Compatible with both SQLite and MySQL)
    schema_statements = [
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(120) NOT NULL UNIQUE,
            phone VARCHAR(25) NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(20) DEFAULT 'customer',
            bike_model VARCHAR(100),
            bike_reg_number VARCHAR(30),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """ if is_sqlite else """
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(120) NOT NULL UNIQUE,
            phone VARCHAR(25) NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role ENUM('admin', 'customer') DEFAULT 'customer',
            bike_model VARCHAR(100),
            bike_reg_number VARCHAR(30),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
        """,
        
        """
        CREATE TABLE IF NOT EXISTS bikes_inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            make VARCHAR(60) NOT NULL,
            model VARCHAR(100) NOT NULL,
            year INTEGER NOT NULL,
            reg_number VARCHAR(30) NOT NULL UNIQUE,
            engine_cc INTEGER DEFAULT 150,
            kms_driven INTEGER DEFAULT 0,
            fuel_type VARCHAR(20) DEFAULT 'Petrol',
            category VARCHAR(40) DEFAULT 'Commuter',
            owners_count INTEGER DEFAULT 1,
            color VARCHAR(50) DEFAULT 'Black',
            purchase_price REAL DEFAULT 0.0,
            refurb_cost REAL DEFAULT 0.0,
            selling_price REAL DEFAULT 0.0,
            stock_status VARCHAR(30) DEFAULT 'In Showroom',
            date_added DATE NOT NULL,
            insurance_valid_until DATE NOT NULL,
            rc_status VARCHAR(60) DEFAULT 'Verified & Clear',
            inspection_score INTEGER DEFAULT 38,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """ if is_sqlite else """
        CREATE TABLE IF NOT EXISTS bikes_inventory (
            id INT AUTO_INCREMENT PRIMARY KEY,
            make VARCHAR(60) NOT NULL,
            model VARCHAR(100) NOT NULL,
            year INT NOT NULL,
            reg_number VARCHAR(30) NOT NULL UNIQUE,
            engine_cc INT DEFAULT 150,
            kms_driven INT DEFAULT 0,
            fuel_type VARCHAR(20) DEFAULT 'Petrol',
            category VARCHAR(40) DEFAULT 'Commuter',
            owners_count INT DEFAULT 1,
            color VARCHAR(50) DEFAULT 'Black',
            purchase_price DECIMAL(12,2) DEFAULT 0.00,
            refurb_cost DECIMAL(12,2) DEFAULT 0.00,
            selling_price DECIMAL(12,2) DEFAULT 0.00,
            stock_status VARCHAR(30) DEFAULT 'In Showroom',
            date_added DATE NOT NULL,
            insurance_valid_until DATE NOT NULL,
            rc_status VARCHAR(60) DEFAULT 'Verified & Clear',
            inspection_score INT DEFAULT 38,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
        """,

        """
        CREATE TABLE IF NOT EXISTS spares_inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(150) NOT NULL,
            sku VARCHAR(50) NOT NULL UNIQUE,
            category VARCHAR(60) NOT NULL,
            brand VARCHAR(60) NOT NULL,
            compatible_bikes TEXT NOT NULL,
            stock_quantity INTEGER DEFAULT 0,
            reorder_level INTEGER DEFAULT 5,
            purchase_cost REAL DEFAULT 0.0,
            selling_price REAL DEFAULT 0.0,
            rack_location VARCHAR(60) DEFAULT 'Bay A',
            warranty_months INTEGER DEFAULT 12,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """ if is_sqlite else """
        CREATE TABLE IF NOT EXISTS spares_inventory (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(150) NOT NULL,
            sku VARCHAR(50) NOT NULL UNIQUE,
            category VARCHAR(60) NOT NULL,
            brand VARCHAR(60) NOT NULL,
            compatible_bikes TEXT NOT NULL,
            stock_quantity INT DEFAULT 0,
            reorder_level INT DEFAULT 5,
            purchase_cost DECIMAL(10,2) DEFAULT 0.00,
            selling_price DECIMAL(10,2) DEFAULT 0.00,
            rack_location VARCHAR(60) DEFAULT 'Bay A',
            warranty_months INT DEFAULT 12,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
        """,

        """
        CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sale_number VARCHAR(40) NOT NULL UNIQUE,
            sale_type VARCHAR(20) NOT NULL,
            customer_name VARCHAR(100) NOT NULL,
            customer_phone VARCHAR(25) NOT NULL,
            customer_email VARCHAR(120),
            bike_id INTEGER,
            item_details TEXT NOT NULL,
            subtotal REAL DEFAULT 0.0,
            tax_amount REAL DEFAULT 0.0,
            discount REAL DEFAULT 0.0,
            grand_total REAL DEFAULT 0.0,
            gross_profit REAL DEFAULT 0.0,
            payment_mode VARCHAR(30) DEFAULT 'UPI',
            sold_by VARCHAR(60) DEFAULT 'Admin',
            sale_date DATE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """ if is_sqlite else """
        CREATE TABLE IF NOT EXISTS sales (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sale_number VARCHAR(40) NOT NULL UNIQUE,
            sale_type VARCHAR(20) NOT NULL,
            customer_name VARCHAR(100) NOT NULL,
            customer_phone VARCHAR(25) NOT NULL,
            customer_email VARCHAR(120),
            bike_id INT,
            item_details TEXT NOT NULL,
            subtotal DECIMAL(12,2) DEFAULT 0.00,
            tax_amount DECIMAL(10,2) DEFAULT 0.00,
            discount DECIMAL(10,2) DEFAULT 0.00,
            grand_total DECIMAL(12,2) DEFAULT 0.00,
            gross_profit DECIMAL(12,2) DEFAULT 0.00,
            payment_mode VARCHAR(30) DEFAULT 'UPI',
            sold_by VARCHAR(60) DEFAULT 'Admin',
            sale_date DATE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
        """,

        """
        CREATE TABLE IF NOT EXISTS service_bills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bill_number VARCHAR(40) NOT NULL UNIQUE,
            customer_name VARCHAR(100) NOT NULL,
            customer_phone VARCHAR(25) NOT NULL,
            customer_email VARCHAR(120),
            bike_reg_number VARCHAR(30) NOT NULL,
            bike_model VARCHAR(100) NOT NULL,
            current_km INTEGER DEFAULT 0,
            service_type VARCHAR(100) NOT NULL,
            technician_name VARCHAR(100) NOT NULL,
            labor_charges REAL DEFAULT 0.0,
            parts_json TEXT,
            parts_subtotal REAL DEFAULT 0.0,
            discount REAL DEFAULT 0.0,
            tax_rate REAL DEFAULT 18.0,
            tax_amount REAL DEFAULT 0.0,
            grand_total REAL DEFAULT 0.0,
            payment_status VARCHAR(20) DEFAULT 'Pending',
            payment_mode VARCHAR(30) DEFAULT 'UPI',
            notes TEXT,
            bill_date DATE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """ if is_sqlite else """
        CREATE TABLE IF NOT EXISTS service_bills (
            id INT AUTO_INCREMENT PRIMARY KEY,
            bill_number VARCHAR(40) NOT NULL UNIQUE,
            customer_name VARCHAR(100) NOT NULL,
            customer_phone VARCHAR(25) NOT NULL,
            customer_email VARCHAR(120),
            bike_reg_number VARCHAR(30) NOT NULL,
            bike_model VARCHAR(100) NOT NULL,
            current_km INT DEFAULT 0,
            service_type VARCHAR(100) NOT NULL,
            technician_name VARCHAR(100) NOT NULL,
            labor_charges DECIMAL(10,2) DEFAULT 0.00,
            parts_json TEXT,
            parts_subtotal DECIMAL(10,2) DEFAULT 0.00,
            discount DECIMAL(10,2) DEFAULT 0.00,
            tax_rate DECIMAL(5,2) DEFAULT 18.00,
            tax_amount DECIMAL(10,2) DEFAULT 0.00,
            grand_total DECIMAL(12,2) DEFAULT 0.00,
            payment_status VARCHAR(20) DEFAULT 'Pending',
            payment_mode VARCHAR(30) DEFAULT 'UPI',
            notes TEXT,
            bill_date DATE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
        """,

        """
        CREATE TABLE IF NOT EXISTS service_alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_name VARCHAR(100) NOT NULL,
            phone VARCHAR(25) NOT NULL,
            bike_reg VARCHAR(30) NOT NULL,
            bike_model VARCHAR(100) NOT NULL,
            alert_type VARCHAR(40) NOT NULL,
            message TEXT NOT NULL,
            status VARCHAR(20) DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """ if is_sqlite else """
        CREATE TABLE IF NOT EXISTS service_alerts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            customer_name VARCHAR(100) NOT NULL,
            phone VARCHAR(25) NOT NULL,
            bike_reg VARCHAR(30) NOT NULL,
            bike_model VARCHAR(100) NOT NULL,
            alert_type VARCHAR(40) NOT NULL,
            message TEXT NOT NULL,
            status VARCHAR(20) DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
        """
    ]

    for stmt in schema_statements:
        try:
            execute_query(stmt, fetch="commit")
        except Exception as e:
            pass

    # Check if admin user exists, if not seed
    admin_user = execute_query("SELECT * FROM users WHERE email = %s", ('admin@motocraft.com',), fetch="one")
    if not admin_user:
        # Seed Hardcoded Admin
        execute_query(
            """INSERT INTO users (name, email, phone, password_hash, role, bike_model, bike_reg_number)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            ('MotoCraft Head Admin', 'admin@motocraft.com', '+91 98231 00042', hash_password('admin123'), 'admin', None, None),
            fetch="insert"
        )
        # Seed Demo Customer
        execute_query(
            """INSERT INTO users (name, email, phone, password_hash, role, bike_model, bike_reg_number)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            ('Rahul Verma', 'rahul@example.com', '+91 98231 45678', hash_password('customer123'), 'customer', 'Royal Enfield Classic 350', 'MH 12 AB 4589'),
            fetch="insert"
        )
        execute_query(
            """INSERT INTO users (name, email, phone, password_hash, role, bike_model, bike_reg_number)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            ('Priya Sundaram', 'priya@example.com', '+91 98450 12389', hash_password('customer123'), 'customer', 'Yamaha YZF-R15 V4', 'KA 05 MN 3210'),
            fetch="insert"
        )

    # Seed Bikes Inventory if empty
    bikes_count = execute_query("SELECT COUNT(*) as cnt FROM bikes_inventory", fetch="one")
    if not bikes_count or (bikes_count.get('cnt', 0) == 0 and bikes_count.get('COUNT(*)', 0) == 0):
        seed_bikes = [
            ('Royal Enfield', 'Classic 350 Stealth Black', 2023, 'MH 12 AB 4589', 349, 14200, 'Petrol', 'Cruiser', 1, 'Matte Stealth Black', 145000.0, 8500.0, 178000.0, 'In Showroom', '2026-09-18', '2027-04-15', 'Verified & Clear', 39, 'Fresh synthetic oil, new sintered pads'),
            ('Yamaha', 'YZF-R15 V4 Racing Blue', 2024, 'KA 05 MN 3210', 155, 8900, 'Petrol', 'Sport', 1, 'Racing Blue', 128000.0, 6200.0, 159000.0, 'In Showroom', '2026-10-04', '2027-01-20', 'Verified & Clear', 40, 'Quickshifter edition, pristine fairings'),
            ('Honda', 'Activa 6G Deluxe H-Smart', 2023, 'DL 03 CY 8821', 109, 11400, 'Petrol', 'Scooter', 1, 'Pearl Siren Blue', 52000.0, 4800.0, 69500.0, 'In Showroom', '2026-08-25', '2026-11-05', 'Verified & Clear', 38, 'New Bando CVT belt, smooth city runner'),
            ('KTM', 'Duke 250 Gen-2', 2023, 'TN 09 ER 1045', 248, 16700, 'Petrol', 'Street Naked', 1, 'Galvano Orange', 160000.0, 11000.0, 198000.0, 'In Showroom', '2026-09-02', '2027-08-14', 'Verified & Clear', 39, 'WP Apex suspension, new Rolon chain kit'),
            ('TVS', 'Apache RTR 160 4V Special Edition', 2024, 'MH 14 GD 6712', 159, 6200, 'Petrol', 'Commuter', 1, 'Matte Black', 92000.0, 3500.0, 118000.0, 'In Showroom', '2026-10-10', '2027-06-30', 'Verified & Clear', 40, 'SmartXonnect Bluetooth cluster, radial rear tyre'),
            ('Ather', '450X Gen 3 3.7kWh Pro', 2023, 'KA 01 EK 9940', 0, 12800, 'Electric', 'Electric', 1, 'Space Grey', 95000.0, 4200.0, 124000.0, 'In Showroom', '2026-07-15', '2026-10-12', 'Verified & Clear', 38, 'BMS health 94%, Warp mode fast acceleration')
        ]
        for b in seed_bikes:
            execute_query(
                """INSERT INTO bikes_inventory 
                   (make, model, year, reg_number, engine_cc, kms_driven, fuel_type, category, owners_count, color, purchase_price, refurb_cost, selling_price, stock_status, date_added, insurance_valid_until, rc_status, inspection_score, notes)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                b,
                fetch="insert"
            )

    # Seed Spares Inventory if empty
    spares_count = execute_query("SELECT COUNT(*) as cnt FROM spares_inventory", fetch="one")
    if not spares_count or (spares_count.get('cnt', 0) == 0 and spares_count.get('COUNT(*)', 0) == 0):
        seed_spares = [
            ('Motul 7100 4T 10W-50 100% Synthetic 1L', 'MOT-7100-10W50', 'Fluids & Lubricants', 'Motul', 'Royal Enfield Classic 350, KTM Duke 250, Dominar 400', 18, 8, 680.0, 940.0, 'Bay A - Shelf 2', 12),
            ('Brembo Sintered Front Brake Pads Set', 'BRM-SP-0941', 'Brakes & Suspension', 'Brembo', 'KTM Duke 250, Yamaha R15 V4, TVS Apache RR 310', 4, 6, 1100.0, 1650.0, 'Bay B - Drawer 1', 6),
            ('Rolon Brass Plated X-Ring Chain & Sprocket Kit', 'RLN-XRG-RE350', 'Engine & Transmission', 'Rolon', 'Royal Enfield Classic 350, Bullet 350, Hunter 350', 7, 4, 2100.0, 2850.0, 'Bay C - Shelf 4', 12),
            ('NGK Iridium IX Spark Plug CPR8EAIX-9', 'NGK-IX-CPR8', 'Electricals & Battery', 'NGK', 'Yamaha R15 V3/V4, Honda Activa 6G, Apache 160', 2, 8, 450.0, 690.0, 'Bay B - Bin 4', 12),
            ('Bosch High-Flow Performance Air Filter', 'BSH-AF-772', 'Engine & Transmission', 'Bosch', 'Royal Enfield Classic 350, Meteor 350, Hunter 350', 14, 5, 280.0, 480.0, 'Bay A - Shelf 1', 6),
            ('Amaron Pro Bike Rider 12V 5Ah VRLA Battery', 'AMR-APBTZ5L', 'Electricals & Battery', 'Amaron', 'Honda Activa 6G, Yamaha R15 V4, TVS Jupiter', 5, 4, 1200.0, 1650.0, 'Bay D - Battery Rack', 48),
            ('FCC OEM Heavy Duty Clutch Plates Set (6-Plate)', 'FCC-CPK-RE350', 'Engine & Transmission', 'FCC Friction', 'Royal Enfield Classic 350, Bullet 350', 3, 5, 1100.0, 1750.0, 'Bay C - Drawer 2', 12),
            ('MRF Zapper FX1 100/80-17 Tubeless Front Tyre', 'MRF-ZPR-10080', 'Tyres & Wheels', 'MRF', 'Yamaha R15 V4, TVS Apache 160 4V, Pulsar NS200', 6, 3, 2200.0, 2890.0, 'Bay E - Tyre Rack', 36)
        ]
        for s in seed_spares:
            execute_query(
                """INSERT INTO spares_inventory
                   (name, sku, category, brand, compatible_bikes, stock_quantity, reorder_level, purchase_cost, selling_price, rack_location, warranty_months)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                s,
                fetch="insert"
            )

    # Seed initial Sales Records if empty
    sales_count = execute_query("SELECT COUNT(*) as cnt FROM sales", fetch="one")
    if not sales_count or (sales_count.get('cnt', 0) == 0 and sales_count.get('COUNT(*)', 0) == 0):
        seed_sales = [
            ('SL-2026-1001', 'BIKE', 'Vikram Patel', '+91 98201 99120', 'vikram.p@example.com', 5, 'TVS Apache RTR 160 4V (2024)', 118000.0, 0.0, 0.0, 118000.0, 22500.0, 'Bank Transfer', 'Admin', '2026-10-12'),
            ('SL-2026-1002', 'SPARES', 'Amitabh Joshi', '+91 97112 88451', 'amitabh.j@example.com', None, 'Amaron 12V 5Ah Battery (x1), NGK Spark Plug (x1)', 2340.0, 0.0, 100.0, 2240.0, 590.0, 'UPI', 'Admin', '2026-10-14'),
            ('SL-2026-1003', 'SPARES', 'Suresh Gokhale', '+91 98450 77123', 'suresh@example.com', None, 'Motul 7100 10W-50 (x2), Bosch Air Filter (x1)', 2360.0, 0.0, 0.0, 2360.0, 720.0, 'Cash', 'Admin', '2026-10-15')
        ]
        for sl in seed_sales:
            execute_query(
                """INSERT INTO sales
                   (sale_number, sale_type, customer_name, customer_phone, customer_email, bike_id, item_details, subtotal, tax_amount, discount, grand_total, gross_profit, payment_mode, sold_by, sale_date)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                sl,
                fetch="insert"
            )

    # Seed Service Bills if empty
    bills_count = execute_query("SELECT COUNT(*) as cnt FROM service_bills", fetch="one")
    if not bills_count or (bills_count.get('cnt', 0) == 0 and bills_count.get('COUNT(*)', 0) == 0):
        seed_bills = [
            (
                'INV-2026-0644', 'Rahul Verma', '+91 98231 45678', 'rahul@example.com',
                'MH 12 AB 4589', 'Royal Enfield Classic 350', 14800,
                '15,000 km Major Service & Tuning', 'Vikram Shinde',
                850.0, '[{"name": "Motul 7100 15W-50 (2L)", "qty": 2, "price": 940}, {"name": "Bosch Air Filter", "qty": 1, "price": 480}]',
                2360.0, 100.0, 18.0, 559.8, 3669.8, 'Paid', 'UPI', 'Tappets adjusted, chain cleaned and lubed', '2026-06-15'
            ),
            (
                'INV-2026-0789', 'Priya Sundaram', '+91 98450 12389', 'priya@example.com',
                'KA 05 MN 3210', 'Yamaha YZF-R15 V4', 9800,
                'Periodic Maintenance & Fluid Flush', 'Sanjay Rawat',
                650.0, '[{"name": "NGK Iridium Spark Plug", "qty": 1, "price": 690}]',
                690.0, 50.0, 18.0, 232.2, 1522.2, 'Paid', 'Cash', 'Valve clearance checked, brake lines bled', '2026-07-20'
            ),
            (
                'INV-2026-1042', 'Rahul Verma', '+91 98231 45678', 'rahul@example.com',
                'MH 12 AB 4589', 'Royal Enfield Classic 350', 18200,
                'Front Brake & Sintered Pad Overhaul', 'Vikram Shinde',
                750.0, '[{"name": "Brembo Sintered Brake Pads", "qty": 1, "price": 1650}]',
                1650.0, 0.0, 18.0, 432.0, 2832.0, 'Pending', 'UPI', 'Caliper pistons deglazed, brand new Brembo pads installed', '2026-10-16'
            )
        ]
        for sb in seed_bills:
            execute_query(
                """INSERT INTO service_bills
                   (bill_number, customer_name, customer_phone, customer_email, bike_reg_number, bike_model, current_km, service_type, technician_name, labor_charges, parts_json, parts_subtotal, discount, tax_rate, tax_amount, grand_total, payment_status, payment_mode, notes, bill_date)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                sb,
                fetch="insert"
            )

    # Seed Service Alerts
    alerts_count = execute_query("SELECT COUNT(*) as cnt FROM service_alerts", fetch="one")
    if not alerts_count or (alerts_count.get('cnt', 0) == 0 and alerts_count.get('COUNT(*)', 0) == 0):
        seed_alerts = [
            ('Rahul Verma', '+91 98231 45678', 'MH 12 AB 4589', 'Royal Enfield Classic 350', 'SERVICE_OVERDUE', 'Service overdue: 3400 km / 124 days since last maintenance (Limit: 3000 km / 90 days)', 'Pending'),
            ('Priya Sundaram', '+91 98450 12389', 'KA 05 MN 3210', 'Yamaha YZF-R15 V4', 'SERVICE_OVERDUE', 'Service due soon: 2600 km / 89 days elapsed', 'Pending'),
            ('Amitabh Joshi', '+91 97112 88451', 'DL 03 CY 8821', 'Honda Activa 6G', 'INSURANCE_EXPIRING', 'Two-wheeler insurance policy expiring in 20 days (2026-11-05)', 'Pending'),
            ('Deepak Nair', '+91 99801 77234', 'KA 01 EK 9940', 'Ather 450X Gen 3', 'INSURANCE_EXPIRING', 'Comprehensive insurance expired 4 days ago (2026-10-12)', 'Pending')
        ]
        for sa in seed_alerts:
            execute_query(
                """INSERT INTO service_alerts (customer_name, phone, bike_reg, bike_model, alert_type, message, status)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                sa,
                fetch="insert"
            )

def get_db_info():
    """Returns database connection diagnostic information for the UI"""
    return {
        "engine": DB_ENGINE,
        "mysql_host": MYSQL_HOST,
        "mysql_port": MYSQL_PORT,
        "mysql_user": MYSQL_USER,
        "mysql_database": MYSQL_DB,
        "status": DB_STATUS_MESSAGE
    }
