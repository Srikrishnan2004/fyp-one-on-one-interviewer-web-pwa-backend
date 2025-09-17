# RAG (Retrieval-Augmented Generation) Setup Guide

This guide will help you set up the RAG system with local embedding models and ChromaDB for your Virtual Interviewer Backend.

## Overview

The RAG system consists of:
- **Local Embedding Model**: all-MiniLM-L6-v2 (downloaded locally, no API key needed)
- **ChromaDB**: Vector database for storing and retrieving embeddings
- **Ollama Integration**: Enhanced question generation with knowledge retrieval
- **Knowledge Base**: Interview questions, answers, and technical knowledge

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (for user data)
- Python 3.x (for TTS functionality)
- At least 2GB free disk space (for model storage)

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Test the Embedding Service

Test the embedding service to ensure it's working correctly:

```bash
npm run test-embedding
```

This will:
- Initialize the embedding service with Xenova/all-MiniLM-L6-v2 model
- Test single and multiple embedding generation
- Verify similarity calculations
- Confirm the service is working correctly
- Use fallback to DistilBERT if needed

### 3. Environment Configuration

Update your `.env` file:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=virtual_interviewer_db
DB_USER=postgres
DB_PASSWORD=your_password_here

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=3000
NODE_ENV=development

# ChromaDB Configuration
CHROMA_DB_PATH=./chroma_db

# Local Model Configuration
EMBEDDING_MODEL_PATH=./models/embeddings
EMBEDDING_MODEL_NAME=Xenova/all-MiniLM-L6-v2

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

### 4. Initialize the Database

Run the database setup script:

```bash
psql -d virtual_interviewer_db -f database_setup.sql
```

### 5. Start the Application

```bash
npm run dev
```

## RAG API Endpoints

### Health Check
```bash
GET /api/rag/health
```

### Add Knowledge
```bash
POST /api/rag/knowledge
Content-Type: application/json
Authorization: Bearer <token>

{
  "text": "JavaScript is a programming language...",
  "title": "JavaScript Overview",
  "category": "technical",
  "difficulty": "beginner",
  "tags": ["javascript", "programming"]
}
```

### Search Knowledge
```bash
POST /api/rag/search
Content-Type: application/json
Authorization: Bearer <token>

{
  "query": "JavaScript closures",
  "category": "technical",
  "nResults": 5
}
```

### Generate RAG-Enhanced Questions
```bash
POST /api/rag/questions/generate
Content-Type: application/json
Authorization: Bearer <token>

{
  "topic": "JavaScript",
  "difficulty": "intermediate",
  "category": "technical",
  "count": 5
}
```

### Add Interview Questions
```bash
POST /api/rag/questions
Content-Type: application/json
Authorization: Bearer <token>

{
  "question": "What is a closure in JavaScript?",
  "answer": "A closure is a function that has access to...",
  "category": "technical",
  "difficulty": "intermediate",
  "topic": "JavaScript"
}
```

## Testing the RAG System

### 1. Test Embedding Service
```bash
curl -X GET http://localhost:3000/api/rag/test/embedding \
  -H "Authorization: Bearer <token>"
```

### 2. Test ChromaDB
```bash
curl -X GET http://localhost:3000/api/rag/test/chroma \
  -H "Authorization: Bearer <token>"
```

### 3. Test Complete RAG System
```bash
curl -X GET http://localhost:3000/api/rag/health \
  -H "Authorization: Bearer <token>"
```

## Sample Data Population

You can populate the knowledge base with sample data:

```bash
# Add sample interview questions
curl -X POST http://localhost:3000/api/rag/questions/batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "questions": [
      {
        "question": "What is the difference between let, const, and var in JavaScript?",
        "answer": "let and const are block-scoped...",
        "category": "technical",
        "difficulty": "intermediate",
        "topic": "JavaScript"
      }
    ]
  }'
```

## Model Information

### Xenova/all-MiniLM-L6-v2 (Primary)
- **Size**: ~80MB
- **Dimensions**: 384
- **Language**: English
- **Use Case**: Sentence embeddings, semantic search
- **Performance**: Fast inference, good quality embeddings

### Xenova/distilbert-base-uncased (Fallback)
- **Size**: ~250MB
- **Dimensions**: 768
- **Language**: English
- **Use Case**: General text embeddings
- **Performance**: Higher quality, slightly slower

### Storage Location
- **Model Files**: `./models/embeddings/`
- **ChromaDB**: `./chroma_db/`
- **Knowledge Base**: `./knowledge_base/`

## Troubleshooting

### Model Download Issues
```bash
# Clear model cache and re-download
rm -rf ./models/embeddings
npm run download-model
```

### ChromaDB Issues
```bash
# Reset ChromaDB
rm -rf ./chroma_db
# Restart the application
npm run dev
```

### Memory Issues
- The model uses ~200MB RAM when loaded
- Reduce batch size in `generateEmbeddings()` if needed
- Monitor memory usage with large knowledge bases

### Performance Optimization
- Use SSD storage for better I/O performance
- Increase Node.js memory limit: `node --max-old-space-size=4096 index.js`
- Consider using a more powerful machine for large-scale deployments

## Advanced Configuration

### Custom Model Path
```env
EMBEDDING_MODEL_PATH=/path/to/your/models
```

### ChromaDB Configuration
```env
CHROMA_DB_PATH=/path/to/chroma/database
```

### Batch Processing
Modify batch size in `embeddingService.js`:
```javascript
const batchSize = 5; // Reduce for lower memory usage
```

## Integration with Existing Features

The RAG system integrates seamlessly with your existing:
- User authentication system
- Session management
- Conversation tracking
- Performance analytics

## Next Steps

1. **Populate Knowledge Base**: Add your interview questions and technical knowledge
2. **Test RAG Queries**: Use the search and generation endpoints
3. **Monitor Performance**: Check embedding generation speed and accuracy
4. **Scale Up**: Add more knowledge as your system grows

## Support

For issues or questions:
1. Check the health endpoints for service status
2. Review logs for error messages
3. Test individual components (embedding, ChromaDB)
4. Verify environment configuration

The RAG system is now ready to enhance your virtual interviewer with intelligent knowledge retrieval and question generation!
