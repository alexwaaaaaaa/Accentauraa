"""
Quick test for speech analysis endpoint
Run this after starting the server with: python main.py
"""

import requests
import sys

BASE_URL = "http://localhost:8000"

def test_root():
    """Test root endpoint"""
    print("Testing root endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/", timeout=5)
        if response.status_code == 200:
            print("✅ Server is running!")
            print(f"   Response: {response.json()}")
            return True
        else:
            print(f"❌ Unexpected status: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Server is not running!")
        print("\nStart the server first:")
        print("  cd accentaura-backend/ai-microservice")
        print("  python main.py")
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def test_docs():
    """Check if API docs are available"""
    print("\nAPI Documentation available at:")
    print(f"  📚 Swagger UI: {BASE_URL}/docs")
    print(f"  📖 ReDoc: {BASE_URL}/redoc")

def show_test_instructions():
    """Show how to test the speech endpoint"""
    print("\n" + "=" * 60)
    print("To test the speech analysis endpoint:")
    print("=" * 60)
    
    print("\n1. You need an audio file (WAV, MP3, M4A, OGG, or FLAC)")
    
    print("\n2. Test with curl:")
    print("   curl -X POST http://localhost:8000/analyze/speech \\")
    print("     -F 'audio=@your_audio_file.wav'")
    
    print("\n3. Or use the Swagger UI:")
    print("   - Open: http://localhost:8000/docs")
    print("   - Find: POST /analyze/speech")
    print("   - Click 'Try it out'")
    print("   - Upload your audio file")
    print("   - Click 'Execute'")
    
    print("\n4. Expected response:")
    print("   {")
    print('     "confidence": 0.85,')
    print('     "grammarScore": 0.90,')
    print('     "feedback": "Your speech is clear...",')
    print('     "pronunciation": { ... }')
    print("   }")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    print("\n🧪 Quick Server Test\n")
    print("=" * 60)
    
    if test_root():
        test_docs()
        show_test_instructions()
        print("\n✅ Server is ready for testing!")
    else:
        print("\n❌ Server is not running. Start it first:")
        print("   cd accentaura-backend/ai-microservice")
        print("   python main.py")
    
    print("\n" + "=" * 60)
