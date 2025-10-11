"""
Tests for speech analysis endpoint with mocked Gemini API
"""
import pytest
from unittest.mock import Mock, patch
import json
import io


class TestSpeechAnalysisEndpoint:
    """Test suite for /analyze/speech endpoint"""
    
    def test_speech_analysis_success(self, client, mock_gemini_model, mock_gemini_response, 
                                     mock_upload_file, mock_delete_file, sample_audio_file):
        """Test successful speech analysis"""
        # Mock Gemini response with JSON
        analysis_json = {
            "transcription": "Hello, my name is John and I am practicing English",
            "confidence": 0.85,
            "grammarScore": 0.90,
            "pronunciation": {
                "clarity": 0.88,
                "accent": "neutral",
                "problemSounds": ["th"],
                "intonation": 0.85
            },
            "feedback": "Your speech is clear and confident. Focus on: 1) Pronounce 'th' sounds more distinctly. 2) Maintain consistent volume throughout."
        }
        
        mock_response = mock_gemini_response(json.dumps(analysis_json))
        mock_gemini_model.generate_content.return_value = mock_response
        
        # Make request
        filename, file_data, content_type = sample_audio_file
        response = client.post(
            "/analyze/speech",
            files={"audio": (filename, file_data, content_type)}
        )
        
        # Assertions
        assert response.status_code == 200
        data = response.json()
        
        assert "confidence" in data
        assert "grammarScore" in data
        assert "feedback" in data
        assert "pronunciation" in data
        
        assert 0.0 <= data["confidence"] <= 1.0
        assert 0.0 <= data["grammarScore"] <= 1.0
        assert isinstance(data["feedback"], str)
        assert isinstance(data["pronunciation"], dict)
        
        # Verify file was uploaded and deleted
        mock_upload_file.assert_called_once()
        mock_delete_file.assert_called_once()
    
    def test_speech_analysis_with_json_in_markdown(self, client, mock_gemini_model, mock_gemini_response,
                                                    mock_upload_file, mock_delete_file, sample_audio_file):
        """Test speech analysis when Gemini returns JSON in markdown code block"""
        analysis_json = {
            "confidence": 0.75,
            "grammarScore": 0.80,
            "pronunciation": {
                "clarity": 0.78,
                "accent": "slight accent",
                "problemSounds": ["r", "l"],
                "intonation": 0.75
            },
            "feedback": "Good effort! Work on 'r' and 'l' sounds."
        }
        
        # Wrap JSON in markdown code block
        markdown_response = f"```json\n{json.dumps(analysis_json)}\n```"
        mock_response = mock_gemini_response(markdown_response)
        mock_gemini_model.generate_content.return_value = mock_response
        
        filename, file_data, content_type = sample_audio_file
        response = client.post(
            "/analyze/speech",
            files={"audio": (filename, file_data, content_type)}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["confidence"] == 0.75
        assert data["grammarScore"] == 0.80
    
    def test_speech_analysis_missing_audio_file(self, client):
        """Test speech analysis without audio file"""
        response = client.post("/analyze/speech")
        
        assert response.status_code == 422  # Validation error
    
    def test_speech_analysis_invalid_file_type(self, client):
        """Test speech analysis with invalid file type"""
        # Create a text file instead of audio
        text_file = io.BytesIO(b"This is not an audio file")
        
        response = client.post(
            "/analyze/speech",
            files={"audio": ("test.txt", text_file, "text/plain")}
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "invalid" in data["detail"].lower() or "supported" in data["detail"].lower()
    
    def test_speech_analysis_file_too_large(self, client, large_audio_file):
        """Test speech analysis with file exceeding size limit"""
        filename, file_data, content_type = large_audio_file
        
        response = client.post(
            "/analyze/speech",
            files={"audio": (filename, file_data, content_type)}
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "large" in data["detail"].lower() or "size" in data["detail"].lower()
    
    def test_speech_analysis_gemini_upload_error(self, client, mock_gemini_model, sample_audio_file):
        """Test speech analysis when Gemini file upload fails"""
        with patch('google.generativeai.upload_file') as mock_upload:
            mock_upload.side_effect = Exception("Upload failed")
            
            filename, file_data, content_type = sample_audio_file
            response = client.post(
                "/analyze/speech",
                files={"audio": (filename, file_data, content_type)}
            )
            
            assert response.status_code == 500
            data = response.json()
            assert "detail" in data
    
    def test_speech_analysis_gemini_api_error(self, client, mock_gemini_model, mock_upload_file, 
                                              mock_delete_file, sample_audio_file):
        """Test speech analysis when Gemini API returns error"""
        mock_gemini_model.generate_content.side_effect = Exception("Gemini API error")
        
        filename, file_data, content_type = sample_audio_file
        response = client.post(
            "/analyze/speech",
            files={"audio": (filename, file_data, content_type)}
        )
        
        assert response.status_code == 500
        data = response.json()
        assert "detail" in data
    
    def test_speech_analysis_invalid_json_response(self, client, mock_gemini_model, mock_gemini_response,
                                                    mock_upload_file, mock_delete_file, sample_audio_file):
        """Test speech analysis when Gemini returns invalid JSON"""
        # Mock Gemini to return non-JSON response
        mock_response = mock_gemini_response("This is not valid JSON")
        mock_gemini_model.generate_content.return_value = mock_response
        
        filename, file_data, content_type = sample_audio_file
        response = client.post(
            "/analyze/speech",
            files={"audio": (filename, file_data, content_type)}
        )
        
        # Should still return 200 with fallback values
        assert response.status_code == 200
        data = response.json()
        assert "confidence" in data
        assert "grammarScore" in data
        assert "feedback" in data
    
    def test_speech_analysis_scores_clamped(self, client, mock_gemini_model, mock_gemini_response,
                                            mock_upload_file, mock_delete_file, sample_audio_file):
        """Test that scores outside [0, 1] range are clamped"""
        # Mock response with out-of-range scores
        analysis_json = {
            "confidence": 1.5,  # > 1.0
            "grammarScore": -0.2,  # < 0.0
            "pronunciation": {
                "clarity": 0.88,
                "accent": "neutral",
                "problemSounds": [],
                "intonation": 0.85
            },
            "feedback": "Test feedback"
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
        
        # Scores should be clamped to [0, 1]
        assert 0.0 <= data["confidence"] <= 1.0
        assert 0.0 <= data["grammarScore"] <= 1.0
    
    def test_speech_analysis_supported_audio_formats(self, client, mock_gemini_model, mock_gemini_response,
                                                      mock_upload_file, mock_delete_file):
        """Test that various audio formats are supported"""
        analysis_json = {
            "confidence": 0.85,
            "grammarScore": 0.90,
            "pronunciation": {"clarity": 0.88, "accent": "neutral", "problemSounds": [], "intonation": 0.85},
            "feedback": "Good job!"
        }
        mock_response = mock_gemini_response(json.dumps(analysis_json))
        mock_gemini_model.generate_content.return_value = mock_response
        
        supported_formats = [
            ("test.wav", "audio/wav"),
            ("test.mp3", "audio/mpeg"),
            ("test.m4a", "audio/m4a"),
            ("test.ogg", "audio/ogg"),
            ("test.flac", "audio/flac"),
        ]
        
        for filename, content_type in supported_formats:
            file_data = io.BytesIO(b'\x00' * 100)
            response = client.post(
                "/analyze/speech",
                files={"audio": (filename, file_data, content_type)}
            )
            
            assert response.status_code == 200, f"Failed for {content_type}"
    
    def test_speech_analysis_response_structure(self, client, mock_gemini_model, mock_gemini_response,
                                                mock_upload_file, mock_delete_file, sample_audio_file):
        """Test that response has correct structure"""
        analysis_json = {
            "confidence": 0.85,
            "grammarScore": 0.90,
            "pronunciation": {
                "clarity": 0.88,
                "accent": "neutral",
                "problemSounds": ["th"],
                "intonation": 0.85
            },
            "feedback": "Great work!"
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
        
        # Verify all required fields
        assert "confidence" in data
        assert "grammarScore" in data
        assert "feedback" in data
        assert "pronunciation" in data
        
        # Verify types
        assert isinstance(data["confidence"], (int, float))
        assert isinstance(data["grammarScore"], (int, float))
        assert isinstance(data["feedback"], str)
        assert isinstance(data["pronunciation"], dict)
