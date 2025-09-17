import express from 'express';
import { Conversation } from '../models/Conversation.js';
import { Session } from '../models/Session.js';
import { authenticateToken, validateInput } from '../middleware/auth.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const createConversationSchema = Joi.object({
  session_id: Joi.string().uuid().required(),
  question_number: Joi.number().integer().min(1).required(),
  question_text: Joi.string().min(1).required(),
  question_category: Joi.string().min(1).max(50).optional(),
  question_difficulty: Joi.string().valid('easy', 'medium', 'hard').default('medium'),
  llm_generated_answer: Joi.string().optional(),
  user_answer: Joi.string().optional(),
  user_answer_audio_url: Joi.string().uri().optional(),
  time_taken_seconds: Joi.number().integer().min(0).optional(),
  llm_feedback: Joi.string().optional(),
  confidence_score: Joi.number().min(0).max(1).optional(),
  auto_generate_answer: Joi.boolean().default(true)
});

const submitAnswerSchema = Joi.object({
  user_answer: Joi.string().min(1).required(),
  user_answer_audio_url: Joi.string().uri().optional(),
  time_taken_seconds: Joi.number().integer().min(0).optional(),
  llm_feedback: Joi.string().optional(),
  confidence_score: Joi.number().min(0).max(1).optional()
});

const updateFeedbackSchema = Joi.object({
  llm_feedback: Joi.string().min(1).required(),
  confidence_score: Joi.number().min(0).max(1).required()
});

// Create a new conversation
router.post('/', authenticateToken, validateInput(createConversationSchema), async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationData = req.body;

    // Verify that the session belongs to the user
    const session = await Session.findById(conversationData.session_id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    if (session.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    console.log(`🔄 Creating conversation for question ${conversationData.question_number}...`);
    
    const conversation = await Conversation.create(conversationData);

    res.status(201).json({
      success: true,
      message: 'Conversation created successfully',
      data: {
        conversation: conversation.toJSON(),
        llm_answer_generated: !!conversation.llm_generated_answer
      }
    });
  } catch (error) {
    console.error('Conversation creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Conversation creation failed',
      error: error.message
    });
  }
});

// Get conversations for a specific session
router.get('/session/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const { limit = 100, offset = 0, orderBy = 'question_number' } = req.query;

    // Verify that the session belongs to the user
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    if (session.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const conversations = await Conversation.findBySessionId(sessionId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      orderBy
    });

    // Get session statistics
    const stats = await Conversation.getSessionStats(sessionId);

    res.json({
      success: true,
      data: {
        conversations: conversations.map(conv => conv.toJSON()),
        stats,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: conversations.length
        }
      }
    });
  } catch (error) {
    console.error('Conversations fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations',
      error: error.message
    });
  }
});

// Get all conversations for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId, limit = 100, offset = 0 } = req.query;

    const conversations = await Conversation.findByUserId(userId, {
      sessionId,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        conversations: conversations.map(conv => conv.toJSON()),
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: conversations.length
        }
      }
    });
  } catch (error) {
    console.error('Conversations fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations',
      error: error.message
    });
  }
});

// Get conversation statistics for the user
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;

    const stats = await Conversation.getUserStats(userId, parseInt(days));

    res.json({
      success: true,
      data: {
        stats
      }
    });
  } catch (error) {
    console.error('Conversation stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversation statistics',
      error: error.message
    });
  }
});

// Get conversations by category
router.get('/category/:category', authenticateToken, async (req, res) => {
  try {
    const { category } = req.params;
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    const conversations = await Conversation.getByCategory(userId, category, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        conversations: conversations.map(conv => conv.toJSON()),
        category,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: conversations.length
        }
      }
    });
  } catch (error) {
    console.error('Category conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations by category',
      error: error.message
    });
  }
});

// Get conversations by difficulty
router.get('/difficulty/:difficulty', authenticateToken, async (req, res) => {
  try {
    const { difficulty } = req.params;
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid difficulty level'
      });
    }

    const conversations = await Conversation.getByDifficulty(userId, difficulty, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        conversations: conversations.map(conv => conv.toJSON()),
        difficulty,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: conversations.length
        }
      }
    });
  } catch (error) {
    console.error('Difficulty conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations by difficulty',
      error: error.message
    });
  }
});

// Get a specific conversation by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Verify that the conversation belongs to the user (through session)
    const session = await Session.findById(conversation.session_id);
    if (!session || session.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get conversation with session details
    const conversationWithDetails = await conversation.getWithSessionDetails();
    const performanceMetrics = await conversation.getPerformanceMetrics();

    res.json({
      success: true,
      data: {
        conversation: conversationWithDetails,
        performance_metrics: performanceMetrics
      }
    });
  } catch (error) {
    console.error('Conversation fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversation',
      error: error.message
    });
  }
});

// Submit user answer to a conversation
router.put('/:id/answer', authenticateToken, validateInput(submitAnswerSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { user_answer, user_answer_audio_url, time_taken_seconds, llm_feedback, confidence_score } = req.body;

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Verify that the conversation belongs to the user (through session)
    const session = await Session.findById(conversation.session_id);
    if (!session || session.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updatedConversation = await conversation.submitAnswer(user_answer, {
      user_answer_audio_url,
      time_taken_seconds,
      llm_feedback,
      confidence_score
    });

    res.json({
      success: true,
      message: 'Answer submitted successfully',
      data: {
        conversation: updatedConversation.toJSON()
      }
    });
  } catch (error) {
    console.error('Answer submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit answer',
      error: error.message
    });
  }
});

// Update LLM feedback for a conversation
router.put('/:id/feedback', authenticateToken, validateInput(updateFeedbackSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { llm_feedback, confidence_score } = req.body;

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Verify that the conversation belongs to the user (through session)
    const session = await Session.findById(conversation.session_id);
    if (!session || session.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updatedConversation = await conversation.updateFeedback(llm_feedback, confidence_score);

    res.json({
      success: true,
      message: 'Feedback updated successfully',
      data: {
        conversation: updatedConversation.toJSON()
      }
    });
  } catch (error) {
    console.error('Feedback update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update feedback',
      error: error.message
    });
  }
});

// Regenerate LLM answer for a conversation
router.post('/:id/regenerate-answer', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Verify that the conversation belongs to the user (through session)
    const session = await Session.findById(conversation.session_id);
    if (!session || session.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    console.log(`🔄 Regenerating LLM answer for conversation ${id}...`);

    // Generate new LLM answer
    const LLMAnswerService = (await import('../services/llmAnswerService.js')).default;
    const llmService = new LLMAnswerService();
    
    const newAnswer = await llmService.generateAnswer(
      conversation.question_text,
      conversation.question_category || 'General',
      conversation.question_difficulty
    );

    // Update the conversation with the new answer
    const updatedConversation = await conversation.update({
      llm_generated_answer: newAnswer
    });

    res.json({
      success: true,
      message: 'LLM answer regenerated successfully',
      data: {
        conversation: updatedConversation.toJSON(),
        answer_length: newAnswer.length
      }
    });
  } catch (error) {
    console.error('LLM answer regeneration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to regenerate LLM answer',
      error: error.message
    });
  }
});

// Update a conversation
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Verify that the conversation belongs to the user (through session)
    const session = await Session.findById(conversation.session_id);
    if (!session || session.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updatedConversation = await conversation.update(updateData);

    res.json({
      success: true,
      message: 'Conversation updated successfully',
      data: {
        conversation: updatedConversation.toJSON()
      }
    });
  } catch (error) {
    console.error('Conversation update error:', error);
    res.status(500).json({
      success: false,
      message: 'Conversation update failed',
      error: error.message
    });
  }
});

// Delete a conversation
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Verify that the conversation belongs to the user (through session)
    const session = await Session.findById(conversation.session_id);
    if (!session || session.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await conversation.delete();

    res.json({
      success: true,
      message: 'Conversation deleted successfully'
    });
  } catch (error) {
    console.error('Conversation deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete conversation',
      error: error.message
    });
  }
});

export default router;
