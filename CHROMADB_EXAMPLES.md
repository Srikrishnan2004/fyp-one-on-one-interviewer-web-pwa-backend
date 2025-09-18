# ChromaDB Practical Examples

## Overview
This document provides practical examples of how to interact with ChromaDB in the RAG system, including data insertion, retrieval, and management operations.

## Basic ChromaDB Operations

### 1. Initialize ChromaDB Service

```javascript
import { ChromaService } from './services/chromaService.js';

// Initialize ChromaDB service
const chromaService = new ChromaService({
  host: 'localhost',
  port: 8000,
  collectionName: 'interview_knowledge'
});

// Initialize the service
await chromaService.initialize();
console.log('ChromaDB service initialized successfully');
```

### 2. Add Knowledge to ChromaDB

```javascript
// Add single knowledge document
const knowledgeDocument = {
  text: "A closure in JavaScript is a function that has access to variables in its outer (enclosing) scope even after the outer function has returned. Closures are created every time a function is created, at function creation time.",
  metadata: {
    title: "JavaScript Closures",
    category: "Technical",
    difficulty: "medium",
    tags: ["javascript", "closures", "scope", "functions"],
    source: "javascript_fundamentals",
    created_at: new Date().toISOString(),
    quality_score: 0.9
  }
};

const result = await chromaService.addDocument(knowledgeDocument);
console.log('Document added:', result.id);
```

### 3. Add Multiple Documents

```javascript
// Add multiple knowledge documents
const knowledgeDocuments = [
  {
    text: "React Hooks allow you to use state and other React features in functional components. They were introduced in React 16.8.",
    metadata: {
      title: "React Hooks Introduction",
      category: "Technical",
      difficulty: "medium",
      tags: ["react", "hooks", "functional-components"],
      source: "react_fundamentals",
      created_at: new Date().toISOString(),
      quality_score: 0.8
    }
  },
  {
    text: "Scalability refers to the ability of a system to handle increased load by adding resources. There are two types: horizontal and vertical scaling.",
    metadata: {
      title: "System Scalability",
      category: "System Design",
      difficulty: "hard",
      tags: ["scalability", "architecture", "performance"],
      source: "system_design_fundamentals",
      created_at: new Date().toISOString(),
      quality_score: 0.95
    }
  }
];

const results = await chromaService.addDocuments(knowledgeDocuments);
console.log('Documents added:', results.map(r => r.id));
```

### 4. Search Similar Documents

```javascript
// Search for similar documents
const searchQuery = "JavaScript closures and scope";
const searchResults = await chromaService.searchSimilar(searchQuery, {
  nResults: 5,
  minScore: 0.3,
  where: {
    category: "Technical"
  }
});

console.log('Search results:');
searchResults.forEach((result, index) => {
  console.log(`${index + 1}. ${result.metadata.title} (Score: ${result.score.toFixed(3)})`);
  console.log(`   ${result.text.substring(0, 100)}...`);
  console.log('');
});
```

### 5. Update Document

```javascript
// Update existing document
const documentId = "js-closures-001";
const updatedDocument = {
  text: "A closure in JavaScript is a function that has access to variables in its outer scope even after the outer function has returned. Closures are created every time a function is created and are fundamental to JavaScript's functional programming paradigm.",
  metadata: {
    title: "JavaScript Closures - Updated",
    category: "Technical",
    difficulty: "medium",
    tags: ["javascript", "closures", "scope", "functions", "functional-programming"],
    source: "javascript_fundamentals",
    updated_at: new Date().toISOString(),
    quality_score: 0.95
  }
};

await chromaService.updateDocument(documentId, updatedDocument);
console.log('Document updated successfully');
```

### 6. Delete Document

```javascript
// Delete document
const documentId = "js-closures-001";
await chromaService.deleteDocument(documentId);
console.log('Document deleted successfully');
```

## Advanced ChromaDB Operations

### 1. Batch Operations

```javascript
// Batch add documents with progress tracking
const documents = [
  // ... array of documents
];

const batchSize = 10;
const results = [];

for (let i = 0; i < documents.length; i += batchSize) {
  const batch = documents.slice(i, i + batchSize);
  console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(documents.length / batchSize)}`);
  
  const batchResults = await chromaService.addDocuments(batch);
  results.push(...batchResults);
  
  // Small delay to prevent overwhelming the server
  await new Promise(resolve => setTimeout(resolve, 100));
}

console.log(`Successfully added ${results.length} documents`);
```

### 2. Complex Search Queries

```javascript
// Complex search with multiple filters
const complexSearch = async () => {
  const searchQuery = "React state management";
  
  const searchResults = await chromaService.searchSimilar(searchQuery, {
    nResults: 10,
    minScore: 0.2,
    where: {
      category: "Technical",
      difficulty: { $in: ["medium", "hard"] },
      tags: { $contains: "react" }
    }
  });

  console.log('Complex search results:');
  searchResults.forEach((result, index) => {
    console.log(`${index + 1}. ${result.metadata.title}`);
    console.log(`   Category: ${result.metadata.category}`);
    console.log(`   Difficulty: ${result.metadata.difficulty}`);
    console.log(`   Tags: ${result.metadata.tags.join(', ')}`);
    console.log(`   Score: ${result.score.toFixed(3)}`);
    console.log('');
  });
};

await complexSearch();
```

### 3. Collection Management

```javascript
// Get collection statistics
const stats = await chromaService.getCollectionStats();
console.log('Collection Statistics:');
console.log(`Total Documents: ${stats.totalDocuments}`);
console.log(`Total Embeddings: ${stats.totalEmbeddings}`);
console.log(`Categories: ${JSON.stringify(stats.categories, null, 2)}`);
console.log(`Difficulties: ${JSON.stringify(stats.difficulties, null, 2)}`);

// Get collection info
const info = await chromaService.getCollectionInfo();
console.log('Collection Info:');
console.log(`Name: ${info.name}`);
console.log(`Created: ${info.created}`);
console.log(`Last Updated: ${info.lastUpdated}`);
```

### 4. Error Handling

```javascript
// Robust error handling
const safeAddDocument = async (document) => {
  try {
    const result = await chromaService.addDocument(document);
    console.log('Document added successfully:', result.id);
    return result;
  } catch (error) {
    console.error('Failed to add document:', error.message);
    
    // Handle specific error types
    if (error.message.includes('connection')) {
      console.log('ChromaDB connection error - retrying...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      return await safeAddDocument(document);
    } else if (error.message.includes('embedding')) {
      console.log('Embedding generation error - using fallback...');
      // Use fallback embedding or skip document
      return null;
    } else {
      throw error;
    }
  }
};

// Usage
const document = {
  text: "Example document",
  metadata: { title: "Example", category: "Technical" }
};

await safeAddDocument(document);
```

## RAG Integration Examples

### 1. Knowledge Retrieval for Question Generation

```javascript
// Retrieve relevant knowledge for question generation
const generateContextualQuestion = async (topic, difficulty) => {
  // Search for relevant knowledge
  const knowledgeResults = await chromaService.searchSimilar(topic, {
    nResults: 3,
    minScore: 0.4,
    where: {
      category: "Technical",
      difficulty: difficulty
    }
  });

  // Build context from retrieved knowledge
  const context = knowledgeResults.map(result => ({
    title: result.metadata.title,
    content: result.text,
    relevance: result.score
  }));

  // Generate question using context
  const question = await generateQuestionWithContext(topic, difficulty, context);
  return question;
};

const question = await generateContextualQuestion("JavaScript closures", "medium");
console.log('Generated question:', question);
```

### 2. Answer Evaluation with RAG

```javascript
// Evaluate user answer using RAG
const evaluateAnswer = async (question, userAnswer) => {
  // Search for relevant knowledge about the question
  const knowledgeResults = await chromaService.searchSimilar(question, {
    nResults: 5,
    minScore: 0.3,
    where: {
      category: "Technical"
    }
  });

  // Build evaluation context
  const evaluationContext = {
    question: question,
    userAnswer: userAnswer,
    relevantKnowledge: knowledgeResults.map(result => ({
      title: result.metadata.title,
      content: result.text,
      score: result.score
    }))
  };

  // Generate evaluation using LLM
  const evaluation = await generateEvaluation(evaluationContext);
  return evaluation;
};

const evaluation = await evaluateAnswer(
  "What is a closure in JavaScript?",
  "A closure is a function that has access to variables in its outer scope."
);
console.log('Answer evaluation:', evaluation);
```

### 3. Dynamic Question Generation

```javascript
// Generate follow-up questions based on user performance
const generateFollowUpQuestion = async (previousQuestions, userAnswers, confidenceScores) => {
  // Analyze user performance
  const performanceAnalysis = analyzePerformance(userAnswers, confidenceScores);
  
  // Determine next difficulty level
  const nextDifficulty = determineNextDifficulty(performanceAnalysis);
  
  // Search for relevant knowledge based on performance
  const knowledgeResults = await chromaService.searchSimilar(
    performanceAnalysis.weakAreas.join(' '),
    {
      nResults: 3,
      minScore: 0.3,
      where: {
        difficulty: nextDifficulty
      }
    }
  );

  // Generate contextual follow-up question
  const followUpQuestion = await generateContextualQuestion(
    knowledgeResults,
    nextDifficulty,
    previousQuestions
  );

  return followUpQuestion;
};

const followUpQuestion = await generateFollowUpQuestion(
  ["What is a closure?", "How do closures work?"],
  ["A closure is a function...", "Closures work by..."],
  [0.8, 0.6]
);
console.log('Follow-up question:', followUpQuestion);
```

## Performance Optimization Examples

### 1. Caching Embeddings

```javascript
// Cache embeddings to avoid regeneration
const embeddingCache = new Map();

const getCachedEmbedding = async (text) => {
  const cacheKey = text.toLowerCase().trim();
  
  if (embeddingCache.has(cacheKey)) {
    console.log('Using cached embedding');
    return embeddingCache.get(cacheKey);
  }

  console.log('Generating new embedding');
  const embedding = await embeddingService.generateEmbedding(text);
  embeddingCache.set(cacheKey, embedding);
  
  return embedding;
};

// Usage
const embedding = await getCachedEmbedding("JavaScript closures");
```

### 2. Batch Processing

```javascript
// Process documents in batches for better performance
const processDocumentsBatch = async (documents, batchSize = 10) => {
  const results = [];
  
  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}`);
    
    // Process batch
    const batchResults = await Promise.all(
      batch.map(async (doc) => {
        const embedding = await getCachedEmbedding(doc.text);
        return await chromaService.addDocument({
          ...doc,
          embedding: embedding
        });
      })
    );
    
    results.push(...batchResults);
    
    // Progress update
    console.log(`Processed ${Math.min(i + batchSize, documents.length)}/${documents.length} documents`);
  }
  
  return results;
};

const documents = [
  // ... array of documents
];

const results = await processDocumentsBatch(documents, 5);
console.log(`Successfully processed ${results.length} documents`);
```

### 3. Query Optimization

```javascript
// Optimize queries for better performance
const optimizedSearch = async (query, filters) => {
  const startTime = Date.now();
  
  // Pre-filter by metadata if possible
  const searchResults = await chromaService.searchSimilar(query, {
    nResults: filters.limit || 10,
    minScore: filters.minScore || 0.3,
    where: filters.where || {}
  });

  const queryTime = Date.now() - startTime;
  console.log(`Query completed in ${queryTime}ms`);
  
  // Post-process results if needed
  const processedResults = searchResults
    .filter(result => result.score >= (filters.minScore || 0.3))
    .sort((a, b) => b.score - a.score)
    .slice(0, filters.limit || 10);

  return {
    results: processedResults,
    queryTime: queryTime,
    totalResults: searchResults.length
  };
};

// Usage
const searchResults = await optimizedSearch("JavaScript closures", {
  limit: 5,
  minScore: 0.4,
  where: {
    category: "Technical",
    difficulty: "medium"
  }
});

console.log(`Found ${searchResults.results.length} results in ${searchResults.queryTime}ms`);
```

## Monitoring and Debugging

### 1. Performance Monitoring

```javascript
// Monitor ChromaDB performance
const monitorPerformance = async (operation, ...args) => {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();
  
  try {
    const result = await operation(...args);
    const endTime = Date.now();
    const endMemory = process.memoryUsage();
    
    console.log(`Operation completed in ${endTime - startTime}ms`);
    console.log(`Memory usage: ${(endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024}MB`);
    
    return result;
  } catch (error) {
    const endTime = Date.now();
    console.error(`Operation failed after ${endTime - startTime}ms:`, error.message);
    throw error;
  }
};

// Usage
const result = await monitorPerformance(
  chromaService.searchSimilar,
  "JavaScript closures",
  { nResults: 5 }
);
```

### 2. Health Checks

```javascript
// Comprehensive health check
const healthCheck = async () => {
  const health = {
    chromadb: false,
    embedding: false,
    performance: null
  };

  try {
    // Check ChromaDB connection
    const startTime = Date.now();
    await chromaService.heartbeat();
    health.chromadb = true;
    health.performance = Date.now() - startTime;
  } catch (error) {
    console.error('ChromaDB health check failed:', error.message);
  }

  try {
    // Check embedding service
    await embeddingService.generateEmbedding("test");
    health.embedding = true;
  } catch (error) {
    console.error('Embedding service health check failed:', error.message);
  }

  return health;
};

// Usage
const health = await healthCheck();
console.log('System health:', health);
```

These examples demonstrate practical usage of ChromaDB in the RAG system, from basic operations to advanced performance optimization and monitoring.
