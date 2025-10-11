"""
Tests for health check endpoint
"""
import pytest
from unittest.mock import Mock, patch


class TestHealthEndpoint:
    """Test suite for /health endpoint"""
    
    def test_health_check_success(self, client):
        """Test successful health check"""
        # Mock the GenerativeModel that health endpoint creates
        with patch('google.generativeai.GenerativeModel') as mock_model_class:
            mock_model = Mock()
            mock_response = Mock()
            mock_response.text = "OK"
            mock_model.generate_content.return_value = mock_response
            mock_model_class.return_value = mock_model
            
            response = client.get("/health")
            
            assert response.status_code == 200
            data = response.json()
            
            assert "status" in data
            assert "gemini_api" in data
            assert data["status"] == "healthy"
            assert data["gemini_api"] == "connected"
    
    def test_health_check_gemini_api_failure(self, client):
        """Test health check when Gemini API is unavailable"""
        # Mock the GenerativeModel that health endpoint creates
        with patch('google.generativeai.GenerativeModel') as mock_model_class:
            mock_model = Mock()
            mock_model.generate_content.side_effect = Exception("API unavailable")
            mock_model_class.return_value = mock_model
            
            response = client.get("/health")
            
            assert response.status_code == 200  # Health endpoint should always return 200
            data = response.json()
            
            assert "status" in data
            assert "gemini_api" in data
            assert "error" in data
            assert data["status"] == "unhealthy"
            assert data["gemini_api"] == "disconnected"
    
    def test_health_check_response_structure(self, client):
        """Test that health check response has correct structure"""
        with patch('google.generativeai.GenerativeModel') as mock_model_class:
            mock_model = Mock()
            mock_response = Mock()
            mock_response.text = "OK"
            mock_model.generate_content.return_value = mock_response
            mock_model_class.return_value = mock_model
            
            response = client.get("/health")
            
            assert response.status_code == 200
            data = response.json()
            
            # Verify structure
            assert isinstance(data, dict)
            assert "status" in data
            assert "gemini_api" in data
            assert isinstance(data["status"], str)
            assert isinstance(data["gemini_api"], str)
    
    def test_health_check_no_side_effects(self, client):
        """Test that health check doesn't affect application state"""
        with patch('google.generativeai.GenerativeModel') as mock_model_class:
            mock_model = Mock()
            mock_response = Mock()
            mock_response.text = "OK"
            mock_model.generate_content.return_value = mock_response
            mock_model_class.return_value = mock_model
            
            # Call health check multiple times
            for _ in range(5):
                response = client.get("/health")
                assert response.status_code == 200
                data = response.json()
                assert data["status"] == "healthy"
    
    def test_health_check_timeout(self, client):
        """Test health check with slow Gemini API response"""
        import time
        
        def slow_response(*args, **kwargs):
            time.sleep(0.1)  # Simulate slow response
            mock_resp = Mock()
            mock_resp.text = "OK"
            return mock_resp
        
        with patch('google.generativeai.GenerativeModel') as mock_model_class:
            mock_model = Mock()
            mock_model.generate_content.side_effect = slow_response
            mock_model_class.return_value = mock_model
            
            response = client.get("/health")
            assert response.status_code == 200
    
    def test_health_check_concurrent_requests(self, client):
        """Test multiple concurrent health check requests"""
        with patch('google.generativeai.GenerativeModel') as mock_model_class:
            mock_model = Mock()
            mock_response = Mock()
            mock_response.text = "OK"
            mock_model.generate_content.return_value = mock_response
            mock_model_class.return_value = mock_model
            
            # Make multiple concurrent health checks
            responses = []
            for _ in range(10):
                response = client.get("/health")
                responses.append(response)
            
            # All should succeed
            for response in responses:
                assert response.status_code == 200
                data = response.json()
                assert "status" in data


class TestRootEndpoint:
    """Test suite for root / endpoint"""
    
    def test_root_endpoint(self, client):
        """Test root endpoint returns service information"""
        response = client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "service" in data
        assert "version" in data
        assert "status" in data
        assert data["service"] == "Accentaura AI Microservice"
        assert data["status"] == "running"
    
    def test_root_endpoint_structure(self, client):
        """Test root endpoint response structure"""
        response = client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, dict)
        assert isinstance(data["service"], str)
        assert isinstance(data["version"], str)
        assert isinstance(data["status"], str)
