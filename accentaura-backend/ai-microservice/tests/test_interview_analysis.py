"""
Tests for interview analysis endpoint with mocked Gemini API
"""
import pytest
from unittest.mock import Mock, patch
import json
import io


class TestInterviewAnalysisEndpoint:
    """Test suite for /interview/analyze endpoint"""
    
    def test_interview_analysis_audio_only(self, client, mock_gemini_model, mock_gemini_response,
                                          mock_upload_file, mock_delete_file, sample_audio_file):
        """Test successful interview analysis with audio only"""
        analysis_json = {
            "transcription": "I have five years of experience in software development",
            "confidence": 0.82,
            "grammarScore": 0.88,
            "bodyLanguage": None,
            "mistakes": [
                "Used 'um' 3 times - practice pausing silently",
                "Grammar: Said 'I was went' instead of 'I went'"
            ],
            "feedback": "Good overall performance. Your responses were clear and well-structured."
        }
        
        mock_response = mock_gemini_response(json.dumps(analysis_json))
        mock_gemini_model.generate_content.return_value = mock_response
        
        filename, file_data, content_type = sample_audio_file
        response = client.post(
            "/interview/analyze",
            files={"audio": (filename, file_data, content_type)}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "confidence" in data
        assert "grammarScore" in data
        assert "feedback" in data
        assert "mistakes" in data
        assert "bodyLanguage" in data
        
        assert 0.0 <= data["confidence"] <= 1.0
        assert 0.0 <= data["grammarScore"] <= 1.0
        assert data["bodyLanguage"] is None  # No video provided
        
        mock_upload_file.assert_called_once()
    
    def test_interview_analysis_audio_and_video(self, client, mock_gemini_model, mock_gemini_response,
                                               mock_upload_file, mock_delete_file, 
                                               sample_audio_file, sample_video_file):
        """Test interview analysis with both audio and video"""
        analysis_json = {
            "transcription": "I am passionate about this role",
            "confidence": 0.85,
            "grammarScore": 0.90,
            "bodyLanguage": {
                "eyeContact": 0.85,
                "posture": 0.90,
                "gestures": 0.80,
                "facialExpressions": 0.85,
                "nervousHabits": 0.75,
                "overallPresence": 0.83
            },
            "mistakes": [
                "Avoided eye contact during first question",
                "Fidgeted with hands occasionally"
            ],
            "feedback": "Excellent interview performance with strong body language and clear communication."
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
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["bodyLanguage"] is not None
        assert isinstance(data["bodyLanguage"], dict)
        assert "eyeContact" in data["bodyLanguage"]
        assert "posture" in data["bodyLanguage"]
        
        # Should upload both files
        assert mock_upload_file.call_count == 2
    
    def test_interview_analysis_with_questions(self, client, mock_gemini_model, mock_gemini_response,
                                              mock_upload_file, mock_delete_file, sample_audio_file):
        """Test interview analysis with provided questions"""
        questions = [
            "Tell me about yourself",
            "What are your strengths?",
            "Why do you want this job?"
        ]
        
        analysis_json = {
            "confidence": 0.80,
            "grammarScore": 0.85,
            "bodyLanguage": None,
            "mistakes": ["Incomplete answer to question 2"],
            "feedback": "Good responses overall. Provide more specific examples."
        }
        
        mock_response = mock_gemini_response(json.dumps(analysis_json))
        mock_gemini_model.generate_content.return_value = mock_response
        
        filename, file_data, content_type = sample_audio_file
        response = client.post(
            "/interview/analyze",
            files={"audio": (filename, file_data, content_type)},
            data={"questions": json.dumps(questions)}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "confidence" in data
    
    def test_interview_analysis_missing_audio(self, client):
        """Test interview analysis without audio file"""
        response = client.post("/interview/analyze")
        
        assert response.status_code == 422  # Validation error
    
    def test_interview_analysis_invalid_audio_type(self, client):
        """Test interview analysis with invalid audio file type"""
        text_file = io.BytesIO(b"Not an audio file")
        
        response = client.post(
            "/interview/analyze",
            files={"audio": ("test.txt", text_file, "text/plain")}
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "invalid" in data["detail"].lower() or "supported" in data["detail"].lower()
    
    def test_interview_analysis_invalid_video_type(self, client, sample_audio_file):
        """Test interview analysis with invalid video file type"""
        filename, file_data, content_type = sample_audio_file
        text_file = io.BytesIO(b"Not a video file")
        
        response = client.post(
            "/interview/analyze",
            files={
                "audio": (filename, file_data, content_type),
                "video": ("test.txt", text_file, "text/plain")
            }
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "video" in data["detail"].lower()
    
    def test_interview_analysis_audio_too_large(self, client, large_audio_file):
        """Test interview analysis with audio file exceeding size limit"""
        filename, file_data, content_type = large_audio_file
        
        response = client.post(
            "/interview/analyze",
            files={"audio": (filename, file_data, content_type)}
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "large" in data["detail"].lower()
    
    def test_interview_analysis_video_too_large(self, client, sample_audio_file, large_video_file):
        """Test interview analysis with video file exceeding size limit"""
        audio_filename, audio_data, audio_type = sample_audio_file
        video_filename, video_data, video_type = large_video_file
        
        response = client.post(
            "/interview/analyze",
            files={
                "audio": (audio_filename, audio_data, audio_type),
                "video": (video_filename, video_data, video_type)
            }
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "large" in data["detail"].lower()
    
    def test_interview_analysis_gemini_upload_error(self, client, sample_audio_file):
        """Test interview analysis when file upload fails"""
        with patch('google.generativeai.upload_file') as mock_upload:
            mock_upload.side_effect = Exception("Upload failed")
            
            filename, file_data, content_type = sample_audio_file
            response = client.post(
                "/interview/analyze",
                files={"audio": (filename, file_data, content_type)}
            )
            
            assert response.status_code == 500
            data = response.json()
            assert "detail" in data
    
    def test_interview_analysis_gemini_api_error(self, client, mock_gemini_model, 
                                                mock_upload_file, mock_delete_file, sample_audio_file):
        """Test interview analysis when Gemini API fails"""
        mock_gemini_model.generate_content.side_effect = Exception("Gemini API error")
        
        filename, file_data, content_type = sample_audio_file
        response = client.post(
            "/interview/analyze",
            files={"audio": (filename, file_data, content_type)}
        )
        
        assert response.status_code == 500
        data = response.json()
        assert "detail" in data
    
    def test_interview_analysis_invalid_json_response(self, client, mock_gemini_model, mock_gemini_response,
                                                      mock_upload_file, mock_delete_file, sample_audio_file):
        """Test interview analysis with invalid JSON from Gemini"""
        mock_response = mock_gemini_response("This is not valid JSON")
        mock_gemini_model.generate_content.return_value = mock_response
        
        filename, file_data, content_type = sample_audio_file
        response = client.post(
            "/interview/analyze",
            files={"audio": (filename, file_data, content_type)}
        )
        
        # Should return 200 with fallback values
        assert response.status_code == 200
        data = response.json()
        assert "confidence" in data
        assert "grammarScore" in data
    
    def test_interview_analysis_scores_clamped(self, client, mock_gemini_model, mock_gemini_response,
                                              mock_upload_file, mock_delete_file, sample_audio_file):
        """Test that scores are clamped to [0, 1] range"""
        analysis_json = {
            "confidence": 1.5,  # > 1.0
            "grammarScore": -0.3,  # < 0.0
            "bodyLanguage": None,
            "mistakes": [],
            "feedback": "Test"
        }
        
        mock_response = mock_gemini_response(json.dumps(analysis_json))
        mock_gemini_model.generate_content.return_value = mock_response
        
        filename, file_data, content_type = sample_audio_file
        response = client.post(
            "/interview/analyze",
            files={"audio": (filename, file_data, content_type)}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert 0.0 <= data["confidence"] <= 1.0
        assert 0.0 <= data["grammarScore"] <= 1.0
    
    def test_interview_analysis_with_markdown_json(self, client, mock_gemini_model, mock_gemini_response,
                                                   mock_upload_file, mock_delete_file, sample_audio_file):
        """Test interview analysis when response is in markdown code block"""
        analysis_json = {
            "confidence": 0.78,
            "grammarScore": 0.82,
            "bodyLanguage": None,
            "mistakes": ["Test mistake"],
            "feedback": "Good job!"
        }
        
        markdown_response = f"```json\n{json.dumps(analysis_json)}\n```"
        mock_response = mock_gemini_response(markdown_response)
        mock_gemini_model.generate_content.return_value = mock_response
        
        filename, file_data, content_type = sample_audio_file
        response = client.post(
            "/interview/analyze",
            files={"audio": (filename, file_data, content_type)}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["confidence"] == 0.78
        assert data["grammarScore"] == 0.82
    
    def test_interview_analysis_invalid_questions_format(self, client, mock_gemini_model, mock_gemini_response,
                                                        mock_upload_file, mock_delete_file, sample_audio_file):
        """Test interview analysis with invalid questions format"""
        analysis_json = {
            "confidence": 0.80,
            "grammarScore": 0.85,
            "bodyLanguage": None,
            "mistakes": [],
            "feedback": "Good"
        }
        
        mock_response = mock_gemini_response(json.dumps(analysis_json))
        mock_gemini_model.generate_content.return_value = mock_response
        
        filename, file_data, content_type = sample_audio_file
        
        # Invalid JSON for questions
        response = client.post(
            "/interview/analyze",
            files={"audio": (filename, file_data, content_type)},
            data={"questions": "not valid json"}
        )
        
        # Should still process without questions
        assert response.status_code == 200
    
    def test_interview_analysis_response_structure(self, client, mock_gemini_model, mock_gemini_response,
                                                   mock_upload_file, mock_delete_file, sample_audio_file):
        """Test that response has correct structure"""
        analysis_json = {
            "confidence": 0.85,
            "grammarScore": 0.90,
            "bodyLanguage": None,
            "mistakes": ["Mistake 1", "Mistake 2"],
            "feedback": "Excellent performance"
        }
        
        mock_response = mock_gemini_response(json.dumps(analysis_json))
        mock_gemini_model.generate_content.return_value = mock_response
        
        filename, file_data, content_type = sample_audio_file
        response = client.post(
            "/interview/analyze",
            files={"audio": (filename, file_data, content_type)}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert isinstance(data, dict)
        assert "confidence" in data
        assert "grammarScore" in data
        assert "bodyLanguage" in data
        assert "feedback" in data
        assert "mistakes" in data
        
        # Verify types
        assert isinstance(data["confidence"], (int, float))
        assert isinstance(data["grammarScore"], (int, float))
        assert isinstance(data["feedback"], str)
        assert isinstance(data["mistakes"], (list, type(None)))
        
        if data["mistakes"] is not None:
            for mistake in data["mistakes"]:
                assert isinstance(mistake, str)
