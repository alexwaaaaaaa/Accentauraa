"""
Test script for the health check endpoint
Tests the /health endpoint to verify service status and Gemini API connectivity
"""

import requests
import sys
import json
from typing import Dict, Any

# Configuration
BASE_URL = "http://localhost:8000"
HEALTH_ENDPOINT = f"{BASE_URL}/health"

def print_section(title: str):
    """Print a formatted section header"""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")

def print_result(success: bool, message: str):
    """Print a formatted result"""
    status = "✓ PASS" if success else "✗ FAIL"
    print(f"{status}: {message}")

def test_health_endpoint() -> bool:
    """Test the health check endpoint"""
    print_section("Testing Health Check Endpoint")
    
    try:
        print(f"Sending GET request to: {HEALTH_ENDPOINT}")
        response = requests.get(HEALTH_ENDPOINT, timeout=10)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        # Parse response
        try:
            data = response.json()
            print(f"\nResponse Body:")
            print(json.dumps(data, indent=2))
        except json.JSONDecodeError:
            print(f"\nRaw Response: {response.text}")
            print_result(False, "Response is not valid JSON")
            return False
        
        # Verify response structure
        if not isinstance(data, dict):
            print_result(False, "Response is not a JSON object")
            return False
        
        # Check required fields
        required_fields = ["status", "gemini_api"]
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            print_result(False, f"Missing required fields: {missing_fields}")
            return False
        
        print_result(True, "Response has all required fields")
        
        # Verify field values
        status = data.get("status")
        gemini_api = data.get("gemini_api")
        error = data.get("error")
        
        print(f"\nHealth Status: {status}")
        print(f"Gemini API: {gemini_api}")
        if error:
            print(f"Error: {error}")
        
        # Check if service is healthy
        if status == "healthy" and gemini_api == "connected":
            print_result(True, "Service is healthy and Gemini API is connected")
            return True
        elif status == "unhealthy":
            print_result(False, f"Service is unhealthy: {error or 'No error message'}")
            return False
        else:
            print_result(False, f"Unexpected status: {status}")
            return False
            
    except requests.exceptions.ConnectionError:
        print_result(False, "Could not connect to the server. Is it running?")
        print("\nTo start the server, run:")
        print("  cd accentaura-backend/ai-microservice")
        print("  python main.py")
        return False
    except requests.exceptions.Timeout:
        print_result(False, "Request timed out")
        return False
    except Exception as e:
        print_result(False, f"Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_health_response_time() -> bool:
    """Test that health check responds quickly"""
    print_section("Testing Health Check Response Time")
    
    try:
        import time
        
        print(f"Measuring response time for: {HEALTH_ENDPOINT}")
        start_time = time.time()
        response = requests.get(HEALTH_ENDPOINT, timeout=10)
        end_time = time.time()
        
        response_time = (end_time - start_time) * 1000  # Convert to milliseconds
        print(f"Response Time: {response_time:.2f}ms")
        
        # Health checks should be fast (< 5 seconds)
        if response_time < 5000:
            print_result(True, f"Response time is acceptable ({response_time:.2f}ms)")
            return True
        else:
            print_result(False, f"Response time is too slow ({response_time:.2f}ms)")
            return False
            
    except Exception as e:
        print_result(False, f"Error measuring response time: {str(e)}")
        return False

def test_health_multiple_calls() -> bool:
    """Test that health check can handle multiple calls"""
    print_section("Testing Multiple Health Check Calls")
    
    try:
        num_calls = 5
        print(f"Making {num_calls} consecutive health check calls...")
        
        results = []
        for i in range(num_calls):
            response = requests.get(HEALTH_ENDPOINT, timeout=10)
            results.append(response.status_code == 200)
            print(f"  Call {i+1}: Status {response.status_code}")
        
        success_count = sum(results)
        print(f"\nSuccessful calls: {success_count}/{num_calls}")
        
        if success_count == num_calls:
            print_result(True, "All health check calls succeeded")
            return True
        else:
            print_result(False, f"Only {success_count}/{num_calls} calls succeeded")
            return False
            
    except Exception as e:
        print_result(False, f"Error during multiple calls: {str(e)}")
        return False

def main():
    """Run all health check tests"""
    print("\n" + "="*60)
    print("  HEALTH CHECK ENDPOINT TEST SUITE")
    print("="*60)
    print(f"\nBase URL: {BASE_URL}")
    print(f"Health Endpoint: {HEALTH_ENDPOINT}")
    
    # Run tests
    tests = [
        ("Basic Health Check", test_health_endpoint),
        ("Response Time", test_health_response_time),
        ("Multiple Calls", test_health_multiple_calls),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"\nTest '{test_name}' crashed: {str(e)}")
            import traceback
            traceback.print_exc()
            results.append((test_name, False))
    
    # Print summary
    print_section("TEST SUMMARY")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print(f"\n❌ {total - passed} test(s) failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
