"""
Tests for error handling across all endpoints
"""
import pytest
from unittest.mock import Mock, patch
import io


class TestErrorHandling:
    """Test suite for error handling"""
    
    def test_404_not_found(self, client):
        """Test 404 error for non-existent endpoint"""
        response = client.get("/nonexistent")
        assert response.status_code == 404
    
    def test_405_method_not_allowed(self, client):
        """Test 405 error for wrong HTTP method"""
        # GET on POST-only endpoint
        response = client.get("/chat")
        assert response.status_code == 405
    
    def test_422_validation_error_missing_required_field(self, client):
        """Test 422 validation error for missing required fields"""
        # Chat without prompt
        response = client.post("/chat", json={})
        assert response.status_code == 422
        
        # Confidence without text
        response = client.post("/analyze/confidence", json={})
        assert response.status_code == 422
    
    def test_422_validation_error_invalid_type(self, client):
        """Test 422 validation error for invalid field types"""
        # Prompt should be string, not number
        response = client.post("/chat", json={"prompt": 123})
        assert response.status_code == 422
        
        # Text should be string, not array
        response = client.post("/analyze/confidence", json={"text": ["not", "a", "string"]})
        assert response.status_code == 422
    
    def test_500_internal_server_error_gemini_exception(self, client, mock_gemini_model):
        """Test 500 error when Gemini API throws exception"""
        mock_gemini_model.generate_content.side_effect = Exception("Internal Gemini error")
        
        response = client.post("/chat", json={"prompt": "Hello"})
        assert response.status_code == 500
        data = response.json()
        assert "detail" in data
    
    def test_error_response_format(self, client, mock_gemini_model):
        """Test that error responses have consistent format"""
        mock_gemini_model.generate_content.side_effect = Exception("Test error")
        
        response = client.post("/chat", json={"prompt": "Test"})
        assert response.status_code == 500
        
        data = response.json()
        assert isinstance(data, dict)
        assert "detail" in data
        assert isinstance(data["detail"], str)
    
    def test_gemini_api_timeout(self, client, mock_gemini_model):
        """Test handling of Gemini API timeout"""
        import asyncio
        mock_gemini_model.generate_content.side_effect = asyncio.TimeoutError("Request timeout")
        
        response = client.post("/chat", json={"prompt": "Hello"})
        assert response.status_code == 500
    
    def test_gemini_api_rate_limit(self, client, mock_gemini_model):
        """Test handling of Gemini API rate limit error"""
        mock_gemini_model.generate_content.side_effect = Exception("Rate limit exceeded")
        
        response = client.post("/chat", json={"prompt": "Hello"})
        assert response.status_code == 500
        data = response.json()
        assert "detail" in data
    
    def test_file_upload_error_handling(self, client):
        """Test error handling for file upload issues"""
        # No file provided
        response = client.post("/analyze/speech")
        assert response.status_code == 422
        
        # Invalid file type
        text_file = io.BytesIO(b"Not audio")
        response = client.post(
            "/analyze/speech",
            files={"audio": ("test.txt", text_file, "text/plain")}
        )
        assert response.status_code == 400
    
    def test_malformed_json_request(self, client):
        """Test handling of malformed JSON in request"""
        response = client.post(
            "/chat",
            data="not valid json",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 422
    
    def test_empty_request_body(self, client):
        """Test handling of empty request body"""
        response = client.post(
            "/chat",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 422
    
    def test_unicode_handling(self, client, mock_gemini_model, mock_gemini_response):
        """Test proper handling of unicode characters"""
        mock_response = mock_gemini_response("你好！I can help with that.")
        mock_gemini_model.generate_content.return_value = mock_response
        
        response = client.post(
            "/chat",
            json={"prompt": "Hello 你好 🎉"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
    
    def test_sql_injection_attempt(self, client, mock_gemini_model, mock_gemini_response):
        """Test that SQL injection attempts are handled safely"""
        mock_response = mock_gemini_response("I can help you learn English.")
        mock_gemini_model.generate_content.return_value = mock_response
        
        # SQL injection attempt in prompt
        response = client.post(
            "/chat",
            json={"prompt": "'; DROP TABLE users; --"}
        )
        
        # Should process normally without SQL execution
        assert response.status_code == 200
    
    def test_xss_attempt(self, client, mock_gemini_model, mock_gemini_response):
        """Test that XSS attempts are handled safely"""
        mock_response = mock_gemini_response("I can help you.")
        mock_gemini_model.generate_content.return_value = mock_response
        
        # XSS attempt in prompt
        response = client.post(
            "/chat",
            json={"prompt": "<script>alert('xss')</script>"}
        )
        
        # Should process normally without executing script
        assert response.status_code == 200
    
    def test_null_values_handling(self, client, mock_gemini_model, mock_gemini_response):
        """Test handling of null values in requests"""
        mock_response = mock_gemini_response("Hello!")
        mock_gemini_model.generate_content.return_value = mock_response
        
        # Null conversationId should be handled
        response = client.post(
            "/chat",
            json={"prompt": "Hello", "conversationId": None}
        )
        
        assert response.status_code == 200
    
    def test_concurrent_request_handling(self, client, mock_gemini_model, mock_gemini_response):
        """Test that concurrent requests are handled properly"""
        mock_response = mock_gemini_response("Response")
        mock_gemini_model.generate_content.return_value = mock_response
        
        # Make multiple concurrent requests
        responses = []
        for i in range(5):
            response = client.post("/chat", json={"prompt": f"Test {i}"})
            responses.append(response)
        
        # All should succeed
        for response in responses:
            assert response.status_code == 200
    
    def test_large_response_handling(self, client, mock_gemini_model, mock_gemini_response):
        """Test handling of very large responses from Gemini"""
        # Create a very large response
        large_response = "word " * 10000
        mock_response = mock_gemini_response(large_response)
        mock_gemini_model.generate_content.return_value = mock_response
        
        response = client.post("/chat", json={"prompt": "Tell me a long story"})
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["response"]) > 0
    
    def test_network_error_simulation(self, client, mock_gemini_model):
        """Test handling of network errors"""
        import socket
        mock_gemini_model.generate_content.side_effect = socket.error("Network error")
        
        response = client.post("/chat", json={"prompt": "Hello"})
        assert response.status_code == 500
    
    def test_memory_error_handling(self, client, mock_gemini_model):
        """Test handling of memory errors"""
        mock_gemini_model.generate_content.side_effect = MemoryError("Out of memory")
        
        response = client.post("/chat", json={"prompt": "Hello"})
        assert response.status_code == 500
