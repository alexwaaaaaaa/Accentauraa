"""
Tests for confidence analysis endpoint with mocked Gemini API
"""
import pytest
from unittest.mock import Mock
import json


class TestConfidenceAnalysisEndpoint:
    """Test suite for /analyze/confidence endpoint"""
    
    def test_confidence_analysis_success(self, client, mock_gemini_model, mock_gemini_response):
        """Test successful confidence analysis"""
        analysis_json = {
            "confidence": 0.75,
            "suggestions": [
                "Replace 'I think' with more assertive language like 'I believe'",
                "Change passive voice to active voice to show ownership",
                "Remove hedging words like 'maybe' and 'perhaps'"
            ]
        }
        
        mock_response = mock_gemini_response(json.dumps(analysis_json))
        mock_gemini_model.generate_content.return_value = mock_response
        
        response = client.post(
            "/analyze/confidence",
            json={
                "text": "I think maybe we could possibly try this approach"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "confidence" in data
        assert "suggestions" in data
        assert 0.0 <= data["confidence"] <= 1.0
        assert isinstance(data["suggestions"], list)
        assert len(data["suggestions"]) > 0
    
    def test_confidence_analysis_with_markdown_json(self, client, mock_gemini_model, mock_gemini_response):
        """Test confidence analysis when response is in markdown code block"""
        analysis_json = {
            "confidence": 0.82,
            "suggestions": [
                "Use more direct language",
                "Avoid filler words",
                "Be more specific"
            ]
        }
        
        markdown_response = f"```json\n{json.dumps(analysis_json)}\n```"
        mock_response = mock_gemini_response(markdown_response)
        mock_gemini_model.generate_content.return_value = mock_response
        
        response = client.post(
            "/analyze/confidence",
            json={
                "text": "I will complete this project by Friday"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["confidence"] == 0.82
        assert len(data["suggestions"]) == 3
    
    def test_confidence_analysis_missing_text(self, client):
        """Test confidence analysis without text"""
        response = client.post(
            "/analyze/confidence",
            json={}
        )
        
        assert response.status_code == 422  # Validation error
    
    def test_confidence_analysis_empty_text(self, client):
        """Test confidence analysis with empty text"""
        response = client.post(
            "/analyze/confidence",
            json={
                "text": ""
            }
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "empty" in data["detail"].lower()
    
    def test_confidence_analysis_whitespace_only(self, client):
        """Test confidence analysis with whitespace-only text"""
        response = client.post(
            "/analyze/confidence",
            json={
                "text": "   \n\t  "
            }
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
    
    def test_confidence_analysis_text_too_long(self, client):
        """Test confidence analysis with text exceeding length limit"""
        long_text = "word " * 2000  # Over 5000 characters
        
        response = client.post(
            "/analyze/confidence",
            json={
                "text": long_text
            }
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "long" in data["detail"].lower() or "length" in data["detail"].lower()
    
    def test_confidence_analysis_gemini_api_error(self, client, mock_gemini_model):
        """Test confidence analysis when Gemini API fails"""
        mock_gemini_model.generate_content.side_effect = Exception("Gemini API error")
        
        response = client.post(
            "/analyze/confidence",
            json={
                "text": "This is a test"
            }
        )
        
        assert response.status_code == 500
        data = response.json()
        assert "detail" in data
    
    def test_confidence_analysis_invalid_json_response(self, client, mock_gemini_model, mock_gemini_response):
        """Test confidence analysis with invalid JSON from Gemini"""
        mock_response = mock_gemini_response("This is not valid JSON")
        mock_gemini_model.generate_content.return_value = mock_response
        
        response = client.post(
            "/analyze/confidence",
            json={
                "text": "Test text"
            }
        )
        
        # Should return 200 with fallback values
        assert response.status_code == 200
        data = response.json()
        assert "confidence" in data
        assert "suggestions" in data
        assert isinstance(data["suggestions"], list)
    
    def test_confidence_analysis_score_clamping(self, client, mock_gemini_model, mock_gemini_response):
        """Test that confidence scores are clamped to [0, 1]"""
        analysis_json = {
            "confidence": 1.8,  # > 1.0
            "suggestions": ["Test suggestion"]
        }
        
        mock_response = mock_gemini_response(json.dumps(analysis_json))
        mock_gemini_model.generate_content.return_value = mock_response
        
        response = client.post(
            "/analyze/confidence",
            json={
                "text": "I am absolutely certain about this"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert 0.0 <= data["confidence"] <= 1.0
    
    def test_confidence_analysis_high_confidence_text(self, client, mock_gemini_model, mock_gemini_response):
        """Test analysis of high-confidence text"""
        analysis_json = {
            "confidence": 0.95,
            "suggestions": [
                "Excellent use of assertive language",
                "Strong, direct statements",
                "No hedging detected"
            ]
        }
        
        mock_response = mock_gemini_response(json.dumps(analysis_json))
        mock_gemini_model.generate_content.return_value = mock_response
        
        response = client.post(
            "/analyze/confidence",
            json={
                "text": "I will deliver this project on time. I have the skills and resources needed."
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["confidence"] >= 0.9
    
    def test_confidence_analysis_low_confidence_text(self, client, mock_gemini_model, mock_gemini_response):
        """Test analysis of low-confidence text"""
        analysis_json = {
            "confidence": 0.35,
            "suggestions": [
                "Remove 'I think' and 'maybe' - be more definitive",
                "Replace 'might' with 'will' to show commitment",
                "Avoid starting sentences with 'I'm not sure but'"
            ]
        }
        
        mock_response = mock_gemini_response(json.dumps(analysis_json))
        mock_gemini_model.generate_content.return_value = mock_response
        
        response = client.post(
            "/analyze/confidence",
            json={
                "text": "I think maybe we might possibly consider this, but I'm not sure"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["confidence"] < 0.5
    
    def test_confidence_analysis_special_characters(self, client, mock_gemini_model, mock_gemini_response):
        """Test confidence analysis with special characters"""
        analysis_json = {
            "confidence": 0.80,
            "suggestions": ["Good use of punctuation", "Clear communication"]
        }
        
        mock_response = mock_gemini_response(json.dumps(analysis_json))
        mock_gemini_model.generate_content.return_value = mock_response
        
        response = client.post(
            "/analyze/confidence",
            json={
                "text": "Hello! I'm ready to start. Let's do this! 🚀"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "confidence" in data
    
    def test_confidence_analysis_response_structure(self, client, mock_gemini_model, mock_gemini_response):
        """Test that response has correct structure"""
        analysis_json = {
            "confidence": 0.75,
            "suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"]
        }
        
        mock_response = mock_gemini_response(json.dumps(analysis_json))
        mock_gemini_model.generate_content.return_value = mock_response
        
        response = client.post(
            "/analyze/confidence",
            json={
                "text": "Test text for analysis"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert isinstance(data, dict)
        assert "confidence" in data
        assert "suggestions" in data
        assert isinstance(data["confidence"], (int, float))
        assert isinstance(data["suggestions"], list)
        
        # Verify suggestions are strings
        for suggestion in data["suggestions"]:
            assert isinstance(suggestion, str)
    
    def test_confidence_analysis_too_many_suggestions(self, client, mock_gemini_model, mock_gemini_response):
        """Test that excessive suggestions are limited"""
        # Create response with many suggestions
        suggestions = [f"Suggestion {i}" for i in range(20)]
        analysis_json = {
            "confidence": 0.70,
            "suggestions": suggestions
        }
        
        mock_response = mock_gemini_response(json.dumps(analysis_json))
        mock_gemini_model.generate_content.return_value = mock_response
        
        response = client.post(
            "/analyze/confidence",
            json={
                "text": "Test text"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should be limited to 10 suggestions
        assert len(data["suggestions"]) <= 10
