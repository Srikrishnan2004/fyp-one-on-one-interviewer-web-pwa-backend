# Learn Coding API Documentation

This document provides comprehensive documentation for the Learn Coding API endpoints in the Virtual Interviewer Backend.

## Overview

The Learn Coding feature allows users to submit code along with voice explanations, which are then processed through AI to provide comprehensive learning feedback with audio and lip-sync animations.

## Base URL
```
/api/learn-coding
```

## Authentication
All endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Response Format
All endpoints return responses in the following format:
```json
{
  "success": true|false,
  "message": "<optional-message>",
  "data": <response-data>,
  "error": "<error-message-if-failed>"
}
```

---

## Learn Coding Endpoints

### 1. Submit Code with Voice Explanation
**POST** `/api/learn-coding/learn-coding` 🔒

Submit code along with a voice explanation for AI analysis and learning feedback.

#### Request
- **Content-Type**: `multipart/form-data`
- **Authentication**: Required

#### Form Data
- `code` (string, required): The code to be analyzed
- `language` (string, optional): Programming language (default: 'python')
- `audio` (file, required): Voice explanation audio file

#### Supported Audio Formats
- WAV (preferred)
- MP3
- M4A
- FLAC
- OGG

#### Example Request (cURL)
```bash
curl -X POST \
  http://localhost:3000/api/learn-coding/learn-coding \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "code=def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)" \
  -F "language=python" \
  -F "audio=@explanation.wav"
```

#### Example Response
```json
{
  "success": true,
  "message": "Learn coding session processed successfully",
  "data": {
    "session_id": "learn_1704067200000",
    "code": {
      "content": "def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)",
      "language": "python"
    },
    "transcription": {
      "text": "This is a recursive function that calculates the Fibonacci sequence. It has a base case for n less than or equal to 1, and recursively calls itself for larger values.",
      "confidence": 0.95
    },
    "llm_response": {
      "text": "Great explanation! Your understanding of the Fibonacci function is correct. This is a classic example of recursion with a base case and recursive case. However, I'd like to point out some important considerations:\n\n1. **Time Complexity**: This recursive approach has exponential time complexity O(2^n), which becomes very slow for large values of n.\n\n2. **Space Complexity**: The space complexity is O(n) due to the call stack.\n\n3. **Optimization**: Consider using memoization or an iterative approach for better performance.\n\n4. **Best Practices**: Always include input validation to handle edge cases.",
      "code": "def fibonacci_memo(n, memo={}):\n    if n in memo:\n        return memo[n]\n    if n <= 1:\n        return n\n    memo[n] = fibonacci_memo(n-1, memo) + fibonacci_memo(n-2, memo)\n    return memo[n]",
      "audio": "base64_encoded_audio_data",
      "lipsync": {
        "metadata": {
          "soundFile": "learn_coding_1704067200000_response.wav",
          "duration": 45.2
        },
        "mouthCues": [
          {
            "start": 0.0,
            "end": 0.5,
            "value": "X"
          },
          {
            "start": 0.5,
            "end": 1.0,
            "value": "A"
          }
        ]
      }
    },
    "metadata": {
      "processing_time": 8500,
      "audio_duration": 12.5,
      "created_at": "2024-01-01T12:00:00Z"
    }
  }
}
```

#### Processing Steps
1. **Audio Conversion**: Convert uploaded audio to WAV format
2. **Transcription**: Use Whisper to extract text from voice (with fallback if unavailable)
3. **LLM Analysis**: Generate comprehensive code explanation and feedback
4. **TTS Generation**: Convert LLM response to speech using Piper TTS
5. **Lip-Sync Generation**: Create lip-sync JSON using Rhubarb
6. **Response**: Return comprehensive JSON with audio + lip-sync data

---

### 2. Health Check
**GET** `/api/learn-coding/health`

Check the health status of all required services.

#### Example Request
```bash
GET /api/learn-coding/health
```

#### Example Response
```json
{
  "success": true,
  "message": "Learn Coding service health check",
  "services": {
    "whisper": true,
    "rhubarb": true,
    "ollama": true,
    "piper": true
  },
  "status": "healthy"
}
```

#### Service Status
- `whisper`: Whisper audio transcription service
- `rhubarb`: Rhubarb lip-sync generation
- `ollama`: LLM service for code analysis
- `piper`: Text-to-speech service

---

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 400 | Bad request - Missing required fields or invalid audio format |
| 401 | Unauthorized - Missing or invalid token |
| 404 | Not found - Learning session doesn't exist |
| 413 | Payload too large - Audio file exceeds 10MB limit |
| 500 | Internal server error - Processing failed |

## Common Error Responses

### Missing Code
```json
{
  "success": false,
  "message": "Code is required"
}
```

### Missing Audio File
```json
{
  "success": false,
  "message": "Audio file is required"
}
```

### Invalid Audio Format
```json
{
  "success": false,
  "message": "Only audio files are allowed"
}
```

### File Size Exceeded
```json
{
  "success": false,
  "message": "Audio file exceeds 10MB limit"
}
```

### Processing Error
```json
{
  "success": false,
  "message": "Failed to process learn coding session",
  "error": "Failed to transcribe audio"
}
```

---

## Technical Requirements

### Dependencies
- **Whisper**: For audio transcription
- **Ollama**: For LLM code analysis
- **Piper TTS**: For text-to-speech generation
- **Rhubarb Lip-Sync**: For lip-sync JSON generation
- **FFmpeg**: For audio format conversion

### File Storage
- Audio files are stored in the `audios/` directory
- Files are automatically cleaned up when sessions are deleted
- Base64 audio data is included in responses for immediate playback

### Performance Considerations
- Processing time varies based on audio length and complexity
- Large audio files may take longer to process
- Consider implementing async processing for production use

---

### Python Integration
```python
import requests

# Submit learning session
url = "http://localhost:3000/api/learn-coding/learn-coding"
headers = {"Authorization": f"Bearer {token}"}

files = {
    'audio': ('explanation.wav', open('explanation.wav', 'rb'), 'audio/wav')
}
data = {
    'code': 'def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)',
    'language': 'python'
}

response = requests.post(url, headers=headers, files=files, data=data)
result = response.json()

if result['success']:
    # Save audio and lip-sync data
    audio_data = result['data']['llm_response']['audio']
    lip_sync_data = result['data']['llm_response']['lip_sync']
    
    with open('response.wav', 'wb') as f:
        f.write(base64.b64decode(audio_data))
    
    with open('lip_sync.json', 'w') as f:
        json.dump(lip_sync_data, f)
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Whisper Module Not Found
**Error**: `ModuleNotFoundError: No module named 'whisper'`

**Solution**:
```bash
pip install openai-whisper
```

**Alternative**: The API will work without Whisper, but voice transcription will be disabled.

#### 2. Piper TTS Not Available
**Error**: `Piper TTS not available`

**Solution**: Ensure Piper TTS is properly installed and the model files are in the correct location.

#### 3. Rhubarb Lip-Sync Not Available
**Error**: Rhubarb executable not found

**Solution**: Install Rhubarb Lip-Sync and ensure it's in the correct path:
```
C:\Program Files\Rhubarb-Lip-Sync-1.14.0-Windows\rhubarb.exe
```

#### 4. Audio File Format Issues
**Error**: Audio conversion failed

**Solution**: Ensure FFmpeg is installed for audio format conversion:
```bash
# Windows (using chocolatey)
choco install ffmpeg

# Or download from https://ffmpeg.org/download.html
```

### Service Status Check
Use the health check endpoint to verify all services:
```bash
GET /api/learn-coding/health
```

This will show the status of all required services:
- ✅ Whisper (transcription)
- ✅ Rhubarb (lip-sync)
- ✅ Ollama (LLM)
- ✅ Piper (TTS)

---

## Notes

- 🔒 indicates endpoints that require authentication
- Audio files are automatically converted to WAV format for processing
- Lip-sync JSON follows the Rhubarb format specification
- Processing time is included in response metadata
- All timestamps are in ISO 8601 format
- Files are automatically cleaned up when sessions are deleted
- The service checks for required dependencies on startup
