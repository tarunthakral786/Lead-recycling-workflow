import requests
import sys
import json
import io
from datetime import datetime

class LeadTrackAPITester:
    def __init__(self, base_url="https://leadrefiner.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
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

    def test_user_registration(self):
        """Test user registration"""
        test_user = {
            "name": f"Test User {datetime.now().strftime('%H%M%S')}",
            "email": f"test_{datetime.now().strftime('%H%M%S')}@example.com",
            "password": "TestPass123!"
        }
        
        try:
            response = requests.post(f"{self.api_url}/auth/register", json=test_user, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                self.user_id = data.get('id')
                details += f", User ID: {self.user_id}"
                # Store for login test
                self.test_email = test_user['email']
                self.test_password = test_user['password']
            else:
                details += f", Error: {response.text}"
                
            self.log_test("User Registration", success, details)
            return success
        except Exception as e:
            self.log_test("User Registration", False, f"Error: {str(e)}")
            return False

    def test_user_login(self):
        """Test user login"""
        if not hasattr(self, 'test_email'):
            self.log_test("User Login", False, "No test user available")
            return False
            
        login_data = {
            "email": self.test_email,
            "password": self.test_password
        }
        
        try:
            response = requests.post(f"{self.api_url}/auth/login", json=login_data, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                self.token = data.get('access_token')
                details += f", Token received: {'Yes' if self.token else 'No'}"
                details += f", User: {data.get('user', {}).get('name', 'Unknown')}"
            else:
                details += f", Error: {response.text}"
                
            self.log_test("User Login", success, details)
            return success
        except Exception as e:
            self.log_test("User Login", False, f"Error: {str(e)}")
            return False

    def test_duplicate_registration(self):
        """Test duplicate email registration"""
        if not hasattr(self, 'test_email'):
            self.log_test("Duplicate Registration Check", False, "No test user available")
            return False
            
        duplicate_user = {
            "name": "Duplicate User",
            "email": self.test_email,  # Same email as before
            "password": "AnotherPass123!"
        }
        
        try:
            response = requests.post(f"{self.api_url}/auth/register", json=duplicate_user, timeout=10)
            success = response.status_code == 400  # Should fail with 400
            details = f"Status: {response.status_code} (Expected: 400)"
            
            if response.status_code == 400:
                details += ", Correctly rejected duplicate email"
            else:
                details += f", Unexpected response: {response.text}"
                
            self.log_test("Duplicate Registration Check", success, details)
            return success
        except Exception as e:
            self.log_test("Duplicate Registration Check", False, f"Error: {str(e)}")
            return False

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        invalid_login = {
            "email": "nonexistent@example.com",
            "password": "wrongpassword"
        }
        
        try:
            response = requests.post(f"{self.api_url}/auth/login", json=invalid_login, timeout=10)
            success = response.status_code == 401  # Should fail with 401
            details = f"Status: {response.status_code} (Expected: 401)"
            
            if response.status_code == 401:
                details += ", Correctly rejected invalid credentials"
            else:
                details += f", Unexpected response: {response.text}"
                
            self.log_test("Invalid Login Check", success, details)
            return success
        except Exception as e:
            self.log_test("Invalid Login Check", False, f"Error: {str(e)}")
            return False

    def create_test_image(self):
        """Create a simple test image file"""
        # Create a minimal valid image (1x1 pixel PNG)
        png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\x0cIDATx\x9cc```\x00\x00\x00\x04\x00\x01\xdd\x8d\xb4\x1c\x00\x00\x00\x00IEND\xaeB`\x82'
        return io.BytesIO(png_data)

    def test_create_entry(self):
        """Test creating a new entry with images"""
        if not self.token:
            self.log_test("Create Entry", False, "No authentication token")
            return False
            
        headers = {'Authorization': f'Bearer {self.token}'}
        
        # Prepare form data
        form_data = {
            'lead_ingot_kg': '100.50',
            'lead_ingot_pieces': '5',
            'initial_dross_kg': '10.25',
            'dross_2nd_kg': '8.75',
            'dross_3rd_kg': '6.50',
            'pure_lead_kg': '75.00'
        }
        
        # Prepare files
        files = {
            'lead_ingot_image': ('test_lead.png', self.create_test_image(), 'image/png'),
            'initial_dross_image': ('test_dross1.png', self.create_test_image(), 'image/png'),
            'dross_2nd_image': ('test_dross2.png', self.create_test_image(), 'image/png'),
            'dross_3rd_image': ('test_dross3.png', self.create_test_image(), 'image/png'),
            'pure_lead_image': ('test_pure.png', self.create_test_image(), 'image/png')
        }
        
        try:
            response = requests.post(
                f"{self.api_url}/entries", 
                data=form_data, 
                files=files, 
                headers=headers, 
                timeout=30
            )
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                self.entry_id = data.get('id')
                details += f", Entry ID: {self.entry_id}"
                details += f", Lead Ingot: {data.get('lead_ingot_kg')}kg"
            else:
                details += f", Error: {response.text}"
                
            self.log_test("Create Entry", success, details)
            return success
        except Exception as e:
            self.log_test("Create Entry", False, f"Error: {str(e)}")
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
            
        # Authentication tests
        self.test_user_registration()
        self.test_user_login()
        self.test_duplicate_registration()
        self.test_invalid_login()
        
        # Entry management tests (only if authenticated)
        if self.token:
            self.test_create_entry()
            self.test_get_entries()
            self.test_get_entry_detail()
            self.test_excel_export()
        
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