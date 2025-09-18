import express from 'express';
import { Performance } from '../models/Performance.js';
import { Session } from '../models/Session.js';
import { authenticateToken, validateInput } from '../middleware/auth.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const createPerformanceSchema = Joi.object({
  session_id: Joi.string().uuid().optional(),
  conversation_id: Joi.string().uuid().optional(),
  metric_type: Joi.string().min(1).max(50).required(),
  metric_value: Joi.number().required(),
  metric_max_value: Joi.number().default(100.00),
  metric_unit: Joi.string().max(20).optional(),
  performance_category: Joi.string().max(50).optional(),
  feedback_notes: Joi.string().optional(),
  improvement_suggestions: Joi.string().optional()
});

const createBatchPerformanceSchema = Joi.array().items(
  Joi.object({
    session_id: Joi.string().uuid().optional(),
    conversation_id: Joi.string().uuid().optional(),
    metric_type: Joi.string().min(1).max(50).required(),
    metric_value: Joi.number().required(),
    metric_max_value: Joi.number().default(100.00),
    metric_unit: Joi.string().max(20).optional(),
    performance_category: Joi.string().max(50).optional(),
    feedback_notes: Joi.string().optional(),
    improvement_suggestions: Joi.string().optional()
  })
);

const updatePerformanceSchema = Joi.object({
  metric_value: Joi.number().optional(),
  metric_max_value: Joi.number().optional(),
  metric_unit: Joi.string().max(20).optional(),
  performance_category: Joi.string().max(50).optional(),
  feedback_notes: Joi.string().optional(),
  improvement_suggestions: Joi.string().optional()
});

// Create a new performance record
router.post('/', authenticateToken, validateInput(createPerformanceSchema), async (req, res) => {
  try {
    const userId = req.user.id;
    const performanceData = { ...req.body, user_id: userId };

    // Verify session ownership if session_id is provided
    if (performanceData.session_id) {
      const session = await Session.findById(performanceData.session_id);
      if (!session || session.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to session'
        });
      }
    }

    const performance = await Performance.create(performanceData);

    res.status(201).json({
      success: true,
      message: 'Performance record created successfully',
      data: {
        performance: performance.toJSON()
      }
    });
  } catch (error) {
    console.error('Performance creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Performance record creation failed',
      error: error.message
    });
  }
});

// Create multiple performance records
router.post('/batch', authenticateToken, validateInput(createBatchPerformanceSchema), async (req, res) => {
  try {
    const userId = req.user.id;
    const performanceRecords = req.body.map(record => ({ ...record, user_id: userId }));

    // Verify session ownership for all records that have session_id
    const sessionIds = [...new Set(performanceRecords.map(r => r.session_id).filter(Boolean))];
    for (const sessionId of sessionIds) {
      const session = await Session.findById(sessionId);
      if (!session || session.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: `Access denied to session ${sessionId}`
        });
      }
    }

    const performances = await Performance.createBatch(performanceRecords);

    res.status(201).json({
      success: true,
      message: 'Performance records created successfully',
      data: {
        performances: performances.map(p => p.toJSON()),
        count: performances.length
      }
    });
  } catch (error) {
    console.error('Batch performance creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Batch performance record creation failed',
      error: error.message
    });
  }
});

// Get performance records for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      sessionId,
      conversationId,
      metricType,
      performanceCategory,
      limit = 100,
      offset = 0,
      days = 30
    } = req.query;

    const performances = await Performance.findByUserId(userId, {
      sessionId,
      conversationId,
      metricType,
      performanceCategory,
      limit: parseInt(limit),
      offset: parseInt(offset),
      days: parseInt(days)
    });

    res.json({
      success: true,
      data: {
        performances: performances.map(p => p.toJSON()),
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: performances.length
        }
      }
    });
  } catch (error) {
    console.error('Performance fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch performance records',
      error: error.message
    });
  }
});

// Get performance summary for the user
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;

    const summary = await Performance.getUserPerformanceSummary(userId, parseInt(days));

    res.json({
      success: true,
      data: {
        summary
      }
    });
  } catch (error) {
    console.error('Performance summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch performance summary',
      error: error.message
    });
  }
});

// Get performance trends over time
router.get('/trends/:metricType', authenticateToken, async (req, res) => {
  try {
    const { metricType } = req.params;
    const userId = req.user.id;
    const { days = 30 } = req.query;

    const trends = await Performance.getPerformanceTrends(userId, metricType, parseInt(days));

    res.json({
      success: true,
      data: {
        metric_type: metricType,
        trends
      }
    });
  } catch (error) {
    console.error('Performance trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch performance trends',
      error: error.message
    });
  }
});

// Get performance insights and recommendations
router.get('/insights', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;

    const insights = await Performance.getPerformanceInsights(userId, parseInt(days));

    res.json({
      success: true,
      data: {
        insights
      }
    });
  } catch (error) {
    console.error('Performance insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch performance insights',
      error: error.message
    });
  }
});

// Get AI insights for a specific session
router.get('/session/:sessionId/insights', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    // Verify session ownership
    const session = await Session.findById(sessionId);
    if (!session || session.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to session'
      });
    }

    console.log(`🧠 Generating AI insights for session ${sessionId}`);

    // Get session-specific insights
    const insights = await Performance.getSessionInsights(userId, sessionId);

    res.json({
      success: true,
      message: 'Session insights generated successfully',
      data: {
        session_id: sessionId,
        session_name: session.session_name,
        session_type: session.session_type,
        insights: insights,
        generated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Session insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate session insights',
      error: error.message
    });
  }
});

// Get performance comparison between sessions
router.get('/compare-sessions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionIds } = req.query;

    if (!sessionIds) {
      return res.status(400).json({
        success: false,
        message: 'sessionIds parameter is required'
      });
    }

    const sessionIdArray = sessionIds.split(',');
    
    // Verify all sessions belong to the user
    for (const sessionId of sessionIdArray) {
      const session = await Session.findById(sessionId);
      if (!session || session.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: `Access denied to session ${sessionId}`
        });
      }
    }

    const comparison = await Performance.getSessionComparison(userId, sessionIdArray);

    res.json({
      success: true,
      data: {
        comparison,
        session_ids: sessionIdArray
      }
    });
  } catch (error) {
    console.error('Performance comparison error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch performance comparison',
      error: error.message
    });
  }
});

// Get performance leaderboard
router.get('/leaderboard/:metricType', authenticateToken, async (req, res) => {
  try {
    const { metricType } = req.params;
    const { limit = 10 } = req.query;

    const leaderboard = await Performance.getPerformanceLeaderboard(metricType, parseInt(limit));

    res.json({
      success: true,
      data: {
        metric_type: metricType,
        leaderboard
      }
    });
  } catch (error) {
    console.error('Performance leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch performance leaderboard',
      error: error.message
    });
  }
});

// Get a specific performance record by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const performance = await Performance.findById(id);
    if (!performance) {
      return res.status(404).json({
        success: false,
        message: 'Performance record not found'
      });
    }

    // Verify that the performance record belongs to the user
    if (performance.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get performance with related data
    const performanceWithDetails = await performance.getWithRelatedData();

    res.json({
      success: true,
      data: {
        performance: performanceWithDetails
      }
    });
  } catch (error) {
    console.error('Performance fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch performance record',
      error: error.message
    });
  }
});

// Update a performance record
router.put('/:id', authenticateToken, validateInput(updatePerformanceSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    const performance = await Performance.findById(id);
    if (!performance) {
      return res.status(404).json({
        success: false,
        message: 'Performance record not found'
      });
    }

    // Verify that the performance record belongs to the user
    if (performance.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updatedPerformance = await performance.update(updateData);

    res.json({
      success: true,
      message: 'Performance record updated successfully',
      data: {
        performance: updatedPerformance.toJSON()
      }
    });
  } catch (error) {
    console.error('Performance update error:', error);
    res.status(500).json({
      success: false,
      message: 'Performance record update failed',
      error: error.message
    });
  }
});

// Delete a performance record
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const performance = await Performance.findById(id);
    if (!performance) {
      return res.status(404).json({
        success: false,
        message: 'Performance record not found'
      });
    }

    // Verify that the performance record belongs to the user
    if (performance.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await performance.delete();

    res.json({
      success: true,
      message: 'Performance record deleted successfully'
    });
  } catch (error) {
    console.error('Performance deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete performance record',
      error: error.message
    });
  }
});

// Get performance analytics dashboard data
router.get('/dashboard/analytics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;

    // Get multiple analytics in parallel
    const [summary, insights, trends] = await Promise.all([
      Performance.getUserPerformanceSummary(userId, parseInt(days)),
      Performance.getPerformanceInsights(userId, parseInt(days)),
      // Get trends for the most common metric types
      Performance.getPerformanceTrends(userId, 'overall_score', parseInt(days))
    ]);

    res.json({
      success: true,
      data: {
        summary,
        insights,
        trends: {
          metric_type: 'overall_score',
          data: trends
        },
        period_days: parseInt(days)
      }
    });
  } catch (error) {
    console.error('Performance dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch performance dashboard data',
      error: error.message
    });
  }
});

export default router;
