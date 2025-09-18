import express from 'express';
import ConversationStorageService from '../services/conversationStorageService.js';
import { authenticateToken, validateInput } from '../middleware/auth.js';
import Joi from 'joi';

const router = express.Router();

// Initialize conversation storage service
const conversationStorageService = new ConversationStorageService();

// Validation schemas
const searchConversationsSchema = Joi.object({
  query: Joi.string().min(1).required(),
  nResults: Joi.number().integer().min(1).max(50).default(5),
  minScore: Joi.number().min(0).max(1).default(0.3),
  category: Joi.string().optional(),
  difficulty: Joi.string().valid('easy', 'medium', 'hard').optional(),
  sessionId: Joi.string().uuid().optional(),
  hasUserAnswer: Joi.boolean().optional()
});

const storeConversationSchema = Joi.object({
  session_id: Joi.string().uuid().required(),
  question_text: Joi.string().min(1).required(),
  llm_generated_answer: Joi.string().optional(),
  user_answer: Joi.string().allow('').optional(),
  question_category: Joi.string().optional(),
  question_difficulty: Joi.string().valid('easy', 'medium', 'hard').default('medium'),
  question_number: Joi.number().integer().min(1).required(),
  confidence_score: Joi.number().min(0).max(1).default(0.0),
  time_taken_seconds: Joi.number().integer().min(0).default(0),
  llm_feedback: Joi.string().optional(),
  answer_timestamp: Joi.string().isoDate().optional()
});

const storeConversationsBatchSchema = Joi.object({
  conversations: Joi.array().items(storeConversationSchema).min(1).max(100).required()
});

const extractKnowledgeSchema = Joi.object({
  sessionId: Joi.string().uuid().required()
});

// Initialize conversation storage service
router.use(async (req, res, next) => {
  try {
    await conversationStorageService.initialize();
    next();
  } catch (error) {
    console.error('Failed to initialize conversation storage service:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize conversation storage service',
      error: error.message
    });
  }
});

// Search similar conversations
router.post('/search', authenticateToken, validateInput(searchConversationsSchema), async (req, res) => {
  try {
    const { query, nResults, minScore, category, difficulty, sessionId, hasUserAnswer } = req.body;
    const userId = req.user.id;

    console.log(`🔍 Searching conversations for user ${userId}: "${query}"`);

    const searchResults = await conversationStorageService.searchSimilarConversations(query, {
      nResults,
      minScore,
      category,
      difficulty,
      sessionId,
      hasUserAnswer
    });

    res.json({
      success: true,
      message: 'Conversation search completed successfully',
      data: {
        query,
        results: searchResults,
        totalResults: searchResults.length,
        searchOptions: {
          nResults,
          minScore,
          category,
          difficulty,
          sessionId,
          hasUserAnswer
        }
      }
    });
  } catch (error) {
    console.error('Conversation search error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search conversations',
      error: error.message
    });
  }
});

// Get conversation by ID from ChromaDB
router.get('/:conversationId', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    console.log(`📖 Retrieving conversation ${conversationId} for user ${userId}`);

    const conversation = await conversationStorageService.getConversationById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    res.json({
      success: true,
      message: 'Conversation retrieved successfully',
      data: {
        conversation
      }
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve conversation',
      error: error.message
    });
  }
});

// Get conversations by session ID from ChromaDB
router.get('/session/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    console.log(`📚 Retrieving conversations for session ${sessionId} and user ${userId}`);

    const conversations = await conversationStorageService.getConversationsBySession(sessionId);

    res.json({
      success: true,
      message: 'Session conversations retrieved successfully',
      data: {
        sessionId,
        conversations,
        totalConversations: conversations.length
      }
    });
  } catch (error) {
    console.error('Get session conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve session conversations',
      error: error.message
    });
  }
});

// Store conversation in ChromaDB (manual storage)
router.post('/store', authenticateToken, validateInput(storeConversationSchema), async (req, res) => {
  try {
    const conversationData = req.body;
    const userId = req.user.id;

    console.log(`💾 Manually storing conversation for user ${userId}`);

    const result = await conversationStorageService.storeConversation(conversationData);

    res.json({
      success: true,
      message: 'Conversation stored successfully in ChromaDB',
      data: {
        conversation: result
      }
    });
  } catch (error) {
    console.error('Store conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to store conversation',
      error: error.message
    });
  }
});

// Store multiple conversations in ChromaDB (batch storage)
router.post('/store/batch', authenticateToken, validateInput(storeConversationsBatchSchema), async (req, res) => {
  try {
    const { conversations } = req.body;
    const userId = req.user.id;

    console.log(`💾 Manually storing ${conversations.length} conversations for user ${userId}`);

    const results = await conversationStorageService.storeConversationsBatch(conversations);

    res.json({
      success: true,
      message: 'Conversations stored successfully in ChromaDB',
      data: {
        conversations: results,
        totalStored: results.length
      }
    });
  } catch (error) {
    console.error('Store conversations batch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to store conversations batch',
      error: error.message
    });
  }
});

// Extract knowledge from session conversations
router.post('/extract-knowledge', authenticateToken, validateInput(extractKnowledgeSchema), async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user.id;

    console.log(`🧠 Extracting knowledge from session ${sessionId} for user ${userId}`);

    const knowledgeItems = await conversationStorageService.extractKnowledgeFromSession(sessionId);

    res.json({
      success: true,
      message: 'Knowledge extraction completed successfully',
      data: {
        sessionId,
        knowledgeItems,
        totalExtracted: knowledgeItems.length
      }
    });
  } catch (error) {
    console.error('Extract knowledge error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to extract knowledge from session',
      error: error.message
    });
  }
});

// Get conversation storage statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    console.log(`📊 Getting conversation storage statistics for user ${userId}`);

    const stats = await conversationStorageService.getConversationStats();

    res.json({
      success: true,
      message: 'Conversation storage statistics retrieved successfully',
      data: {
        stats
      }
    });
  } catch (error) {
    console.error('Get conversation stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve conversation storage statistics',
      error: error.message
    });
  }
});

// Test conversation storage service
router.get('/test/health', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    console.log(`🔍 Testing conversation storage service for user ${userId}`);

    // Test basic operations
    const stats = await conversationStorageService.getConversationStats();
    
    // Test search functionality
    const testSearch = await conversationStorageService.searchSimilarConversations('test', {
      nResults: 1,
      minScore: 0.1
    });

    res.json({
      success: true,
      message: 'Conversation storage service is healthy',
      data: {
        serviceStatus: 'healthy',
        stats,
        testSearch: {
          performed: true,
          resultsFound: testSearch.length
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Conversation storage health check error:', error);
    res.status(500).json({
      success: false,
      message: 'Conversation storage service health check failed',
      error: error.message
    });
  }
});

export default router;
