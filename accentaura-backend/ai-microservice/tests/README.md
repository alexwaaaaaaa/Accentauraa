# AI Microservice Tests

This directory contains comprehensive tests for the Accentaura AI Microservice FastAPI application.

## Test Structure

```
tests/
├── __init__.py                      # Test package initialization
├── conftest.py                      # Pytest fixtures and configuration
├── test_chat.py                     # Tests for /chat endpoint
├── test_speech_analysis.py          # Tests for /analyze/speech endpoint
├── test_confidence_analysis.py      # Tests for /analyze/confidence endpoint
├── test_interview_analysis.py       # Tests for /interview/analyze endpoint
├── test_error_handling.py           # Tests for error handling across all endpoints
├── test_health.py                   # Tests for /health and root endpoints
└── README.md                        # This file
```

## Test Coverage

### Chat Endpoint (`test_chat.py`)
- ✅ Successful chat without conversation ID
- ✅ Successful chat with existing conversation ID
- ✅ Conversation context maintenance
- ✅ Missing/empty prompt handling
- ✅ Gemini API errors
- ✅ Empty responses from Gemini
- ✅ Long prompts
- ✅ Special characters
- ✅ Response format validation

### Speech Analysis Endpoint (`test_speech_analysis.py`)
- ✅ Successful speech analysis
- ✅ JSON in markdown code blocks
- ✅ Missing audio file
- ✅ Invalid file types
- ✅ File size limits (10MB)
- ✅ Gemini upload errors
- ✅ Gemini API errors
- ✅ Invalid JSON responses with fallback
- ✅ Score clamping to [0, 1]
- ✅ Multiple audio format support (WAV, MP3, M4A, OGG, FLAC)
- ✅ Response structure validation

### Confidence Analysis Endpoint (`test_confidence_analysis.py`)
- ✅ Successful confidence analysis
- ✅ JSON in markdown code blocks
- ✅ Missing/empty text
- ✅ Text length limits (5000 chars)
- ✅ Gemini API errors
- ✅ Invalid JSON responses with fallback
- ✅ Score clamping to [0, 1]
- ✅ High/low confidence text analysis
- ✅ Special characters
- ✅ Suggestion limiting (max 10)
- ✅ Response structure validation

### Interview Analysis Endpoint (`test_interview_analysis.py`)
- ✅ Audio-only analysis
- ✅ Audio + video analysis
- ✅ Analysis with interview questions
- ✅ Missing audio file
- ✅ Invalid audio/video file types
- ✅ File size limits (audio: 10MB, video: 50MB)
- ✅ Gemini upload errors
- ✅ Gemini API errors
- ✅ Invalid JSON responses with fallback
- ✅ Score clamping to [0, 1]
- ✅ Body language analysis (when video provided)
- ✅ Invalid questions format handling
- ✅ Response structure validation

### Error Handling (`test_error_handling.py`)
- ✅ 404 Not Found
- ✅ 405 Method Not Allowed
- ✅ 422 Validation Errors
- ✅ 500 Internal Server Errors
- ✅ Gemini API exceptions
- ✅ Timeout handling
- ✅ Rate limit errors
- ✅ File upload errors
- ✅ Malformed JSON
- ✅ Unicode handling
- ✅ SQL injection attempts
- ✅ XSS attempts
- ✅ Null values
- ✅ Concurrent requests
- ✅ Large responses
- ✅ Network errors
- ✅ Memory errors

### Health Check (`test_health.py`)
- ✅ Successful health check
- ✅ Gemini API failure detection
- ✅ Response structure validation
- ✅ No side effects
- ✅ Timeout handling
- ✅ Concurrent health checks
- ✅ Root endpoint

## Running Tests

### Install Dependencies

```bash
cd accentaura-backend/ai-microservice
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

### Run All Tests

```bash
pytest
```

### Run Specific Test File

```bash
pytest tests/test_chat.py
pytest tests/test_speech_analysis.py
pytest tests/test_confidence_analysis.py
pytest tests/test_interview_analysis.py
pytest tests/test_error_handling.py
pytest tests/test_health.py
```

### Run Specific Test Class or Function

```bash
# Run specific test class
pytest tests/test_chat.py::TestChatEndpoint

# Run specific test function
pytest tests/test_chat.py::TestChatEndpoint::test_chat_success_without_conversation_id
```

### Run with Coverage

```bash
pytest --cov=. --cov-report=html --cov-report=term
```

This will generate:
- Terminal coverage report
- HTML coverage report in `htmlcov/` directory

### Run with Verbose Output

```bash
pytest -v
```

### Run with Detailed Output

```bash
pytest -vv
```

### Run Only Fast Tests (exclude slow tests)

```bash
pytest -m "not slow"
```

### Run in Parallel (faster execution)

```bash
pip install pytest-xdist
pytest -n auto
```

## Test Fixtures

The `conftest.py` file provides several useful fixtures:

- **`client`**: FastAPI TestClient for making requests
- **`mock_gemini_model`**: Mocked Gemini GenerativeModel
- **`mock_gemini_response`**: Helper to create mock Gemini responses
- **`mock_upload_file`**: Mocked file upload function
- **`mock_delete_file`**: Mocked file deletion function
- **`sample_audio_file`**: Sample audio file for testing
- **`sample_video_file`**: Sample video file for testing
- **`large_audio_file`**: Large audio file (>10MB) for size limit testing
- **`large_video_file`**: Large video file (>50MB) for size limit testing

## Mocking Strategy

All tests mock the Gemini API to:
1. Avoid actual API calls during testing
2. Test error scenarios that are hard to reproduce
3. Ensure fast, reliable test execution
4. Avoid API rate limits and costs

The mocking is done at the `google.generativeai` module level, ensuring no real API calls are made.

## Test Environment

Tests use a test environment with:
- `GEMINI_API_KEY=test-api-key-12345` (fake key for testing)
- `ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080`

These are set in `conftest.py` before the application is imported.

## Continuous Integration

These tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run AI Microservice Tests
  run: |
    cd accentaura-backend/ai-microservice
    pip install -r requirements.txt
    pip install -r requirements-dev.txt
    pytest --cov=. --cov-report=xml
```

## Coverage Goals

Target coverage: **>90%**

Current coverage areas:
- ✅ All endpoints
- ✅ Request validation
- ✅ Response formatting
- ✅ Error handling
- ✅ File upload/processing
- ✅ Gemini API integration (mocked)
- ✅ Edge cases and error scenarios

## Adding New Tests

When adding new tests:

1. Follow the existing test structure
2. Use descriptive test names: `test_<feature>_<scenario>`
3. Use appropriate fixtures from `conftest.py`
4. Mock external dependencies (Gemini API)
5. Test both success and failure scenarios
6. Validate response structure and types
7. Add docstrings explaining what is being tested

Example:

```python
def test_new_feature_success(self, client, mock_gemini_model, mock_gemini_response):
    """Test successful execution of new feature"""
    # Arrange
    mock_response = mock_gemini_response("Expected response")
    mock_gemini_model.generate_content.return_value = mock_response
    
    # Act
    response = client.post("/new-endpoint", json={"data": "test"})
    
    # Assert
    assert response.status_code == 200
    data = response.json()
    assert "expected_field" in data
```

## Troubleshooting

### Import Errors

If you get import errors, ensure you're running pytest from the `ai-microservice` directory:

```bash
cd accentaura-backend/ai-microservice
pytest
```

### Fixture Not Found

Make sure `conftest.py` is in the `tests/` directory and pytest can find it.

### Mock Not Working

Verify that mocks are applied before the application is imported. Check `conftest.py` for the correct mock setup.

### Tests Hanging

If tests hang, check for:
- Actual API calls (should all be mocked)
- Infinite loops
- Blocking I/O operations

Use `pytest --timeout=30` to set a timeout for tests.

## Requirements

Requirement 12.4 from the design document:

> WHEN AI microservice is developed THEN the system SHALL have tests for Gemini API integration and error handling

This test suite fulfills this requirement by providing:
- ✅ Comprehensive tests for all endpoints
- ✅ Mocked Gemini API integration tests
- ✅ Extensive error handling tests
- ✅ Edge case coverage
- ✅ Response validation
- ✅ File upload/processing tests
