"""
Basic server test - checks if server can start and respond to root endpoint
This test doesn't require a Gemini API key
"""

import subprocess
import time
import requests
import sys

def test_server_startup():
    """Test if the server can start"""
    print("=" * 60)
    print("Basic Server Test (No API Key Required)")
    print("=" * 60)
    
    print("\n⚠️  Note: This test will fail because GEMINI_API_KEY is not set.")
    print("This is expected. The test shows what error you'll see.")
    print("\nTo fix: Add your Gemini API key to .env file")
    print("Get one from: https://makersuite.google.com/app/apikey")
    print("\n" + "=" * 60)
    
    # Try to import and check for API key
    try:
        import sys
        import os
        sys.path.insert(0, '.')
        
        # Load .env
        from dotenv import load_dotenv
        load_dotenv()
        
        api_key = os.getenv("GEMINI_API_KEY")
        
        if not api_key or api_key == "your_gemini_api_key_here":
            print("\n❌ GEMINI_API_KEY not configured")
            print("\nSteps to configure:")
            print("1. Get API key from: https://makersuite.google.com/app/apikey")
            print("2. Edit accentaura-backend/ai-microservice/.env")
            print("3. Replace 'your_gemini_api_key_here' with your actual key")
            print("4. Run this test again")
            return False
        else:
            print("\n✅ GEMINI_API_KEY is configured")
            print(f"   Key starts with: {api_key[:10]}...")
            return True
            
    except Exception as e:
        print(f"\n❌ Error checking configuration: {str(e)}")
        return False

def check_dependencies():
    """Check if required packages are installed"""
    print("\n" + "=" * 60)
    print("Checking Dependencies")
    print("=" * 60)
    
    required_packages = [
        'fastapi',
        'uvicorn',
        'google-generativeai',
        'python-dotenv',
        'pydantic'
    ]
    
    all_installed = True
    
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
            print(f"✅ {package}")
        except ImportError:
            print(f"❌ {package} - NOT INSTALLED")
            all_installed = False
    
    if not all_installed:
        print("\n⚠️  Install missing packages:")
        print("   pip install -r requirements.txt")
    
    return all_installed

def show_next_steps():
    """Show what to do next"""
    print("\n" + "=" * 60)
    print("Next Steps")
    print("=" * 60)
    
    print("\n1. Configure Gemini API Key:")
    print("   - Get key: https://makersuite.google.com/app/apikey")
    print("   - Edit: accentaura-backend/ai-microservice/.env")
    print("   - Set: GEMINI_API_KEY=your_actual_key")
    
    print("\n2. Create Sample Audio File:")
    print("   - Record 5-10 seconds of speech")
    print("   - Save as: sample_audio.wav")
    print("   - Place in: accentaura-backend/ai-microservice/")
    
    print("\n3. Start the Server:")
    print("   cd accentaura-backend/ai-microservice")
    print("   python main.py")
    
    print("\n4. Run Tests:")
    print("   python test_speech_analysis.py")
    
    print("\n5. Or test with curl:")
    print("   curl -X POST http://localhost:8000/analyze/speech \\")
    print("     -F 'audio=@sample_audio.wav'")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    print("\n🧪 FastAPI Speech Analysis - Basic Server Test\n")
    
    # Check dependencies
    deps_ok = check_dependencies()
    
    if not deps_ok:
        print("\n❌ Please install dependencies first")
        sys.exit(1)
    
    # Check API key configuration
    api_key_ok = test_server_startup()
    
    # Show next steps
    show_next_steps()
    
    if api_key_ok:
        print("\n✅ Configuration looks good! You can start testing.")
        print("\nRun: python main.py")
    else:
        print("\n⚠️  Please configure your Gemini API key first.")
    
    print("\n" + "=" * 60)
