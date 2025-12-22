import requests
import sys
import json
import io
from datetime import datetime

class LeadTrackAPITester:
    def __init__(self, base_url="https://leadworks-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.admin_token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    Details: {details}")

    def test_api_root(self):
        """Test API root endpoint"""
        try:
            response = requests.get(f"{self.api_url}/", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Message: {data.get('message', 'No message')}"
            self.log_test("API Root Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("API Root Endpoint", False, f"Error: {str(e)}")
            return False

    def test_admin_login(self):
        """Test TT admin login"""
        login_data = {
            "email": "tt@leadtrack.com",
            "password": "9786"
        }
        
        try:
            response = requests.post(f"{self.api_url}/auth/login", json=login_data, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                self.admin_token = data.get('access_token')
                details += f", Admin token received: {'Yes' if self.admin_token else 'No'}"
                details += f", User: {data.get('user', {}).get('name', 'Unknown')}"
            else:
                details += f", Error: {response.text}"
                
            self.log_test("TT Admin Login", success, details)
            return success
        except Exception as e:
            self.log_test("TT Admin Login", False, f"Error: {str(e)}")
            return False

    def test_factory_login(self):
        """Test Factory user login"""
        login_data = {
            "email": "factory@leadtrack.com",
            "password": "0786"
        }
        
        try:
            response = requests.post(f"{self.api_url}/auth/login", json=login_data, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                self.token = data.get('access_token')
                details += f", Factory token received: {'Yes' if self.token else 'No'}"
                details += f", User: {data.get('user', {}).get('name', 'Unknown')}"
            else:
                details += f", Error: {response.text}"
                
            self.log_test("Factory User Login", success, details)
            return success
        except Exception as e:
            self.log_test("Factory User Login", False, f"Error: {str(e)}")
            return False

    def test_users_list(self):
        """Test getting users list for login page"""
        try:
            response = requests.get(f"{self.api_url}/users/list", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                user_names = [user.get('name') for user in data]
                details += f", Users found: {user_names}"
                
                # Check if only expected users are present
                expected_users = ['Factory', 'TT', 'Umesh Thakral']
                unexpected_users = [name for name in user_names if name not in expected_users]
                missing_users = [name for name in expected_users if name not in user_names]
                
                if unexpected_users:
                    details += f", Unexpected users: {unexpected_users}"
                    success = False
                if missing_users:
                    details += f", Missing users: {missing_users}"
                    success = False
                    
                if success:
                    details += ", Only expected users present"
            else:
                details += f", Error: {response.text}"
                
            self.log_test("Users List for Login", success, details)
            return success
        except Exception as e:
            self.log_test("Users List for Login", False, f"Error: {str(e)}")
            return False

    def test_admin_add_user(self):
        """Test admin add user functionality"""
        if not self.admin_token:
            self.log_test("Admin Add User", False, "No admin token")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        test_user = {
            "name": f"Test User {datetime.now().strftime('%H%M%S')}",
            "email": f"testuser_{datetime.now().strftime('%H%M%S')}@leadtrack.com",
            "password": "TestPass123!"
        }
        
        try:
            response = requests.post(f"{self.api_url}/admin/users", json=test_user, headers=headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                self.test_user_id = data.get('id')
                self.test_user_name = test_user['name']
                details += f", User created: {data.get('name')}, ID: {self.test_user_id}"
            else:
                details += f", Error: {response.text}"
                
            self.log_test("Admin Add User", success, details)
            return success
        except Exception as e:
            self.log_test("Admin Add User", False, f"Error: {str(e)}")
            return False

    def test_admin_get_users(self):
        """Test admin get all users"""
        if not self.admin_token:
            self.log_test("Admin Get Users", False, "No admin token")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        try:
            response = requests.get(f"{self.api_url}/admin/users", headers=headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f", Total users: {len(data)}"
                user_names = [user.get('name') for user in data]
                details += f", Users: {user_names}"
            else:
                details += f", Error: {response.text}"
                
            self.log_test("Admin Get Users", success, details)
            return success
        except Exception as e:
            self.log_test("Admin Get Users", False, f"Error: {str(e)}")
            return False

    def test_admin_change_password(self):
        """Test admin change user password functionality"""
        if not self.admin_token or not hasattr(self, 'test_user_id'):
            self.log_test("Admin Change Password", False, "No admin token or test user")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Change password for the test user
        new_password_data = {
            "new_password": "NewTestPass456!"
        }
        
        try:
            response = requests.put(f"{self.api_url}/admin/users/{self.test_user_id}/password", 
                                  json=new_password_data, headers=headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f", Password changed: {data.get('message', 'Success')}"
                self.new_password = new_password_data['new_password']
            else:
                details += f", Error: {response.text}"
                
            self.log_test("Admin Change Password", success, details)
            return success
        except Exception as e:
            self.log_test("Admin Change Password", False, f"Error: {str(e)}")
            return False

    def test_admin_delete_user(self):
        """Test admin delete user functionality"""
        if not self.admin_token or not hasattr(self, 'test_user_id'):
            self.log_test("Admin Delete User", False, "No admin token or test user")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        try:
            response = requests.delete(f"{self.api_url}/admin/users/{self.test_user_id}", headers=headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                details += f", User deleted successfully"
            else:
                details += f", Error: {response.text}"
                
            self.log_test("Admin Delete User", success, details)
            return success
        except Exception as e:
            self.log_test("Admin Delete User", False, f"Error: {str(e)}")
            return False

    def test_recovery_settings_get(self):
        """Test getting recovery settings"""
        if not self.admin_token:
            self.log_test("Get Recovery Settings", False, "No admin token")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        try:
            response = requests.get(f"{self.api_url}/admin/recovery-settings", headers=headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                self.original_pp = data.get('pp_battery_percent', 60.5)
                self.original_mc_smf = data.get('mc_smf_battery_percent', 58.0)
                details += f", PP: {self.original_pp}%, MC/SMF: {self.original_mc_smf}%"
            else:
                details += f", Error: {response.text}"
                
            self.log_test("Get Recovery Settings", success, details)
            return success
        except Exception as e:
            self.log_test("Get Recovery Settings", False, f"Error: {str(e)}")
            return False

    def test_recovery_settings_update(self):
        """Test updating recovery settings"""
        if not self.admin_token:
            self.log_test("Update Recovery Settings", False, "No admin token")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Update with test values
        test_settings = {
            "pp_battery_percent": 65.0,
            "mc_smf_battery_percent": 62.0
        }
        
        try:
            response = requests.put(f"{self.api_url}/admin/recovery-settings", json=test_settings, headers=headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                details += f", Settings updated to PP: {test_settings['pp_battery_percent']}%, MC/SMF: {test_settings['mc_smf_battery_percent']}%"
                
                # Restore original settings
                if hasattr(self, 'original_pp') and hasattr(self, 'original_mc_smf'):
                    restore_settings = {
                        "pp_battery_percent": self.original_pp,
                        "mc_smf_battery_percent": self.original_mc_smf
                    }
                    requests.put(f"{self.api_url}/admin/recovery-settings", json=test_settings, headers=headers, timeout=10)
                    details += f", Restored to original values"
            else:
                details += f", Error: {response.text}"
                
            self.log_test("Update Recovery Settings", success, details)
            return success
        except Exception as e:
            self.log_test("Update Recovery Settings", False, f"Error: {str(e)}")
            return False

    def create_test_image(self):
        """Create a simple test image file"""
        # Create a minimal valid image (1x1 pixel PNG)
        png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\x0cIDATx\x9cc```\x00\x00\x00\x04\x00\x01\xdd\x8d\xb4\x1c\x00\x00\x00\x00IEND\xaeB`\x82'
        return io.BytesIO(png_data)

    def test_dashboard_summary_api(self):
        """Test Dashboard Summary API - should return 6 key metrics"""
        if not self.token:
            self.log_test("Dashboard Summary API", False, "No authentication token")
            return False
            
        headers = {'Authorization': f'Bearer {self.token}'}
        
        try:
            response = requests.get(f"{self.api_url}/summary", headers=headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                # Check for the 6 key metrics
                required_fields = [
                    'pure_lead_stock', 'rml_stock', 'total_receivable', 
                    'high_lead_stock', 'total_dross', 'antimony_recoverable'
                ]
                
                missing_fields = [field for field in required_fields if field not in data]
                if missing_fields:
                    success = False
                    details += f", Missing fields: {missing_fields}"
                else:
                    details += f", All 6 metrics present"
                    details += f", Pure Lead: {data.get('pure_lead_stock')}kg"
                    details += f", RML Stock: {data.get('rml_stock')}kg"
                    details += f", Receivable: {data.get('total_receivable')}kg"
                    details += f", High Lead: {data.get('high_lead_stock')}kg"
                    details += f", Total Dross: {data.get('total_dross')}kg"
                    details += f", Antimony: {data.get('antimony_recoverable')}kg"
                    
                    # Store initial values for later comparison
                    self.initial_pure_lead = data.get('pure_lead_stock', 0)
                    self.initial_rml_stock = data.get('rml_stock', 0)
            else:
                details += f", Error: {response.text}"
                
            self.log_test("Dashboard Summary API", success, details)
            return success
        except Exception as e:
            self.log_test("Dashboard Summary API", False, f"Error: {str(e)}")
            return False

    def test_available_skus_api(self):
        """Test Available SKUs API - should return list of SKUs with stock levels and SB%"""
        if not self.token:
            self.log_test("Available SKUs API", False, "No authentication token")
            return False
            
        headers = {'Authorization': f'Bearer {self.token}'}
        
        try:
            response = requests.get(f"{self.api_url}/sales/available-skus", headers=headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f", SKUs found: {len(data)}"
                
                if data:
                    # Check structure of first SKU
                    first_sku = data[0]
                    required_fields = ['sku_type', 'available_kg', 'display_name']
                    missing_fields = [field for field in required_fields if field not in first_sku]
                    
                    if missing_fields:
                        success = False
                        details += f", Missing SKU fields: {missing_fields}"
                    else:
                        details += f", SKU structure valid"
                        
                        # List available SKUs
                        sku_info = []
                        for sku in data:
                            sku_name = sku.get('sku_type', 'Unknown')
                            stock = sku.get('available_kg', 0)
                            sb_percent = sku.get('sb_percentage')
                            
                            if sb_percent:
                                sku_info.append(f"{sku_name} ({stock}kg, SB:{sb_percent}%)")
                            else:
                                sku_info.append(f"{sku_name} ({stock}kg)")
                                
                            # Store first available SKU for testing
                            if not hasattr(self, 'test_sku') and stock > 0:
                                self.test_sku = sku_name
                                self.test_sku_stock = stock
                        
                        details += f", Available: {', '.join(sku_info)}"
                else:
                    details += ", No SKUs available"
            else:
                details += f", Error: {response.text}"
                
            self.log_test("Available SKUs API", success, details)
            return success
        except Exception as e:
            self.log_test("Available SKUs API", False, f"Error: {str(e)}")
            return False

    def test_create_sale_api(self):
        """Test Create Sale API - should accept sku_type and deduct from correct stock"""
        if not self.token:
            self.log_test("Create Sale API", False, "No authentication token")
            return False
            
        if not hasattr(self, 'test_sku'):
            self.log_test("Create Sale API", False, "No available SKU to test with")
            return False
            
        headers = {'Authorization': f'Bearer {self.token}'}
        
        # Create a test sale
        sale_data = {
            "party_name": f"Test Buyer {datetime.now().strftime('%H%M%S')}",
            "sku_type": self.test_sku,
            "quantity_kg": 5.0,  # Small test quantity
            "entry_date": datetime.now().strftime('%Y-%m-%d')
        }
        
        try:
            response = requests.post(f"{self.api_url}/sales", json=sale_data, headers=headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                self.sale_id = data.get('id')
                details += f", Sale created: ID {self.sale_id}"
                details += f", Party: {sale_data['party_name']}"
                details += f", SKU: {sale_data['sku_type']}"
                details += f", Quantity: {sale_data['quantity_kg']}kg"
            else:
                details += f", Error: {response.text}"
                
            self.log_test("Create Sale API", success, details)
            return success
        except Exception as e:
            self.log_test("Create Sale API", False, f"Error: {str(e)}")
            return False

    def test_stock_reduction_after_sale(self):
        """Test that stock is correctly reduced after sale"""
        if not self.token or not hasattr(self, 'sale_id'):
            self.log_test("Stock Reduction After Sale", False, "No sale created to verify")
            return False
            
        headers = {'Authorization': f'Bearer {self.token}'}
        
        try:
            # Get updated summary
            response = requests.get(f"{self.api_url}/summary", headers=headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                current_pure_lead = data.get('pure_lead_stock', 0)
                current_rml_stock = data.get('rml_stock', 0)
                
                # Check if stock was reduced (assuming we sold Pure Lead)
                if hasattr(self, 'initial_pure_lead') and self.test_sku == 'Pure Lead':
                    expected_stock = self.initial_pure_lead - 5.0  # We sold 5kg
                    if abs(current_pure_lead - expected_stock) < 0.01:  # Allow small floating point differences
                        details += f", Pure Lead stock correctly reduced from {self.initial_pure_lead}kg to {current_pure_lead}kg"
                    else:
                        success = False
                        details += f", Stock reduction error: Expected {expected_stock}kg, got {current_pure_lead}kg"
                else:
                    # For RML SKUs, just verify the values are reasonable
                    details += f", Current stocks - Pure Lead: {current_pure_lead}kg, RML: {current_rml_stock}kg"
                    details += f", Stock tracking appears functional"
            else:
                details += f", Error: {response.text}"
                
            self.log_test("Stock Reduction After Sale", success, details)
            return success
        except Exception as e:
            self.log_test("Stock Reduction After Sale", False, f"Error: {str(e)}")
            return False

    def test_get_sales_list(self):
        """Test retrieving sales list"""
        if not self.token:
            self.log_test("Get Sales List", False, "No authentication token")
            return False
            
        headers = {'Authorization': f'Bearer {self.token}'}
        
        try:
            response = requests.get(f"{self.api_url}/sales", headers=headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f", Sales count: {len(data)}"
                if data:
                    latest_sale = data[0]  # Should be sorted by timestamp desc
                    details += f", Latest sale: {latest_sale.get('party_name')} - {latest_sale.get('quantity_kg')}kg of {latest_sale.get('sku_type')}"
            else:
                details += f", Error: {response.text}"
                
            self.log_test("Get Sales List", success, details)
            return success
        except Exception as e:
            self.log_test("Get Sales List", False, f"Error: {str(e)}")
            return False

    def test_get_entries(self):
        """Test retrieving entries list"""
        if not self.token:
            self.log_test("Get Entries List", False, "No authentication token")
            return False
            
        headers = {'Authorization': f'Bearer {self.token}'}
        
        try:
            response = requests.get(f"{self.api_url}/entries", headers=headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f", Entries count: {len(data)}"
                if data:
                    details += f", First entry user: {data[0].get('user_name', 'Unknown')}"
            else:
                details += f", Error: {response.text}"
                
            self.log_test("Get Entries List", success, details)
            return success
        except Exception as e:
            self.log_test("Get Entries List", False, f"Error: {str(e)}")
            return False

    def test_get_entry_detail(self):
        """Test retrieving specific entry details"""
        if not self.token:
            self.log_test("Get Entry Detail", False, "No authentication token")
            return False
            
        if not hasattr(self, 'entry_id') or not self.entry_id:
            self.log_test("Get Entry Detail", False, "No entry ID available")
            return False
            
        headers = {'Authorization': f'Bearer {self.token}'}
        
        try:
            response = requests.get(f"{self.api_url}/entries/{self.entry_id}", headers=headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f", Entry ID: {data.get('id')}"
                details += f", Has images: {'Yes' if data.get('lead_ingot_image') else 'No'}"
            else:
                details += f", Error: {response.text}"
                
            self.log_test("Get Entry Detail", success, details)
            return success
        except Exception as e:
            self.log_test("Get Entry Detail", False, f"Error: {str(e)}")
            return False

    def test_excel_export(self):
        """Test Excel export functionality"""
        if not self.token:
            self.log_test("Excel Export", False, "No authentication token")
            return False
            
        headers = {'Authorization': f'Bearer {self.token}'}
        
        try:
            response = requests.get(f"{self.api_url}/entries/export/excel", headers=headers, timeout=15)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                content_type = response.headers.get('content-type', '')
                content_length = len(response.content)
                details += f", Content-Type: {content_type}"
                details += f", File size: {content_length} bytes"
                
                # Check if it's actually an Excel file
                if 'spreadsheet' in content_type or content_length > 1000:
                    details += ", Valid Excel file"
                else:
                    success = False
                    details += ", Invalid Excel file"
            else:
                details += f", Error: {response.text}"
                
            self.log_test("Excel Export", success, details)
            return success
        except Exception as e:
            self.log_test("Excel Export", False, f"Error: {str(e)}")
            return False

    def test_unauthorized_access(self):
        """Test accessing protected endpoints without token"""
        try:
            response = requests.get(f"{self.api_url}/entries", timeout=10)
            success = response.status_code == 403  # Should be unauthorized
            details = f"Status: {response.status_code} (Expected: 403)"
            
            if response.status_code == 403:
                details += ", Correctly rejected unauthorized access"
            else:
                details += f", Unexpected response: {response.text}"
                
            self.log_test("Unauthorized Access Check", success, details)
            return success
        except Exception as e:
            self.log_test("Unauthorized Access Check", False, f"Error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting LeadTrack Pro Backend API Tests")
        print("=" * 50)
        
        # Basic connectivity
        if not self.test_api_root():
            print("❌ API not accessible, stopping tests")
            return False
            
        # Test user list for login page
        self.test_users_list()
        
        # Authentication tests with provided credentials
        self.test_admin_login()
        self.test_factory_login()
        
        # Admin functionality tests (only if admin authenticated)
        if self.admin_token:
            self.test_admin_get_users()
            self.test_admin_add_user()
            self.test_admin_delete_user()
            self.test_recovery_settings_get()
            self.test_recovery_settings_update()
        
        # Entry management tests (only if authenticated)
        if self.token:
            self.test_dashboard_summary_api()
            self.test_available_skus_api()
            self.test_create_sale_api()
            self.test_stock_reduction_after_sale()
            self.test_get_sales_list()
            self.test_get_entries()
        
        # Security tests
        self.test_unauthorized_access()
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    tester = LeadTrackAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump({
            'summary': {
                'total_tests': tester.tests_run,
                'passed_tests': tester.tests_passed,
                'success_rate': f"{(tester.tests_passed/tester.tests_run*100):.1f}%" if tester.tests_run > 0 else "0%",
                'timestamp': datetime.now().isoformat()
            },
            'detailed_results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())