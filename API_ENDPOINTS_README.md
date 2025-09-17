# Virtual Interviewer Backend - API Endpoints

This document provides a comprehensive list of all API endpoints for frontend integration.

## Base URL
```
http://localhost:3000/api
```

## Authentication
Most endpoints require authentication using JWT Bearer tokens:
```
Authorization: Bearer <your_jwt_token>
```

---

## 🔐 Authentication Endpoints (`/api/auth`)

### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "username": "john_doe",
      "email": "john@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "created_at": "2024-01-01T00:00:00Z"
    },
    "token": "jwt_token_here"
  }
}
```

### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "john_doe",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { /* user object */ },
    "token": "jwt_token_here"
  }
}
```

### Get User Profile
```http
GET /api/auth/profile
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { /* user object */ },
    "stats": {
      "total_sessions": 5,
      "completed_sessions": 3,
      "total_conversations": 25,
      "avg_session_duration": 15.5
    },
    "performance_summary": [
      {
        "metric_type": "overall_score",
        "avg_score": 85.5,
        "total_metrics": 10
      }
    ]
  }
}
```

### Update User Profile
```http
PUT /api/auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "first_name": "John",
  "last_name": "Smith",
  "email": "john.smith@example.com"
}
```

### Change Password
```http
PUT /api/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "current_password": "old_password",
  "new_password": "new_password"
}
```

### Check Username Availability
```http
GET /api/auth/check-username/john_doe
```

### Check Email Availability
```http
GET /api/auth/check-email/john@example.com
```

---

## 📋 Session Management (`/api/sessions`)

### Create New Session
```http
POST /api/sessions
Authorization: Bearer <token>
Content-Type: application/json

{
  "session_name": "JavaScript Interview Practice",
  "session_type": "interview",
  "session_metadata": {
    "topic": "JavaScript",
    "difficulty": "intermediate"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Session created successfully",
  "data": {
    "session": {
      "id": "uuid",
      "user_id": "uuid",
      "session_name": "JavaScript Interview Practice",
      "session_type": "interview",
      "status": "active",
      "started_at": "2024-01-01T00:00:00Z",
      "total_questions": 0,
      "completed_questions": 0
    }
  }
}
```

### Get User Sessions
```http
GET /api/sessions?status=active&limit=10&offset=0
Authorization: Bearer <token>
```

**Query Parameters:**
- `status`: active, completed, paused, abandoned
- `limit`: Number of sessions to return (default: 50)
- `offset`: Number of sessions to skip (default: 0)

### Get Session Summary
```http
GET /api/sessions/summary?days=30
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_sessions": 10,
      "completed_sessions": 7,
      "active_sessions": 1,
      "paused_sessions": 1,
      "abandoned_sessions": 1,
      "avg_duration": 18.5,
      "total_questions_asked": 150,
      "total_questions_answered": 120
    }
  }
}
```

### Get Active Sessions
```http
GET /api/sessions/active
Authorization: Bearer <token>
```

### Get Specific Session
```http
GET /api/sessions/{session_id}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "session": { /* session object */ },
    "stats": {
      "total_conversations": 5,
      "avg_answer_time": 45.2,
      "avg_confidence": 0.75,
      "high_confidence_answers": 3,
      "low_confidence_answers": 1
    },
    "conversations": [ /* conversation objects */ ],
    "performance_metrics": [ /* performance objects */ ]
  }
}
```

### Update Session
```http
PUT /api/sessions/{session_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "session_name": "Updated Session Name",
  "session_metadata": {
    "notes": "Additional session notes"
  }
}
```

### Start Session
```http
POST /api/sessions/{session_id}/start
Authorization: Bearer <token>
```

### End Session
```http
POST /api/sessions/{session_id}/end
Authorization: Bearer <token>
```

### Pause Session
```http
POST /api/sessions/{session_id}/pause
Authorization: Bearer <token>
```

### Resume Session
```http
POST /api/sessions/{session_id}/resume
Authorization: Bearer <token>
```

### Update Question Count
```http
PUT /api/sessions/{session_id}/question-count
Authorization: Bearer <token>
Content-Type: application/json

{
  "total_questions": 10,
  "completed_questions": 7
}
```

### Delete Session
```http
DELETE /api/sessions/{session_id}
Authorization: Bearer <token>
```

---

## 💬 Conversation Management (`/api/conversations`)

### Create New Conversation
```http
POST /api/conversations
Authorization: Bearer <token>
Content-Type: application/json

{
  "session_id": "uuid",
  "question_number": 1,
  "question_text": "What is a closure in JavaScript?",
  "question_category": "technical",
  "question_difficulty": "intermediate",
  "llm_generated_answer": "A closure is a function that has access to variables in its outer scope..."
}
```

### Get Session Conversations
```http
GET /api/conversations/session/{session_id}?limit=50&offset=0&orderBy=question_number
Authorization: Bearer <token>
```

### Get User Conversations
```http
GET /api/conversations?sessionId=uuid&limit=100&offset=0
Authorization: Bearer <token>
```

### Get Conversation Statistics
```http
GET /api/conversations/stats?days=30
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "total_conversations": 50,
      "answered_conversations": 45,
      "avg_answer_time": 42.5,
      "avg_confidence": 0.78,
      "high_confidence_count": 35,
      "low_confidence_count": 5,
      "unique_categories": 8,
      "sessions_with_conversations": 12
    }
  }
}
```

### Search Conversations by Category
```http
GET /api/conversations/category/technical?limit=20&offset=0
Authorization: Bearer <token>
```

### Search Conversations by Difficulty
```http
GET /api/conversations/difficulty/intermediate?limit=20&offset=0
Authorization: Bearer <token>
```

### Get Specific Conversation
```http
GET /api/conversations/{conversation_id}
Authorization: Bearer <token>
```

### Submit User Answer
```http
PUT /api/conversations/{conversation_id}/answer
Authorization: Bearer <token>
Content-Type: application/json

{
  "user_answer": "A closure is a function that retains access to variables from its outer scope even after the outer function has returned.",
  "user_answer_audio_url": "https://example.com/audio.wav",
  "time_taken_seconds": 45,
  "llm_feedback": "Great explanation! You correctly identified the key concept.",
  "confidence_score": 0.85
}
```

### Update LLM Feedback
```http
PUT /api/conversations/{conversation_id}/feedback
Authorization: Bearer <token>
Content-Type: application/json

{
  "llm_feedback": "Excellent answer! You demonstrated deep understanding.",
  "confidence_score": 0.92
}
```

### Update Conversation
```http
PUT /api/conversations/{conversation_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "user_answer": "Updated answer",
  "time_taken_seconds": 50
}
```

### Delete Conversation
```http
DELETE /api/conversations/{conversation_id}
Authorization: Bearer <token>
```

---

## 📊 Performance Analytics (`/api/performance`)

### Create Performance Record
```http
POST /api/performance
Authorization: Bearer <token>
Content-Type: application/json

{
  "session_id": "uuid",
  "conversation_id": "uuid",
  "metric_type": "overall_score",
  "metric_value": 85.5,
  "metric_max_value": 100.0,
  "metric_unit": "percentage",
  "performance_category": "content_quality",
  "feedback_notes": "Good technical knowledge demonstrated",
  "improvement_suggestions": "Try to provide more specific examples"
}
```

### Create Multiple Performance Records
```http
POST /api/performance/batch
Authorization: Bearer <token>
Content-Type: application/json

{
  "performanceRecords": [
    {
      "metric_type": "communication",
      "metric_value": 80.0,
      "performance_category": "clarity"
    },
    {
      "metric_type": "technical",
      "metric_value": 90.0,
      "performance_category": "accuracy"
    }
  ]
}
```

### Get Performance Records
```http
GET /api/performance?sessionId=uuid&metricType=overall_score&limit=50&offset=0&days=30
Authorization: Bearer <token>
```

### Get Performance Summary
```http
GET /api/performance/summary?days=30
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": [
      {
        "metric_type": "overall_score",
        "performance_category": "general",
        "total_records": 25,
        "avg_score": 82.5,
        "min_score": 65.0,
        "max_score": 95.0,
        "score_stddev": 8.5,
        "median_score": 83.0,
        "last_recorded": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

### Get Performance Trends
```http
GET /api/performance/trends/overall_score?days=30
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "metric_type": "overall_score",
    "trends": [
      {
        "date": "2024-01-01",
        "avg_score": 80.5,
        "record_count": 5,
        "min_score": 75.0,
        "max_score": 85.0
      }
    ]
  }
}
```

### Get Performance Insights
```http
GET /api/performance/insights?days=30
Authorization: Bearer <token>
```

### Compare Session Performance
```http
GET /api/performance/compare-sessions?sessionIds=uuid1,uuid2,uuid3
Authorization: Bearer <token>
```

### Get Performance Leaderboard
```http
GET /api/performance/leaderboard/overall_score?limit=10
Authorization: Bearer <token>
```

### Get Dashboard Analytics
```http
GET /api/performance/dashboard/analytics?days=30
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": [ /* performance summary */ ],
    "insights": [ /* performance insights */ ],
    "trends": {
      "metric_type": "overall_score",
      "data": [ /* trend data */ ]
    },
    "period_days": 30
  }
}
```

### Get Specific Performance Record
```http
GET /api/performance/{performance_id}
Authorization: Bearer <token>
```

### Update Performance Record
```http
PUT /api/performance/{performance_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "metric_value": 88.0,
  "feedback_notes": "Updated feedback",
  "improvement_suggestions": "Updated suggestions"
}
```

### Delete Performance Record
```http
DELETE /api/performance/{performance_id}
Authorization: Bearer <token>
```

---

## 🤖 RAG (Retrieval-Augmented Generation) (`/api/rag`)

### Health Check
```http
GET /api/rag/health
Authorization: Bearer <token>
```

### Add Knowledge
```http
POST /api/rag/knowledge
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "JavaScript closures allow functions to access variables from their outer scope.",
  "title": "JavaScript Closures",
  "category": "technical",
  "difficulty": "intermediate",
  "tags": ["javascript", "closures", "scope"]
}
```

### Search Knowledge
```http
POST /api/rag/search
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": "JavaScript closures",
  "category": "technical",
  "difficulty": "intermediate",
  "nResults": 5,
  "minScore": 0.3
}
```

### Generate RAG-Enhanced Response
```http
POST /api/rag/query
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": "Explain JavaScript closures with examples",
  "nResults": 3,
  "ollamaModel": "llama2",
  "includeSources": true
}
```

### Generate Interview Questions
```http
POST /api/rag/questions/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "topic": "JavaScript",
  "difficulty": "intermediate",
  "category": "technical",
  "count": 5,
  "includeAnswers": false
}
```

### Add Interview Question
```http
POST /api/rag/questions
Authorization: Bearer <token>
Content-Type: application/json

{
  "question": "What is the difference between let, const, and var?",
  "answer": "let and const are block-scoped, var is function-scoped...",
  "category": "technical",
  "difficulty": "intermediate",
  "topic": "JavaScript Variables"
}
```

### Search Interview Questions
```http
POST /api/rag/questions/search
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": "JavaScript variables",
  "category": "technical",
  "difficulty": "intermediate",
  "nResults": 10
}
```

### Get Questions by Category
```http
GET /api/rag/questions/category/technical?difficulty=intermediate&limit=20&offset=0
Authorization: Bearer <token>
```

### Get Knowledge Base Statistics
```http
GET /api/rag/stats
Authorization: Bearer <token>
```

### Get Available Categories
```http
GET /api/rag/categories
Authorization: Bearer <token>
```

---

## 🎤 Interview Endpoints (`/interview`)

### Get Available Templates
```http
GET /interview/templates
```

**Response:**
```json
{
  "success": true,
  "templates": [
    {
      "key": "languages.java",
      "name": "Java Interview",
      "description": "Java programming questions",
      "category": "Technical",
      "difficulty": "intermediate"
    }
  ],
  "count": 25
}
```

### Search Templates
```http
GET /interview/templates/search?q=java
```

**Response:**
```json
{
  "success": true,
  "templates": [ /* matching templates */ ],
  "count": 5,
  "query": "java"
}
```

### Get Template Statistics
```http
GET /interview/templates/stats
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_templates": 25,
    "by_category": {
      "Technical": 15,
      "Behavioral": 5,
      "Leadership": 3,
      "General": 2
    },
    "by_difficulty": {
      "beginner": 8,
      "intermediate": 12,
      "advanced": 5
    }
  }
}
```

### Generate Interview Questions
```http
POST /interview/generate
Content-Type: application/json

{
  "template": "languages.java",
  "context": "Senior Java developer position",
  "includeAudio": true
}
```

**Response:**
```json
{
  "success": true,
  "template": "languages.java",
  "questions": [
    {
      "text": "What is the difference between ArrayList and LinkedList?",
      "category": "Technical",
      "difficulty": "intermediate",
      "audio": "base64_encoded_audio_data",
      "lipsync": { /* lip sync data */ },
      "facialExpression": "default",
      "animation": "Talking_1"
    }
  ],
  "count": 5,
  "audioGenerated": true
}
```

### Analyze Resume and Generate Questions
```http
POST /interview/resume/analyze
Content-Type: application/json

{
  "resumeContent": "John Doe - Senior Java Developer with 5 years experience...",
  "template": "resume.general",
  "includeAudio": true
}
```

### Get Resume-Specific Templates
```http
GET /interview/resume/templates
```

---

## 💬 Chat Endpoints (`/chat`)

### Chat with AI Interviewer
```http
POST /chat
Content-Type: application/json

{
  "message": "I want to practice JavaScript interview questions"
}
```

**Response:**
```json
{
  "messages": [
    {
      "text": "Great! Let's start with JavaScript fundamentals. What is the difference between var, let, and const?",
      "audio": "base64_encoded_audio_data",
      "lipsync": { /* lip sync data */ },
      "facialExpression": "default",
      "animation": "Talking_1"
    }
  ]
}
```

---

## 🎵 Voice Endpoints (`/voices`)

### Get Available Voice Models
```http
GET /voices
```

**Response:**
```json
[
  "en_US-amy-medium.onnx",
  "en_GB-alan-medium.onnx",
  "hi_IN-pratham-medium.onnx"
]
```

---

## 🏥 System Endpoints

### Health Check
```http
GET /health
```

### API Documentation
```http
GET /api
```

---

## 📝 Common Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { /* response data */ }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

### Pagination Response
```json
{
  "success": true,
  "data": {
    "items": [ /* array of items */ ],
    "pagination": {
      "limit": 50,
      "offset": 0,
      "total": 150
    }
  }
}
```

---

## 🔧 Frontend Integration Tips

### 1. Authentication Flow
```javascript
// Login and store token
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password })
});
const { data } = await loginResponse.json();
localStorage.setItem('token', data.token);
```

### 2. Making Authenticated Requests
```javascript
const token = localStorage.getItem('token');
const response = await fetch('/api/sessions', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### 3. Error Handling
```javascript
if (!response.ok) {
  const error = await response.json();
  console.error('API Error:', error.message);
  // Handle error appropriately
}
```

### 4. Real-time Updates
Consider implementing WebSocket connections for real-time session updates and live conversation feedback.

---

## 📚 Additional Resources

- [Database Setup Guide](SETUP_GUIDE.md)
- [RAG System Setup](RAG_SETUP_GUIDE.md)
- [API Documentation](API_DOCUMENTATION.md)

For more detailed information about specific endpoints, refer to the individual service documentation files.
