# Accentaura AI Microservice

FastAPI-based AI microservice for language learning features powered by Google Gemini Pro.

## Overview

This microservice provides AI-powered features for the Accentaura language learning platform:
- **Chat Practice**: Conversational AI for language practice
- **Speech Analysis**: Pronunciation and confidence scoring
- **Confidence Analysis**: Text-based confidence evaluation
- **Interview Simulation**: Comprehensive interview practice with feedback

## Technology Stack

- **Framework**: FastAPI 0.109.0
- **Server**: Uvicorn 0.27.0
- **AI Engine**: Google Gemini Pro (via google-generativeai 0.3.2)
- **Validation**: Pydantic 2.5.3
- **Environment**: python-dotenv 1.0.0
- **HTTP Client**: httpx 0.26.0

## Prerequisites

- Python 3.11 or higher
- Google Gemini API key
- pip package manager

## Installation

### 1. Navigate to the AI microservice directory
```bash
cd accentaura-backend/ai-microservice
```

### 2. Create a virtual environment (recommended)
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure environment variables
```bash
cp .env.example .env
```

Edit `.env` and add your configuration:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
PORT=8000
ALLOWED_ORIGINS=http://localhost:3000,https://api.accentaura.com
```

## Running the Service

### Development Mode
```bash
python main.py
```

Or with auto-reload:
```bash
uvicorn main:app --reload --port 8000
```

### Production Mode
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API Documentation

Once the service is running, access the interactive API documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

## API Endpoints

### Root
- `GET /` - Service information

### Chat (Task 20.2)
- `POST /chat` - Chat with AI assistant
  - Request: `{ prompt: str, conversationId?: str }`
  - Response: `{ response: str, conversationId: str }`

### Analysis (Tasks 20.3, 20.4)
- `POST /analyze/speech` - Analyze speech audio
  - Request: multipart/form-data with audio file
  - Response: `{ confidence: float, grammarScore: float, feedback: str, pronunciation: dict }`

- `POST /analyze/confidence` - Analyze text confidence
  - Request: `{ text: str }`
  - Response: `{ confidence: float, suggestions: list[str] }`

### Interview (Task 20.5)
- `POST /interview/analyze` - Analyze interview performance
  - Request: multipart/form-data with audio, optional video, questions
  - Response: `{ confidence: float, grammarScore: float, bodyLanguage: dict, feedback: str, mistakes: list }`

### Health (Task 20.6)
- `GET /health` - Service health check
  - Response: `{ status: str, gemini_api: str }`

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | Yes | - | Google Gemini API key |
| `PORT` | No | 8000 | Server port |
| `ALLOWED_ORIGINS` | No | http://localhost:3000 | Comma-separated CORS origins |

## CORS Configuration

The service is configured to accept requests from:
- Development: `http://localhost:3000`
- Production: `https://api.accentaura.com`

Additional origins can be added via the `ALLOWED_ORIGINS` environment variable.

## Project Structure

```
ai-microservice/
├── main.py              # FastAPI application
├── requirements.txt     # Python dependencies
├── .env.example        # Environment template
├── .env               # Local environment (gitignored)
└── README.md          # This file
```

## Development

### Adding New Endpoints

1. Define Pydantic models for request/response
2. Create endpoint function with proper type hints
3. Add error handling
4. Update documentation

Example:
```python
class MyRequest(BaseModel):
    data: str = Field(..., description="Input data")

class MyResponse(BaseModel):
    result: str = Field(..., description="Output result")

@app.post("/my-endpoint", response_model=MyResponse, tags=["Custom"])
async def my_endpoint(request: MyRequest):
    """Endpoint description"""
    try:
        # Process request
        result = process_data(request.data)
        return MyResponse(result=result)
    except Exception as e:
        logger.error(f"Error in my_endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
```

### Testing

Test endpoints using curl:
```bash
# Test root endpoint
curl http://localhost:8000/

# Test chat endpoint (when implemented)
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello, how are you?"}'

# Test speech analysis (when implemented)
curl -X POST http://localhost:8000/analyze/speech \
  -F "audio=@sample.wav"
```

Or use the interactive Swagger UI at http://localhost:8000/docs

## Logging

The service uses Python's built-in logging with the following configuration:
- **Level**: INFO
- **Format**: `%(asctime)s - %(name)s - %(levelname)s - %(message)s`
- **Output**: Console (stdout)

## Error Handling

All endpoints include proper error handling:
- **400**: Bad Request (validation errors)
- **500**: Internal Server Error
- **501**: Not Implemented (placeholder endpoints)
- **503**: Service Unavailable (Gemini API issues)

## Security Considerations

1. **API Key Protection**: Never commit `.env` file
2. **CORS**: Configure `ALLOWED_ORIGINS` for production
3. **Input Validation**: All inputs validated with Pydantic
4. **Error Messages**: Sanitized to prevent information leakage
5. **Rate Limiting**: Should be implemented at API gateway level

## Integration with Main API

The main Node.js API calls this microservice via HTTP:
- Base URL: `http://localhost:8000` (development)
- Base URL: `http://ai-service:8000` (Docker)
- Timeout: 30 seconds
- Retry logic: 3 attempts with exponential backoff

## Troubleshooting

### Service won't start
- Check Python version: `python3 --version` (must be 3.11+)
- Verify dependencies: `pip list`
- Check environment variables: `cat .env`

### Gemini API errors
- Verify API key is correct
- Check API quota and billing
- Review Gemini API status page

### CORS errors
- Add origin to `ALLOWED_ORIGINS`
- Verify CORS middleware configuration
- Check browser console for details

## Performance

- **Async/Await**: All endpoints use async for non-blocking I/O
- **Uvicorn**: ASGI server with uvloop for high performance
- **Connection Pooling**: HTTP client reuses connections
- **Timeout**: 30-second timeout for Gemini API calls

## Monitoring

Recommended monitoring:
- Response times per endpoint
- Gemini API call latency
- Error rates
- Request volume

## Future Enhancements

- [ ] Redis for conversation storage
- [ ] Request queuing for rate limiting
- [ ] Caching for common responses
- [ ] Metrics endpoint (Prometheus)
- [ ] Authentication middleware
- [ ] Request/response logging to database

## License

Proprietary - Accentaura Platform

## Support

For issues or questions, contact the development team.
