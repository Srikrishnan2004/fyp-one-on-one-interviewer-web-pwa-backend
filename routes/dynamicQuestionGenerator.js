import express from 'express';
import DynamicQuestionGenerator from '../services/dynamicQuestionGenerator.js';
import { Session } from '../models/Session.js';
import { authenticateToken, validateInput } from '../middleware/auth.js';
import Joi from 'joi';

const router = express.Router();

// Initialize dynamic question generator
const dynamicQuestionGenerator = new DynamicQuestionGenerator();

// Validation schemas
const initializeSessionSchema = Joi.object({
  skillDomain: Joi.string().min(1).required(),
  difficulty: Joi.string().valid('easy', 'medium', 'hard').default('medium'),
  userId: Joi.string().uuid().required(),
  sessionName: Joi.string().optional(),
  maxQuestions: Joi.number().integer().min(5).max(50).default(20)
});

const processAnswerSchema = Joi.object({
  questionId: Joi.string().uuid().required(),
  userAnswer: Joi.string().allow('').optional(),
  timeTakenSeconds: Joi.number().integer().min(0).optional(),
  confidenceScore: Joi.number().min(0).max(1).optional()
});

const getSessionStatusSchema = Joi.object({
  sessionId: Joi.string().uuid().required()
});

// Initialize dynamic question generator service
router.use(async (req, res, next) => {
  try {
    await dynamicQuestionGenerator.initialize();
    next();
  } catch (error) {
    console.error('Failed to initialize dynamic question generator:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize dynamic question generator',
      error: error.message
    });
  }
});

// Step 1: Initialize session with skill domain and difficulty
router.post('/initialize', authenticateToken, validateInput(initializeSessionSchema), async (req, res) => {
  try {
    const { skillDomain, difficulty, userId, sessionName, maxQuestions } = req.body;
    const authUserId = req.user.id;

    // Verify user authorization
    if (userId !== authUserId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Cannot initialize session for another user'
      });
    }

    console.log(`🚀 Initializing dynamic question session for user ${authUserId}: ${skillDomain} (${difficulty})`);

    // Step 1: Create database session first (without dynamic_session_id yet)
    console.log(`📝 Creating database session...`);
    const dbSession = await Session.create({
      user_id: authUserId,
      session_name: sessionName || `Dynamic Interview - ${skillDomain}`,
      session_type: 'dynamic_interview',
      difficulty: difficulty,
      session_metadata: {
        skill_domain: skillDomain,
        max_questions: maxQuestions,
        session_status: 'initialized'
      }
    });
    console.log(`✅ Database session created with ID: ${dbSession.id}`);

    const sessionConfig = {
      skillDomain,
      difficulty,
      userId: authUserId,
      sessionName: sessionName || `Dynamic Interview - ${skillDomain}`,
      maxQuestions,
      databaseSessionId: dbSession.id // Link to database session
    };

    // Step 2: Initialize dynamic interview session
    const result = await dynamicQuestionGenerator.initializeSession(sessionConfig);

    // Step 3: Update database session with dynamic session ID in metadata
    await dbSession.update({
      session_metadata: {
        ...dbSession.session_metadata,
        dynamic_session_id: result.session.id,
        baseline_questions_count: result.baselineQuestions.length,
        session_status: 'ready'
      }
    });

    res.json({
      success: true,
      message: 'Dynamic question session initialized successfully',
      data: {
        session: result.session,
        databaseSession: {
          id: dbSession.id,
          session_name: dbSession.session_name,
          session_type: dbSession.session_type,
          difficulty: dbSession.difficulty,
          created_at: dbSession.created_at
        },
        baselineQuestions: result.baselineQuestions,
        algorithmSteps: [
          'Database session created',
          'Dynamic session initialized with skill domain and difficulty',
          `${result.baselineQuestions.length} baseline questions generated`,
          'Ready to begin assessment loop'
        ]
      }
    });
  } catch (error) {
    console.error('Session initialization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize dynamic question session',
      error: error.message
    });
  }
});

// Step 3: Get next question from queue
router.get('/session/:sessionId/next-question', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { includeAudio = 'true', includeAnimation = 'true' } = req.query;
    const userId = req.user.id;

    console.log(`📝 Getting next question for session ${sessionId}`);

    const question = await dynamicQuestionGenerator.getNextQuestion(sessionId, {
      includeAudio: includeAudio === 'true',
      includeAnimation: includeAnimation === 'true'
    });

    if (!question) {
      // Get session status to provide more context
      const sessionStatus = dynamicQuestionGenerator.getSessionStatus(sessionId);
      return res.json({
        success: true,
        message: 'No more questions available',
        data: {
          question: null,
          sessionComplete: true,
          sessionStatus,
          algorithmStep: 'Assessment loop complete - ready for performance report'
        }
      });
    }

    res.json({
      success: true,
      message: 'Next question retrieved successfully',
      data: {
        question,
        sessionComplete: false,
        algorithmStep: 'Question presented - awaiting user response',
        ttsInfo: {
          audioGenerated: question.audioGenerated,
          facialExpression: question.facialExpression,
          animation: question.animation
        }
      }
    });
  } catch (error) {
    console.error('Get next question error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get next question',
      error: error.message
    });
  }
});

// Step 4 & 5: Process user answer and determine next question
router.post('/session/:sessionId/process-answer', authenticateToken, validateInput(processAnswerSchema), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const answerData = req.body;
    const userId = req.user.id;

    console.log(`🧠 Processing answer for session ${sessionId}`);

    const result = await dynamicQuestionGenerator.processAnswer(sessionId, answerData);

    // Determine algorithm step based on adaptive action
    let algorithmStep = '';
    if (result.analysisResult.adaptiveAction === 'advance') {
      algorithmStep = 'High confidence detected - advanced question generated and added to queue';
    } else if (result.analysisResult.adaptiveAction === 'reinforce') {
      algorithmStep = 'Low confidence detected - foundational question generated and added to queue';
    }

    res.json({
      success: true,
      message: 'Answer processed successfully',
      data: {
        analysisResult: result.analysisResult,
        sessionMetrics: result.sessionMetrics,
        nextQuestion: result.nextQuestion,
        algorithmStep,
        adaptiveAction: result.analysisResult.adaptiveAction
      }
    });
  } catch (error) {
    console.error('Process answer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process answer',
      error: error.message
    });
  }
});

// Step 7: Generate performance report
router.post('/session/:sessionId/generate-report', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    console.log(`📊 Generating performance report for session ${sessionId}`);

    const report = await dynamicQuestionGenerator.generatePerformanceReport(sessionId);

    res.json({
      success: true,
      message: 'Performance report generated successfully',
      data: {
        report,
        algorithmStep: 'Performance report generated - session complete'
      }
    });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate performance report',
      error: error.message
    });
  }
});

// Get session status and current state
router.get('/session/:sessionId/status', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    console.log(`📊 Getting status for session ${sessionId}`);

    const status = dynamicQuestionGenerator.getSessionStatus(sessionId);

    if (!status) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    res.json({
      success: true,
      message: 'Session status retrieved successfully',
      data: {
        status,
        algorithmProgress: {
          currentStep: status.questionsRemaining > 0 ? 'Assessment loop in progress' : 'Ready for performance report',
          questionsAnswered: status.questionsAnswered,
          totalQuestions: status.totalQuestions,
          averageConfidence: status.averageConfidence
        }
      }
    });
  } catch (error) {
    console.error('Get session status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get session status',
      error: error.message
    });
  }
});

// Get database session ID for a dynamic session
router.get('/session/:sessionId/database-id', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    console.log(`🔗 Getting database session ID for dynamic session ${sessionId}`);

    const databaseSessionId = dynamicQuestionGenerator.getDatabaseSessionId(sessionId);

    if (!databaseSessionId) {
      return res.status(404).json({
        success: false,
        message: 'Dynamic session not found or has no linked database session'
      });
    }

    res.json({
      success: true,
      message: 'Database session ID retrieved successfully',
      data: {
        dynamicSessionId: sessionId,
        databaseSessionId: databaseSessionId
      }
    });
  } catch (error) {
    console.error('Get database session ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get database session ID',
      error: error.message
    });
  }
});

// Get dynamic session ID from database session ID
router.get('/database-session/:databaseSessionId/dynamic-id', authenticateToken, async (req, res) => {
  try {
    const { databaseSessionId } = req.params;
    const userId = req.user.id;

    console.log(`🔗 Getting dynamic session ID for database session ${databaseSessionId}`);

    const dynamicSessionId = await dynamicQuestionGenerator.getDynamicSessionIdFromDatabase(databaseSessionId);

    if (!dynamicSessionId) {
      return res.status(404).json({
        success: false,
        message: 'Database session not found or has no linked dynamic session'
      });
    }

    res.json({
      success: true,
      message: 'Dynamic session ID retrieved successfully',
      data: {
        databaseSessionId: databaseSessionId,
        dynamicSessionId: dynamicSessionId
      }
    });
  } catch (error) {
    console.error('Get dynamic session ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dynamic session ID',
      error: error.message
    });
  }
});

// Debug endpoint to check session details
router.get('/session/:sessionId/debug', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    console.log(`🔍 Debug info for session ${sessionId}`);

    const session = dynamicQuestionGenerator.sessions.get(sessionId);
    const queue = dynamicQuestionGenerator.questionQueue.get(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    res.json({
      success: true,
      message: 'Session debug info retrieved',
      data: {
        session: {
          id: session.id,
          databaseSessionId: session.databaseSessionId,
          status: session.status,
          currentQuestionNumber: session.currentQuestionNumber,
          questionsAnswered: session.questionsAnswered,
          totalQuestions: session.totalQuestions,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt
        },
        queue: {
          length: queue ? queue.length : 0,
          questions: queue ? queue.map(q => ({ id: q.id, text: q.text.substring(0, 50) + '...', category: q.category, difficulty: q.difficulty })) : []
        },
        debug: {
          sessionsMapSize: dynamicQuestionGenerator.sessions.size,
          questionQueueMapSize: dynamicQuestionGenerator.questionQueue.size,
          allSessionIds: Array.from(dynamicQuestionGenerator.sessions.keys())
        }
      }
    });
  } catch (error) {
    console.error('Get session debug error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get session debug info',
      error: error.message
    });
  }
});

// Get available skill domains
router.get('/skill-domains', authenticateToken, async (req, res) => {
  try {
    const skillDomains = dynamicQuestionGenerator.getAvailableSkillDomains();

    res.json({
      success: true,
      message: 'Skill domains retrieved successfully',
      data: {
        skillDomains,
        totalDomains: skillDomains.length
      }
    });
  } catch (error) {
    console.error('Get skill domains error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get skill domains',
      error: error.message
    });
  }
});

// Get algorithm explanation and steps
router.get('/algorithm', authenticateToken, async (req, res) => {
  try {
    const algorithmExplanation = {
      name: 'Dynamic Question Generation Algorithm',
      description: 'An adaptive algorithm that adjusts difficulty and topic of questions in real-time based on user performance',
      steps: [
        {
          step: 1,
          title: 'System Initialization',
          description: 'Select a skill domain and difficulty level (Easy, Medium, or Hard)',
          endpoint: 'POST /api/dynamic-question-generator/initialize'
        },
        {
          step: 2,
          title: 'Baseline Question Generation',
          description: 'Generate a baseline set of 10 questions and place them into a question queue',
          automatic: true
        },
        {
          step: 3,
          title: 'Assessment Loop - Present Question',
          description: 'Present the next question to the user and capture their spoken response',
          endpoint: 'GET /api/dynamic-question-generator/session/:sessionId/next-question'
        },
        {
          step: 4,
          title: 'Answer Analysis',
          description: 'Analyze the transcribed answer to calculate a confidence score (0.0 to 1.0)',
          automatic: true
        },
        {
          step: 5,
          title: 'Adaptive Question Generation',
          description: 'Determine the next question based on confidence score: >0.5 = advanced question, ≤0.5 = foundational question',
          automatic: true,
          endpoint: 'POST /api/dynamic-question-generator/session/:sessionId/process-answer'
        },
        {
          step: 6,
          title: 'Loop Continuation',
          description: 'Repeat steps 3-5 until the question queue is empty',
          automatic: true
        },
        {
          step: 7,
          title: 'Performance Report Generation',
          description: 'Generate a comprehensive performance report highlighting strengths, weaknesses, and areas for improvement',
          endpoint: 'POST /api/dynamic-question-generator/session/:sessionId/generate-report'
        }
      ],
      adaptiveLogic: {
        highConfidence: {
          threshold: '> 0.5',
          action: 'Generate more advanced, related question',
          difficulty: 'Hard',
          purpose: 'Challenge the user and test deeper understanding'
        },
        lowConfidence: {
          threshold: '≤ 0.5',
          action: 'Generate simpler, foundational question',
          difficulty: 'Easy',
          purpose: 'Reinforce basic concepts and build confidence'
        }
      },
      features: [
        'Real-time difficulty adjustment',
        'Contextual question generation using RAG',
        'AI-powered answer analysis',
        'Performance tracking and metrics',
        'Comprehensive reporting with insights',
        'Knowledge extraction from conversations'
      ]
    };

    res.json({
      success: true,
      message: 'Algorithm explanation retrieved successfully',
      data: algorithmExplanation
    });
  } catch (error) {
    console.error('Get algorithm explanation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get algorithm explanation',
      error: error.message
    });
  }
});

// Test the dynamic question generator
router.get('/test', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    console.log(`🧪 Testing dynamic question generator for user ${userId}`);

    const testResult = await dynamicQuestionGenerator.test();

    res.json({
      success: true,
      message: 'Dynamic question generator test completed',
      data: testResult
    });
  } catch (error) {
    console.error('Dynamic question generator test error:', error);
    res.status(500).json({
      success: false,
      message: 'Dynamic question generator test failed',
      error: error.message
    });
  }
});

// Health check for dynamic question generator
router.get('/health', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    console.log(`🔍 Checking dynamic question generator health for user ${userId}`);

    // Check if service is initialized
    const isInitialized = dynamicQuestionGenerator.initialized;
    
    // Get available skill domains
    const skillDomains = dynamicQuestionGenerator.getAvailableSkillDomains();

    // Check active sessions count
    const activeSessionsCount = dynamicQuestionGenerator.sessions.size;

    res.json({
      success: true,
      message: 'Dynamic question generator health check completed',
      data: {
        serviceStatus: isInitialized ? 'healthy' : 'not_initialized',
        initialized: isInitialized,
        availableSkillDomains: skillDomains.length,
        activeSessions: activeSessionsCount,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Dynamic question generator health check error:', error);
    res.status(500).json({
      success: false,
      message: 'Dynamic question generator health check failed',
      error: error.message
    });
  }
});

export default router;
