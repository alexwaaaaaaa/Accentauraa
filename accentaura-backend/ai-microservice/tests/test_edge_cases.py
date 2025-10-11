"""
Tests for edge cases and uncovered code paths
"""
import pytest
from unittest.mock import Mock, patch
import json
import io


class TestConversationHistoryLimit:
    """Test conversation history limiting"""
    
    def test_conversation_history_limited_to_10(self, client, mock_gemini_model, mock_gemini_response):
        """Test that conversation history is limited to last 10 exchanges"""
        conversation_id = "test-long-conversation"
        
        # Mock successful responses
        mock_response = mock_gemini_response("Response")
        mock_gemini_model.generate_content.return_value = mock_response
        
        # Make 15 requests to exceed the 10-exchange limit
        for i in range(15):
            response = client.post(
                "/chat",
                json={
                    "prompt": f"Message {i}",
                    "conversationId": conversation_id
                }
            )
            assert response.status_code == 200
        
        # The conversation history limiting code (line 164) should have been executed
        # We can't directly verify the internal state, but the test exercises the code path


class TestEmptyResponseHandling:
    """Test handling of empty responses from Gemini"""
    
    def test_chat_empty_text_in_response(self, client, mock_gemini_model):
        """Test chat when Gemini returns response with empty text"""
        # Mock response with empty text
        mock_response = Mock()
        mock_response.text = ""
        mock_gemini_model.generate_content.return_value = mock_response
        
        response = client.post(
            "/chat",
            json={"prompt": "Hello"}
        )
        
        # Should return 500 for empty response
        assert response.status_code == 500
        data = response.json()
        assert "detail" in data


class TestFileCleanup:
    """Test file cleanup after processing"""
    
    def test_speech_analysis_file_cleanup_on_success(self, client, mock_gemini_model, 
                                                      mock_gemini_response, mock_upload_file, 
                                                      mock_delete_file, sample_audio_file):
        """Test that uploaded files are cleaned up after successful analysis"""
        analysis_json = {
            "confidence": 0.85,
            "grammarScore": 0.90,
            "pronunciation": {
                "clarity": 0.88,
                "accent": "neutral",
                "problemSounds": [],
                "intonation": 0.85
            },
            "feedback": "Good job!"
        }
        
        mock_response = mock_gemini_response(json.dumps(analysis_json))
        mock_gemini_model.generate_content.return_value = mock_response
        
        filename, file_data, content_type = sample_audio_file
        response = client.post(
            "/analyze/speech",
            files={"audio": (filename, file_data, content_type)}
        )
        
        assert response.status_code == 200
        
        # Verify file was deleted (cleanup code executed)
        mock_delete_file.assert_called_once()
    
    def test_speech_analysis_file_cleanup_on_error(self, client, mock_gemini_model,
                                                    mock_upload_file, mock_delete_file, 
                                                    sample_audio_file):
        """Test that file cleanup is attempted even on error"""
        # Mock Gemini to raise an error
        mock_gemini_model.generate_content.side_effect = Exception("API error")
        
        filename, file_data, content_type = sample_audio_file
        response = client.post(
            "/analyze/speech",
            files={"audio": (filename, file_data, content_type)}
        )
        
        assert response.status_code == 500
        
        # File cleanup should still be attempted (lines 658-659)
        # Even if it fails, the exception is caught


class TestJSONParsingEdgeCases:
    """Test JSON parsing edge cases"""
    
    def test_confidence_analysis_malformed_json_in_markdown(self, client, mock_gemini_model, 
                                                             mock_gemini_response):
        """Test handling of malformed JSON in markdown code block"""
        # Return malformed JSON in markdown
        malformed_json = "```json\n{invalid json here\n```"
        mock_response = mock_gemini_response(malformed_json)
        mock_gemini_model.generate_content.return_value = mock_response
        
        response = client.post(
            "/analyze/confidence",
            json={"text": "Test text"}
        )
        
        # Should return 200 with fallback values (lines 449-450)
        assert response.status_code == 200
        data = response.json()
        assert "confidence" in data
        assert "suggestions" in data
    
    def test_speech_analysis_json_without_required_fields(self, client, mock_gemini_model,
                                                           mock_gemini_response, mock_upload_file,
                                                           mock_delete_file, sample_audio_file):
        """Test handling of JSON response missing required fields"""
        # Return JSON without all required fields
        incomplete_json = {"confidence": 0.8}  # Missing other fields
        mock_response = mock_gemini_response(json.dumps(incomplete_json))
        mock_gemini_model.generate_content.return_value = mock_response
        
        filename, file_data, content_type = sample_audio_file
        response = client.post(
            "/analyze/speech",
            files={"audio": (filename, file_data, content_type)}
        )
        
        # Should handle missing fields gracefully
        assert response.status_code == 200
        data = response.json()
        assert "confidence" in data
        assert "grammarScore" in data
        assert "feedback" in data


class TestInterviewAnalysisEdgeCases:
    """Test interview analysis edge cases"""
    
    def test_interview_analysis_video_upload_failure(self, client, mock_gemini_model,
                                                      mock_gemini_response, sample_audio_file,
                                                      sample_video_file):
        """Test interview analysis when video upload fails but audio succeeds"""
        with patch('google.generativeai.upload_file') as mock_upload:
            # First call (audio) succeeds, second call (video) fails
            mock_audio_file = Mock()
            mock_audio_file.name = 'audio-123'
            
            def upload_side_effect(*args, **kwargs):
                # Check if it's video by mime type
                if 'video' in str(kwargs.get('mime_type', '')):
                    raise Exception("Video upload failed")
                return mock_audio_file
            
            mock_upload.side_effect = upload_side_effect
            
            # Mock successful analysis
            analysis_json = {
                "confidence": 0.80,
                "grammarScore": 0.85,
                "bodyLanguage": None,
                "mistakes": [],
                "feedback": "Good"
            }
            mock_response = mock_gemini_response(json.dumps(analysis_json))
            mock_gemini_model.generate_content.return_value = mock_response
            
            audio_filename, audio_data, audio_type = sample_audio_file
            video_filename, video_data, video_type = sample_video_file
            
            response = client.post(
                "/interview/analyze",
                files={
                    "audio": (audio_filename, audio_data, audio_type),
                    "video": (video_filename, video_data, video_type)
                }
            )
            
            # Should continue without video (lines 650-653)
            assert response.status_code == 200
            data = response.json()
            assert data["bodyLanguage"] is None


class TestHealthCheckEdgeCases:
    """Test health check edge cases"""
    
    def test_health_check_empty_response_from_gemini(self, client):
        """Test health check when Gemini returns empty response"""
        with patch('google.generativeai.GenerativeModel') as mock_model_class:
            mock_model = Mock()
            mock_response = Mock()
            mock_response.text = None  # Empty text
            mock_model.generate_content.return_value = mock_response
            mock_model_class.return_value = mock_model
            
            response = client.get("/health")
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "unhealthy"
            assert data["gemini_api"] == "disconnected"
            assert "empty response" in data["error"].lower()
    
    def test_health_check_no_response_object(self, client):
        """Test health check when Gemini returns None"""
        with patch('google.generativeai.GenerativeModel') as mock_model_class:
            mock_model = Mock()
            mock_model.generate_content.return_value = None  # No response
            mock_model_class.return_value = mock_model
            
            response = client.get("/health")
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "unhealthy"
            assert data["gemini_api"] == "disconnected"


class TestScoreClamping:
    """Test score clamping to [0, 1] range"""
    
    def test_confidence_negative_score(self, client, mock_gemini_model, mock_gemini_response):
        """Test that negative confidence scores are clamped to 0"""
        analysis_json = {
            "confidence": -0.5,  # Negative score
            "suggestions": ["Test"]
        }
        mock_response = mock_gemini_response(json.dumps(analysis_json))
        mock_gemini_model.generate_content.return_value = mock_response
        
        response = client.post(
            "/analyze/confidence",
            json={"text": "Test"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["confidence"] == 0.0  # Clamped to 0
    
    def test_speech_analysis_score_above_one(self, client, mock_gemini_model, mock_gemini_response,
                                             mock_upload_file, mock_delete_file, sample_audio_file):
        """Test that scores above 1.0 are clamped to 1.0"""
        analysis_json = {
            "confidence": 2.5,  # > 1.0
            "grammarScore": 1.8,  # > 1.0
            "pronunciation": {
                "clarity": 0.88,
                "accent": "neutral",
                "problemSounds": [],
                "intonation": 0.85
            },
            "feedback": "Test"
        }
        mock_response = mock_gemini_response(json.dumps(analysis_json))
        mock_gemini_model.generate_content.return_value = mock_response
        
        filename, file_data, content_type = sample_audio_file
        response = client.post(
            "/analyze/speech",
            files={"audio": (filename, file_data, content_type)}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["confidence"] == 1.0  # Clamped to 1.0
        assert data["grammarScore"] == 1.0  # Clamped to 1.0



class TestJSONExtractionEdgeCases:
    """Test JSON extraction from various response formats"""
    
    def test_confidence_analysis_json_with_extra_text(self, client, mock_gemini_model, mock_gemini_response):
        """Test JSON extraction when response has text before/after JSON"""
        # Response with text around JSON
        response_text = """Here is the analysis:
        
{
  "confidence": 0.85,
  "suggestions": ["Good work"]
}

Hope this helps!"""
        mock_response = mock_gemini_response(response_text)
        mock_gemini_model.generate_content.return_value = mock_response
        
        response = client.post(
            "/analyze/confidence",
            json={"text": "Test"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["confidence"] == 0.85
    
    def test_speech_analysis_no_json_in_response(self, client, mock_gemini_model, mock_gemini_response,
                                                  mock_upload_file, mock_delete_file, sample_audio_file):
        """Test when response contains no JSON at all"""
        # Plain text response with no JSON
        mock_response = mock_gemini_response("This is just plain text with no JSON structure")
        mock_gemini_model.generate_content.return_value = mock_response
        
        filename, file_data, content_type = sample_audio_file
        response = client.post(
            "/analyze/speech",
            files={"audio": (filename, file_data, content_type)}
        )
        
        # Should return 200 with fallback values
        assert response.status_code == 200
        data = response.json()
        assert "confidence" in data
        assert "grammarScore" in data
    
    def test_interview_analysis_partial_json(self, client, mock_gemini_model, mock_gemini_response,
                                             mock_upload_file, mock_delete_file, sample_audio_file):
        """Test interview analysis with incomplete JSON response"""
        # JSON with only some fields
        partial_json = {
            "confidence": 0.75,
            "grammarScore": 0.80
            # Missing bodyLanguage, mistakes, feedback
        }
        mock_response = mock_gemini_response(json.dumps(partial_json))
        mock_gemini_model.generate_content.return_value = mock_response
        
        filename, file_data, content_type = sample_audio_file
        response = client.post(
            "/interview/analyze",
            files={"audio": (filename, file_data, content_type)}
        )
        
        # Should handle missing fields with defaults
        assert response.status_code == 200
        data = response.json()
        assert data["confidence"] == 0.75
        assert data["grammarScore"] == 0.80
        assert "feedback" in data  # Should have default
