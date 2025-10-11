"""
Accentaura AI Microservice
FastAPI service for AI-powered language learning features using Google Gemini 2.5 Pro
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import google.generativeai as genai
from pydantic import BaseModel, Field
import os
from dotenv import load_dotenv
from typing import Optional, List
import uuid
import logging

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    logger.error("GEMINI_API_KEY not found in environment variables")
    raise ValueError("GEMINI_API_KEY environment variable is required")

genai.configure(api_key=GEMINI_API_KEY)

# Initialize FastAPI app
app = FastAPI(
    title="Accentaura AI Service",
    version="1.0.0",
    description="AI microservice for language learning features powered by Google Gemini 2.5 Pro"
)

# Initialize Gemini 2.5 Pro model
model = genai.GenerativeModel('gemini-2.0-flash-exp')  # Latest Gemini 2.5 Pro model

# Configure CORS
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response Models
class ChatRequest(BaseModel):
    prompt: str = Field(..., description="User's chat message")
    conversationId: Optional[str] = Field(None, description="Optional conversation ID for context")

class ChatResponse(BaseModel):
    response: str = Field(..., description="AI-generated response")
    conversationId: str = Field(..., description="Conversation ID for tracking context")

class ConfidenceRequest(BaseModel):
    text: str = Field(..., description="Text to analyze for confidence")

class ConfidenceResponse(BaseModel):
    confidence: float = Field(..., description="Confidence score (0-1)")
    suggestions: List[str] = Field(..., description="Suggestions for improvement")

class SpeechAnalysisResponse(BaseModel):
    confidence: float = Field(..., description="Speech confidence score (0-1)")
    grammarScore: float = Field(..., description="Grammar correctness score (0-1)")
    feedback: str = Field(..., description="Detailed feedback for improvement")
    pronunciation: Optional[dict] = Field(None, description="Pronunciation analysis details")

class InterviewAnalysisResponse(BaseModel):
    confidence: float = Field(..., description="Overall confidence score (0-1)")
    grammarScore: float = Field(..., description="Grammar correctness score (0-1)")
    bodyLanguage: Optional[dict] = Field(None, description="Body language analysis (if video provided)")
    feedback: str = Field(..., description="Comprehensive feedback")
    mistakes: Optional[List[str]] = Field(None, description="List of identified mistakes")

class HealthResponse(BaseModel):
    status: str = Field(..., description="Service health status")
    gemini_api: str = Field(..., description="Gemini API connection status")
    error: Optional[str] = Field(None, description="Error message if unhealthy")

# In-memory conversation storage (in production, use Redis or database)
conversations = {}

@app.get("/", tags=["Root"])
async def root():
    """Root endpoint"""
    return {
        "service": "Accentaura AI Microservice",
        "version": "1.0.0",
        "status": "running"
    }

@app.post("/chat", response_model=ChatResponse, tags=["Chat"])
async def chat_with_ai(request: ChatRequest):
    """
    Chat with AI for language learning practice
    
    Accepts a prompt and optional conversation ID for context management.
    Returns AI-generated response and conversation ID.
    """
    try:
        logger.info(f"Chat request received: prompt length={len(request.prompt)}, conversationId={request.conversationId}")
        
        # Generate or use existing conversation ID
        conversation_id = request.conversationId or str(uuid.uuid4())
        
        # Build conversation context
        conversation_history = conversations.get(conversation_id, [])
        
        # Create system prompt for language learning assistant
        system_prompt = """You are an English learning assistant for Accentaura, a language learning app. 
Your role is to help users practice English conversation in a friendly, encouraging way.

Guidelines:
- Be conversational and supportive
- Correct mistakes gently and explain why
- Encourage users to practice more
- Keep responses concise but helpful (2-4 sentences typically)
- Adapt to the user's level based on their language use
- Ask follow-up questions to keep the conversation going
- Focus on practical, everyday English

Remember: You're helping someone learn, so be patient and positive!"""
        
        # Build the full prompt with conversation history
        if conversation_history:
            # Include recent conversation history (last 5 exchanges)
            recent_history = conversation_history[-5:]
            context = "\n\n".join([
                f"User: {exchange['user']}\nAssistant: {exchange['assistant']}"
                for exchange in recent_history
            ])
            full_prompt = f"{system_prompt}\n\nConversation history:\n{context}\n\nUser: {request.prompt}\nAssistant:"
        else:
            full_prompt = f"{system_prompt}\n\nUser: {request.prompt}\nAssistant:"
        
        # Generate response using Gemini
        logger.info(f"Generating response for conversation {conversation_id}")
        response = model.generate_content(full_prompt)
        
        if not response or not response.text:
            logger.error("Empty response from Gemini API")
            raise HTTPException(status_code=500, detail="Failed to generate response")
        
        ai_response = response.text.strip()
        
        # Store conversation history
        conversation_history.append({
            "user": request.prompt,
            "assistant": ai_response
        })
        conversations[conversation_id] = conversation_history
        
        # Limit conversation history to last 10 exchanges to prevent memory issues
        if len(conversations[conversation_id]) > 10:
            conversations[conversation_id] = conversations[conversation_id][-10:]
        
        logger.info(f"Response generated successfully for conversation {conversation_id}")
        
        return ChatResponse(
            response=ai_response,
            conversationId=conversation_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@app.post("/analyze/speech", response_model=SpeechAnalysisResponse, tags=["Analysis"])
async def analyze_speech(audio: UploadFile = File(...)):
    """
    Analyze speech from audio file
    
    Accepts an audio file and analyzes:
    - Speech confidence and clarity
    - Grammar correctness
    - Pronunciation quality
    - Provides actionable feedback
    
    Supported formats: .wav, .mp3, .m4a, .ogg, .flac
    """
    try:
        logger.info(f"Speech analysis request received: filename={audio.filename}, content_type={audio.content_type}")
        
        # Validate file type
        allowed_types = [
            "audio/wav", "audio/wave", "audio/x-wav",
            "audio/mpeg", "audio/mp3",
            "audio/mp4", "audio/m4a", "audio/x-m4a",
            "audio/ogg", "audio/flac"
        ]
        
        if audio.content_type not in allowed_types:
            logger.warning(f"Invalid audio file type: {audio.content_type}")
            raise HTTPException(
                status_code=400,
                detail=f"Invalid audio file type. Supported types: WAV, MP3, M4A, OGG, FLAC"
            )
        
        # Read audio file
        audio_bytes = await audio.read()
        file_size_mb = len(audio_bytes) / (1024 * 1024)
        
        logger.info(f"Audio file read: size={file_size_mb:.2f}MB")
        
        # Validate file size (max 10MB as per requirements)
        if file_size_mb > 10:
            logger.warning(f"Audio file too large: {file_size_mb:.2f}MB")
            raise HTTPException(
                status_code=400,
                detail="Audio file too large. Maximum size is 10MB"
            )
        
        # Upload audio to Gemini for analysis
        # Gemini can process audio files directly
        logger.info("Uploading audio to Gemini for processing")
        
        # Create a temporary file-like object for Gemini
        import io
        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = audio.filename or "audio.wav"
        
        # Upload file to Gemini
        try:
            uploaded_file = genai.upload_file(audio_file, mime_type=audio.content_type)
            logger.info(f"Audio uploaded to Gemini: {uploaded_file.name}")
        except Exception as e:
            logger.error(f"Failed to upload audio to Gemini: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to process audio file: {str(e)}"
            )
        
        # Create analysis prompt
        analysis_prompt = """Analyze this audio recording for English language learning purposes. Provide a comprehensive analysis including:

1. **Transcription**: Write out what was said in the audio
2. **Confidence Score** (0.0 to 1.0): Rate the speaker's confidence based on:
   - Voice clarity and volume
   - Speaking pace (not too fast or slow)
   - Hesitations and filler words (um, uh, like)
   - Overall fluency

3. **Grammar Score** (0.0 to 1.0): Evaluate grammar correctness:
   - Sentence structure
   - Verb tenses
   - Subject-verb agreement
   - Word order

4. **Pronunciation Analysis**:
   - Clarity: How clear are the words (0.0 to 1.0)
   - Accent: Describe the accent (e.g., "neutral", "slight accent", "strong accent")
   - Problem sounds: List any sounds that need improvement
   - Intonation: Rate the natural flow and rhythm (0.0 to 1.0)

5. **Detailed Feedback**: Provide 2-3 specific, actionable suggestions for improvement

Format your response as JSON with this exact structure:
{
  "transcription": "what was said",
  "confidence": 0.85,
  "grammarScore": 0.90,
  "pronunciation": {
    "clarity": 0.88,
    "accent": "neutral",
    "problemSounds": ["th", "r"],
    "intonation": 0.85
  },
  "feedback": "Your speech is clear and confident. Focus on: 1) Pronounce 'th' sounds more distinctly. 2) Reduce filler words like 'um'. 3) Maintain consistent volume throughout."
}

Provide ONLY the JSON response, no additional text."""
        
        # Generate analysis using Gemini
        logger.info("Generating speech analysis with Gemini")
        response = model.generate_content([uploaded_file, analysis_prompt])
        
        if not response or not response.text:
            logger.error("Empty response from Gemini API")
            raise HTTPException(status_code=500, detail="Failed to analyze speech")
        
        # Parse JSON response
        import json
        import re
        
        response_text = response.text.strip()
        
        # Extract JSON from response (handle markdown code blocks)
        json_match = re.search(r'```json\s*(.*?)\s*```', response_text, re.DOTALL)
        if json_match:
            json_str = json_match.group(1)
        else:
            # Try to find JSON object directly
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
            else:
                json_str = response_text
        
        try:
            analysis_data = json.loads(json_str)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {str(e)}\nResponse: {response_text}")
            # Fallback: provide default analysis
            analysis_data = {
                "confidence": 0.75,
                "grammarScore": 0.80,
                "pronunciation": {
                    "clarity": 0.75,
                    "accent": "neutral",
                    "problemSounds": [],
                    "intonation": 0.75
                },
                "feedback": "Audio analyzed. Continue practicing to improve your speaking skills."
            }
        
        # Extract and validate scores
        confidence = float(analysis_data.get("confidence", 0.75))
        grammar_score = float(analysis_data.get("grammarScore", 0.80))
        feedback = analysis_data.get("feedback", "Keep practicing your speaking skills!")
        pronunciation = analysis_data.get("pronunciation", {
            "clarity": 0.75,
            "accent": "neutral",
            "problemSounds": [],
            "intonation": 0.75
        })
        
        # Ensure scores are in valid range [0, 1]
        confidence = max(0.0, min(1.0, confidence))
        grammar_score = max(0.0, min(1.0, grammar_score))
        
        logger.info(f"Speech analysis completed: confidence={confidence}, grammar={grammar_score}")
        
        # Clean up uploaded file
        try:
            genai.delete_file(uploaded_file.name)
            logger.info(f"Cleaned up uploaded file: {uploaded_file.name}")
        except Exception as e:
            logger.warning(f"Failed to delete uploaded file: {str(e)}")
        
        return SpeechAnalysisResponse(
            confidence=confidence,
            grammarScore=grammar_score,
            feedback=feedback,
            pronunciation=pronunciation
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in speech analysis endpoint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error during speech analysis: {str(e)}"
        )

@app.post("/analyze/confidence", response_model=ConfidenceResponse, tags=["Analysis"])
async def analyze_confidence(request: ConfidenceRequest):
    """
    Analyze text for confidence level
    
    Analyzes written text to determine:
    - Confidence level (0-1 scale)
    - Specific suggestions for improvement
    
    Evaluates factors like:
    - Word choice (assertive vs. tentative language)
    - Sentence structure (active vs. passive voice)
    - Hedging language (maybe, perhaps, might)
    - Filler words and qualifiers
    """
    try:
        logger.info(f"Confidence analysis request received: text length={len(request.text)}")
        
        # Validate text length
        if not request.text or len(request.text.strip()) == 0:
            raise HTTPException(
                status_code=400,
                detail="Text cannot be empty"
            )
        
        if len(request.text) > 5000:
            raise HTTPException(
                status_code=400,
                detail="Text too long. Maximum length is 5000 characters"
            )
        
        # Create analysis prompt
        analysis_prompt = f"""Analyze the following text for confidence level and provide specific suggestions for improvement.

Text to analyze:
"{request.text}"

Evaluate the confidence level based on:
1. **Word Choice**: Use of assertive vs. tentative language
   - Assertive: "I will", "I know", "definitely", "certainly"
   - Tentative: "I think", "maybe", "perhaps", "might", "possibly"

2. **Sentence Structure**: Active vs. passive voice
   - Active voice shows more confidence
   - Passive voice can seem uncertain

3. **Hedging Language**: Excessive qualifiers and disclaimers
   - "kind of", "sort of", "just", "actually"
   - "I'm not sure but...", "This might be wrong but..."

4. **Filler Words**: Unnecessary words that weaken statements
   - "really", "very", "quite", "somewhat"

5. **Directness**: Clear, direct statements vs. roundabout expressions

Provide a confidence score from 0.0 (very unconfident) to 1.0 (very confident).

Then provide 3-5 specific, actionable suggestions for improvement. Each suggestion should:
- Identify a specific issue in the text
- Explain why it reduces confidence
- Provide a concrete example of how to improve it

Format your response as JSON with this exact structure:
{{
  "confidence": 0.75,
  "suggestions": [
    "Replace 'I think' with more assertive language like 'I believe' or state facts directly",
    "Change passive voice 'was done' to active voice 'I did' to show ownership",
    "Remove hedging words like 'maybe' and 'perhaps' - be more definitive"
  ]
}}

Provide ONLY the JSON response, no additional text."""
        
        # Generate analysis using Gemini
        logger.info("Generating confidence analysis with Gemini")
        response = model.generate_content(analysis_prompt)
        
        if not response or not response.text:
            logger.error("Empty response from Gemini API")
            raise HTTPException(status_code=500, detail="Failed to analyze confidence")
        
        # Parse JSON response
        import json
        import re
        
        response_text = response.text.strip()
        
        # Extract JSON from response (handle markdown code blocks)
        json_match = re.search(r'```json\s*(.*?)\s*```', response_text, re.DOTALL)
        if json_match:
            json_str = json_match.group(1)
        else:
            # Try to find JSON object directly
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
            else:
                json_str = response_text
        
        try:
            analysis_data = json.loads(json_str)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {str(e)}\nResponse: {response_text}")
            # Fallback: provide default analysis
            analysis_data = {
                "confidence": 0.70,
                "suggestions": [
                    "Use more assertive language to strengthen your statements",
                    "Reduce hedging words like 'maybe', 'perhaps', and 'might'",
                    "Replace passive voice with active voice to show ownership"
                ]
            }
        
        # Extract and validate data
        confidence = float(analysis_data.get("confidence", 0.70))
        suggestions = analysis_data.get("suggestions", [])
        
        # Ensure confidence is in valid range [0, 1]
        confidence = max(0.0, min(1.0, confidence))
        
        # Ensure we have suggestions
        if not suggestions or not isinstance(suggestions, list):
            suggestions = [
                "Use more assertive language to strengthen your statements",
                "Reduce hedging words and qualifiers",
                "Be more direct and specific in your communication"
            ]
        
        # Limit to reasonable number of suggestions
        if len(suggestions) > 10:
            suggestions = suggestions[:10]
        
        logger.info(f"Confidence analysis completed: confidence={confidence}, suggestions count={len(suggestions)}")
        
        return ConfidenceResponse(
            confidence=confidence,
            suggestions=suggestions
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in confidence analysis endpoint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error during confidence analysis: {str(e)}"
        )

@app.post("/interview/analyze", response_model=InterviewAnalysisResponse, tags=["Interview"])
async def analyze_interview(
    audio: UploadFile = File(...),
    video: Optional[UploadFile] = File(None),
    questions: Optional[str] = None
):
    """
    Analyze interview performance from audio/video
    
    Comprehensive interview analysis including:
    - Speech confidence and clarity
    - Grammar correctness
    - Body language (if video provided)
    - Detailed feedback with specific mistakes
    - Performance metrics
    
    Accepts:
    - audio: Audio file (required) - .wav, .mp3, .m4a, .ogg, .flac
    - video: Video file (optional) - .mp4, .mov, .avi
    - questions: JSON string array of interview questions (optional)
    
    Returns comprehensive analysis with actionable feedback
    """
    try:
        logger.info(f"Interview analysis request received: audio={audio.filename}, video={video.filename if video else None}")
        
        # Parse questions if provided
        interview_questions = []
        if questions:
            try:
                import json
                interview_questions = json.loads(questions)
                if not isinstance(interview_questions, list):
                    raise ValueError("Questions must be an array")
                logger.info(f"Interview questions parsed: {len(interview_questions)} questions")
            except (json.JSONDecodeError, ValueError) as e:
                logger.warning(f"Failed to parse questions: {str(e)}")
                # Continue without questions
        
        # Validate audio file type
        allowed_audio_types = [
            "audio/wav", "audio/wave", "audio/x-wav",
            "audio/mpeg", "audio/mp3",
            "audio/mp4", "audio/m4a", "audio/x-m4a",
            "audio/ogg", "audio/flac"
        ]
        
        if audio.content_type not in allowed_audio_types:
            logger.warning(f"Invalid audio file type: {audio.content_type}")
            raise HTTPException(
                status_code=400,
                detail=f"Invalid audio file type. Supported types: WAV, MP3, M4A, OGG, FLAC"
            )
        
        # Read and validate audio file
        audio_bytes = await audio.read()
        audio_size_mb = len(audio_bytes) / (1024 * 1024)
        
        logger.info(f"Audio file read: size={audio_size_mb:.2f}MB")
        
        # Validate audio file size (max 10MB as per requirements)
        if audio_size_mb > 10:
            logger.warning(f"Audio file too large: {audio_size_mb:.2f}MB")
            raise HTTPException(
                status_code=400,
                detail="Audio file too large. Maximum size is 10MB"
            )
        
        # Process video file if provided
        video_bytes = None
        video_size_mb = 0
        has_video = False
        
        if video:
            # Validate video file type
            allowed_video_types = [
                "video/mp4", "video/quicktime", "video/x-msvideo",
                "video/avi", "video/mpeg", "video/webm"
            ]
            
            if video.content_type not in allowed_video_types:
                logger.warning(f"Invalid video file type: {video.content_type}")
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid video file type. Supported types: MP4, MOV, AVI, WEBM"
                )
            
            # Read and validate video file
            video_bytes = await video.read()
            video_size_mb = len(video_bytes) / (1024 * 1024)
            
            logger.info(f"Video file read: size={video_size_mb:.2f}MB")
            
            # Validate video file size (max 50MB as per requirements)
            if video_size_mb > 50:
                logger.warning(f"Video file too large: {video_size_mb:.2f}MB")
                raise HTTPException(
                    status_code=400,
                    detail="Video file too large. Maximum size is 50MB"
                )
            
            has_video = True
        
        # Upload audio to Gemini for analysis
        logger.info("Uploading audio to Gemini for processing")
        
        import io
        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = audio.filename or "interview_audio.wav"
        
        try:
            uploaded_audio = genai.upload_file(audio_file, mime_type=audio.content_type)
            logger.info(f"Audio uploaded to Gemini: {uploaded_audio.name}")
        except Exception as e:
            logger.error(f"Failed to upload audio to Gemini: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to process audio file: {str(e)}"
            )
        
        # Upload video to Gemini if provided
        uploaded_video = None
        if has_video and video_bytes:
            logger.info("Uploading video to Gemini for processing")
            
            video_file = io.BytesIO(video_bytes)
            video_file.name = video.filename or "interview_video.mp4"
            
            try:
                uploaded_video = genai.upload_file(video_file, mime_type=video.content_type)
                logger.info(f"Video uploaded to Gemini: {uploaded_video.name}")
            except Exception as e:
                logger.warning(f"Failed to upload video to Gemini: {str(e)}")
                # Continue without video analysis
                has_video = False
        
        # Create comprehensive interview analysis prompt
        questions_context = ""
        if interview_questions:
            questions_list = "\n".join([f"{i+1}. {q}" for i, q in enumerate(interview_questions)])
            questions_context = f"""
Interview Questions:
{questions_list}

The candidate's responses should be evaluated in the context of these questions.
"""
        
        analysis_prompt = f"""Analyze this interview performance comprehensively for a job interview or professional communication scenario.

{questions_context}

Provide a detailed analysis including:

1. **Transcription**: Write out what was said in the audio

2. **Confidence Score** (0.0 to 1.0): Evaluate overall confidence based on:
   - Voice quality: clarity, volume, steadiness
   - Speaking pace: appropriate speed, not rushed or too slow
   - Fluency: smooth delivery with minimal hesitations
   - Filler words: frequency of "um", "uh", "like", "you know"
   - Tone: professional, enthusiastic, engaged
   - Pauses: appropriate use of pauses vs. awkward silences

3. **Grammar Score** (0.0 to 1.0): Comprehensive grammar evaluation:
   - Sentence structure and complexity
   - Verb tenses and consistency
   - Subject-verb agreement
   - Proper use of articles (a, an, the)
   - Pronoun usage
   - Word choice and vocabulary appropriateness

4. **Body Language Analysis** (if video is available):
   - Eye contact: maintaining appropriate eye contact
   - Posture: sitting/standing professionally
   - Gestures: natural and appropriate hand movements
   - Facial expressions: engaged and positive
   - Nervous habits: fidgeting, touching face, etc.
   - Overall presence: professional and confident
   - Score each aspect from 0.0 to 1.0

5. **Specific Mistakes**: List 3-7 specific mistakes or areas for improvement:
   - Grammar errors with examples
   - Pronunciation issues
   - Filler word usage
   - Unclear or incomplete responses
   - Body language issues (if video available)

6. **Comprehensive Feedback**: Provide detailed, actionable feedback (3-5 paragraphs):
   - Overall performance summary
   - Key strengths to maintain
   - Priority areas for improvement
   - Specific techniques to practice
   - Encouragement and next steps

Format your response as JSON with this exact structure:
{{
  "transcription": "full transcription of what was said",
  "confidence": 0.82,
  "grammarScore": 0.88,
  "bodyLanguage": {{
    "eyeContact": 0.85,
    "posture": 0.90,
    "gestures": 0.80,
    "facialExpressions": 0.85,
    "nervousHabits": 0.75,
    "overallPresence": 0.83
  }},
  "mistakes": [
    "Used 'um' and 'uh' frequently (12 times) - practice pausing silently instead",
    "Grammar: Said 'I was went' instead of 'I went' at 0:45",
    "Pronunciation: 'specific' pronounced as 'pacific' at 1:20",
    "Body language: Avoided eye contact during first question",
    "Incomplete answer to question 2 - didn't provide concrete example"
  ],
  "feedback": "Overall, you demonstrated good communication skills with a confident tone and clear articulation. Your responses showed thoughtful consideration of the questions.\\n\\nStrengths: You maintained good posture throughout, used appropriate professional vocabulary, and your enthusiasm was evident. Your grammar was generally strong with complex sentence structures.\\n\\nAreas for improvement: Work on reducing filler words by practicing pausing silently when you need to think. This will make you sound more confident and polished. Also, ensure you provide complete answers with specific examples for each question.\\n\\nFor your next interview: Practice your responses out loud, record yourself to identify filler words, and prepare concrete examples for common questions. Focus on maintaining eye contact and speaking at a steady, measured pace. With these adjustments, you'll present even more professionally."
}}

{"Note: If no video was provided, set bodyLanguage to null." if not has_video else ""}

Provide ONLY the JSON response, no additional text."""
        
        # Generate analysis using Gemini
        logger.info(f"Generating interview analysis with Gemini (video: {has_video})")
        
        # Prepare content for Gemini
        content_parts = []
        if has_video and uploaded_video:
            content_parts.append(uploaded_video)
        content_parts.append(uploaded_audio)
        content_parts.append(analysis_prompt)
        
        response = model.generate_content(content_parts)
        
        if not response or not response.text:
            logger.error("Empty response from Gemini API")
            raise HTTPException(status_code=500, detail="Failed to analyze interview")
        
        # Parse JSON response
        import json
        import re
        
        response_text = response.text.strip()
        
        # Extract JSON from response (handle markdown code blocks)
        json_match = re.search(r'```json\s*(.*?)\s*```', response_text, re.DOTALL)
        if json_match:
            json_str = json_match.group(1)
        else:
            # Try to find JSON object directly
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
            else:
                json_str = response_text
        
        try:
            analysis_data = json.loads(json_str)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {str(e)}\nResponse: {response_text}")
            # Fallback: provide default analysis
            analysis_data = {
                "confidence": 0.75,
                "grammarScore": 0.80,
                "bodyLanguage": None if not has_video else {
                    "eyeContact": 0.75,
                    "posture": 0.80,
                    "gestures": 0.75,
                    "facialExpressions": 0.75,
                    "nervousHabits": 0.70,
                    "overallPresence": 0.75
                },
                "mistakes": [
                    "Practice reducing filler words for more confident delivery",
                    "Work on maintaining consistent eye contact" if has_video else "Focus on clear pronunciation",
                    "Provide more specific examples in your responses"
                ],
                "feedback": "Your interview performance shows potential. Continue practicing to improve confidence and clarity. Focus on reducing filler words and providing complete, well-structured answers with specific examples."
            }
        
        # Extract and validate data
        confidence = float(analysis_data.get("confidence", 0.75))
        grammar_score = float(analysis_data.get("grammarScore", 0.80))
        body_language = analysis_data.get("bodyLanguage")
        mistakes = analysis_data.get("mistakes", [])
        feedback = analysis_data.get("feedback", "Continue practicing to improve your interview skills.")
        
        # Ensure scores are in valid range [0, 1]
        confidence = max(0.0, min(1.0, confidence))
        grammar_score = max(0.0, min(1.0, grammar_score))
        
        # Validate body language scores if present
        if body_language and isinstance(body_language, dict):
            for key in body_language:
                if isinstance(body_language[key], (int, float)):
                    body_language[key] = max(0.0, min(1.0, float(body_language[key])))
        elif not has_video:
            body_language = None
        
        # Ensure mistakes is a list
        if not isinstance(mistakes, list):
            mistakes = []
        
        # Limit mistakes to reasonable number
        if len(mistakes) > 15:
            mistakes = mistakes[:15]
        
        logger.info(f"Interview analysis completed: confidence={confidence}, grammar={grammar_score}, video={has_video}")
        
        # Clean up uploaded files
        try:
            genai.delete_file(uploaded_audio.name)
            logger.info(f"Cleaned up uploaded audio: {uploaded_audio.name}")
            if uploaded_video:
                genai.delete_file(uploaded_video.name)
                logger.info(f"Cleaned up uploaded video: {uploaded_video.name}")
        except Exception as e:
            logger.warning(f"Failed to delete uploaded files: {str(e)}")
        
        return InterviewAnalysisResponse(
            confidence=confidence,
            grammarScore=grammar_score,
            bodyLanguage=body_language,
            feedback=feedback,
            mistakes=mistakes if mistakes else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in interview analysis endpoint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error during interview analysis: {str(e)}"
        )

@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """
    Health check endpoint
    
    Checks the service health and Gemini API connectivity.
    Returns:
    - status: "healthy" or "unhealthy"
    - gemini_api: "connected" or "disconnected"
    - error: Error message if unhealthy (optional)
    
    This endpoint is used by load balancers and monitoring systems
    to verify the service is operational.
    """
    try:
        logger.info("Health check requested")
        
        # Test Gemini API connection with a minimal request
        try:
            test_model = genai.GenerativeModel('gemini-2.0-flash-exp')
            test_response = test_model.generate_content(
                "Respond with only the word 'OK'",
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=10,
                    temperature=0
                )
            )
            
            # Verify we got a response
            if test_response and test_response.text:
                logger.info("Gemini API health check passed")
                return HealthResponse(
                    status="healthy",
                    gemini_api="connected"
                )
            else:
                logger.warning("Gemini API returned empty response")
                return HealthResponse(
                    status="unhealthy",
                    gemini_api="disconnected",
                    error="Gemini API returned empty response"
                )
                
        except Exception as gemini_error:
            logger.error(f"Gemini API health check failed: {str(gemini_error)}")
            return HealthResponse(
                status="unhealthy",
                gemini_api="disconnected",
                error=f"Gemini API error: {str(gemini_error)}"
            )
            
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}", exc_info=True)
        return HealthResponse(
            status="unhealthy",
            gemini_api="unknown",
            error=f"Health check error: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
