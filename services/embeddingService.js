import { pipeline } from '@xenova/transformers';
import dotenv from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';

dotenv.config();

export class EmbeddingService {
  constructor() {
    this.model = process.env.EMBEDDING_MODEL_NAME || 'sentence-transformers/all-MiniLM-L6-v2';
    this.modelPath = process.env.EMBEDDING_MODEL_PATH || './models/embeddings';
    this.dimension = 384; // Dimension of all-MiniLM-L6-v2 embeddings
    this.pipeline = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the embedding pipeline
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        return true;
      }

      console.log('Initializing embedding service with local model...');
      
      // Create models directory if it doesn't exist
      await this.ensureModelDirectory();
      
      // Initialize the feature extraction pipeline
      this.pipeline = await pipeline('feature-extraction', this.model, {
        local_files_only: false, // Allow downloading if not present locally
        cache_dir: this.modelPath
      });

      this.isInitialized = true;
      console.log('Embedding service initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing embedding service:', error);
      throw new Error(`Failed to initialize embedding service: ${error.message}`);
    }
  }

  /**
   * Ensure model directory exists
   */
  async ensureModelDirectory() {
    try {
      await fs.mkdir(this.modelPath, { recursive: true });
    } catch (error) {
      console.error('Error creating model directory:', error);
    }
  }

  /**
   * Generate embeddings for a single text
   * @param {string} text - Text to embed
   * @returns {Promise<number[]>} Embedding vector
   */
  async generateEmbedding(text) {
    try {
      if (!text || typeof text !== 'string') {
        throw new Error('Text must be a non-empty string');
      }

      // Ensure pipeline is initialized
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Preprocess text
      const processedText = this.preprocessText(text);

      // Generate embedding using local pipeline
      const result = await this.pipeline(processedText, {
        pooling: 'mean', // Use mean pooling for sentence embeddings
        normalize: true  // Normalize embeddings
      });

      // Extract the embedding vector
      const embedding = Array.from(result.data);

      return embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for multiple texts
   * @param {string[]} texts - Array of texts to embed
   * @returns {Promise<number[][]>} Array of embedding vectors
   */
  async generateEmbeddings(texts) {
    try {
      if (!Array.isArray(texts) || texts.length === 0) {
        throw new Error('Texts must be a non-empty array');
      }

      // Ensure pipeline is initialized
      if (!this.isInitialized) {
        await this.initialize();
      }

      const embeddings = [];
      
      // Process texts in batches to avoid memory issues
      const batchSize = 10;
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        
        for (const text of batch) {
          const processedText = this.preprocessText(text);
          const result = await this.pipeline(processedText, {
            pooling: 'mean',
            normalize: true
          });
          
          const embedding = Array.from(result.data);
          embeddings.push(embedding);
        }
      }

      return embeddings;
    } catch (error) {
      console.error('Error generating embeddings:', error);
      throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
  }

  /**
   * Calculate cosine similarity between two embedding vectors
   * @param {number[]} vecA - First embedding vector
   * @param {number[]} vecB - Second embedding vector
   * @returns {number} Cosine similarity score (-1 to 1)
   */
  calculateCosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Find most similar texts based on query embedding
   * @param {number[]} queryEmbedding - Query embedding vector
   * @param {Array} documents - Array of {text, embedding, metadata} objects
   * @param {number} topK - Number of top results to return
   * @returns {Array} Sorted array of most similar documents with similarity scores
   */
  findSimilarDocuments(queryEmbedding, documents, topK = 5) {
    if (!queryEmbedding || !documents || documents.length === 0) {
      return [];
    }

    const similarities = documents.map(doc => ({
      ...doc,
      similarity: this.calculateCosineSimilarity(queryEmbedding, doc.embedding)
    }));

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * Preprocess text for embedding generation
   * @param {string} text - Raw text
   * @returns {string} Preprocessed text
   */
  preprocessText(text) {
    if (!text) return '';
    
    return text
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .toLowerCase();
  }

  /**
   * Split long text into chunks for embedding
   * @param {string} text - Long text to chunk
   * @param {number} maxChunkSize - Maximum characters per chunk
   * @param {number} overlap - Character overlap between chunks
   * @returns {string[]} Array of text chunks
   */
  chunkText(text, maxChunkSize = 1000, overlap = 100) {
    if (!text || text.length <= maxChunkSize) {
      return [text];
    }

    const chunks = [];
    let start = 0;

    while (start < text.length) {
      let end = Math.min(start + maxChunkSize, text.length);
      
      // Try to break at sentence boundary
      if (end < text.length) {
        const lastPeriod = text.lastIndexOf('.', end);
        const lastQuestion = text.lastIndexOf('?', end);
        const lastExclamation = text.lastIndexOf('!', end);
        const lastBreak = Math.max(lastPeriod, lastQuestion, lastExclamation);
        
        if (lastBreak > start + maxChunkSize * 0.5) {
          end = lastBreak + 1;
        }
      }

      chunks.push(text.slice(start, end).trim());
      start = end - overlap;
    }

    return chunks.filter(chunk => chunk.length > 0);
  }

  /**
   * Get model information
   * @returns {Object} Model information
   */
  getModelInfo() {
    return {
      model: this.model,
      dimension: this.dimension,
      description: 'sentence-transformers/all-MiniLM-L6-v2 - A lightweight sentence transformer model'
    };
  }

  /**
   * Test the embedding service
   * @returns {Promise<Object>} Test results
   */
  async test() {
    try {
      // Initialize the service first
      await this.initialize();
      
      const testText = "This is a test sentence for embedding generation.";
      const embedding = await this.generateEmbedding(testText);
      
      return {
        success: true,
        model: this.model,
        modelPath: this.modelPath,
        dimension: embedding.length,
        testEmbedding: embedding.slice(0, 5), // First 5 dimensions for preview
        isInitialized: this.isInitialized,
        message: 'Local embedding service is working correctly'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        model: this.model,
        modelPath: this.modelPath,
        isInitialized: this.isInitialized,
        message: 'Local embedding service test failed'
      };
    }
  }
}

export default EmbeddingService;
