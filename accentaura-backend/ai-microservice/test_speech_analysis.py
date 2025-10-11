"""
Test script for speech analysis endpoint
"""

import requests
import os
from pathlib import Path

# Configuration
BASE_URL = "http://localhost:8000"
SPEECH_ENDPOINT = f"{BASE_URL}/analyze/speech"

def test_speech_analysis_with_sample():
    """Test speech analysis with a sample audio file"""
    print("=" * 60)
    print("Testing Speech Analysis Endpoint")
    print("=" * 60)
    
    # Note: This test requires an actual audio file
    # For demonstration, we'll show how to test with a file
    
    # Check if sample audio exists
    sample_audio_path = Path("sample_audio.wav")
    
    if not sample_audio_path.exists():
        print("\n⚠️  No sample audio file found.")
        print("To test this endpoint, you need an audio file.")
        print("\nYou can:")
        print("1. Record a short audio clip (5-10 seconds)")
        print("2. Save it as 'sample_audio.wav' in this directory")
        print("3. Run this test again")
        print("\nOr test manually with curl:")
        print(f"curl -X POST {SPEECH_ENDPOINT} \\")
        print('  -H "Content-Type: multipart/form-data" \\')
        print('  -F "audio=@your_audio_file.wav"')
        return
    
    print(f"\n📁 Using audio file: {sample_audio_path}")
    
    try:
        # Open and send the audio file
        with open(sample_audio_path, 'rb') as audio_file:
            files = {'audio': ('sample_audio.wav', audio_file, 'audio/wav')}
            
            print(f"\n🚀 Sending request to {SPEECH_ENDPOINT}")
            response = requests.post(SPEECH_ENDPOINT, files=files, timeout=60)
        
        print(f"\n📊 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("\n✅ Speech Analysis Successful!")
            print("\n" + "=" * 60)
            print("ANALYSIS RESULTS")
            print("=" * 60)
            print(f"\n🎯 Confidence Score: {data['confidence']:.2f}")
            print(f"📝 Grammar Score: {data['grammarScore']:.2f}")
            print(f"\n💬 Feedback:\n{data['feedback']}")
            
            if data.get('pronunciation'):
                print("\n🗣️  Pronunciation Analysis:")
                pron = data['pronunciation']
                print(f"  - Clarity: {pron.get('clarity', 'N/A')}")
                print(f"  - Accent: {pron.get('accent', 'N/A')}")
                print(f"  - Intonation: {pron.get('intonation', 'N/A')}")
                if pron.get('problemSounds'):
                    print(f"  - Problem Sounds: {', '.join(pron['problemSounds'])}")
            
            print("\n" + "=" * 60)
        else:
            print(f"\n❌ Error: {response.status_code}")
            print(f"Response: {response.text}")
    
    except requests.exceptions.ConnectionError:
        print("\n❌ Connection Error!")
        print("Make sure the FastAPI server is running:")
        print("  cd accentaura-backend/ai-microservice")
        print("  python main.py")
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")

def test_invalid_file_type():
    """Test with invalid file type"""
    print("\n" + "=" * 60)
    print("Testing Invalid File Type")
    print("=" * 60)
    
    try:
        # Create a fake text file
        files = {'audio': ('test.txt', b'This is not audio', 'text/plain')}
        
        print(f"\n🚀 Sending invalid file to {SPEECH_ENDPOINT}")
        response = requests.post(SPEECH_ENDPOINT, files=files, timeout=30)
        
        print(f"\n📊 Response Status: {response.status_code}")
        
        if response.status_code == 400:
            print("✅ Correctly rejected invalid file type")
            print(f"Error message: {response.json()['detail']}")
        else:
            print(f"⚠️  Unexpected status code: {response.status_code}")
            print(f"Response: {response.text}")
    
    except requests.exceptions.ConnectionError:
        print("\n❌ Connection Error! Server not running.")
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")

def test_health_check():
    """Test if server is running"""
    print("\n" + "=" * 60)
    print("Testing Server Health")
    print("=" * 60)
    
    try:
        response = requests.get(f"{BASE_URL}/", timeout=5)
        if response.status_code == 200:
            print("✅ Server is running!")
            print(f"Response: {response.json()}")
            return True
        else:
            print(f"⚠️  Unexpected response: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Server is not running!")
        print("\nStart the server with:")
        print("  cd accentaura-backend/ai-microservice")
        print("  python main.py")
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

if __name__ == "__main__":
    print("\n🧪 Speech Analysis Endpoint Test Suite")
    print("=" * 60)
    
    # Check if server is running
    if not test_health_check():
        print("\n⚠️  Cannot proceed with tests. Start the server first.")
        exit(1)
    
    # Run tests
    test_speech_analysis_with_sample()
    test_invalid_file_type()
    
    print("\n" + "=" * 60)
    print("✅ Test Suite Complete")
    print("=" * 60)
