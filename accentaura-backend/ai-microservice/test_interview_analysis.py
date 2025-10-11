"""
Test script for interview analysis endpoint
Tests the /interview/analyze endpoint with audio and optional video files
"""

import requests
import json
import os
from pathlib import Path

# Configuration
BASE_URL = "http://localhost:8000"
INTERVIEW_ENDPOINT = f"{BASE_URL}/interview/analyze"

def test_interview_analysis_audio_only():
    """Test interview analysis with audio file only"""
    print("\n" + "="*60)
    print("TEST 1: Interview Analysis - Audio Only")
    print("="*60)
    
    # Create a test audio file path (you'll need to provide an actual audio file)
    # For testing, we'll show what the request would look like
    
    # Sample interview questions
    questions = [
        "Tell me about yourself",
        "What are your greatest strengths?",
        "Where do you see yourself in 5 years?"
    ]
    
    print(f"\nEndpoint: {INTERVIEW_ENDPOINT}")
    print(f"Questions: {json.dumps(questions, indent=2)}")
    
    # Note: You need to provide actual audio file for real testing
    print("\nNote: To test this endpoint, you need to provide:")
    print("1. An audio file (WAV, MP3, M4A, OGG, or FLAC)")
    print("2. Optional: A video file (MP4, MOV, AVI, WEBM)")
    print("3. Optional: Interview questions as JSON array")
    
    print("\nExample curl command:")
    print(f"""
curl -X POST "{INTERVIEW_ENDPOINT}" \\
  -F "audio=@/path/to/interview_audio.wav" \\
  -F "questions='[\"Tell me about yourself\", \"What are your strengths?\"]'
""")
    
    print("\nExample with video:")
    print(f"""
curl -X POST "{INTERVIEW_ENDPOINT}" \\
  -F "audio=@/path/to/interview_audio.wav" \\
  -F "video=@/path/to/interview_video.mp4" \\
  -F "questions='[\"Tell me about yourself\", \"What are your strengths?\"]'
""")

def test_interview_analysis_with_video():
    """Test interview analysis with both audio and video"""
    print("\n" + "="*60)
    print("TEST 2: Interview Analysis - Audio + Video")
    print("="*60)
    
    questions = [
        "Describe a challenging project you worked on",
        "How do you handle stress and pressure?",
        "Why should we hire you?"
    ]
    
    print(f"\nEndpoint: {INTERVIEW_ENDPOINT}")
    print(f"Questions: {json.dumps(questions, indent=2)}")
    print("\nThis test requires both audio and video files")
    print("Expected response includes body language analysis")

def test_interview_analysis_no_questions():
    """Test interview analysis without providing questions"""
    print("\n" + "="*60)
    print("TEST 3: Interview Analysis - No Questions Provided")
    print("="*60)
    
    print(f"\nEndpoint: {INTERVIEW_ENDPOINT}")
    print("Testing without questions parameter")
    print("Analysis should still work but without question context")

def test_expected_response_format():
    """Show expected response format"""
    print("\n" + "="*60)
    print("EXPECTED RESPONSE FORMAT")
    print("="*60)
    
    expected_response = {
        "confidence": 0.82,
        "grammarScore": 0.88,
        "bodyLanguage": {
            "eyeContact": 0.85,
            "posture": 0.90,
            "gestures": 0.80,
            "facialExpressions": 0.85,
            "nervousHabits": 0.75,
            "overallPresence": 0.83
        },
        "mistakes": [
            "Used 'um' and 'uh' frequently (12 times) - practice pausing silently instead",
            "Grammar: Said 'I was went' instead of 'I went' at 0:45",
            "Pronunciation: 'specific' pronounced as 'pacific' at 1:20",
            "Body language: Avoided eye contact during first question",
            "Incomplete answer to question 2 - didn't provide concrete example"
        ],
        "feedback": "Overall, you demonstrated good communication skills with a confident tone and clear articulation. Your responses showed thoughtful consideration of the questions.\n\nStrengths: You maintained good posture throughout, used appropriate professional vocabulary, and your enthusiasm was evident. Your grammar was generally strong with complex sentence structures.\n\nAreas for improvement: Work on reducing filler words by practicing pausing silently when you need to think. This will make you sound more confident and polished. Also, ensure you provide complete answers with specific examples for each question.\n\nFor your next interview: Practice your responses out loud, record yourself to identify filler words, and prepare concrete examples for common questions. Focus on maintaining eye contact and speaking at a steady, measured pace. With these adjustments, you'll present even more professionally."
    }
    
    print("\nWith video (bodyLanguage included):")
    print(json.dumps(expected_response, indent=2))
    
    expected_response_no_video = expected_response.copy()
    expected_response_no_video["bodyLanguage"] = None
    
    print("\n\nWithout video (bodyLanguage is null):")
    print(json.dumps(expected_response_no_video, indent=2))

def test_error_cases():
    """Test error handling"""
    print("\n" + "="*60)
    print("ERROR CASES TO TEST")
    print("="*60)
    
    error_cases = [
        {
            "case": "Missing audio file",
            "expected": "400 Bad Request - audio file is required"
        },
        {
            "case": "Invalid audio file type (e.g., .txt)",
            "expected": "400 Bad Request - Invalid audio file type"
        },
        {
            "case": "Audio file too large (>10MB)",
            "expected": "400 Bad Request - Audio file too large"
        },
        {
            "case": "Invalid video file type",
            "expected": "400 Bad Request - Invalid video file type"
        },
        {
            "case": "Video file too large (>50MB)",
            "expected": "400 Bad Request - Video file too large"
        },
        {
            "case": "Invalid questions format (not JSON array)",
            "expected": "Warning logged, continues without questions"
        }
    ]
    
    for i, case in enumerate(error_cases, 1):
        print(f"\n{i}. {case['case']}")
        print(f"   Expected: {case['expected']}")

def check_server_health():
    """Check if the server is running"""
    print("\n" + "="*60)
    print("SERVER HEALTH CHECK")
    print("="*60)
    
    try:
        response = requests.get(f"{BASE_URL}/")
        if response.status_code == 200:
            print(f"✓ Server is running at {BASE_URL}")
            print(f"Response: {response.json()}")
            return True
        else:
            print(f"✗ Server returned status code: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"✗ Cannot connect to server at {BASE_URL}")
        print("Make sure the FastAPI server is running:")
        print("  cd accentaura-backend/ai-microservice")
        print("  python main.py")
        return False

def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("INTERVIEW ANALYSIS ENDPOINT TEST SUITE")
    print("="*60)
    
    # Check server health
    if not check_server_health():
        print("\n⚠️  Server is not running. Start it first before testing.")
        return
    
    # Run test scenarios
    test_interview_analysis_audio_only()
    test_interview_analysis_with_video()
    test_interview_analysis_no_questions()
    test_expected_response_format()
    test_error_cases()
    
    print("\n" + "="*60)
    print("MANUAL TESTING INSTRUCTIONS")
    print("="*60)
    print("""
To manually test the interview analysis endpoint:

1. Start the FastAPI server:
   cd accentaura-backend/ai-microservice
   python main.py

2. Prepare test files:
   - Audio file: interview_audio.wav (or .mp3, .m4a)
   - Video file (optional): interview_video.mp4 (or .mov)

3. Test with curl:
   
   # Audio only
   curl -X POST "http://localhost:8000/interview/analyze" \\
     -F "audio=@interview_audio.wav" \\
     -F "questions='[\"Tell me about yourself\"]'"
   
   # Audio + Video
   curl -X POST "http://localhost:8000/interview/analyze" \\
     -F "audio=@interview_audio.wav" \\
     -F "video=@interview_video.mp4" \\
     -F "questions='[\"Tell me about yourself\", \"What are your strengths?\"]'"

4. Test with Python:
   
   import requests
   
   files = {
       'audio': open('interview_audio.wav', 'rb'),
       'video': open('interview_video.mp4', 'rb'),  # optional
   }
   data = {
       'questions': '["Tell me about yourself", "What are your strengths?"]'
   }
   
   response = requests.post(
       'http://localhost:8000/interview/analyze',
       files=files,
       data=data
   )
   
   print(response.json())

5. Check the response includes:
   - confidence: float (0.0 to 1.0)
   - grammarScore: float (0.0 to 1.0)
   - bodyLanguage: dict or null (if video provided)
   - feedback: string (comprehensive feedback)
   - mistakes: list of strings or null

6. Verify error handling:
   - Try without audio file
   - Try with invalid file types
   - Try with files exceeding size limits
""")
    
    print("\n" + "="*60)
    print("TEST SUITE COMPLETE")
    print("="*60)

if __name__ == "__main__":
    main()
