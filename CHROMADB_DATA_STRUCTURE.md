# ChromaDB Data Structure Visualization

## Overview
This document provides a visual representation of how data is structured and stored in ChromaDB within the RAG system.

## ChromaDB Collection Structure

```
ChromaDB Server (localhost:8000)
├── Collection: "interview_knowledge"
│   ├── Document 1: "js-closures-001"
│   │   ├── Text: "A closure in JavaScript is a function that has access to variables..."
│   │   ├── Embedding: [0.1, -0.2, 0.3, ..., 0.384] (384 dimensions)
│   │   └── Metadata:
│   │       ├── title: "JavaScript Closures"
│   │       ├── category: "Technical"
│   │       ├── difficulty: "medium"
│   │       ├── tags: ["javascript", "closures", "scope"]
│   │       ├── source: "javascript_fundamentals"
│   │       ├── created_at: "2024-01-01T00:00:00Z"
│   │       └── quality_score: 0.9
│   │
│   ├── Document 2: "react-hooks-001"
│   │   ├── Text: "React Hooks allow you to use state and other React features..."
│   │   ├── Embedding: [0.2, 0.1, -0.3, ..., 0.284] (384 dimensions)
│   │   └── Metadata:
│   │       ├── title: "React Hooks Introduction"
│   │       ├── category: "Technical"
│   │       ├── difficulty: "medium"
│   │       ├── tags: ["react", "hooks", "state"]
│   │       ├── source: "react_fundamentals"
│   │       ├── created_at: "2024-01-01T00:00:00Z"
│   │       └── quality_score: 0.8
│   │
│   └── Document N: "system-design-001"
│       ├── Text: "Scalability refers to the ability of a system to handle increased load..."
│       ├── Embedding: [-0.1, 0.4, 0.2, ..., 0.184] (384 dimensions)
│       └── Metadata:
│           ├── title: "System Scalability"
│           ├── category: "System Design"
│           ├── difficulty: "hard"
│           ├── tags: ["scalability", "architecture", "performance"]
│           ├── source: "system_design_fundamentals"
│           ├── created_at: "2024-01-01T00:00:00Z"
│           └── quality_score: 0.95
│
└── Collection: "interview_questions"
    ├── Document 1: "js-interview-001"
    │   ├── Text: "What is the difference between let, const, and var in JavaScript?"
    │   ├── Embedding: [0.3, -0.1, 0.5, ..., 0.484] (384 dimensions)
    │   └── Metadata:
    │       ├── title: "JavaScript Variable Declaration"
    │       ├── category: "Technical"
    │       ├── difficulty: "easy"
    │       ├── tags: ["javascript", "variables", "scope"]
    │       ├── question_type: "conceptual"
    │       ├── expected_answer_length: "medium"
    │       └── created_at: "2024-01-01T00:00:00Z"
    │
    └── Document 2: "react-interview-001"
        ├── Text: "Explain the React component lifecycle methods."
        ├── Embedding: [0.1, 0.3, -0.2, ..., 0.384] (384 dimensions)
        └── Metadata:
            ├── title: "React Component Lifecycle"
            ├── category: "Technical"
            ├── difficulty: "medium"
            ├── tags: ["react", "components", "lifecycle"]
            ├── question_type: "conceptual"
            ├── expected_answer_length: "long"
            └── created_at: "2024-01-01T00:00:00Z"
```

## Data Flow Diagram

```
User Query: "Explain JavaScript closures"
                    ↓
            Text Preprocessing
                    ↓
            Embedding Generation
            (Xenova/all-MiniLM-L6-v2)
                    ↓
            Vector: [0.1, -0.2, 0.3, ..., 0.384]
                    ↓
            ChromaDB Similarity Search
                    ↓
            Retrieve Top 5 Similar Documents
                    ↓
            Context Augmentation
                    ↓
            Ollama LLM Processing
                    ↓
            Generated Response with Sources
```

## Metadata Schema Details

### Knowledge Documents Metadata
```javascript
{
  // Core Identification
  title: "string",                    // Document title
  category: "string",                 // Technical, Behavioral, System Design, etc.
  difficulty: "string",               // easy, medium, hard
  
  // Categorization
  tags: ["string"],                   // Array of relevant tags
  
  // Source Information
  source: "string",                   // Source identifier
  url: "string",                      // Optional URL reference
  author: "string",                   // Optional author
  
  // Quality Metrics
  quality_score: "number",            // 0-1 quality rating
  
  // Versioning
  version: "string",                  // Document version
  language: "string",                 // Language code (en, es, etc.)
  
  // Timestamps
  created_at: "ISO_string",           // Creation timestamp
  updated_at: "ISO_string"            // Last update timestamp
}
```

### Interview Questions Metadata
```javascript
{
  // Core Identification
  title: "string",                    // Question title
  category: "string",                 // Technical, Behavioral, etc.
  difficulty: "string",               // easy, medium, hard
  
  // Question Properties
  question_type: "string",             // conceptual, coding, behavioral
  expected_answer_length: "string",   // short, medium, long
  
  // Categorization
  tags: ["string"],                   // Array of relevant tags
  
  // Source Information
  source: "string",                   // Source identifier
  topic: "string",                    // Specific topic area
  
  // Timestamps
  created_at: "ISO_string",           // Creation timestamp
  updated_at: "ISO_string"            // Last update timestamp
}
```

## Embedding Vector Structure

### Vector Dimensions
- **Model**: Xenova/all-MiniLM-L6-v2
- **Dimensions**: 384
- **Data Type**: Float32
- **Normalization**: L2 normalized

### Example Vector
```javascript
{
  id: "js-closures-001",
  embedding: [
    0.1234567,   // Dimension 0
    -0.2345678,  // Dimension 1
    0.3456789,   // Dimension 2
    // ... 381 more dimensions
    0.4567890    // Dimension 383
  ],
  metadata: {
    model: "Xenova/all-MiniLM-L6-v2",
    dimension: 384,
    created_at: "2024-01-01T00:00:00Z"
  }
}
```

## Search Query Structure

### Similarity Search Query
```javascript
{
  query: "JavaScript closures explanation",
  embedding: [0.1, -0.2, 0.3, ..., 0.384],  // Generated from query
  nResults: 5,                               // Number of results to return
  where: {                                   // Metadata filters
    category: "Technical",
    difficulty: "medium"
  },
  minScore: 0.3                             // Minimum similarity score
}
```

### Search Results Structure
```javascript
{
  results: [
    {
      id: "js-closures-001",
      text: "A closure in JavaScript is a function that has access to variables...",
      score: 0.89,                          // Similarity score (0-1)
      metadata: {
        title: "JavaScript Closures",
        category: "Technical",
        difficulty: "medium",
        tags: ["javascript", "closures", "scope"]
      }
    },
    {
      id: "js-scope-001",
      text: "JavaScript has function scope and block scope...",
      score: 0.76,
      metadata: {
        title: "JavaScript Scope",
        category: "Technical",
        difficulty: "easy",
        tags: ["javascript", "scope", "variables"]
      }
    }
    // ... more results
  ],
  totalResults: 5,
  queryTime: 45                             // Query execution time in ms
}
```

## Collection Statistics

### Knowledge Base Collection Stats
```javascript
{
  collectionName: "interview_knowledge",
  totalDocuments: 1250,
  totalEmbeddings: 1250,
  averageEmbeddingDimension: 384,
  categories: {
    "Technical": 800,
    "Behavioral": 200,
    "System Design": 150,
    "General": 100
  },
  difficulties: {
    "easy": 400,
    "medium": 600,
    "hard": 250
  },
  lastUpdated: "2024-01-01T00:00:00Z"
}
```

### Question Bank Collection Stats
```javascript
{
  collectionName: "interview_questions",
  totalDocuments: 500,
  totalEmbeddings: 500,
  averageEmbeddingDimension: 384,
  questionTypes: {
    "conceptual": 300,
    "coding": 150,
    "behavioral": 50
  },
  difficulties: {
    "easy": 150,
    "medium": 250,
    "hard": 100
  },
  lastUpdated: "2024-01-01T00:00:00Z"
}
```

## Data Persistence

### ChromaDB Storage
- **Format**: Binary format optimized for vector operations
- **Location**: ChromaDB server data directory
- **Backup**: Regular backups recommended
- **Recovery**: Automatic recovery on server restart

### Index Structure
```
ChromaDB Indexes
├── Vector Index (FAISS/HNSW)
│   ├── 384-dimensional vectors
│   ├── Similarity search optimization
│   └── Memory-mapped storage
├── Metadata Index
│   ├── Category index
│   ├── Difficulty index
│   ├── Tag index
│   └── Timestamp index
└── Text Index (Optional)
    ├── Full-text search
    ├── Keyword matching
    └── Fuzzy search
```

## Performance Metrics

### Embedding Generation
- **Average Time**: 50-100ms per document
- **Batch Processing**: 10-20 documents/second
- **Memory Usage**: ~22MB for model + embeddings

### ChromaDB Operations
- **Search Time**: 10-50ms for similarity search
- **Insert Time**: 5-20ms per document
- **Update Time**: 10-30ms per document
- **Delete Time**: 5-15ms per document

### Query Performance
- **Simple Query**: 20-50ms
- **Filtered Query**: 30-80ms
- **Complex Query**: 50-150ms
- **Batch Query**: 100-500ms

This structure provides a comprehensive view of how data is organized and stored in ChromaDB, enabling efficient retrieval and similarity search for the RAG system.
