# Dynamic Question Generation Algorithm - Complete Implementation Guide

## Overview

The Dynamic Question Generation Algorithm is the core intelligence of the AI interviewer system. It implements an adaptive algorithm that adjusts the difficulty and topic of questions in real-time based on user performance, providing a personalized and effective learning experience.

## Database Integration

The system integrates with PostgreSQL for persistent storage while maintaining in-memory dynamic sessions for real-time operations. Each dynamic interview session is linked to a database session through metadata storage.

### Session Structure
- **Database Session**: Stored in PostgreSQL with `id` as primary key
- **Dynamic Session**: In-memory session for real-time operations
- **Linking**: `dynamic_session_id` stored in `session_metadata` JSONB field

## Algorithm Flow

### Step 1: System Initialization
**Purpose**: Initialize the system with skill domain and difficulty level

**Process**:
1. User selects a skill domain (e.g., JavaScript, React, System Design)
2. User selects initial difficulty level (Easy, Medium, Hard)
3. System creates a database session in PostgreSQL
4. System creates an in-memory dynamic session
5. Links both sessions via metadata storage
6. RAG services are initialized for contextual knowledge

**API Endpoint**: `POST /api/dynamic-question-generator/initialize`

**Example Request**:
```javascript
{
  "skillDomain": "JavaScript",
  "difficulty": "medium",
  "userId": "user-uuid",
  "sessionName": "JavaScript Interview Practice",
  "maxQuestions": 20
}
```

**Example Response**:
```javascript
{
  "success": true,
  "message": "Dynamic question session initialized successfully",
  "data": {
    "session": {
      "id": "dynamic-session-uuid",
      "skillDomain": "JavaScript",
      "difficulty": "medium",
      "status": "ready"
    },
    "databaseSession": {
      "id": "database-session-uuid",
      "session_name": "Dynamic Interview - JavaScript",
      "session_type": "dynamic_interview",
      "difficulty": "medium",
      "created_at": "2024-01-15T10:30:00Z"
    },
    "baselineQuestions": [
      {
        "id": "question-uuid",
        "text": "What is a closure in JavaScript?",
        "category": "Conceptual",
        "difficulty": "medium"
      }
    ]
  }
}
```

### Step 2: Baseline Question Generation
**Purpose**: Generate initial set of 10 questions for the question queue

**Process**:
1. Use RAG to retrieve contextual knowledge about the skill domain
2. Generate diverse questions using Ollama LLM
3. Categorize and process questions
4. Add questions to the session's question queue

**Automatic Process**: No API call required

### Step 3: Assessment Loop - Present Question
**Purpose**: Present the next question to the user

**Process**:
1. Get the next question from the front of the queue
2. Present question to user (text, audio, animation)
3. Capture user's spoken response
4. Transcribe the response

**API Endpoint**: `GET /api/dynamic-question-generator/session/:sessionId/next-question`

### Step 4: Answer Analysis
**Purpose**: Analyze the transcribed answer and calculate confidence score

**Process**:
1. Use RAG to get relevant knowledge for comparison
2. Generate analysis prompt with question and user answer
3. Use Ollama LLM to analyze the answer
4. Calculate confidence score (0.0 to 1.0)
5. Identify related topics and weak areas

**Automatic Process**: Part of answer processing

### Step 5: Adaptive Question Generation
**Purpose**: Determine next question based on confidence score

**Decision Logic**:
- **If confidence > 0.5**: Generate more advanced, related question
- **If confidence ≤ 0.5**: Generate simpler, foundational question

**Process**:
1. Analyze confidence score and performance patterns
2. Generate contextual question based on adaptive action
3. Add new question to front of question queue
4. Update session metrics and performance tracking

**API Endpoint**: `POST /api/dynamic-question-generator/session/:sessionId/process-answer`

**Example Request**:
```javascript
{
  "questionId": "question-uuid",
  "userAnswer": "A closure is a function that has access to variables in its outer scope...",
  "timeTakenSeconds": 45,
  "confidenceScore": 0.85
}
```

### Step 6: Loop Continuation
**Purpose**: Repeat the assessment loop until queue is empty

**Process**:
1. Check if question queue has remaining questions
2. If yes, return to Step 3
3. If no, proceed to Step 7

### Step 7: Performance Report Generation
**Purpose**: Generate comprehensive performance report

**Process**:
1. Calculate comprehensive session metrics
2. Generate AI insights using Ollama
3. Identify strengths and improvement areas
4. Create recommendations for next steps
5. Generate detailed performance report

**API Endpoint**: `POST /api/dynamic-question-generator/session/:sessionId/generate-report`

## Implementation Details

### Core Components

#### 1. DynamicQuestionGenerator Service
```javascript
import DynamicQuestionGenerator from '../services/dynamicQuestionGenerator.js';

const generator = new DynamicQuestionGenerator();
await generator.initialize();
```

**Key Methods**:
- `initializeSession()` - Step 1: Initialize session
- `getNextQuestion()` - Step 3: Get next question
- `processAnswer()` - Steps 4-5: Process answer and adapt
- `generatePerformanceReport()` - Step 7: Generate report

#### 2. RAG Integration
- **Knowledge Retrieval**: Uses RAG to get contextual knowledge for question generation
- **Answer Analysis**: Compares user answers against expert knowledge
- **Adaptive Generation**: Uses context to generate relevant follow-up questions

#### 3. Session Management
- **Session State**: Tracks session progress, metrics, and question queue
- **Performance Tracking**: Monitors confidence scores, improvement trends, consistency
- **Adaptive Logic**: Implements the confidence-based decision making

### Adaptive Logic Details

#### High Confidence Response (> 0.5)
```javascript
// Generate advanced question
const advancedQuestion = await this.generateAdvancedQuestion(
  sessionId,
  skillDomain,
  relatedTopics
);
```

**Characteristics**:
- **Difficulty**: Hard
- **Focus**: Advanced concepts, practical applications
- **Purpose**: Challenge user and test deeper understanding
- **Content**: Builds on demonstrated knowledge areas

#### Low Confidence Response (≤ 0.5)
```javascript
// Generate foundational question
const foundationalQuestion = await this.generateFoundationalQuestion(
  sessionId,
  skillDomain,
  weakAreas
);
```

**Characteristics**:
- **Difficulty**: Easy
- **Focus**: Fundamental concepts, basic understanding
- **Purpose**: Reinforce basics and build confidence
- **Content**: Addresses identified weak areas

### Performance Metrics

#### Session Metrics
```javascript
const metrics = {
  totalQuestions: 15,
  averageConfidence: 0.72,
  confidenceDistribution: {
    excellent: 3,  // > 0.8
    good: 6,       // 0.6-0.8
    fair: 4,       // 0.4-0.6
    poor: 2        // < 0.4
  },
  improvementTrend: 'improving',
  consistency: 'moderately_consistent',
  completionRate: 100
};
```

#### Confidence Score Calculation
```javascript
const confidenceScore = await this.analyzeAnswer(
  questionId,
  userAnswer,
  skillDomain,
  difficulty
);

// Analysis considers:
// - Accuracy of answer
// - Depth of understanding
// - Practical knowledge demonstrated
// - Communication clarity
// - Completeness of response
```

### Question Generation Process

#### Baseline Questions
```javascript
const baselineQuestions = await this.generateBaselineQuestions(
  'JavaScript',
  'medium',
  10
);
```

**Process**:
1. Retrieve contextual knowledge using RAG
2. Generate diverse questions covering different aspects
3. Categorize questions (Technical, Conceptual, Practical, etc.)
4. Set appropriate difficulty levels
5. Assess expected answer length

#### Adaptive Questions
```javascript
// Advanced question generation
const advancedQuestion = {
  text: "Explain the concept of closures in JavaScript and provide a practical example of how they can be used in a real-world application.",
  category: "Advanced",
  difficulty: "hard",
  expectedAnswerLength: "long",
  adaptiveType: "advanced"
};

// Foundational question generation
const foundationalQuestion = {
  text: "What is JavaScript and what is it commonly used for?",
  category: "Fundamentals",
  difficulty: "easy",
  expectedAnswerLength: "medium",
  adaptiveType: "foundational"
};
```

## API Reference

### Initialize Session
```http
POST /api/dynamic-question-generator/initialize
Authorization: Bearer <token>
Content-Type: application/json

{
  "skillDomain": "JavaScript",
  "difficulty": "medium",
  "userId": "user-uuid",
  "sessionName": "JavaScript Practice",
  "maxQuestions": 20
}
```

### Get Next Question
```http
GET /api/dynamic-question-generator/session/{sessionId}/next-question?includeAudio=true&includeAnimation=true
Authorization: Bearer <token>
```

**Query Parameters:**
- `includeAudio` (optional): `true`/`false` - Generate TTS audio for the question (default: `true`)
- `includeAnimation` (optional): `true`/`false` - Include facial expression and animation data (default: `true`)

### Process Answer
```http
POST /api/dynamic-question-generator/session/{sessionId}/process-answer
Authorization: Bearer <token>
Content-Type: application/json

{
  "questionId": "question-uuid",
  "userAnswer": "User's answer text",
  "timeTakenSeconds": 45,
  "confidenceScore": 0.85
}
```

### Generate Performance Report
```http
POST /api/dynamic-question-generator/session/{sessionId}/generate-report
Authorization: Bearer <token>
```

### Get Session Status
```http
GET /api/dynamic-question-generator/session/{sessionId}/status
Authorization: Bearer <token>
```

### Get Database Session ID
```http
GET /api/dynamic-question-generator/session/{sessionId}/database-id
Authorization: Bearer <token>
```

### Get Dynamic Session ID
```http
GET /api/dynamic-question-generator/database-session/{databaseSessionId}/dynamic-id
Authorization: Bearer <token>
```

### Get Available Skill Domains
```http
GET /api/dynamic-question-generator/skill-domains
Authorization: Bearer <token>
```

### Get Algorithm Explanation
```http
GET /api/dynamic-question-generator/algorithm
Authorization: Bearer <token>
```

## Usage Examples

### Complete Interview Flow
```javascript
// 1. Initialize session (creates both database and dynamic sessions)
const response = await fetch('/api/dynamic-question-generator/initialize', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + token },
  body: JSON.stringify({
    skillDomain: 'JavaScript',
    difficulty: 'medium',
    userId: userId
  })
}).then(r => r.json());

const { session, databaseSession } = response.data;
console.log('Dynamic Session ID:', session.id);
console.log('Database Session ID:', databaseSession.id);

// 2. Get first question with TTS and animation
const question = await fetch(`/api/dynamic-question-generator/session/${session.id}/next-question?includeAudio=true&includeAnimation=true`, {
  headers: { 'Authorization': 'Bearer ' + token }
}).then(r => r.json());

// 3. Use TTS audio and animation data in frontend
if (question.data.question.audio) {
  // Play the generated audio
  const audioBlob = new Blob([Buffer.from(question.data.question.audio, 'base64')], { type: 'audio/wav' });
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);
  audio.play();
  
  // Use lip sync data for animation
  const lipsyncData = question.data.question.lipsync;
  // Apply lip sync to 3D character
  
  // Use facial expression and animation
  const facialExpression = question.data.question.facialExpression; // 'smile', 'default', 'serious'
  const animation = question.data.question.animation; // 'Talking_1', 'Talking_2', 'Thinking'
}

// 4. User answers question (captured via voice/speech recognition)

// 5. Process answer
const result = await fetch(`/api/dynamic-question-generator/session/${session.id}/process-answer`, {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + token },
  body: JSON.stringify({
    questionId: question.questionId,
    userAnswer: transcribedAnswer,
    timeTakenSeconds: 45
  })
}).then(r => r.json());

// 6. Create conversation record using database session ID
await fetch('/api/conversations', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + token },
  body: JSON.stringify({
    session_id: databaseSession.id, // Use database session ID
    question_number: 1,
    question_text: question.data.question.text,
    question_category: question.data.question.category,
    question_difficulty: question.data.question.difficulty,
    llm_generated_answer: question.data.question.llmGeneratedAnswer,
    user_answer: transcribedAnswer
  })
}).then(r => r.json());

// 7. Repeat steps 2-6 until queue is empty

// 8. Generate performance report
const report = await fetch(`/api/dynamic-question-generator/session/${session.id}/generate-report`, {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + token }
}).then(r => r.json());
```

### Frontend Integration Example
```javascript
class DynamicInterview {
  constructor(userId, token) {
    this.userId = userId;
    this.token = token;
    this.dynamicSessionId = null;
    this.databaseSessionId = null;
  }

  async startInterview(skillDomain, difficulty) {
    // Initialize session (creates both database and dynamic sessions)
    const response = await this.callAPI('/initialize', {
      method: 'POST',
      body: JSON.stringify({
        skillDomain,
        difficulty,
        userId: this.userId
      })
    });

    this.dynamicSessionId = response.data.session.id;
    this.databaseSessionId = response.data.databaseSession.id;
    
    console.log('Dynamic Session ID:', this.dynamicSessionId);
    console.log('Database Session ID:', this.databaseSessionId);
    
    return response.data.baselineQuestions;
  }

  async getNextQuestion(includeAudio = true, includeAnimation = true) {
    const params = new URLSearchParams({
      includeAudio: includeAudio.toString(),
      includeAnimation: includeAnimation.toString()
    });
    return await this.callAPI(`/session/${this.dynamicSessionId}/next-question?${params}`);
  }

  async submitAnswer(questionId, userAnswer, timeTaken) {
    return await this.callAPI(`/session/${this.dynamicSessionId}/process-answer`, {
      method: 'POST',
      body: JSON.stringify({
        questionId,
        userAnswer,
        timeTakenSeconds: timeTaken
      })
    });
  }

  async createConversation(questionData, userAnswer) {
    // Use database session ID for persistent storage
    return await this.callAPI('/conversations', {
      method: 'POST',
      body: JSON.stringify({
        session_id: this.databaseSessionId, // Use database session ID
        question_number: questionData.questionNumber,
        question_text: questionData.text,
        question_category: questionData.category,
        question_difficulty: questionData.difficulty,
        llm_generated_answer: questionData.llmGeneratedAnswer,
        user_answer: userAnswer
      })
    });
  }

  async generateReport() {
    return await this.callAPI(`/session/${this.dynamicSessionId}/generate-report`, {
      method: 'POST'
    });
  }

  async getDatabaseSessionId() {
    return await this.callAPI(`/session/${this.dynamicSessionId}/database-id`);
  }

  async getDynamicSessionId() {
    return await this.callAPI(`/database-session/${this.databaseSessionId}/dynamic-id`);
  }

  async callAPI(endpoint, options = {}) {
    const response = await fetch(`/api/dynamic-question-generator${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    return await response.json();
  }
}
```

## Database Session Integration

### Session Structure Overview

The system maintains two types of sessions for optimal performance and persistence:

#### 1. **Database Session (PostgreSQL)**
- **Primary Key**: `id` (UUID)
- **Purpose**: Persistent storage for conversations, analytics, and session metadata
- **Location**: PostgreSQL database
- **Lifetime**: Permanent until manually deleted

```sql
-- Sessions table structure
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    session_name VARCHAR(100) NOT NULL,
    session_type VARCHAR(50) DEFAULT 'interview',
    difficulty VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'created',
    session_metadata JSONB,  -- Contains dynamic_session_id
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. **Dynamic Session (In-Memory)**
- **Primary Key**: `id` (UUID)
- **Purpose**: Real-time operations, question queue management, adaptive logic
- **Location**: Server memory
- **Lifetime**: Until server restart or session completion

### Session Linking Mechanism

#### Database Session Metadata Structure:
```json
{
  "session_metadata": {
    "skill_domain": "JavaScript",
    "max_questions": 20,
    "dynamic_session_id": "dynamic-session-uuid",
    "baseline_questions_count": 10,
    "session_status": "ready"
  }
}
```

#### Dynamic Session Configuration:
```javascript
{
  "id": "dynamic-session-uuid",
  "userId": "user-uuid",
  "skillDomain": "JavaScript",
  "difficulty": "medium",
  "databaseSessionId": "database-session-uuid", // Links to database session
  "status": "ready",
  "questionQueue": [...],
  "performanceMetrics": {...}
}
```

### Integration Workflow

#### 1. **Session Initialization**
```javascript
// Step 1: Create database session
const dbSession = await Session.create({
  user_id: userId,
  session_name: "Dynamic Interview - JavaScript",
  session_type: "dynamic_interview",
  difficulty: "medium",
  session_metadata: {
    skill_domain: "JavaScript",
    max_questions: 20,
    session_status: "initialized"
  }
});

// Step 2: Create dynamic session
const dynamicSession = await dynamicQuestionGenerator.initializeSession({
  skillDomain: "JavaScript",
  difficulty: "medium",
  userId: userId,
  databaseSessionId: dbSession.id // Link to database session
});

// Step 3: Update database session with dynamic session ID
await dbSession.update({
  session_metadata: {
    ...dbSession.session_metadata,
    dynamic_session_id: dynamicSession.id, // Store in metadata
    baseline_questions_count: dynamicSession.baselineQuestions.length,
    session_status: "ready"
  }
});
```

#### 2. **Session ID Retrieval**

**Get Database Session ID from Dynamic Session:**
```javascript
const databaseSessionId = dynamicQuestionGenerator.getDatabaseSessionId(dynamicSessionId);
```

**Get Dynamic Session ID from Database Session:**
```javascript
const dynamicSessionId = await dynamicQuestionGenerator.getDynamicSessionIdFromDatabase(databaseSessionId);
```

### Usage Guidelines

#### **When to Use Database Session ID:**
- ✅ **Conversations**: `POST /api/conversations` with `session_id`
- ✅ **Analytics**: Query conversations by database session ID
- ✅ **Performance Records**: Link performance data to database session
- ✅ **Persistent Storage**: All data that needs to survive server restarts

#### **When to Use Dynamic Session ID:**
- ✅ **Real-time Operations**: Get questions, process answers
- ✅ **TTS Generation**: Generate audio for questions
- ✅ **Adaptive Logic**: Adjust difficulty based on performance
- ✅ **Session Status**: Check current session state

### API Integration Examples

#### **Complete Interview Flow with Database Integration:**
```javascript
// 1. Initialize both sessions
const response = await fetch('/api/dynamic-question-generator/initialize', {
  method: 'POST',
  body: JSON.stringify({
    skillDomain: 'JavaScript',
    difficulty: 'medium',
    userId: userId
  })
});

const { session, databaseSession } = response.data;

// 2. Use dynamic session for real-time operations
const question = await fetch(`/api/dynamic-question-generator/session/${session.id}/next-question`);
const answerResult = await fetch(`/api/dynamic-question-generator/session/${session.id}/process-answer`, {
  method: 'POST',
  body: JSON.stringify({ questionId, userAnswer, timeTaken })
});

// 3. Use database session for persistent storage
const conversation = await fetch('/api/conversations', {
  method: 'POST',
  body: JSON.stringify({
    session_id: databaseSession.id, // Use database session ID
    question_number: 1,
    question_text: question.text,
    question_category: question.category,
    question_difficulty: question.difficulty,
    llm_generated_answer: question.llmGeneratedAnswer,
    user_answer: userAnswer
  })
});

// 4. Get session insights using database session ID
const insights = await fetch(`/api/performance/session/${databaseSession.id}/insights`);
```

### Error Handling

#### **Session Not Found Errors:**
- **Dynamic Session**: Use dynamic session ID for real-time operations
- **Database Session**: Use database session ID for persistent operations
- **Conversations API**: Always use database session ID

#### **Session Linking Errors:**
```javascript
// Check if sessions are properly linked
const databaseId = dynamicQuestionGenerator.getDatabaseSessionId(dynamicSessionId);
const dynamicId = await dynamicQuestionGenerator.getDynamicSessionIdFromDatabase(databaseSessionId);

if (!databaseId || !dynamicId) {
  console.error('Session linking error - sessions not properly connected');
}
```

## TTS (Text-to-Speech) Integration

### Overview
The Dynamic Question Generator now includes full TTS integration, allowing the AI interviewer to speak questions aloud to users. This creates a more immersive and accessible interview experience.

### TTS Features

#### 1. **Automatic Audio Generation**
- Questions are automatically converted to speech using Piper TTS
- High-quality voice synthesis with natural pronunciation
- Base64 encoded audio for easy frontend integration

#### 2. **Lip Sync Support**
- Rhubarb Lip Sync integration for realistic mouth movements
- JSON transcript data for precise lip synchronization
- Phonetic analysis for accurate timing

#### 3. **Dynamic Facial Expressions**
- **Easy Questions**: `smile` - Encouraging and friendly
- **Medium Questions**: `default` - Professional and neutral
- **Hard Questions**: `serious` - Focused and challenging

#### 4. **Context-Aware Animations**
- **Technical Questions**: `Talking_1` - Direct and precise
- **Conceptual Questions**: `Talking_2` - Thoughtful and explanatory
- **Practical Questions**: `Talking_3` - Engaging and hands-on
- **Problem-solving**: `Thinking` - Analytical and methodical

### TTS Configuration

#### Audio Generation
```javascript
// Automatic TTS generation for questions
const question = await generator.getNextQuestion(sessionId, {
  includeAudio: true,        // Generate TTS audio
  includeAnimation: true     // Include facial expressions and animations
});

// Response includes:
{
  questionId: "uuid",
  text: "What is a closure in JavaScript?",
  audio: "base64_encoded_audio_data",     // TTS audio
  lipsync: { /* lip sync JSON data */ },  // Lip sync timing
  facialExpression: "default",            // Difficulty-based expression
  animation: "Talking_1",                 // Category-based animation
  audioGenerated: true                    // Success flag
}
```

#### Frontend Integration
```javascript
// Play TTS audio in frontend
if (question.audio) {
  const audioBlob = new Blob([Buffer.from(question.audio, 'base64')], { 
    type: 'audio/wav' 
  });
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);
  
  audio.play();
  
  // Apply lip sync to 3D character
  applyLipSync(question.lipsync);
  
  // Set facial expression and animation
  setFacialExpression(question.facialExpression);
  playAnimation(question.animation);
}
```

### TTS File Management

#### Audio Files
- **Location**: `audios/` directory
- **Naming**: `dynamic_question_{number}_{timestamp}.wav`
- **Format**: WAV format for high quality
- **Cleanup**: Automatic cleanup after base64 conversion

#### Lip Sync Files
- **Location**: `audios/` directory
- **Naming**: `dynamic_question_{number}_{timestamp}.json`
- **Format**: JSON with timing and phoneme data
- **Usage**: Precise lip synchronization for 3D characters

### Performance Optimization

#### Caching Strategy
- **Audio Caching**: Cache generated audio for repeated questions
- **Model Caching**: Keep Piper TTS model loaded in memory
- **Batch Processing**: Generate multiple audio files efficiently

#### Error Handling
- **Graceful Degradation**: Continue without audio if TTS fails
- **Fallback Options**: Use text-only mode if audio generation fails
- **Retry Logic**: Automatic retry for transient TTS failures

### API Parameters

#### Query Parameters
```http
GET /api/dynamic-question-generator/session/{sessionId}/next-question?includeAudio=true&includeAnimation=true
```

- `includeAudio`: `true`/`false` - Generate TTS audio (default: `true`)
- `includeAnimation`: `true`/`false` - Include animation data (default: `true`)

#### Response Format
```javascript
{
  "success": true,
  "message": "Next question retrieved successfully",
  "data": {
    "question": {
      "questionId": "uuid",
      "text": "Question text",
      "audio": "base64_audio_data",
      "lipsync": { /* lip sync data */ },
      "facialExpression": "smile|default|serious",
      "animation": "Talking_1|Talking_2|Talking_3|Thinking",
      "audioGenerated": true
    },
    "ttsInfo": {
      "audioGenerated": true,
      "facialExpression": "smile",
      "animation": "Talking_1"
    }
  }
}
```

## Testing

### Run Tests
```bash
# Test dynamic question generation
npm run test-dynamic-generator

# Test database session structure integration
npm run test-database-structure
```

### Test Coverage
- Service initialization
- Session initialization with skill domain and difficulty
- Database session creation and linking
- Dynamic session creation with database session ID
- Session metadata storage and retrieval
- Bidirectional session ID mapping
- Baseline question generation
- Question retrieval from queue
- Answer processing with confidence scoring
- Adaptive question generation (advanced vs foundational)
- Performance report generation
- Session status tracking
- Skill domain management

### Database Integration Tests
```javascript
// Test session linking
const dynamicSessionId = 'dynamic-session-uuid';
const databaseSessionId = dynamicQuestionGenerator.getDatabaseSessionId(dynamicSessionId);

// Test reverse lookup
const retrievedDynamicSessionId = await dynamicQuestionGenerator.getDynamicSessionIdFromDatabase(databaseSessionId);

// Verify linking
assert.equal(dynamicSessionId, retrievedDynamicSessionId);
```

### Test Scenarios
1. **High Confidence Path**: User provides excellent answers → Advanced questions generated
2. **Low Confidence Path**: User struggles with answers → Foundational questions generated
3. **Mixed Performance**: User shows varying performance → Balanced adaptive approach
4. **Edge Cases**: Empty answers, very short answers, very long answers
5. **Session Management**: Multiple sessions, session persistence, cleanup

## Performance Optimization

### Caching Strategy
- **Question Cache**: Cache generated questions to avoid regeneration
- **Knowledge Cache**: Cache RAG search results for faster retrieval
- **Session Cache**: Keep active sessions in memory for quick access

### Batch Operations
- **Question Generation**: Generate multiple questions in batches
- **Answer Processing**: Process multiple answers efficiently
- **Report Generation**: Optimize report generation for large sessions

### Memory Management
- **Session Cleanup**: Automatically clean up completed sessions
- **Queue Management**: Efficient queue operations for large question sets
- **Resource Monitoring**: Monitor memory usage and optimize accordingly

## Error Handling

### Graceful Degradation
- **LLM Failures**: Fallback to pre-generated questions
- **RAG Failures**: Use basic question generation without context
- **Service Failures**: Continue with existing functionality

### Error Recovery
- **Session Recovery**: Restore session state after failures
- **Question Recovery**: Regenerate lost questions
- **Data Persistence**: Ensure session data is preserved

## Monitoring and Analytics

### Session Metrics
- **Performance Tracking**: Monitor confidence scores and trends
- **Adaptation Effectiveness**: Track how well adaptive questions improve performance
- **User Engagement**: Monitor session completion rates and duration

### System Metrics
- **Question Generation Time**: Track time to generate questions
- **Answer Analysis Time**: Monitor analysis performance
- **Service Health**: Monitor service availability and performance

## Troubleshooting

### Common Database Integration Issues

#### 1. **"Session not found" Error in Conversations API**
```javascript
// ❌ Wrong - Using dynamic session ID
POST /api/conversations
{
  "session_id": "dynamic-session-uuid" // This will fail
}

// ✅ Correct - Using database session ID
POST /api/conversations
{
  "session_id": "database-session-uuid" // This will work
}
```

#### 2. **Session Linking Failures**
```javascript
// Check if sessions are properly linked
const databaseId = dynamicQuestionGenerator.getDatabaseSessionId(dynamicSessionId);
if (!databaseId) {
  console.error('Dynamic session not linked to database session');
}

// Verify metadata contains dynamic_session_id
const dbSession = await Session.findById(databaseId);
if (!dbSession.session_metadata.dynamic_session_id) {
  console.error('Database session missing dynamic_session_id in metadata');
}
```

#### 3. **Session ID Mismatch**
```javascript
// Always use the correct session ID for each operation
const response = await initializeSession();

// For real-time operations
const question = await getNextQuestion(response.data.session.id);

// For persistent storage
const conversation = await createConversation(response.data.databaseSession.id);
```

### Debugging Session State
```javascript
// Get comprehensive session debug info
GET /api/dynamic-question-generator/session/{sessionId}/debug

// Response includes:
{
  "session": {
    "id": "dynamic-session-id",
    "databaseSessionId": "database-session-id",
    "status": "ready",
    "questionsAnswered": 0
  },
  "queue": {
    "length": 10,
    "questions": [...]
  },
  "debug": {
    "sessionsMapSize": 1,
    "questionQueueMapSize": 1,
    "allSessionIds": ["dynamic-session-id"]
  }
}
```

## Best Practices

### 1. Session Management
- **Clear Initialization**: Always initialize sessions with proper configuration
- **State Tracking**: Maintain accurate session state throughout the process
- **Cleanup**: Properly clean up completed sessions
- **ID Usage**: Use correct session ID for each operation type

### 2. Database Integration
- **Session Linking**: Always verify sessions are properly linked
- **Metadata Storage**: Store dynamic_session_id in session_metadata JSONB field
- **Persistent Operations**: Use database session ID for all persistent storage
- **Real-time Operations**: Use dynamic session ID for all real-time operations

### 3. Question Quality
- **Diverse Content**: Ensure questions cover different aspects of the skill domain
- **Appropriate Difficulty**: Match question difficulty to user level
- **Clear Instructions**: Provide clear, unambiguous questions

### 4. Adaptive Logic
- **Balanced Approach**: Don't be too aggressive with difficulty changes
- **Context Awareness**: Consider previous performance when adapting
- **User Feedback**: Use confidence scores and timing data effectively

### 5. Performance Optimization
- **Efficient Generation**: Optimize question generation for speed
- **Smart Caching**: Cache frequently accessed data
- **Resource Management**: Monitor and optimize resource usage
- **Session Cleanup**: Automatically clean up completed dynamic sessions

This Dynamic Question Generation Algorithm provides a sophisticated, adaptive interview experience that personalizes the learning journey based on individual performance and needs, with full integration between real-time dynamic sessions and persistent database storage.
