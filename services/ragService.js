import ChromaService from './chromaService.js';
import EmbeddingService from './embeddingService.js';
import OllamaService from '../ollama/index.js';
import { v4 as uuidv4 } from 'uuid';

export class RAGService {
  constructor() {
    this.chromaService = new ChromaService();
    this.embeddingService = new EmbeddingService();
    this.ollamaService = new OllamaService();
    this.knowledgeBaseCollection = 'interview_knowledge_base';
    this.questionBankCollection = 'question_bank';
    this.answerBankCollection = 'answer_bank';
  }

  /**
   * Initialize RAG service
   */
  async initialize() {
    try {
      // Initialize embedding service first
      await this.embeddingService.initialize();
      
      // Initialize ChromaDB service
      await this.chromaService.initialize();
      
      // Create collections if they don't exist
      await this.createKnowledgeBaseCollections();
      
      console.log('RAG service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize RAG service:', error);
      throw new Error(`RAG initialization failed: ${error.message}`);
    }
  }

  /**
   * Create knowledge base collections
   */
  async createKnowledgeBaseCollections() {
    try {
      const collections = [
        {
          name: this.knowledgeBaseCollection,
          metadata: {
            description: 'General interview knowledge base',
            type: 'knowledge_base',
            created_at: new Date().toISOString()
          }
        },
        {
          name: this.questionBankCollection,
          metadata: {
            description: 'Interview questions bank',
            type: 'questions',
            created_at: new Date().toISOString()
          }
        },
        {
          name: this.answerBankCollection,
          metadata: {
            description: 'Interview answers bank',
            type: 'answers',
            created_at: new Date().toISOString()
          }
        }
      ];

      for (const collection of collections) {
        try {
          await this.chromaService.createCollection(collection.name, collection.metadata);
        } catch (error) {
          // Collection might already exist, that's okay
          if (!error.message.includes('already exists')) {
            console.warn(`Warning creating collection ${collection.name}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.error('Error creating knowledge base collections:', error);
      throw error;
    }
  }

  /**
   * Add knowledge to the knowledge base
   * @param {Object} knowledge - Knowledge object
   * @param {string} collection - Collection name (optional)
   * @returns {Promise<Object>} Add result
   */
  async addKnowledge(knowledge, collection = this.knowledgeBaseCollection) {
    try {
      const {
        text,
        title,
        category,
        difficulty,
        tags = [],
        metadata = {}
      } = knowledge;

      if (!text || typeof text !== 'string') {
        throw new Error('Knowledge text is required');
      }

      // Generate embedding
      const embedding = await this.embeddingService.generateEmbedding(text);

      // Prepare document
      const document = {
        id: uuidv4(),
        text: text,
        embedding: embedding,
        metadata: {
          title: title || 'Untitled',
          category: category || 'general',
          difficulty: difficulty || 'medium',
          tags: Array.isArray(tags) ? tags : [tags],
          created_at: new Date().toISOString(),
          ...metadata
        }
      };

      const result = await this.chromaService.addDocuments(collection, [document]);
      
      return {
        success: true,
        documentId: document.id,
        message: 'Knowledge added successfully'
      };
    } catch (error) {
      console.error('Error adding knowledge:', error);
      throw new Error(`Failed to add knowledge: ${error.message}`);
    }
  }

  /**
   * Add multiple knowledge items
   * @param {Array} knowledgeItems - Array of knowledge objects
   * @param {string} collection - Collection name (optional)
   * @returns {Promise<Object>} Add result
   */
  async addMultipleKnowledge(knowledgeItems, collection = this.knowledgeBaseCollection) {
    try {
      if (!Array.isArray(knowledgeItems) || knowledgeItems.length === 0) {
        throw new Error('Knowledge items must be a non-empty array');
      }

      const documents = [];
      
      for (const knowledge of knowledgeItems) {
        const {
          text,
          title,
          category,
          difficulty,
          tags = [],
          metadata = {}
        } = knowledge;

        if (!text || typeof text !== 'string') {
          console.warn('Skipping invalid knowledge item:', knowledge);
          continue;
        }

        // Generate embedding
        const embedding = await this.embeddingService.generateEmbedding(text);

        documents.push({
          id: uuidv4(),
          text: text,
          embedding: embedding,
          metadata: {
            title: title || 'Untitled',
            category: category || 'general',
            difficulty: difficulty || 'medium',
            tags: Array.isArray(tags) ? tags : [tags],
            created_at: new Date().toISOString(),
            ...metadata
          }
        });
      }

      if (documents.length === 0) {
        throw new Error('No valid knowledge items to add');
      }

      const result = await this.chromaService.addDocuments(collection, documents);
      
      return {
        success: true,
        addedCount: documents.length,
        skippedCount: knowledgeItems.length - documents.length,
        message: `Added ${documents.length} knowledge items successfully`
      };
    } catch (error) {
      console.error('Error adding multiple knowledge:', error);
      throw new Error(`Failed to add multiple knowledge: ${error.message}`);
    }
  }

  /**
   * Search for relevant knowledge
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  async searchKnowledge(query, options = {}) {
    try {
      const {
        collection = this.knowledgeBaseCollection,
        nResults = 5,
        category = undefined,
        difficulty = undefined,
        minScore = 0.5
      } = options;

      // Generate query embedding
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);

      // Build where clause for filtering
      const where = {};
      if (category) where.category = category;
      if (difficulty) where.difficulty = difficulty;

      const searchOptions = {
        nResults,
        where: Object.keys(where).length > 0 ? where : undefined,
        include: ['documents', 'metadatas', 'distances']
      };

      const results = await this.chromaService.queryDocuments(
        collection,
        queryEmbedding,
        searchOptions
      );

      // Filter by minimum score and format results
      const filteredResults = results.documents[0]
        .map((doc, index) => ({
          text: doc,
          metadata: results.metadatas[0][index],
          distance: results.distances[0][index],
          score: 1 - results.distances[0][index] // Convert distance to similarity score
        }))
        .filter(result => result.score >= minScore)
        .sort((a, b) => b.score - a.score);

      return {
        success: true,
        query,
        results: filteredResults,
        totalResults: filteredResults.length
      };
    } catch (error) {
      console.error('Error searching knowledge:', error);
      throw new Error(`Failed to search knowledge: ${error.message}`);
    }
  }

  /**
   * Generate RAG-enhanced response using Ollama
   * @param {string} query - User query
   * @param {Object} options - RAG options
   * @returns {Promise<Object>} Enhanced response
   */
  async generateRAGResponse(query, options = {}) {
    try {
      const {
        collection = this.knowledgeBaseCollection,
        nResults = 3,
        ollamaModel = 'llama2',
        context = '',
        includeSources = true
      } = options;

      // Search for relevant knowledge
      const knowledgeResults = await this.searchKnowledge(query, {
        collection,
        nResults,
        minScore: 0.3
      });

      // Build context from retrieved knowledge
      let ragContext = '';
      if (knowledgeResults.results.length > 0) {
        ragContext = knowledgeResults.results
          .map(result => `- ${result.text}`)
          .join('\n');
      }

      // Combine with additional context
      const fullContext = context ? `${context}\n\nRelevant Knowledge:\n${ragContext}` : ragContext;

      // Generate response using Ollama with RAG context
      const ollamaResponse = await this.ollamaService.generateResponse(query, {
        context: fullContext,
        model: ollamaModel
      });

      const response = {
        success: true,
        query,
        response: ollamaResponse,
        sources: includeSources ? knowledgeResults.results : undefined,
        contextUsed: ragContext.length > 0,
        timestamp: new Date().toISOString()
      };

      return response;
    } catch (error) {
      console.error('Error generating RAG response:', error);
      throw new Error(`Failed to generate RAG response: ${error.message}`);
    }
  }

  /**
   * Generate interview questions with RAG
   * @param {string} topic - Interview topic
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generated questions
   */
  async generateInterviewQuestions(topic, options = {}) {
    try {
      const {
        difficulty = 'medium',
        category = 'technical',
        count = 5,
        includeAnswers = false
      } = options;

      // Search for relevant knowledge about the topic
      const knowledgeResults = await this.searchKnowledge(topic, {
        nResults: 5,
        category,
        difficulty,
        minScore: 0.4
      });

      // Build context from knowledge base
      const context = knowledgeResults.results.length > 0
        ? `Based on the following knowledge about ${topic}:\n${knowledgeResults.results.map(r => r.text).join('\n')}`
        : `Generate interview questions about ${topic}`;

      // Generate questions using Ollama
      const questions = await this.ollamaService.generateInterviewQuestions('general', context);

      // Enhance questions with metadata
      const enhancedQuestions = questions.map((question, index) => ({
        ...question,
        id: uuidv4(),
        topic,
        category,
        difficulty,
        source: 'rag_enhanced',
        knowledgeScore: knowledgeResults.results.length > 0 ? knowledgeResults.results[0].score : 0,
        sources: knowledgeResults.results.slice(0, 2) // Include top 2 sources
      }));

      return {
        success: true,
        topic,
        questions: enhancedQuestions.slice(0, count),
        totalGenerated: enhancedQuestions.length,
        knowledgeUsed: knowledgeResults.results.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating interview questions with RAG:', error);
      throw new Error(`Failed to generate interview questions: ${error.message}`);
    }
  }

  /**
   * Get knowledge base statistics
   * @returns {Promise<Object>} Statistics
   */
  async getKnowledgeBaseStats() {
    try {
      const collections = [
        this.knowledgeBaseCollection,
        this.questionBankCollection,
        this.answerBankCollection
      ];

      const stats = {};
      
      for (const collectionName of collections) {
        try {
          const count = await this.chromaService.getCollectionCount(collectionName);
          stats[collectionName] = count;
        } catch (error) {
          stats[collectionName] = 0;
        }
      }

      const totalKnowledge = Object.values(stats).reduce((sum, count) => sum + count, 0);

      return {
        success: true,
        collections: stats,
        totalKnowledge,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting knowledge base stats:', error);
      throw new Error(`Failed to get knowledge base stats: ${error.message}`);
    }
  }

  /**
   * Test RAG service
   * @returns {Promise<Object>} Test results
   */
  async test() {
    try {
      const embeddingTest = await this.embeddingService.test();
      const chromaTest = await this.chromaService.test();
      
      return {
        success: embeddingTest.success && chromaTest.success,
        embedding: embeddingTest,
        chroma: chromaTest,
        message: 'RAG service test completed'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'RAG service test failed'
      };
    }
  }

  /**
   * Close RAG service
   */
  async close() {
    try {
      await this.chromaService.close();
      console.log('RAG service closed');
    } catch (error) {
      console.error('Error closing RAG service:', error);
    }
  }
}

export default RAGService;
