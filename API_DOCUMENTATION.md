# Virtual AI Interviewer Backend - API Documentation

This document provides comprehensive information about all available API endpoints, request formats, and response structures for the Virtual AI Interviewer Backend.

## Base URL

```
http://localhost:3000
```

## Table of Contents

- [Basic Routes](#basic-routes)
- [Chat Routes](#chat-routes)
- [Interview Template Routes](#interview-template-routes)
- [Interview Generation Routes](#interview-generation-routes)
- [Resume-Specific Routes](#resume-specific-routes)
- [Error Handling](#error-handling)
- [Template Categories](#template-categories)

---

## Basic Routes

### GET `/`

**Description**: Health check endpoint that returns a welcome message.

**Request**: No parameters required

**Response**:

```
"Hello World!"
```

**Example**:

```bash
curl http://localhost:3000/
```

---

### GET `/voices`

**Description**: Retrieves a list of available Piper TTS voice models.

**Request**: No parameters required

**Response**:

```json
[
  "en_US-amy-medium.onnx",
  "en_GB-alan-medium.onnx",
  "en_GB-northern_english_male-medium.onnx",
  "hi_IN-pratham-medium.onnx"
]
```

**Example**:

```bash
curl http://localhost:3000/voices
```

---

## Chat Routes

### POST `/chat`

**Description**: Interactive AI interviewer chat with voice synthesis and lip-sync generation.

**Request Body**:

```json
{
  "message": "string (optional)"
}
```

**Response Format**:

```json
{
  "messages": [
    {
      "text": "Response text from AI interviewer",
      "audio": "base64_encoded_audio_data",
      "lipsync": {
        "metadata": {...},
        "mouthCues": [...]
      },
      "facialExpression": "smile|default|sad",
      "animation": "Talking_1|Talking_2|Idle|Crying"
    }
  ]
}
```

**Behavior**:

- If no message is provided, returns default welcome messages
- Generates AI responses using Ollama LLM
- Converts text to speech using Piper TTS
- Creates lip-sync data using Rhubarb Lip-Sync

**Example**:

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, I want to practice for a React interview"}'
```

---

## Interview Template Routes

### GET `/interview/templates`

**Description**: Retrieves all available interview templates across all categories.

**Request**: No parameters required

**Response Format**:

```json
{
  "success": true,
  "templates": [
    {
      "key": "languages.java",
      "category": "languages",
      "name": "Java Interview",
      "model": "codellama:latest",
      "description": "Generate challenging Java interview questions..."
    }
  ],
  "count": 23
}
```

**Example**:

```bash
curl http://localhost:3000/interview/templates
```

---

### GET `/interview/templates/search`

**Description**: Search templates by keyword in name or description.

**Query Parameters**:

- `q` (required): Search term

**Response Format**:

```json
{
  "success": true,
  "templates": [
    {
      "key": "frameworks.react",
      "category": "frameworks",
      "name": "React Interview",
      "model": "codellama:latest",
      "description": "Generate challenging React interview questions..."
    }
  ],
  "count": 1,
  "query": "react"
}
```

**Example**:

```bash
curl "http://localhost:3000/interview/templates/search?q=react"
```

---

### GET `/interview/templates/stats`

**Description**: Get statistics about template distribution and usage.

**Request**: No parameters required

**Response Format**:

```json
{
  "success": true,
  "stats": {
    "totalTemplates": 23,
    "categoryCounts": {
      "languages": 5,
      "frameworks": 6,
      "databases": 6,
      "resume": 6
    },
    "models": ["codellama:latest"]
  }
}
```

**Example**:

```bash
curl http://localhost:3000/interview/templates/stats
```

---

## Interview Generation Routes

### POST `/interview/generate`

**Description**: Generate interview questions using a specific template.

**Request Body**:

```json
{
  "template": "string (required) - Template key in format 'category.key'",
  "context": "string (optional) - Additional context for question generation",
  "includeAudio": "boolean (optional, default: false) - Generate TTS audio and lip-sync"
}
```

**Response Format (without audio)**:

```json
{
  "success": true,
  "template": "languages.java",
  "questions": [
    {
      "text": "Explain the difference between ArrayList and LinkedList in Java",
      "difficulty": "intermediate",
      "category": "Collections",
      "followUp": "When would you choose one over the other?"
    }
  ],
  "count": 10,
  "audioGenerated": false
}
```

**Response Format (with audio - when includeAudio: true)**:

```json
{
  "success": true,
  "template": "languages.java",
  "questions": [
    {
      "text": "Explain the difference between ArrayList and LinkedList in Java",
      "difficulty": "intermediate",
      "category": "Collections",
      "followUp": "When would you choose one over the other?",
      "audio": "base64_encoded_audio_data",
      "lipsync": {
        "metadata": {...},
        "mouthCues": [...]
      },
      "facialExpression": "default|smile|serious",
      "animation": "Talking_1|Talking_2|Thinking|Explaining"
    }
  ],
  "count": 10,
  "audioGenerated": true
}
```

**Available Templates**:

#### Languages

- `languages.java` - Java OOP, Collections, Multithreading
- `languages.javascript` - ES6+, Closures, Async/Await
- `languages.golang` - Goroutines, Channels, Concurrency
- `languages.python` - OOP, Decorators, Generators
- `languages.csharp` - .NET, LINQ, Entity Framework

#### Frameworks

- `frameworks.react` - Hooks, State Management, Performance
- `frameworks.nodejs` - Event Loop, Modules, Express.js
- `frameworks.nextjs` - SSR/SSG, API Routes, Deployment
- `frameworks.springboot` - DI, REST APIs, Security
- `frameworks.express` - Middleware, Routing, Authentication
- `frameworks.angular` - Components, Services, RxJS

#### Databases

- `databases.mysql` - SQL Optimization, Indexing, Transactions
- `databases.postgresql` - Advanced SQL, Extensions, Performance
- `databases.mongodb` - Document Modeling, Aggregation, Sharding
- `databases.redis` - Data Structures, Caching, Pub/Sub
- `databases.sqlite` - Embedded DB, WAL Mode, FTS
- `databases.cassandra` - Distributed Architecture, CQL

#### Resume

- `resume.general` - General resume-based questions
- `resume.technical` - Technical skills analysis
- `resume.behavioral` - Behavioral competencies
- `resume.career` - Career progression analysis
- `resume.project` - Project-based questions
- `resume.achievements` - Achievements and impact focus

**Examples**:

**Generate questions without audio**:

```bash
curl -X POST http://localhost:3000/interview/generate \
  -H "Content-Type: application/json" \
  -d '{
    "template": "languages.java",
    "context": "Senior developer position with 5+ years experience"
  }'
```

**Generate questions with TTS audio and lip-sync**:

```bash
curl -X POST http://localhost:3000/interview/generate \
  -H "Content-Type: application/json" \
  -d '{
    "template": "languages.java",
    "context": "Senior developer position with 5+ years experience",
    "includeAudio": true
  }'
```

---

## Resume-Specific Routes

### POST `/interview/resume/analyze`

**Description**: Analyze resume content and generate contextual interview questions.

**Request Body**:

```json
{
  "resumeContent": "string (required) - Full resume text content",
  "template": "string (optional, default: 'resume.general') - Resume template type",
  "includeAudio": "boolean (optional, default: false) - Generate TTS audio and lip-sync"
}
```

**Response Format (without audio)**:

```json
{
  "success": true,
  "template": "resume.technical",
  "questions": [
    {
      "text": "I see you worked with React for 3 years at Company X. Can you walk me through a challenging React project you completed there?",
      "difficulty": "intermediate",
      "category": "Technical Experience",
      "followUp": "What specific challenges did you face and how did you overcome them?",
      "resumeContext": "React experience at Company X"
    }
  ],
  "count": 10,
  "resumeAnalyzed": true,
  "audioGenerated": false
}
```

**Response Format (with audio - when includeAudio: true)**:

```json
{
  "success": true,
  "template": "resume.technical",
  "questions": [
    {
      "text": "I see you worked with React for 3 years at Company X. Can you walk me through a challenging React project you completed there?",
      "difficulty": "intermediate",
      "category": "Technical Experience",
      "followUp": "What specific challenges did you face and how did you overcome them?",
      "resumeContext": "React experience at Company X",
      "audio": "base64_encoded_audio_data",
      "lipsync": {
        "metadata": {...},
        "mouthCues": [...]
      },
      "facialExpression": "default|smile|serious",
      "animation": "Talking_1|Talking_2|Thinking|Explaining"
    }
  ],
  "count": 10,
  "resumeAnalyzed": true,
  "audioGenerated": true
}
```

**Examples**:

**Analyze resume without audio**:

```bash
curl -X POST http://localhost:3000/interview/resume/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "resumeContent": "John Doe - Senior Software Engineer with 5 years of experience in React, Node.js, and AWS...",
    "template": "resume.technical"
  }'
```

**Analyze resume with TTS audio and lip-sync**:

```bash
curl -X POST http://localhost:3000/interview/resume/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "resumeContent": "John Doe - Senior Software Engineer with 5 years of experience in React, Node.js, and AWS...",
    "template": "resume.technical",
    "includeAudio": true
  }'
```

---

### GET `/interview/resume/templates`

**Description**: Get only resume-specific interview templates.

**Request**: No parameters required

**Response Format**:

```json
{
  "success": true,
  "templates": [
    {
      "key": "resume.general",
      "category": "resume",
      "name": "General Resume Interview",
      "model": "codellama:latest",
      "description": "Generate challenging interview questions that analyze..."
    }
  ],
  "count": 6,
  "description": "Resume-specific interview templates"
}
```

**Example**:

```bash
curl http://localhost:3000/interview/resume/templates
```

---

## Error Handling

All endpoints return consistent error responses in the following format:

### Error Response Format

```json
{
  "success": false,
  "error": "Error description",
  "message": "Detailed error message"
}
```

### Common HTTP Status Codes

- `200` - Success
- `400` - Bad Request (missing required parameters)
- `500` - Internal Server Error (server-side issues)

### Example Error Responses

**Missing Template Parameter**:

```json
{
  "success": false,
  "error": "Template key is required",
  "example": "languages.java"
}
```

**Missing Search Query**:

```json
{
  "success": false,
  "error": "Search query parameter 'q' is required"
}
```

**Service Unavailable**:

```json
{
  "success": false,
  "error": "Failed to generate interview questions",
  "message": "Ollama service not available"
}
```

---

## Template Categories

### Summary

| Category       | Count  | Focus Area                                      |
| -------------- | ------ | ----------------------------------------------- |
| **Languages**  | 5      | Programming language fundamentals               |
| **Frameworks** | 6      | Web frameworks and libraries                    |
| **Databases**  | 6      | Database design and optimization                |
| **Resume**     | 6      | Resume-based behavioral and technical questions |
| **Total**      | **23** | **Comprehensive Interview Coverage**            |

### Question Format

All generated questions follow this structure:

**Basic Format (without audio)**:

```json
{
  "text": "The actual interview question",
  "difficulty": "beginner|intermediate|advanced",
  "category": "Question category/topic",
  "followUp": "Optional follow-up question or probe",
  "resumeContext": "Reference to resume section (resume templates only)"
}
```

**Enhanced Format (with audio - when includeAudio: true)**:

```json
{
  "text": "The actual interview question",
  "difficulty": "beginner|intermediate|advanced",
  "category": "Question category/topic",
  "followUp": "Optional follow-up question or probe",
  "resumeContext": "Reference to resume section (resume templates only)",
  "audio": "base64_encoded_audio_data",
  "lipsync": {
    "metadata": {...},
    "mouthCues": [...]
  },
  "facialExpression": "smile|default|serious",
  "animation": "Talking_1|Talking_2|Thinking|Explaining|Idle"
}
```

### Audio Features

When `includeAudio: true` is specified, each question includes:

- **audio**: Base64-encoded WAV audio data generated using Piper TTS
- **lipsync**: Lip-sync data generated using Rhubarb Lip-Sync for mouth animation
- **facialExpression**: Facial expression based on question difficulty:
  - `smile` - Beginner questions
  - `default` - Intermediate questions
  - `serious` - Advanced questions
- **animation**: Animation type based on question category:
  - `Talking_1` - Technical, Coding, Framework, General questions
  - `Talking_2` - Behavioral, Database questions
  - `Thinking` - Problem-solving questions
  - `Explaining` - System Design questions

---

## Requirements

### System Dependencies

- **Ollama**: Running locally on port 11434
- **CodeLLaMA Model**: `ollama pull codellama:latest`
- **Python**: For Piper TTS script
- **Rhubarb Lip-Sync**: For lip-sync generation

### Node.js Dependencies

```json
{
  "express": "^4.18.2",
  "node-fetch": "^3.3.2",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1",
  "pdf2pic": "^3.2.0",
  "tesseract.js": "^6.0.1"
}
```

---

## Getting Started

1. **Start Ollama Service**:

   ```bash
   ollama serve
   ```

2. **Install CodeLLaMA Model**:

   ```bash
   ollama pull codellama:latest
   ```

3. **Start the Server**:

   ```bash
   npm start
   # or
   npm run dev
   ```

4. **Test the API**:
   ```bash
   curl http://localhost:3000/
   ```

The Virtual AI Interviewer Backend will be running on `http://localhost:3000` and ready to generate intelligent interview questions across 23 different technology templates!
