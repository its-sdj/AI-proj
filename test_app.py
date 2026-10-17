import unittest
import os
import database
import app as flask_app

class TestMotoCraftBackend(unittest.TestCase):
    def setUp(self):
        database.init_database()
        flask_app.app.config['TESTING'] = True
        self.client = flask_app.app.test_client()

    def test_database_initialization_and_seeding(self):
        info = database.get_db_info()
        self.assertIn(info['engine'], ['SQLite', 'MySQL'])
        
        # Check seed bikes exist
        bikes = database.execute_query("SELECT COUNT(*) as cnt FROM bikes_inventory", fetch="one")
        cnt = bikes.get('cnt') or bikes.get('COUNT(*)', 0)
        self.assertGreater(cnt, 0)

        # Check seed spares exist
        spares = database.execute_query("SELECT COUNT(*) as cnt FROM spares_inventory", fetch="one")
        sp_cnt = spares.get('cnt') or spares.get('COUNT(*)', 0)
        self.assertGreater(sp_cnt, 0)

    def test_admin_hardcoded_login(self):
        response = self.client.post('/api/auth/login', json={
            'identifier': 'admin',
            'password': 'admin123'
        })
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data['success'])
        self.assertEqual(data['user']['role'], 'admin')

    def test_customer_demo_login(self):
        response = self.client.post('/api/auth/login', json={
            'identifier': 'rahul@example.com',
            'password': 'customer123'
        })
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data['success'])
        self.assertEqual(data['user']['role'], 'customer')

    def test_invalid_login_rejected(self):
        response = self.client.post('/api/auth/login', json={
            'identifier': 'admin',
            'password': 'wrongpassword'
        })
        self.assertEqual(response.status_code, 401)
        data = response.get_json()
        self.assertFalse(data['success'])

    def test_dashboard_stats_endpoint(self):
        response = self.client.get('/api/dashboard/stats')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn('total_revenue', data)
        self.assertIn('bikes_in_stock', data)
        self.assertIn('service_alerts', data)

    def test_sales_and_inventory_endpoints(self):
        sales_resp = self.client.get('/api/sales')
        self.assertEqual(sales_resp.status_code, 200)
        sales_data = sales_resp.get_json()
        self.assertIsInstance(sales_data['sales'], list)

        bikes_resp = self.client.get('/api/inventory/bikes')
        self.assertEqual(bikes_resp.status_code, 200)
        bikes_data = bikes_resp.get_json()
        self.assertGreater(len(bikes_data['bikes']), 0)

    def test_billing_invoice_calculation(self):
        payload = {
            'customer_name': 'Test Customer',
            'customer_phone': '+91 99999 88888',
            'customer_email': 'test@example.com',
            'bike_reg_number': 'MH 12 ZZ 9999',
            'bike_model': 'Test Bike 200',
            'service_type': 'General Service',
            'labor_charges': 1000.0,
            'discount': 100.0,
            'payment_status': 'Pending',
            'parts': [
                {'spare_id': None, 'name': 'Generic Synthetic Oil', 'qty': 1, 'price': 500.0}
            ]
        }
        resp = self.client.post('/api/billing', json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertTrue(data['success'])
        # labor (1000) + parts (500) - discount (100) = 1400. Tax (18% of 1400) = 252. Grand total = 1652.
        self.assertEqual(data['grand_total'], 1652.0)

if __name__ == '__main__':
    unittest.main()
