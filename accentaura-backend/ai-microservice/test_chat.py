"""
Test script for the chat endpoint
"""
import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_chat_endpoint():
    """Test the /chat endpoint"""
    print("Testing /chat endpoint...")
    print("-" * 50)
    
    # Test 1: Simple chat without conversation ID
    print("\n1. Testing simple chat (no conversation ID):")
    payload = {
        "prompt": "Hello! I want to practice English."
    }
    
    try:
        response = requests.post(f"{BASE_URL}/chat", json=payload)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {data['response'][:100]}...")
            print(f"Conversation ID: {data['conversationId']}")
            conversation_id = data['conversationId']
            
            # Test 2: Continue conversation with context
            print("\n2. Testing conversation with context:")
            payload2 = {
                "prompt": "Can you help me with grammar?",
                "conversationId": conversation_id
            }
            
            time.sleep(1)  # Brief pause between requests
            response2 = requests.post(f"{BASE_URL}/chat", json=payload2)
            print(f"Status Code: {response2.status_code}")
            
            if response2.status_code == 200:
                data2 = response2.json()
                print(f"Response: {data2['response'][:100]}...")
                print(f"Conversation ID: {data2['conversationId']}")
                print(f"Same conversation: {data2['conversationId'] == conversation_id}")
                
                # Test 3: Another message in same conversation
                print("\n3. Testing third message in conversation:")
                payload3 = {
                    "prompt": "What about pronunciation?",
                    "conversationId": conversation_id
                }
                
                time.sleep(1)
                response3 = requests.post(f"{BASE_URL}/chat", json=payload3)
                print(f"Status Code: {response3.status_code}")
                
                if response3.status_code == 200:
                    data3 = response3.json()
                    print(f"Response: {data3['response'][:100]}...")
                    print(f"Conversation ID: {data3['conversationId']}")
                else:
                    print(f"Error: {response3.text}")
            else:
                print(f"Error: {response2.text}")
        else:
            print(f"Error: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("ERROR: Could not connect to the server.")
        print("Make sure the FastAPI server is running on http://localhost:8000")
        print("Run: cd accentaura-backend/ai-microservice && python main.py")
    except Exception as e:
        print(f"ERROR: {str(e)}")
    
    print("\n" + "-" * 50)
    print("Test completed!")

if __name__ == "__main__":
    test_chat_endpoint()
