import ChromaService from './chromaService.js';
import EmbeddingService from './embeddingService.js';
import { v4 as uuidv4 } from 'uuid';

export class ConversationStorageService {
  constructor() {
    this.chromaService = new ChromaService();
    this.embeddingService = new EmbeddingService();
    this.conversationCollection = 'interview_conversations';
    this.knowledgeCollection = 'interview_knowledge';
    this.initialized = false;
  }

  /**
   * Initialize the conversation storage service
   */
  async initialize() {
    if (this.initialized) {
      console.log('Conversation storage service already initialized, skipping...');
      return true;
    }

    try {
      // Initialize embedding service
      await this.embeddingService.initialize();
      
      // Initialize ChromaDB service
      await this.chromaService.initialize();
      
      // Create conversation collection if it doesn't exist
      await this.createConversationCollection();
      
      this.initialized = true;
      console.log('✅ Conversation storage service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize conversation storage service:', error);
      throw new Error(`Conversation storage initialization failed: ${error.message}`);
    }
  }

  /**
   * Create conversation collection in ChromaDB
   */
  async createConversationCollection() {
    try {
      await this.chromaService.createCollection(this.conversationCollection, {
        description: 'Stores interview conversations with questions, answers, and metadata',
        collection_type: 'conversations',
        created_at: new Date().toISOString()
      });
      console.log(`✅ Created conversation collection: ${this.conversationCollection}`);
    } catch (error) {
      if (error.message && error.message.includes('already exists')) {
        console.log(`Collection '${this.conversationCollection}' already exists, retrieving existing collection`);
      } else {
        console.error(`Error creating conversation collection:`, error);
        throw error;
      }
    }
  }

  /**
   * Store conversation data in ChromaDB
   * @param {Object} conversationData - The conversation data to store
   * @returns {Promise<Object>} Stored conversation with ID
   */
  async storeConversation(conversationData) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      console.log(`💾 Storing conversation in ChromaDB...`);

      const {
        session_id,
        question_text,
        llm_generated_answer,
        user_answer,
        question_category,
        question_difficulty,
        question_number,
        confidence_score,
        time_taken_seconds,
        llm_feedback,
        answer_timestamp
      } = conversationData;

      // Generate unique ID for the conversation
      const conversationId = conversationData.id || `conv_${uuidv4()}`;

      // Create the conversation document
      const conversationDocument = {
        id: conversationId,
        text: this.buildConversationText(question_text, llm_generated_answer, user_answer),
        metadata: {
          // Core conversation data
          conversation_id: conversationId,
          session_id: session_id,
          question_number: question_number,
          
          // Question metadata
          question_text: question_text,
          question_category: question_category || 'General',
          question_difficulty: question_difficulty || 'medium',
          
          // Answer metadata
          llm_generated_answer: llm_generated_answer,
          user_answer: user_answer,
          has_user_answer: !!(user_answer && user_answer.trim()),
          
          // Performance metadata
          confidence_score: confidence_score || 0.0,
          time_taken_seconds: time_taken_seconds || 0,
          llm_feedback: llm_feedback,
          
          // Timestamps
          answer_timestamp: answer_timestamp || new Date().toISOString(),
          stored_at: new Date().toISOString(),
          
          // Analysis metadata
          answer_quality: this.assessAnswerQuality(user_answer, confidence_score),
          conversation_length: this.calculateConversationLength(question_text, llm_generated_answer, user_answer),
          
          // Categorization
          tags: this.generateTags(question_category, question_difficulty, user_answer),
          source: 'interview_conversation',
          version: '1.0'
        }
      };

      // Store in ChromaDB
      const result = await this.chromaService.addDocument(conversationDocument);
      
      console.log(`✅ Conversation stored successfully with ID: ${conversationId}`);
      
      return {
        id: conversationId,
        chromadb_id: result.id,
        stored_at: new Date().toISOString(),
        metadata: conversationDocument.metadata
      };

    } catch (error) {
      console.error('❌ Failed to store conversation in ChromaDB:', error);
      throw new Error(`Failed to store conversation: ${error.message}`);
    }
  }

  /**
   * Store multiple conversations in batch
   * @param {Array} conversations - Array of conversation data
   * @returns {Promise<Array>} Array of stored conversations
   */
  async storeConversationsBatch(conversations) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      console.log(`💾 Storing ${conversations.length} conversations in ChromaDB...`);

      const conversationDocuments = conversations.map(convData => {
        const conversationId = convData.id || `conv_${uuidv4()}`;
        
        return {
          id: conversationId,
          text: this.buildConversationText(
            convData.question_text, 
            convData.llm_generated_answer, 
            convData.user_answer
          ),
          metadata: {
            conversation_id: conversationId,
            session_id: convData.session_id,
            question_number: convData.question_number,
            question_text: convData.question_text,
            question_category: convData.question_category || 'General',
            question_difficulty: convData.question_difficulty || 'medium',
            llm_generated_answer: convData.llm_generated_answer,
            user_answer: convData.user_answer,
            has_user_answer: !!(convData.user_answer && convData.user_answer.trim()),
            confidence_score: convData.confidence_score || 0.0,
            time_taken_seconds: convData.time_taken_seconds || 0,
            llm_feedback: convData.llm_feedback,
            answer_timestamp: convData.answer_timestamp || new Date().toISOString(),
            stored_at: new Date().toISOString(),
            answer_quality: this.assessAnswerQuality(convData.user_answer, convData.confidence_score),
            conversation_length: this.calculateConversationLength(
              convData.question_text, 
              convData.llm_generated_answer, 
              convData.user_answer
            ),
            tags: this.generateTags(convData.question_category, convData.question_difficulty, convData.user_answer),
            source: 'interview_conversation',
            version: '1.0'
          }
        };
      });

      const results = await this.chromaService.addDocuments(conversationDocuments);
      
      console.log(`✅ Successfully stored ${results.length} conversations in ChromaDB`);
      
      return results.map((result, index) => ({
        id: conversations[index].id || `conv_${uuidv4()}`,
        chromadb_id: result.id,
        stored_at: new Date().toISOString(),
        metadata: conversationDocuments[index].metadata
      }));

    } catch (error) {
      console.error('❌ Failed to store conversations batch in ChromaDB:', error);
      throw new Error(`Failed to store conversations batch: ${error.message}`);
    }
  }

  /**
   * Search for similar conversations
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Search results
   */
  async searchSimilarConversations(query, options = {}) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const {
        nResults = 5,
        minScore = 0.3,
        category = null,
        difficulty = null,
        sessionId = null,
        hasUserAnswer = null
      } = options;

      // Build where clause for filtering
      const whereClause = {};
      if (category) whereClause.question_category = category;
      if (difficulty) whereClause.question_difficulty = difficulty;
      if (sessionId) whereClause.session_id = sessionId;
      if (hasUserAnswer !== null) whereClause.has_user_answer = hasUserAnswer;

      const searchResults = await this.chromaService.searchSimilar(query, {
        collectionName: this.conversationCollection,
        nResults,
        minScore,
        where: whereClause
      });

      console.log(`🔍 Found ${searchResults.length} similar conversations`);
      
      return searchResults.map(result => ({
        id: result.metadata.conversation_id,
        session_id: result.metadata.session_id,
        question_text: result.metadata.question_text,
        user_answer: result.metadata.user_answer,
        llm_generated_answer: result.metadata.llm_generated_answer,
        confidence_score: result.metadata.confidence_score,
        similarity_score: result.score,
        metadata: result.metadata
      }));

    } catch (error) {
      console.error('❌ Failed to search conversations:', error);
      throw new Error(`Failed to search conversations: ${error.message}`);
    }
  }

  /**
   * Get conversation by ID from ChromaDB
   * @param {string} conversationId - The conversation ID
   * @returns {Promise<Object|null>} Conversation data or null
   */
  async getConversationById(conversationId) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const results = await this.chromaService.searchSimilar('', {
        collectionName: this.conversationCollection,
        nResults: 1,
        where: { conversation_id: conversationId }
      });

      if (results.length === 0) {
        return null;
      }

      const result = results[0];
      return {
        id: result.metadata.conversation_id,
        session_id: result.metadata.session_id,
        question_text: result.metadata.question_text,
        user_answer: result.metadata.user_answer,
        llm_generated_answer: result.metadata.llm_generated_answer,
        confidence_score: result.metadata.confidence_score,
        metadata: result.metadata
      };

    } catch (error) {
      console.error('❌ Failed to get conversation by ID:', error);
      throw new Error(`Failed to get conversation: ${error.message}`);
    }
  }

  /**
   * Get conversations by session ID
   * @param {string} sessionId - The session ID
   * @returns {Promise<Array>} Array of conversations
   */
  async getConversationsBySession(sessionId) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const results = await this.chromaService.searchSimilar('', {
        collectionName: this.conversationCollection,
        nResults: 100,
        where: { session_id: sessionId }
      });

      return results.map(result => ({
        id: result.metadata.conversation_id,
        question_number: result.metadata.question_number,
        question_text: result.metadata.question_text,
        user_answer: result.metadata.user_answer,
        llm_generated_answer: result.metadata.llm_generated_answer,
        confidence_score: result.metadata.confidence_score,
        metadata: result.metadata
      }));

    } catch (error) {
      console.error('❌ Failed to get conversations by session:', error);
      throw new Error(`Failed to get conversations by session: ${error.message}`);
    }
  }

  /**
   * Extract knowledge from conversations and store in knowledge collection
   * @param {string} sessionId - Session ID to extract knowledge from
   * @returns {Promise<Array>} Extracted knowledge items
   */
  async extractKnowledgeFromSession(sessionId) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      console.log(`🧠 Extracting knowledge from session: ${sessionId}`);

      const conversations = await this.getConversationsBySession(sessionId);
      const knowledgeItems = [];

      for (const conversation of conversations) {
        // Extract knowledge from LLM answers
        if (conversation.llm_generated_answer) {
          const knowledgeItem = {
            text: conversation.llm_generated_answer,
            title: `Knowledge from Question: ${conversation.question_text.substring(0, 50)}...`,
            category: conversation.metadata.question_category,
            difficulty: conversation.metadata.question_difficulty,
            tags: [
              ...conversation.metadata.tags,
              'extracted-knowledge',
              `session-${sessionId}`
            ],
            source: 'conversation-extraction',
            session_id: sessionId,
            conversation_id: conversation.id,
            extracted_at: new Date().toISOString(),
            quality_score: this.assessKnowledgeQuality(conversation.llm_generated_answer)
          };

          knowledgeItems.push(knowledgeItem);
        }

        // Extract knowledge from good user answers
        if (conversation.user_answer && conversation.metadata.confidence_score > 0.7) {
          const knowledgeItem = {
            text: conversation.user_answer,
            title: `User Insight: ${conversation.question_text.substring(0, 50)}...`,
            category: conversation.metadata.question_category,
            difficulty: conversation.metadata.question_difficulty,
            tags: [
              ...conversation.metadata.tags,
              'user-insight',
              `session-${sessionId}`
            ],
            source: 'user-answer-extraction',
            session_id: sessionId,
            conversation_id: conversation.id,
            extracted_at: new Date().toISOString(),
            quality_score: conversation.metadata.confidence_score
          };

          knowledgeItems.push(knowledgeItem);
        }
      }

      // Store extracted knowledge in knowledge collection
      if (knowledgeItems.length > 0) {
        const knowledgeResults = await this.chromaService.addDocuments(
          knowledgeItems.map(item => ({
            id: `knowledge_${uuidv4()}`,
            text: item.text,
            metadata: item
          })),
          this.knowledgeCollection
        );

        console.log(`✅ Extracted and stored ${knowledgeResults.length} knowledge items`);
        return knowledgeResults;
      }

      return [];

    } catch (error) {
      console.error('❌ Failed to extract knowledge from session:', error);
      throw new Error(`Failed to extract knowledge: ${error.message}`);
    }
  }

  /**
   * Get conversation statistics
   * @returns {Promise<Object>} Statistics about stored conversations
   */
  async getConversationStats() {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const stats = await this.chromaService.getCollectionStats(this.conversationCollection);
      
      return {
        total_conversations: stats.totalDocuments,
        total_embeddings: stats.totalEmbeddings,
        collection_name: this.conversationCollection,
        last_updated: stats.lastUpdated,
        categories: stats.categories || {},
        difficulties: stats.difficulties || {}
      };

    } catch (error) {
      console.error('❌ Failed to get conversation stats:', error);
      throw new Error(`Failed to get conversation stats: ${error.message}`);
    }
  }

  // Helper methods

  /**
   * Build conversation text for embedding
   */
  buildConversationText(question, llmAnswer, userAnswer) {
    const parts = [
      `Question: ${question}`,
      llmAnswer ? `Expert Answer: ${llmAnswer}` : '',
      userAnswer ? `User Answer: ${userAnswer}` : ''
    ].filter(Boolean);

    return parts.join('\n\n');
  }

  /**
   * Assess answer quality
   */
  assessAnswerQuality(userAnswer, confidenceScore) {
    if (!userAnswer || userAnswer.trim() === '') {
      return 'no_answer';
    }
    
    const wordCount = userAnswer.split(' ').length;
    
    if (confidenceScore >= 0.8 && wordCount >= 20) {
      return 'excellent';
    } else if (confidenceScore >= 0.6 && wordCount >= 10) {
      return 'good';
    } else if (confidenceScore >= 0.4 && wordCount >= 5) {
      return 'fair';
    } else {
      return 'poor';
    }
  }

  /**
   * Calculate conversation length
   */
  calculateConversationLength(question, llmAnswer, userAnswer) {
    const totalLength = (question?.length || 0) + 
                       (llmAnswer?.length || 0) + 
                       (userAnswer?.length || 0);
    
    if (totalLength > 500) return 'long';
    if (totalLength > 200) return 'medium';
    return 'short';
  }

  /**
   * Generate tags for conversation
   */
  generateTags(category, difficulty, userAnswer) {
    const tags = [category?.toLowerCase(), difficulty];
    
    if (userAnswer && userAnswer.trim()) {
      tags.push('answered');
      if (userAnswer.length > 100) tags.push('detailed');
    } else {
      tags.push('unanswered');
    }
    
    return tags.filter(Boolean);
  }

  /**
   * Assess knowledge quality
   */
  assessKnowledgeQuality(text) {
    const wordCount = text.split(' ').length;
    const hasExamples = text.includes('example') || text.includes('for instance');
    const hasTechnicalTerms = /[A-Z]{2,}|[a-z]+[A-Z]/.test(text);
    
    let score = 0.5; // Base score
    
    if (wordCount > 50) score += 0.2;
    if (hasExamples) score += 0.2;
    if (hasTechnicalTerms) score += 0.1;
    
    return Math.min(score, 1.0);
  }
}

export default ConversationStorageService;
