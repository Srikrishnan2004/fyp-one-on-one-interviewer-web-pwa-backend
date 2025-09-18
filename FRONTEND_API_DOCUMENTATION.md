# Frontend API Documentation

This document provides a **frontend-focused** guide to all API endpoints, showing exactly what you need to send from your frontend application.

## 🔐 Authentication

All endpoints (except login/register) require a JWT token in the Authorization header:

```javascript
headers: {
  'Authorization': `Bearer ${userToken}`,
  'Content-Type': 'application/json'
}
```

---

## 👤 User Management

### Register User
```http
POST /api/auth/register
```

**What to send:**
```javascript
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securepassword123",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "username": "john_doe",
      "email": "john@example.com",
      "first_name": "John",
      "last_name": "Doe"
    },
    "token": "jwt_token_here"
  }
}
```

### Login User
```http
POST /api/auth/login
```

**What to send:**
```javascript
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "username": "john_doe",
      "email": "john@example.com",
      "first_name": "John",
      "last_name": "Doe"
    },
    "token": "jwt_token_here"
  }
}
```

### Get User Profile
```http
GET /api/auth/profile
```

**What to send:** Nothing (uses token from header)

**Response:**
```javascript
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "john_doe",
      "email": "john@example.com",
      "first_name": "John",
      "last_name": "Doe"
    }
  }
}
```

---

## 📝 Session Management

### Create New Session
```http
POST /api/sessions
```

**What to send:**
```javascript
{
  "session_name": "JavaScript Interview Practice",
  "session_type": "interview",
  "difficulty": "medium"
}
```

**Optional fields:**
- `session_type`: `"interview"`, `"practice"`, `"mock"`, `"assessment"` (default: `"interview"`)
- `difficulty`: `"easy"`, `"medium"`, `"hard"` (default: `"medium"`)

**Response:**
```javascript
{
  "success": true,
  "message": "Session created successfully",
  "data": {
    "session": {
      "id": "session_uuid",
      "session_name": "JavaScript Interview Practice",
      "session_type": "interview",
      "difficulty": "medium",
      "user_id": "user_uuid",
      "status": "active",
      "created_at": "2024-01-01T00:00:00Z"
    }
  }
}
```

### Get All Sessions
```http
GET /api/sessions
```

**What to send:** Nothing (uses token from header)

**Optional query parameters:**
- `status`: `"active"`, `"completed"`, `"paused"`
- `session_type`: `"interview"`, `"practice"`, `"mock"`, `"assessment"`
- `limit`: number (default: 20)
- `offset`: number (default: 0)

**Response:**
```javascript
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "session_uuid",
        "session_name": "JavaScript Interview Practice",
        "session_type": "interview",
        "difficulty": "medium",
        "status": "active",
        "created_at": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "total": 1,
      "limit": 20,
      "offset": 0
    }
  }
}
```

### Get Specific Session
```http
GET /api/sessions/{session_id}
```

**What to send:** Session ID in URL path

**Response:**
```javascript
{
  "success": true,
  "data": {
    "session": {
      "id": "session_uuid",
      "session_name": "JavaScript Interview Practice",
      "session_type": "interview",
      "difficulty": "medium",
      "status": "active",
      "created_at": "2024-01-01T00:00:00Z"
    }
  }
}
```

### Update Session
```http
PUT /api/sessions/{session_id}
```

**What to send:**
```javascript
{
  "session_name": "Updated Session Name",
  "status": "completed"
}
```

**Optional fields:** Any field you want to update

**Response:**
```javascript
{
  "success": true,
  "message": "Session updated successfully",
  "data": {
    "session": {
      "id": "session_uuid",
      "session_name": "Updated Session Name",
      "status": "completed"
    }
  }
}
```

### Delete Session
```http
DELETE /api/sessions/{session_id}
```

**What to send:** Session ID in URL path

**Response:**
```javascript
{
  "success": true,
  "message": "Session deleted successfully"
}
```

---

## 💬 Conversations (Q&A)

### Create New Question
```http
POST /api/conversations
```

**What to send:**
```javascript
{
  "session_id": "session_uuid",
  "question_number": 1,
  "question_text": "What is a closure in JavaScript?",
  "question_category": "Technical",
  "question_difficulty": "medium",
  "user_answer": "Optional initial answer",
  "time_taken_seconds": 45
}
```

**Required fields:**
- `session_id`: UUID of the session
- `question_number`: Number of the question (1, 2, 3, etc.)
- `question_text`: The actual question text

**Optional fields:**
- `question_category`: Category of the question
- `question_difficulty`: `"easy"`, `"medium"`, `"hard"`
- `user_answer`: User's answer (can be empty string)
- `time_taken_seconds`: Time taken to answer
- `auto_generate_answer`: `true`/`false` (default: `true` - AI will generate answer)

**Response:**
```javascript
{
  "success": true,
  "message": "Conversation created successfully",
  "data": {
    "conversation": {
      "id": "conversation_uuid",
      "session_id": "session_uuid",
      "question_number": 1,
      "question_text": "What is a closure in JavaScript?",
      "question_category": "Technical",
      "question_difficulty": "medium",
      "llm_generated_answer": "AI generated answer here...",
      "user_answer": "Optional initial answer",
      "time_taken_seconds": 45,
      "created_at": "2024-01-01T00:00:00Z"
    },
    "llm_answer_generated": true
  }
}
```

### Get Conversations for Session
```http
GET /api/conversations?sessionId={session_id}
```

**What to send:** Query parameter `sessionId`

**Optional query parameters:**
- `limit`: number (default: 100)
- `offset`: number (default: 0)

**Response:**
```javascript
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "conversation_uuid",
        "question_number": 1,
        "question_text": "What is a closure in JavaScript?",
        "question_category": "Technical",
        "question_difficulty": "medium",
        "llm_generated_answer": "AI generated answer...",
        "user_answer": "User's answer",
        "time_taken_seconds": 45,
        "created_at": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

### Submit User Answer
```http
PUT /api/conversations/{conversation_id}/answer
```

**What to send:**
```javascript
{
  "user_answer": "A closure is a function that retains access to variables from its outer scope.",
  "time_taken_seconds": 45,
  "confidence_score": 0.8
}
```

**Optional fields:**
- `user_answer`: Can be empty string if no answer provided
- `time_taken_seconds`: Time taken to answer
- `confidence_score`: User's confidence (0.0 to 1.0)
- `auto_generate_feedback`: `true`/`false` (default: `true` - AI will generate feedback)

**Response (with answer):**
```javascript
{
  "success": true,
  "message": "Answer submitted successfully",
  "data": {
    "conversation": {
      "id": "conversation_uuid",
      "user_answer": "A closure is a function that retains access to variables from its outer scope.",
      "llm_feedback": "Your answer demonstrates good understanding of closures. You correctly identified the key concept of variable retention. Consider providing a practical example to strengthen your explanation.",
      "confidence_score": 0.85,
      "answer_timestamp": "2024-01-01T00:00:00Z"
    },
    "answer_provided": true,
    "feedback_generated": true
  }
}
```

**Response (without answer):**
```javascript
{
  "success": true,
  "message": "Conversation updated (no answer provided)",
  "data": {
    "conversation": {
      "id": "conversation_uuid",
      "user_answer": null,
      "llm_feedback": "No answer provided. Don't be discouraged - keep practicing!",
      "confidence_score": 0.0,
      "answer_timestamp": "2024-01-01T00:00:00Z"
    },
    "answer_provided": false,
    "feedback_generated": true
  }
}
```

**🤖 Automatic Features:**
- **AI Feedback**: Automatically generates constructive feedback comparing your answer to the expert answer
- **Confidence Scoring**: AI evaluates your answer quality and assigns a confidence score (0.0 to 1.0)
- **Improvement Suggestions**: Provides specific areas for improvement and next steps

### Regenerate AI Answer
```http
POST /api/conversations/{conversation_id}/regenerate-answer
```

**What to send:** Nothing (uses conversation data)

**Response:**
```javascript
{
  "success": true,
  "message": "LLM answer regenerated successfully",
  "data": {
    "conversation": {
      "id": "conversation_uuid",
      "llm_generated_answer": "New AI generated answer..."
    },
    "answer_length": 150
  }
}
```

---

## 📊 Performance Analytics

### Create Performance Record
```http
POST /api/performance
```

**What to send:**
```javascript
{
  "session_id": "session_uuid",
  "conversation_id": "conversation_uuid",
  "metric_type": "response_time",
  "metric_value": 45.5,
  "metric_unit": "seconds",
  "performance_category": "efficiency"
}
```

**Required fields:**
- `session_id`: UUID of the session
- `conversation_id`: UUID of the conversation (optional)
- `metric_type`: Type of metric (e.g., "response_time", "accuracy", "confidence")
- `metric_value`: The metric value
- `metric_unit`: Unit of measurement (e.g., "seconds", "percentage", "score")
- `performance_category`: Category of performance (e.g., "efficiency", "quality", "communication")

**Optional fields:**
- `metric_max_value`: Maximum possible value (default: 100.00)
- `feedback_notes`: Additional notes
- `improvement_suggestions`: Suggestions for improvement
- `auto_generate_suggestions`: `true`/`false` (default: `true` - AI will generate suggestions)

**Response:**
```javascript
{
  "success": true,
  "message": "Performance record created successfully",
  "data": {
    "performance": {
      "id": "performance_uuid",
      "session_id": "session_uuid",
      "conversation_id": "conversation_uuid",
      "metric_type": "response_time",
      "metric_value": "45.50",
      "metric_unit": "seconds",
      "performance_category": "efficiency",
      "feedback_notes": null,
      "improvement_suggestions": "Focus on providing more detailed explanations. Practice explaining concepts step by step. Include specific examples in your answers.",
      "recorded_at": "2024-01-01T00:00:00Z"
    }
  }
}
```

**🤖 Automatic Features:**
- **AI-Generated Suggestions**: Automatically analyzes your answer and generates specific improvement suggestions
- **Context-Aware**: Uses the conversation question, user answer, and LLM answer to provide relevant feedback
- **Personalized**: Suggestions are tailored to your specific performance and the question difficulty

### Get Session AI Insights
```http
GET /api/performance/session/{session_id}/insights
```

**What to send:** Session ID in URL path

**Response:**
```javascript
{
  "success": true,
  "message": "Session insights generated successfully",
  "data": {
    "session_id": "session_uuid",
    "session_name": "JavaScript Practice Session",
    "session_type": "interview",
    "insights": {
      "overall_assessment": "Good performance with room for improvement",
      "strengths": [
        "Strong understanding of JavaScript closures",
        "Good communication skills"
      ],
      "weaknesses": [
        "Slow response time on complex questions",
        "Need more practice with async programming"
      ],
      "recommendations": [
        "Practice more async/await examples",
        "Work on time management techniques"
      ],
      "improvement_areas": [
        {
          "area": "Async Programming",
          "current_score": 0.65,
          "target_score": 0.80,
          "priority": "high",
          "action_plan": "Practice 10 async/await examples daily"
        }
      ],
      "next_steps": [
        "Review questions with low confidence scores",
        "Practice async programming concepts"
      ],
      "learning_path": "Focus on async programming and time management",
      "confidence_analysis": "Average confidence score of 0.72 across 10 questions",
      "time_management": "Average 45.5 seconds per question",
      "communication_skills": "Good clarity in explanations, could be more concise",
      "session_metadata": {
        "total_questions": 10,
        "answered_questions": 8,
        "avg_confidence": 0.72,
        "avg_time_per_question": 45.5
      }
    }
  }
}
```

### Get Performance Summary
```http
GET /api/performance/summary?days=30
```

**What to send:** Optional query parameter `days` (default: 30)

**Response:**
```javascript
{
  "success": true,
  "data": {
    "summary": [
      {
        "metric_type": "overall_score",
        "performance_category": "technical",
        "total_records": 25,
        "avg_score": 75.5,
        "min_score": 60.0,
        "max_score": 95.0
      }
    ]
  }
}
```

### Get Performance Insights
```http
GET /api/performance/insights?days=30
```

**What to send:** Optional query parameter `days` (default: 30)

**Response:**
```javascript
{
  "success": true,
  "data": {
    "insights": {
      "overall_assessment": "Good progress with room for improvement",
      "strengths": [
        "Strong understanding of JavaScript fundamentals",
        "Good communication skills"
      ],
      "weaknesses": [
        "System design concepts need work",
        "Algorithm problem-solving could improve"
      ],
      "recommendations": [
        "Focus on system design practice",
        "Practice algorithm problems daily"
      ]
    }
  }
}
```

---

## 🤖 AI Interview Features

### Generate Interview Questions
```http
POST /api/interview/generate
```

**What to send:**
```javascript
{
  "topic": "JavaScript",
  "difficulty": "medium",
  "count": 5
}
```

**Required fields:**
- `topic`: The topic for questions (e.g., "JavaScript", "React", "System Design")
- `difficulty`: `"easy"`, `"medium"`, `"hard"`
- `count`: Number of questions to generate (1-20)

**Response:**
```javascript
{
  "success": true,
  "message": "Interview questions generated successfully",
  "data": {
    "questions": [
      {
        "question": "What is the difference between let, const, and var in JavaScript?",
        "category": "JavaScript",
        "difficulty": "medium",
        "follow_up": "Can you explain hoisting in this context?",
        "animation": "Talking_1"
      }
    ],
    "session_context": {
      "topic": "JavaScript",
      "difficulty": "medium",
      "total_questions": 5
    }
  }
}
```

### Resume Analysis
```http
POST /api/interview/resume/analyze
```

**What to send:**
```javascript
{
  "resume_text": "John Doe\nSoftware Engineer\n5 years experience in JavaScript...",
  "difficulty": "medium"
}
```

**Required fields:**
- `resume_text`: The resume content as text
- `difficulty`: `"easy"`, `"medium"`, `"hard"`

**Response:**
```javascript
{
  "success": true,
  "message": "Resume analysis completed",
  "data": {
    "analysis": {
      "skills_identified": ["JavaScript", "React", "Node.js"],
      "experience_level": "Mid-level",
      "strengths": ["Strong JavaScript background", "Full-stack experience"],
      "suggested_questions": [
        "How would you optimize a React application for performance?",
        "Explain the event loop in Node.js"
      ]
    }
  }
}
```

---

## 🧠 Dynamic Questions (Advanced)

### Initialize Dynamic Session
```http
POST /api/dynamic-questions/initialize
```

**What to send:**
```javascript
{
  "skillDomain": "JavaScript",
  "difficulty": "medium",
  "sessionId": "session_uuid"
}
```

**Required fields:**
- `skillDomain`: The skill area (e.g., "JavaScript", "React", "System Design")
- `difficulty`: `"easy"`, `"medium"`, `"hard"`
- `sessionId`: UUID of the session

**Response:**
```javascript
{
  "success": true,
  "message": "Dynamic question session initialized successfully",
  "data": {
    "sessionId": "session_uuid",
    "skillDomain": "JavaScript",
    "currentDifficulty": "medium",
    "nextQuestion": {
      "id": "baseline_1",
      "text": "What is a closure in JavaScript?",
      "category": "JavaScript",
      "difficulty": "medium",
      "followUp": "Can you provide more details?"
    },
    "queueLength": 10,
    "baselineQuestionsGenerated": 10
  }
}
```

### Process Answer & Get Next Question
```http
POST /api/dynamic-questions/process-answer
```

**What to send:**
```javascript
{
  "userAnswer": "A closure is a function that retains access to variables from its outer scope.",
  "timeTakenSeconds": 45,
  "sessionId": "session_uuid"
}
```

**Required fields:**
- `sessionId`: UUID of the session
- `userAnswer`: Can be empty string if no answer provided
- `timeTakenSeconds`: Time taken to answer (optional)

**Response:**
```javascript
{
  "success": true,
  "message": "Answer processed successfully",
  "data": {
    "currentQuestion": {
      "id": "baseline_1",
      "text": "What is a closure in JavaScript?",
      "difficulty": "medium"
    },
    "confidenceScore": 0.85,
    "nextQuestion": {
      "id": "dynamic_1234567890",
      "text": "How would you implement a closure to create a private variable?",
      "category": "JavaScript",
      "difficulty": "hard",
      "followUp": "Can you provide a practical example?"
    },
    "queueLength": 9,
    "sessionMetrics": {
      "totalQuestions": 1,
      "answeredQuestions": 1,
      "avgConfidenceScore": 0.85
    },
    "isSessionComplete": false
  }
}
```

### Generate Performance Report
```http
POST /api/dynamic-questions/generate-report
```

**What to send:**
```javascript
{
  "sessionId": "session_uuid"
}
```

**Required fields:**
- `sessionId`: UUID of the session

**Response:**
```javascript
{
  "success": true,
  "message": "Performance report generated successfully",
  "data": {
    "report": {
      "sessionId": "session_uuid",
      "skillDomain": "JavaScript",
      "summary": {
        "totalQuestions": 10,
        "answeredQuestions": 8,
        "avgConfidenceScore": 0.72,
        "avgTimePerQuestion": 45.5
      },
      "strengths": ["Closure concepts", "Async programming"],
      "weaknesses": ["Prototype chain", "Memory management"],
      "insights": [
        "Strong understanding of basic JavaScript concepts",
        "Need more practice with advanced topics"
      ],
      "recommendations": [
        "Focus on prototype chain concepts",
        "Practice memory management techniques"
      ]
    }
  }
}
```

---

## 🎯 Error Handling

### Common Error Responses

**401 Unauthorized:**
```javascript
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

**403 Forbidden:**
```javascript
{
  "success": false,
  "message": "Access denied to session"
}
```

**404 Not Found:**
```javascript
{
  "success": false,
  "message": "Session not found"
}
```

**422 Validation Error:**
```javascript
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

**500 Server Error:**
```javascript
{
  "success": false,
  "message": "Internal server error",
  "error": "Error details"
}
```

---

## 📱 Frontend Implementation Examples

### React Hook Example
```javascript
import { useState, useEffect } from 'react';

const useSessionInsights = (sessionId) => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('userToken');
      const response = await fetch(`/api/performance/session/${sessionId}/insights`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setInsights(data.data);
    } catch (error) {
      console.error('Failed to fetch insights:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) fetchInsights();
  }, [sessionId]);

  return { insights, loading, refetch: fetchInsights };
};
```

### Complete Session Flow Example
```javascript
// 1. Create session
const createSession = async (sessionData) => {
  const response = await fetch('/api/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(sessionData)
  });
  return response.json();
};

// 2. Create conversation (question)
const createConversation = async (conversationData) => {
  const response = await fetch('/api/conversations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(conversationData)
  });
  return response.json();
};

// 3. Submit answer
const submitAnswer = async (conversationId, answerData) => {
  const response = await fetch(`/api/conversations/${conversationId}/answer`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(answerData)
  });
  return response.json();
};

// 4. Get session insights
const getSessionInsights = async (sessionId) => {
  const response = await fetch(`/api/performance/session/${sessionId}/insights`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

---

## 🔧 Quick Reference

### Base URL
```
http://localhost:5000
```

### Required Headers
```javascript
{
  'Authorization': `Bearer ${userToken}`,
  'Content-Type': 'application/json'
}
```

### Common Query Parameters
- `limit`: Number of items to return (default: 20)
- `offset`: Number of items to skip (default: 0)
- `days`: Number of days for analytics (default: 30)

### UUIDs
All IDs in the system are UUIDs (Universally Unique Identifiers) in the format:
```
xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
```

### Difficulty Levels
- `"easy"`: Beginner level questions
- `"medium"`: Intermediate level questions  
- `"hard"`: Advanced level questions

### Session Types
- `"interview"`: Standard interview practice
- `"practice"`: General practice session
- `"mock"`: Mock interview simulation
- `"assessment"`: Skills assessment

---

This documentation focuses on what your frontend needs to send, making it easy to integrate with the backend API! 🚀
