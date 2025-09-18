# RAG (Retrieval-Augmented Generation) & ChromaDB Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [RAG Architecture](#rag-architecture)
3. [ChromaDB Implementation](#chromadb-implementation)
4. [Data Structure in ChromaDB](#data-structure-in-chromadb)
5. [Embedding Models](#embedding-models)
6. [API Endpoints](#api-endpoints)
7. [Setup Instructions](#setup-instructions)
8. [Usage Examples](#usage-examples)
9. [Performance Considerations](#performance-considerations)
10. [Troubleshooting](#troubleshooting)

## Overview

This system implements a **Retrieval-Augmented Generation (RAG)** approach using **ChromaDB** as the vector database for storing and retrieving knowledge embeddings. The RAG system enhances the AI interviewer's capabilities by providing contextually relevant information from a knowledge base.

### Key Components
- **ChromaDB**: Vector database for storing embeddings
- **Embedding Service**: Converts text to vector embeddings
- **RAG Service**: Orchestrates retrieval and generation
- **Knowledge Base Service**: Manages knowledge storage and retrieval
- **Ollama Integration**: LLM for generating responses

## RAG Architecture

### What is RAG?
RAG (Retrieval-Augmented Generation) is a technique that combines:
1. **Retrieval**: Finding relevant information from a knowledge base
2. **Augmentation**: Enhancing the input with retrieved context
3. **Generation**: Using an LLM to generate responses based on the augmented input

### RAG Flow Diagram
```
User Query → Embedding Generation → Vector Search → Knowledge Retrieval
                                                           ↓
Response Generation ← LLM Processing ← Context Augmentation
```

### Benefits of RAG
- **Accuracy**: Provides factual information from knowledge base
- **Context**: Maintains relevant context across conversations
- **Scalability**: Can handle large knowledge bases efficiently
- **Flexibility**: Easy to update and expand knowledge

## ChromaDB Implementation

### What is ChromaDB?
ChromaDB is an open-source vector database designed for storing and querying embeddings. It provides:
- **Vector Storage**: Efficient storage of high-dimensional vectors
- **Similarity Search**: Fast retrieval of similar vectors
- **Metadata Support**: Store additional information with vectors
- **Scalability**: Handle large-scale vector operations

### ChromaDB Architecture
```
ChromaDB Server
├── Collections (Knowledge Bases)
│   ├── Documents (Text Content)
│   ├── Embeddings (Vector Representations)
│   └── Metadata (Additional Information)
└── Indexes (For Fast Retrieval)
```

### Server Configuration
The system uses ChromaDB in server-client mode:

```javascript
// ChromaDB Configuration
const chromaConfig = {
  host: process.env.CHROMA_HOST || 'localhost',
  port: process.env.CHROMA_PORT || 8000,
  collectionName: 'interview_knowledge'
};
```

## Data Structure in ChromaDB

### Collection Structure
Each ChromaDB collection contains:

#### 1. **Documents**
```javascript
{
  id: "unique_document_id",
  text: "The actual knowledge content",
  metadata: {
    title: "Document Title",
    category: "Technical",
    difficulty: "medium",
    tags: ["javascript", "closures"],
    source: "knowledge_base",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  }
}
```

#### 2. **Embeddings**
```javascript
{
  id: "unique_document_id",
  embedding: [0.1, -0.2, 0.3, ..., 0.384], // 384-dimensional vector
  metadata: {
    model: "Xenova/all-MiniLM-L6-v2",
    dimension: 384,
    created_at: "2024-01-01T00:00:00Z"
  }
}
```

#### 3. **Metadata Schema**
```javascript
const metadataSchema = {
  // Core Fields
  title: "string",           // Document title
  category: "string",        // Knowledge category (Technical, Behavioral, etc.)
  difficulty: "string",      // Difficulty level (easy, medium, hard)
  tags: ["string"],          // Array of tags for categorization
  
  // Source Information
  source: "string",          // Source of the knowledge
  url: "string",            // Optional URL reference
  
  // Timestamps
  created_at: "ISO_string",  // Creation timestamp
  updated_at: "ISO_string", // Last update timestamp
  
  // Additional Fields
  author: "string",         // Optional author information
  version: "string",         // Document version
  language: "string",       // Language of the content
  quality_score: "number"   // Quality rating (0-1)
};
```

### Example Data Structure

#### Knowledge Document Example
```javascript
{
  id: "js-closures-001",
  text: "A closure in JavaScript is a function that has access to variables in its outer (enclosing) scope even after the outer function has returned. Closures are created every time a function is created, at function creation time.",
  metadata: {
    title: "JavaScript Closures",
    category: "Technical",
    difficulty: "medium",
    tags: ["javascript", "closures", "scope", "functions"],
    source: "javascript_fundamentals",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    author: "AI Interviewer System",
    version: "1.0",
    language: "en",
    quality_score: 0.9
  }
}
```

#### Interview Question Example
```javascript
{
  id: "react-hooks-001",
  text: "What are React Hooks and how do they differ from class components?",
  metadata: {
    title: "React Hooks Fundamentals",
    category: "Technical",
    difficulty: "medium",
    tags: ["react", "hooks", "components", "state"],
    source: "react_interview_questions",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    question_type: "conceptual",
    expected_answer_length: "medium"
  }
}
```

### Collection Organization

#### 1. **Knowledge Base Collection**
```javascript
const knowledgeCollection = {
  name: "interview_knowledge",
  documents: [
    // Technical knowledge
    "JavaScript fundamentals",
    "React concepts",
    "System design principles",
    "Database optimization",
    
    // Interview questions
    "JavaScript interview questions",
    "React interview questions",
    "System design questions",
    
    // Best practices
    "Coding best practices",
    "Interview techniques",
    "Problem-solving approaches"
  ]
};
```

#### 2. **Question Bank Collection**
```javascript
const questionCollection = {
  name: "interview_questions",
  documents: [
    // Questions by category
    "Technical questions",
    "Behavioral questions",
    "System design questions",
    "Coding challenges",
    
    // Questions by difficulty
    "Easy questions",
    "Medium questions",
    "Hard questions",
    
    // Questions by topic
    "JavaScript questions",
    "React questions",
    "Node.js questions"
  ]
};
```

## Embedding Models

### Primary Model: Xenova/all-MiniLM-L6-v2
```javascript
const embeddingConfig = {
  model: "Xenova/all-MiniLM-L6-v2",
  dimension: 384,
  maxLength: 256,
  quantized: false
};
```

**Characteristics:**
- **Dimensions**: 384
- **Model Size**: ~22MB
- **Performance**: Fast inference, good quality
- **Use Case**: General-purpose text embeddings

### Fallback Model: Xenova/distilbert-base-uncased
```javascript
const fallbackConfig = {
  model: "Xenova/distilbert-base-uncased",
  dimension: 768,
  maxLength: 512,
  quantized: false
};
```

**Characteristics:**
- **Dimensions**: 768
- **Model Size**: ~66MB
- **Performance**: Higher quality, slower inference
- **Use Case**: When primary model fails

### Embedding Generation Process
```javascript
async function generateEmbedding(text) {
  // 1. Preprocess text
  const processedText = preprocessText(text);
  
  // 2. Generate embedding
  const embedding = await pipeline(processedText, {
    pooling: 'mean',
    normalize: true
  });
  
  // 3. Return normalized vector
  return embedding.data;
}
```

## API Endpoints

### RAG Service Endpoints

#### Health Check
```http
GET /api/rag/health
Authorization: Bearer <token>
```

#### Add Knowledge
```http
POST /api/rag/knowledge
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "JavaScript closures allow functions to access variables from their outer scope.",
  "title": "JavaScript Closures",
  "category": "Technical",
  "difficulty": "medium",
  "tags": ["javascript", "closures", "scope"]
}
```

#### Search Knowledge
```http
POST /api/rag/search
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": "JavaScript closures",
  "category": "Technical",
  "difficulty": "medium",
  "nResults": 5,
  "minScore": 0.3
}
```

#### Generate RAG Response
```http
POST /api/rag/query
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": "Explain JavaScript closures with examples",
  "nResults": 3,
  "ollamaModel": "llama3",
  "includeSources": true
}
```

### ChromaDB Service Endpoints

#### Test ChromaDB Connection
```http
GET /api/rag/test/chroma
Authorization: Bearer <token>
```

#### Get Collection Stats
```http
GET /api/rag/stats
Authorization: Bearer <token>
```

## Setup Instructions

### 1. Install Dependencies
```bash
npm install chromadb @xenova/transformers
```

### 2. Environment Configuration
```bash
# .env file
CHROMA_HOST=localhost
CHROMA_PORT=8000
EMBEDDING_MODEL_NAME=Xenova/all-MiniLM-L6-v2
EMBEDDING_MODEL_PATH=./models
NODE_ENV=development
```

### 3. Start ChromaDB Server
```bash
# Option 1: Using npm script
npm run start-chroma

# Option 2: Using Docker
docker run -p 8000:8000 chromadb/chroma

# Option 3: Using Python
pip install chromadb
chroma run --host localhost --port 8000
```

### 4. Initialize Services
```javascript
import { RAGService } from './services/ragService.js';
import { ChromaService } from './services/chromaService.js';
import { EmbeddingService } from './services/embeddingService.js';

// Initialize services
const ragService = new RAGService();
await ragService.initialize();
```

## Usage Examples

### 1. Adding Knowledge to ChromaDB
```javascript
// Add single knowledge item
const knowledge = {
  text: "React Hooks allow you to use state and other React features in functional components.",
  title: "React Hooks Introduction",
  category: "Technical",
  difficulty: "medium",
  tags: ["react", "hooks", "functional-components"]
};

await ragService.addKnowledge(knowledge);
```

### 2. Searching Knowledge
```javascript
// Search for relevant knowledge
const searchResults = await ragService.searchKnowledge(
  "React Hooks state management",
  {
    category: "Technical",
    difficulty: "medium",
    nResults: 5,
    minScore: 0.3
  }
);

console.log(searchResults);
```

### 3. Generating RAG-Enhanced Response
```javascript
// Generate response with RAG
const response = await ragService.generateResponse(
  "How do React Hooks work?",
  {
    nResults: 3,
    ollamaModel: "llama3",
    includeSources: true
  }
);

console.log(response);
```

### 4. Batch Operations
```javascript
// Add multiple knowledge items
const knowledgeItems = [
  {
    text: "JavaScript closures...",
    title: "Closures",
    category: "Technical",
    difficulty: "medium"
  },
  {
    text: "React components...",
    title: "React Components",
    category: "Technical",
    difficulty: "easy"
  }
];

await ragService.addKnowledgeBatch(knowledgeItems);
```

## Performance Considerations

### 1. Embedding Generation
- **Batch Processing**: Generate embeddings in batches for efficiency
- **Caching**: Cache embeddings to avoid regeneration
- **Model Selection**: Choose appropriate model for your use case

### 2. ChromaDB Optimization
- **Indexing**: Use appropriate indexes for fast retrieval
- **Collection Size**: Monitor collection size and performance
- **Memory Usage**: Optimize memory usage for large datasets

### 3. Query Optimization
- **Result Limiting**: Limit number of results returned
- **Score Thresholds**: Use minimum score thresholds
- **Category Filtering**: Filter by categories when possible

### 4. Scalability
- **Horizontal Scaling**: Use multiple ChromaDB instances
- **Load Balancing**: Distribute queries across instances
- **Caching**: Implement caching for frequent queries

## Troubleshooting

### Common Issues

#### 1. ChromaDB Connection Failed
```bash
Error: Failed to connect to chromadb
```
**Solutions:**
- Check if ChromaDB server is running
- Verify host and port configuration
- Check firewall settings

#### 2. Embedding Model Download Failed
```bash
Error: Could not locate file: model_quantized.onnx
```
**Solutions:**
- Use `quantized: false` in model configuration
- Check internet connection
- Verify model name and path

#### 3. Low Search Results Quality
```bash
Search results not relevant to query
```
**Solutions:**
- Adjust minimum score threshold
- Improve knowledge base quality
- Use better embedding models
- Add more relevant knowledge

#### 4. Memory Issues
```bash
Out of memory error
```
**Solutions:**
- Reduce batch size
- Use smaller embedding models
- Optimize ChromaDB configuration
- Increase system memory

### Debug Commands

#### Test ChromaDB Connection
```bash
npm run test-chroma
```

#### Test Embedding Service
```bash
npm run test-embedding
```

#### Test RAG System
```bash
npm run test-rag
```

### Monitoring and Logging

#### Enable Debug Logging
```javascript
// Set debug mode
process.env.DEBUG = 'rag:*';

// Or enable specific services
process.env.DEBUG = 'rag:chroma,rag:embedding';
```

#### Performance Monitoring
```javascript
// Monitor embedding generation time
const startTime = Date.now();
const embedding = await embeddingService.generateEmbedding(text);
const duration = Date.now() - startTime;
console.log(`Embedding generation took ${duration}ms`);
```

## Best Practices

### 1. Knowledge Management
- **Quality over Quantity**: Focus on high-quality knowledge
- **Regular Updates**: Keep knowledge base current
- **Categorization**: Use consistent categories and tags
- **Validation**: Validate knowledge before adding

### 2. Performance Optimization
- **Batch Operations**: Use batch operations when possible
- **Caching**: Implement appropriate caching strategies
- **Monitoring**: Monitor performance metrics
- **Optimization**: Regularly optimize queries and indexes

### 3. Security Considerations
- **Access Control**: Implement proper authentication
- **Data Validation**: Validate all input data
- **Error Handling**: Implement comprehensive error handling
- **Logging**: Log important operations and errors

### 4. Maintenance
- **Regular Backups**: Backup ChromaDB data regularly
- **Version Control**: Track changes to knowledge base
- **Testing**: Regular testing of RAG functionality
- **Documentation**: Keep documentation updated

This comprehensive guide covers all aspects of the RAG and ChromaDB implementation, from basic concepts to advanced usage patterns and troubleshooting.
