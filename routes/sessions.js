import express from 'express';
import { Session } from '../models/Session.js';
import { authenticateToken, validateInput } from '../middleware/auth.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const createSessionSchema = Joi.object({
  session_name: Joi.string().min(1).max(100).required(),
  session_type: Joi.string().valid('interview', 'practice', 'mock', 'assessment').default('interview'),
  session_metadata: Joi.object().optional()
});

const updateSessionSchema = Joi.object({
  session_name: Joi.string().min(1).max(100).optional(),
  session_type: Joi.string().valid('interview', 'practice', 'mock', 'assessment').optional(),
  session_metadata: Joi.object().optional()
});

// Create a new session
router.post('/', authenticateToken, validateInput(createSessionSchema), async (req, res) => {
  try {
    const { session_name, session_type, session_metadata } = req.body;
    const userId = req.user.id;

    const session = await Session.create({
      user_id: userId,
      session_name,
      session_type,
      session_metadata
    });

    res.status(201).json({
      success: true,
      message: 'Session created successfully',
      data: {
        session: session.toJSON()
      }
    });
  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Session creation failed',
      error: error.message
    });
  }
});

// Get all sessions for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, limit = 50, offset = 0 } = req.query;

    const sessions = await Session.findByUserId(userId, {
      status,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        sessions: sessions.map(session => session.toJSON()),
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: sessions.length
        }
      }
    });
  } catch (error) {
    console.error('Sessions fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sessions',
      error: error.message
    });
  }
});

// Get session summary for dashboard
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;

    const summary = await Session.getSessionSummary(userId, parseInt(days));

    res.json({
      success: true,
      data: {
        summary
      }
    });
  } catch (error) {
    console.error('Session summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch session summary',
      error: error.message
    });
  }
});

// Get active sessions
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const activeSessions = await Session.getActiveSessions(userId);

    res.json({
      success: true,
      data: {
        sessions: activeSessions.map(session => session.toJSON())
      }
    });
  } catch (error) {
    console.error('Active sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active sessions',
      error: error.message
    });
  }
});

// Get a specific session by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const session = await Session.findById(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check if session belongs to the user
    if (session.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get session statistics
    const stats = await session.getStats();
    const conversations = await session.getConversations();
    const performanceMetrics = await session.getPerformanceMetrics();

    res.json({
      success: true,
      data: {
        session: session.toJSON(),
        stats,
        conversations,
        performance_metrics: performanceMetrics
      }
    });
  } catch (error) {
    console.error('Session fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch session',
      error: error.message
    });
  }
});

// Update a session
router.put('/:id', authenticateToken, validateInput(updateSessionSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    const session = await Session.findById(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check if session belongs to the user
    if (session.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updatedSession = await session.update(updateData);

    res.json({
      success: true,
      message: 'Session updated successfully',
      data: {
        session: updatedSession.toJSON()
      }
    });
  } catch (error) {
    console.error('Session update error:', error);
    res.status(500).json({
      success: false,
      message: 'Session update failed',
      error: error.message
    });
  }
});

// Start a session
router.post('/:id/start', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const session = await Session.findById(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check if session belongs to the user
    if (session.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if session can be started
    if (session.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot start a completed session'
      });
    }

    const startedSession = await session.start();

    res.json({
      success: true,
      message: 'Session started successfully',
      data: {
        session: startedSession.toJSON()
      }
    });
  } catch (error) {
    console.error('Session start error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start session',
      error: error.message
    });
  }
});

// End a session
router.post('/:id/end', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const session = await Session.findById(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check if session belongs to the user
    if (session.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if session can be ended
    if (session.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Session is already completed'
      });
    }

    const endedSession = await session.end();

    res.json({
      success: true,
      message: 'Session ended successfully',
      data: {
        session: endedSession.toJSON()
      }
    });
  } catch (error) {
    console.error('Session end error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end session',
      error: error.message
    });
  }
});

// Pause a session
router.post('/:id/pause', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const session = await Session.findById(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check if session belongs to the user
    if (session.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if session can be paused
    if (session.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Only active sessions can be paused'
      });
    }

    const pausedSession = await session.pause();

    res.json({
      success: true,
      message: 'Session paused successfully',
      data: {
        session: pausedSession.toJSON()
      }
    });
  } catch (error) {
    console.error('Session pause error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to pause session',
      error: error.message
    });
  }
});

// Resume a session
router.post('/:id/resume', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const session = await Session.findById(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check if session belongs to the user
    if (session.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if session can be resumed
    if (session.status !== 'paused') {
      return res.status(400).json({
        success: false,
        message: 'Only paused sessions can be resumed'
      });
    }

    const resumedSession = await session.resume();

    res.json({
      success: true,
      message: 'Session resumed successfully',
      data: {
        session: resumedSession.toJSON()
      }
    });
  } catch (error) {
    console.error('Session resume error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resume session',
      error: error.message
    });
  }
});

// Abandon a session
router.post('/:id/abandon', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const session = await Session.findById(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check if session belongs to the user
    if (session.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if session can be abandoned
    if (session.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot abandon a completed session'
      });
    }

    const abandonedSession = await session.abandon();

    res.json({
      success: true,
      message: 'Session abandoned successfully',
      data: {
        session: abandonedSession.toJSON()
      }
    });
  } catch (error) {
    console.error('Session abandon error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to abandon session',
      error: error.message
    });
  }
});

// Update question count for a session
router.put('/:id/question-count', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { total_questions, completed_questions } = req.body;

    if (typeof total_questions !== 'number' || typeof completed_questions !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'total_questions and completed_questions must be numbers'
      });
    }

    const session = await Session.findById(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check if session belongs to the user
    if (session.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updatedSession = await session.updateQuestionCount(total_questions, completed_questions);

    res.json({
      success: true,
      message: 'Question count updated successfully',
      data: {
        session: updatedSession.toJSON()
      }
    });
  } catch (error) {
    console.error('Question count update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update question count',
      error: error.message
    });
  }
});

// Delete a session
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const session = await Session.findById(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check if session belongs to the user
    if (session.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await session.delete();

    res.json({
      success: true,
      message: 'Session deleted successfully'
    });
  } catch (error) {
    console.error('Session deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete session',
      error: error.message
    });
  }
});

export default router;
