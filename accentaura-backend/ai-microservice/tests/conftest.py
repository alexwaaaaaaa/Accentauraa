"""
Pytest configuration and fixtures for AI microservice tests
"""
import pytest
from unittest.mock import Mock, MagicMock, patch
import os
import sys

# Add parent directory to path to import main module
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Set test environment variables before importing main
os.environ['GEMINI_API_KEY'] = 'test-api-key-12345'
os.environ['ALLOWED_ORIGINS'] = 'http://localhost:3000,http://localhost:8080'

# Global mock instances that will be reused
_mock_model_instance = None
_mock_model_class = None

@pytest.fixture(scope="session", autouse=True)
def mock_gemini_setup():
    """Set up Gemini API mocks before any tests run"""
    global _mock_model_instance, _mock_model_class
    
    # Patch configure
    configure_patcher = patch('google.generativeai.configure')
    configure_patcher.start()
    
    # Patch GenerativeModel
    model_patcher = patch('google.generativeai.GenerativeModel')
    _mock_model_class = model_patcher.start()
    
    # Create a mock model instance
    _mock_model_instance = MagicMock()
    _mock_model_class.return_value = _mock_model_instance
    
    yield
    
    # Cleanup
    model_patcher.stop()
    configure_patcher.stop()

@pytest.fixture(autouse=True)
def reset_mock_model():
    """Reset the mock model before each test"""
    global _mock_model_instance
    if _mock_model_instance:
        _mock_model_instance.reset_mock()
        _mock_model_instance.generate_content.side_effect = None
        _mock_model_instance.generate_content.return_value = None

@pytest.fixture
def mock_gemini_model():
    """Get the mock Gemini model instance for configuration in tests"""
    global _mock_model_instance
    return _mock_model_instance

@pytest.fixture
def client():
    """Create a test client for the FastAPI app"""
    # Import main after mocking is set up
    from main import app
    from fastapi.testclient import TestClient
    
    # Create test client
    test_client = TestClient(app)
    yield test_client

@pytest.fixture
def mock_gemini_response():
    """Create a mock Gemini API response"""
    def _create_response(text: str):
        mock_response = Mock()
        mock_response.text = text
        return mock_response
    return _create_response

@pytest.fixture
def mock_upload_file():
    """Mock genai.upload_file function"""
    with patch('google.generativeai.upload_file') as mock_upload:
        mock_file = Mock()
        mock_file.name = 'test-file-id-123'
        mock_upload.return_value = mock_file
        yield mock_upload

@pytest.fixture
def mock_delete_file():
    """Mock genai.delete_file function"""
    with patch('google.generativeai.delete_file') as mock_delete:
        yield mock_delete

@pytest.fixture
def sample_audio_file():
    """Create a sample audio file for testing"""
    import io
    # Create a small fake audio file (just bytes)
    audio_data = b'RIFF' + b'\x00' * 100  # Minimal WAV-like header
    return ('test_audio.wav', io.BytesIO(audio_data), 'audio/wav')

@pytest.fixture
def sample_video_file():
    """Create a sample video file for testing"""
    import io
    # Create a small fake video file
    video_data = b'\x00\x00\x00\x20ftypmp42' + b'\x00' * 100  # Minimal MP4-like header
    return ('test_video.mp4', io.BytesIO(video_data), 'video/mp4')

@pytest.fixture
def large_audio_file():
    """Create a large audio file that exceeds size limit"""
    import io
    # Create a file larger than 10MB
    audio_data = b'\x00' * (11 * 1024 * 1024)  # 11MB
    return ('large_audio.wav', io.BytesIO(audio_data), 'audio/wav')

@pytest.fixture
def large_video_file():
    """Create a large video file that exceeds size limit"""
    import io
    # Create a file larger than 50MB
    video_data = b'\x00' * (51 * 1024 * 1024)  # 51MB
    return ('large_video.mp4', io.BytesIO(video_data), 'video/mp4')
