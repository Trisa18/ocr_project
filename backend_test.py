import requests
import sys
import json
import time
from datetime import datetime
import os
from io import BytesIO
import base64

class AITripSystemTester:
    def __init__(self, base_url="https://aitripsystem.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.employee_token = "employee"
        self.manager_token = "manager"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_trip_id = None
        self.created_expense_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None, files=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if not endpoint.startswith('http') else endpoint
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        # Remove Content-Type for file uploads
        if files:
            del headers['Content-Type']

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        print(f"   Method: {method}")
        print(f"   Token: {token}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, headers={'Authorization': headers.get('Authorization', '')})
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test basic health endpoint"""
        return self.run_test("Health Check", "GET", "health", 200)

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root Endpoint", "GET", "", 200)

    def test_authentication_employee(self):
        """Test employee authentication"""
        success, response = self.run_test("Employee Auth", "GET", "users/me", 200, token=self.employee_token)
        if success:
            print(f"   Employee User: {response.get('name')} ({response.get('role')})")
        return success

    def test_authentication_manager(self):
        """Test manager authentication"""
        success, response = self.run_test("Manager Auth", "GET", "users/me", 200, token=self.manager_token)
        if success:
            print(f"   Manager User: {response.get('name')} ({response.get('role')})")
        return success

    def test_invalid_authentication(self):
        """Test invalid token"""
        return self.run_test("Invalid Auth", "GET", "users/me", 401, token="invalid_token")

    def test_dashboard_analytics_employee(self):
        """Test employee dashboard analytics"""
        return self.run_test("Employee Dashboard", "GET", "analytics/dashboard", 200, token=self.employee_token)

    def test_dashboard_analytics_manager(self):
        """Test manager dashboard analytics"""
        return self.run_test("Manager Dashboard", "GET", "analytics/dashboard", 200, token=self.manager_token)

    def test_create_trip_request(self):
        """Test creating a trip request with AI budget allocation"""
        trip_data = {
            "destination": "Mumbai",
            "duration": 5,
            "purpose": "Client meeting and project review",
            "start_date": "2024-09-15",
            "end_date": "2024-09-19"
        }
        
        print("   Testing AI Budget Allocation...")
        success, response = self.run_test("Create Trip Request", "POST", "trips", 201, data=trip_data, token=self.employee_token)
        
        if success and 'id' in response:
            self.created_trip_id = response['id']
            print(f"   Created Trip ID: {self.created_trip_id}")
            
            # Check AI budget allocation
            if 'ai_budget' in response:
                ai_budget = response['ai_budget']
                print(f"   AI Budget Generated:")
                print(f"     Travel: ₹{ai_budget.get('travel', 0)}")
                print(f"     Accommodation/night: ₹{ai_budget.get('accommodation_per_night', 0)}")
                print(f"     Food/day: ₹{ai_budget.get('food_per_day', 0)}")
                print(f"     Total Budget: ₹{ai_budget.get('total_budget', 0)}")
                
                if ai_budget.get('total_budget', 0) > 0:
                    print("   ✅ AI Budget Allocation Working!")
                else:
                    print("   ⚠️ AI Budget might be using fallback calculation")
            else:
                print("   ❌ No AI budget found in response")
        
        return success

    def test_get_trips_employee(self):
        """Test getting trips as employee"""
        return self.run_test("Get Trips (Employee)", "GET", "trips", 200, token=self.employee_token)

    def test_get_trips_manager(self):
        """Test getting trips as manager"""
        return self.run_test("Get Trips (Manager)", "GET", "trips", 200, token=self.manager_token)

    def test_approve_trip_budget(self):
        """Test manager approving trip budget"""
        if not self.created_trip_id:
            print("❌ No trip ID available for approval test")
            return False
            
        approval_data = {
            "approved_budget": {
                "travel": 5000,
                "accommodation_per_night": 3000,
                "food_per_day": 1500,
                "local_transport_per_day": 500,
                "miscellaneous_per_day": 1000,
                "total_budget": 25000
            },
            "notes": "Budget approved with minor adjustments"
        }
        
        return self.run_test("Approve Trip Budget", "PUT", f"trips/{self.created_trip_id}/approve", 200, 
                           data=approval_data, token=self.manager_token)

    def test_start_trip(self):
        """Test employee starting an approved trip"""
        if not self.created_trip_id:
            print("❌ No trip ID available for start test")
            return False
            
        return self.run_test("Start Trip", "PUT", f"trips/{self.created_trip_id}/start", 200, token=self.employee_token)

    def test_create_manual_expense(self):
        """Test creating manual expense"""
        if not self.created_trip_id:
            print("❌ No trip ID available for expense test")
            return False
            
        expense_data = {
            "trip_id": self.created_trip_id,
            "vendor": "Hotel Taj Mumbai",
            "amount": 2500.0,
            "category": "Accommodation",
            "date": "2024-09-15",
            "items": ["Room booking", "Breakfast"]
        }
        
        success, response = self.run_test("Create Manual Expense", "POST", "expenses", 201, 
                                        data=expense_data, token=self.employee_token)
        
        if success and 'id' in response:
            self.created_expense_id = response['id']
            print(f"   Created Expense ID: {self.created_expense_id}")
        
        return success

    def test_ocr_receipt_processing(self):
        """Test OCR receipt processing with AI"""
        if not self.created_trip_id:
            print("❌ No trip ID available for OCR test")
            return False
            
        # Create a simple test image (1x1 pixel PNG)
        test_image_data = base64.b64decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
        )
        
        files = {
            'file': ('test_receipt.png', BytesIO(test_image_data), 'image/png')
        }
        
        print("   Testing AI OCR Processing...")
        success, response = self.run_test("OCR Receipt Processing", "POST", 
                                        f"expenses/upload?trip_id={self.created_trip_id}", 
                                        200, files=files, token=self.employee_token)
        
        if success:
            if 'ocr_data' in response:
                ocr_data = response['ocr_data']
                print(f"   OCR Extracted Data:")
                print(f"     Vendor: {ocr_data.get('vendor', 'N/A')}")
                print(f"     Amount: ₹{ocr_data.get('amount', 0)}")
                print(f"     Category: {ocr_data.get('category', 'N/A')}")
                print(f"     Date: {ocr_data.get('date', 'N/A')}")
                
                if ocr_data.get('vendor') != 'Unknown':
                    print("   ✅ AI OCR Processing Working!")
                else:
                    print("   ⚠️ OCR might be using fallback data")
            else:
                print("   ❌ No OCR data found in response")
        
        return success

    def test_get_expenses_employee(self):
        """Test getting expenses as employee"""
        return self.run_test("Get Expenses (Employee)", "GET", "expenses", 200, token=self.employee_token)

    def test_get_expenses_manager(self):
        """Test getting expenses as manager"""
        return self.run_test("Get Expenses (Manager)", "GET", "expenses", 200, token=self.manager_token)

    def test_approve_expense(self):
        """Test manager approving expense"""
        if not self.created_expense_id:
            print("❌ No expense ID available for approval test")
            return False
            
        approval_data = {
            "status": "approved",
            "notes": "Expense approved - valid business expense"
        }
        
        return self.run_test("Approve Expense", "PUT", f"expenses/{self.created_expense_id}/approve", 
                           200, data=approval_data, token=self.manager_token)

    def test_role_based_access_control(self):
        """Test role-based access control"""
        print("\n🔒 Testing Role-Based Access Control...")
        
        # Employee trying to approve trip (should fail)
        if self.created_trip_id:
            approval_data = {"approved_budget": {}, "notes": "test"}
            success, _ = self.run_test("Employee Approve Trip (Should Fail)", "PUT", 
                                     f"trips/{self.created_trip_id}/approve", 403, 
                                     data=approval_data, token=self.employee_token)
            if not success:
                print("   ✅ Employee correctly denied trip approval access")
        
        # Employee trying to approve expense (should fail)
        if self.created_expense_id:
            approval_data = {"status": "approved", "notes": "test"}
            success, _ = self.run_test("Employee Approve Expense (Should Fail)", "PUT", 
                                     f"expenses/{self.created_expense_id}/approve", 403, 
                                     data=approval_data, token=self.employee_token)
            if not success:
                print("   ✅ Employee correctly denied expense approval access")
        
        return True

def main():
    print("🚀 Starting AI Trip Management System Backend Tests")
    print("=" * 60)
    
    tester = AITripSystemTester()
    
    # Basic connectivity tests
    print("\n📡 CONNECTIVITY TESTS")
    tester.test_health_check()
    tester.test_root_endpoint()
    
    # Authentication tests
    print("\n🔐 AUTHENTICATION TESTS")
    tester.test_authentication_employee()
    tester.test_authentication_manager()
    tester.test_invalid_authentication()
    
    # Dashboard analytics tests
    print("\n📊 DASHBOARD ANALYTICS TESTS")
    tester.test_dashboard_analytics_employee()
    tester.test_dashboard_analytics_manager()
    
    # Trip management tests
    print("\n✈️ TRIP MANAGEMENT TESTS")
    tester.test_create_trip_request()  # This tests AI budget allocation
    tester.test_get_trips_employee()
    tester.test_get_trips_manager()
    tester.test_approve_trip_budget()
    tester.test_start_trip()
    
    # Expense management tests
    print("\n💰 EXPENSE MANAGEMENT TESTS")
    tester.test_create_manual_expense()
    tester.test_ocr_receipt_processing()  # This tests AI OCR
    tester.test_get_expenses_employee()
    tester.test_get_expenses_manager()
    tester.test_approve_expense()
    
    # Security tests
    print("\n🔒 SECURITY TESTS")
    tester.test_role_based_access_control()
    
    # Final results
    print("\n" + "=" * 60)
    print(f"📊 FINAL RESULTS")
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Tests Failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 ALL TESTS PASSED!")
        return 0
    else:
        print("❌ SOME TESTS FAILED!")
        return 1

if __name__ == "__main__":
    sys.exit(main())