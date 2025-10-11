"""
Test script for confidence analysis endpoint
Tests the /analyze/confidence endpoint with various text samples
"""

import requests
import json

# Base URL for the AI microservice
BASE_URL = "http://localhost:8000"

def test_confidence_analysis():
    """Test the confidence analysis endpoint with different text samples"""
    
    print("=" * 80)
    print("Testing Confidence Analysis Endpoint")
    print("=" * 80)
    
    # Test cases with different confidence levels
    test_cases = [
        {
            "name": "Low Confidence Text",
            "text": "I think maybe we could possibly try this approach, but I'm not really sure if it will work. Perhaps we should consider other options too."
        },
        {
            "name": "Medium Confidence Text",
            "text": "I believe this approach will work well. We should implement it, though we might need to adjust some details along the way."
        },
        {
            "name": "High Confidence Text",
            "text": "This is the best solution. I will implement it immediately. The results will exceed expectations and deliver significant value."
        },
        {
            "name": "Mixed Confidence Text",
            "text": "The project was completed successfully. I think the results are good, but maybe we could have done better. I'm not entirely sure about the final outcome."
        },
        {
            "name": "Short Text",
            "text": "I might be wrong, but perhaps this could work."
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{'=' * 80}")
        print(f"Test Case {i}: {test_case['name']}")
        print(f"{'=' * 80}")
        print(f"\nText: \"{test_case['text']}\"")
        print(f"\nSending request to {BASE_URL}/analyze/confidence...")
        
        try:
            response = requests.post(
                f"{BASE_URL}/analyze/confidence",
                json={"text": test_case["text"]},
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"\n✅ SUCCESS")
                print(f"\nConfidence Score: {result['confidence']:.2f}")
                print(f"\nSuggestions ({len(result['suggestions'])}):")
                for j, suggestion in enumerate(result['suggestions'], 1):
                    print(f"  {j}. {suggestion}")
            else:
                print(f"\n❌ ERROR")
                print(f"Response: {response.text}")
                
        except requests.exceptions.ConnectionError:
            print(f"\n❌ CONNECTION ERROR")
            print("Could not connect to the AI microservice.")
            print("Make sure the service is running on http://localhost:8000")
            print("\nTo start the service, run:")
            print("  cd accentaura-backend/ai-microservice")
            print("  python main.py")
            return
        except Exception as e:
            print(f"\n❌ EXCEPTION: {str(e)}")
    
    # Test edge cases
    print(f"\n{'=' * 80}")
    print("Testing Edge Cases")
    print(f"{'=' * 80}")
    
    # Test empty text
    print("\n--- Test: Empty Text ---")
    try:
        response = requests.post(
            f"{BASE_URL}/analyze/confidence",
            json={"text": ""},
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        print(f"Status Code: {response.status_code}")
        if response.status_code == 400:
            print("✅ Correctly rejected empty text")
        else:
            print(f"❌ Expected 400, got {response.status_code}")
    except Exception as e:
        print(f"❌ Exception: {str(e)}")
    
    # Test very long text
    print("\n--- Test: Very Long Text (>5000 chars) ---")
    long_text = "This is a test. " * 400  # ~6400 characters
    try:
        response = requests.post(
            f"{BASE_URL}/analyze/confidence",
            json={"text": long_text},
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        print(f"Status Code: {response.status_code}")
        if response.status_code == 400:
            print("✅ Correctly rejected text that's too long")
        else:
            print(f"❌ Expected 400, got {response.status_code}")
    except Exception as e:
        print(f"❌ Exception: {str(e)}")
    
    print(f"\n{'=' * 80}")
    print("Testing Complete!")
    print(f"{'=' * 80}\n")

if __name__ == "__main__":
    test_confidence_analysis()
