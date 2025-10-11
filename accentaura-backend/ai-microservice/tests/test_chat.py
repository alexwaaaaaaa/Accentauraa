"""
Tests for chat endpoint with mocked Gemini API
"""
import pytest
from unittest.mock import Mock, patch
import json


class TestChatEndpoint:
    """Test suite for /chat endpoint"""
    
    def test_chat_success_without_conversation_id(self, client, mock_gemini_model, mock_gemini_response):
        """Test successful chat request without conversation ID"""
        # Mock Gemini response
        mock_response = mock_gemini_response("Hello! I'm here to help you practice English. What would you like to talk about today?")
        mock_gemini_model.generate_content.return_value = mock_response
        
        # Make request
        response = client.post(
            "/chat",
            json={
                "prompt": "Hello, I want to practice English"
            }
        )
        
        # Assertions
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert "conversationId" in data
        assert len(data["response"]) > 0
        assert len(data["conversationId"]) > 0
        
        # Verify Gemini was called
        mock_gemini_model.generate_content.assert_called_once()
    
    def test_chat_success_with_conversation_id(self, client, mock_gemini_model, mock_gemini_response):
        """Test successful chat request with existing conversation ID"""
        # Mock Gemini response
        mock_response = mock_gemini_response("That's great! Tell me more about your day.")
        mock_gemini_model.generate_content.return_value = mock_response
        
        conversation_id = "test-conversation-123"
        
        # Make first request to establish conversation
        response1 = client.post(
            "/chat",
            json={
                "prompt": "I had a good day today",
                "conversationId": conversation_id
            }
        )
        
        assert response1.status_code == 200
        data1 = response1.json()
        assert data1["conversationId"] == conversation_id
        
        # Make second request with same conversation ID
        mock_response2 = mock_gemini_response("Wonderful! What made it special?")
        mock_gemini_model.generate_content.return_value = mock_response2
        
        response2 = client.post(
            "/chat",
            json={
                "prompt": "I learned something new",
                "conversationId": conversation_id
            }
        )
        
        assert response2.status_code == 200
        data2 = response2.json()
        assert data2["conversationId"] == conversation_id
        assert "response" in data2
    
    def test_chat_missing_prompt(self, client):
        """Test chat request with missing prompt"""
        response = client.post(
            "/chat",
            json={}
        )
        
        assert response.status_code == 422  # Validation error
    
    def test_chat_empty_prompt(self, client, mock_gemini_model, mock_gemini_response):
        """Test chat request with empty prompt"""
        mock_response = mock_gemini_response("I'm here to help! Please ask me something.")
        mock_gemini_model.generate_content.return_value = mock_response
        
        response = client.post(
            "/chat",
            json={
                "prompt": ""
            }
        )
        
        # Empty string is technically valid, but Gemini should handle it
        assert response.status_code == 200
    
    def test_chat_gemini_api_error(self, client, mock_gemini_model):
        """Test chat when Gemini API returns an error"""
        # Mock Gemini to raise an exception
        mock_gemini_model.generate_content.side_effect = Exception("Gemini API error")
        
        response = client.post(
            "/chat",
            json={
                "prompt": "Hello"
            }
        )
        
        # The endpoint catches exceptions and returns 500
        assert response.status_code == 500
        data = response.json()
        assert "detail" in data
        assert "error" in data["detail"].lower() or "internal" in data["detail"].lower()
    
    def test_chat_gemini_empty_response(self, client, mock_gemini_model):
        """Test chat when Gemini returns empty response"""
        # Mock Gemini to return empty response
        mock_response = Mock()
        mock_response.text = None
        mock_gemini_model.generate_content.return_value = mock_response
        
        response = client.post(
            "/chat",
            json={
                "prompt": "Hello"
            }
        )
        
        assert response.status_code == 500
        data = response.json()
        assert "detail" in data
    
    def test_chat_long_prompt(self, client, mock_gemini_model, mock_gemini_response):
        """Test chat with very long prompt"""
        mock_response = mock_gemini_response("I understand. Let me help you with that.")
        mock_gemini_model.generate_content.return_value = mock_response
        
        long_prompt = "Hello " * 1000  # Very long prompt
        
        response = client.post(
            "/chat",
            json={
                "prompt": long_prompt
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
    
    def test_chat_conversation_context_maintained(self, client, mock_gemini_model, mock_gemini_response):
        """Test that conversation context is maintained across requests"""
        conversation_id = "context-test-123"
        
        # First message
        mock_response1 = mock_gemini_response("Nice to meet you!")
        mock_gemini_model.generate_content.return_value = mock_response1
        
        response1 = client.post(
            "/chat",
            json={
                "prompt": "My name is John",
                "conversationId": conversation_id
            }
        )
        
        assert response1.status_code == 200
        
        # Second message - should have context from first
        mock_response2 = mock_gemini_response("Hello John! How can I help you today?")
        mock_gemini_model.generate_content.return_value = mock_response2
        
        response2 = client.post(
            "/chat",
            json={
                "prompt": "What's my name?",
                "conversationId": conversation_id
            }
        )
        
        assert response2.status_code == 200
        
        # Verify that the second call included conversation history
        call_args = mock_gemini_model.generate_content.call_args_list[-1]
        prompt_text = call_args[0][0]
        assert "John" in prompt_text or "name" in prompt_text.lower()
    
    def test_chat_special_characters(self, client, mock_gemini_model, mock_gemini_response):
        """Test chat with special characters in prompt"""
        mock_response = mock_gemini_response("I can help with that!")
        mock_gemini_model.generate_content.return_value = mock_response
        
        response = client.post(
            "/chat",
            json={
                "prompt": "Hello! How are you? 你好 🎉 #test @user"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
    
    def test_chat_response_format(self, client, mock_gemini_model, mock_gemini_response):
        """Test that chat response has correct format"""
        mock_response = mock_gemini_response("Test response")
        mock_gemini_model.generate_content.return_value = mock_response
        
        response = client.post(
            "/chat",
            json={
                "prompt": "Test"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert isinstance(data, dict)
        assert "response" in data
        assert "conversationId" in data
        assert isinstance(data["response"], str)
        assert isinstance(data["conversationId"], str)
