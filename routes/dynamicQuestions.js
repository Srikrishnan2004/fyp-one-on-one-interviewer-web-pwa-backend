import express from 'express';
import { DynamicQuestionService } from '../services/dynamicQuestionService.js';
import { authenticateToken, validateInput } from '../middleware/auth.js';
import Joi from 'joi';

const router = express.Router();

// Initialize the dynamic question service
const dynamicQuestionService = new DynamicQuestionService();

// Initialize services on startup
dynamicQuestionService.initialize().catch(error => {
  console.error('Failed to initialize Dynamic Question Service:', error);
});

// Validation schemas
const initializeSessionSchema = Joi.object({
  skillDomain: Joi.string().min(1).max(100).required(),
  difficulty: Joi.string().valid('easy', 'medium', 'hard').default('medium'),
  sessionId: Joi.string().uuid().required()
});

const processAnswerSchema = Joi.object({
  userAnswer: Joi.string().allow('').optional(),
  timeTakenSeconds: Joi.number().integer().min(0).optional(),
  sessionId: Joi.string().uuid().required()
});

const generateReportSchema = Joi.object({
  sessionId: Joi.string().uuid().required()
});

// Step 1: Initialize dynamic question session
router.post('/initialize', authenticateToken, validateInput(initializeSessionSchema), async (req, res) => {
  try {
    const { skillDomain, difficulty, sessionId } = req.body;
    const userId = req.user.id;

    console.log(`🚀 User ${userId} initializing dynamic session for ${skillDomain}`);

    const result = await dynamicQuestionService.initializeSession(skillDomain, difficulty, sessionId);

    res.status(201).json({
      success: true,
      message: 'Dynamic question session initialized successfully',
      data: {
        sessionId: result.sessionState.sessionId,
        skillDomain: result.sessionState.skillDomain,
        currentDifficulty: result.sessionState.currentDifficulty,
        nextQuestion: result.nextQuestion,
        queueLength: result.queueLength,
        baselineQuestionsGenerated: result.sessionState.questionQueue.length
      }
    });
  } catch (error) {
    console.error('Dynamic session initialization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize dynamic question session',
      error: error.message
    });
  }
});

// Step 3: Process user answer and get next question
router.post('/process-answer', authenticateToken, validateInput(processAnswerSchema), async (req, res) => {
  try {
    const { userAnswer, timeTakenSeconds, sessionId } = req.body;
    const userId = req.user.id;

    console.log(`🔄 User ${userId} processing answer for session ${sessionId}`);

    const result = await dynamicQuestionService.processAnswer(sessionId, userAnswer, timeTakenSeconds);

    res.json({
      success: true,
      message: 'Answer processed successfully',
      data: {
        currentQuestion: result.currentQuestion,
        confidenceScore: result.confidenceScore,
        nextQuestion: result.nextQuestion,
        queueLength: result.queueLength,
        sessionMetrics: result.sessionState,
        isSessionComplete: result.queueLength === 0
      }
    });
  } catch (error) {
    console.error('Answer processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process answer',
      error: error.message
    });
  }
});

// Step 7: Generate performance report
router.post('/generate-report', authenticateToken, validateInput(generateReportSchema), async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user.id;

    console.log(`📊 User ${userId} generating performance report for session ${sessionId}`);

    const result = await dynamicQuestionService.generatePerformanceReport(sessionId);

    res.json({
      success: true,
      message: 'Performance report generated successfully',
      data: {
        report: result.report
      }
    });
  } catch (error) {
    console.error('Performance report generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate performance report',
      error: error.message
    });
  }
});

// Get session status
router.get('/session/:sessionId/status', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    // In real implementation, this would fetch from database
    res.json({
      success: true,
      message: 'Session status retrieved',
      data: {
        sessionId,
        status: 'active', // This would be fetched from database
        message: 'Session state management not yet implemented in database'
      }
    });
  } catch (error) {
    console.error('Session status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get session status',
      error: error.message
    });
  }
});

// Test the dynamic question service
router.get('/test', authenticateToken, async (req, res) => {
  try {
    const testResult = await dynamicQuestionService.initialize();
    
    res.json({
      success: true,
      message: 'Dynamic Question Service test completed',
      data: {
        serviceInitialized: testResult,
        features: [
          'Adaptive difficulty adjustment',
          'RAG-enhanced question generation',
          'Confidence score analysis',
          'Performance reporting',
          'Contextual follow-up questions'
        ]
      }
    });
  } catch (error) {
    console.error('Dynamic question service test error:', error);
    res.status(500).json({
      success: false,
      message: 'Dynamic Question Service test failed',
      error: error.message
    });
  }
});

// Get available skill domains
router.get('/skill-domains', authenticateToken, async (req, res) => {
  try {
    const skillDomains = [
      {
        name: 'JavaScript',
        description: 'Core JavaScript concepts, ES6+, closures, async/await',
        categories: ['Fundamentals', 'Advanced', 'DOM', 'Async Programming']
      },
      {
        name: 'React',
        description: 'React components, hooks, state management, performance',
        categories: ['Components', 'Hooks', 'State Management', 'Performance']
      },
      {
        name: 'Node.js',
        description: 'Server-side JavaScript, APIs, middleware, databases',
        categories: ['Core', 'APIs', 'Middleware', 'Database Integration']
      },
      {
        name: 'System Design',
        description: 'Scalability, architecture, distributed systems',
        categories: ['Architecture', 'Scalability', 'Databases', 'Caching']
      },
      {
        name: 'Python',
        description: 'Python fundamentals, OOP, data structures, frameworks',
        categories: ['Fundamentals', 'OOP', 'Data Structures', 'Frameworks']
      },
      {
        name: 'Database Design',
        description: 'SQL, NoSQL, database optimization, transactions',
        categories: ['SQL', 'NoSQL', 'Optimization', 'Transactions']
      }
    ];

    res.json({
      success: true,
      message: 'Available skill domains retrieved',
      data: {
        skillDomains
      }
    });
  } catch (error) {
    console.error('Skill domains error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get skill domains',
      error: error.message
    });
  }
});

// Get algorithm explanation
router.get('/algorithm', authenticateToken, async (req, res) => {
  try {
    const algorithm = {
      name: 'Dynamic Question Generation Algorithm',
      description: 'Adaptive algorithm that adjusts difficulty and topics based on user performance',
      steps: [
        {
          step: 1,
          title: 'System Initialization',
          description: 'Select skill domain and initial difficulty level (Easy, Medium, or Hard)',
          implementation: 'POST /api/dynamic-questions/initialize'
        },
        {
          step: 2,
          title: 'Baseline Question Generation',
          description: 'Generate baseline set of 10 questions using RAG-enhanced knowledge base',
          implementation: 'Automatic during initialization'
        },
        {
          step: 3,
          title: 'Assessment Loop',
          description: 'Present question, capture user response, and transcribe spoken answer',
          implementation: 'POST /api/dynamic-questions/process-answer'
        },
        {
          step: 4,
          title: 'Confidence Score Analysis',
          description: 'Analyze transcribed answer to calculate confidence score (0.0 to 1.0)',
          implementation: 'Automatic during answer processing'
        },
        {
          step: 5,
          title: 'Dynamic Question Generation',
          description: 'Generate next question based on confidence score: >0.5 = advanced question, ≤0.5 = simpler question',
          implementation: 'Automatic during answer processing'
        },
        {
          step: 6,
          title: 'Queue Management',
          description: 'Add generated question to front of queue and repeat process',
          implementation: 'Automatic queue management'
        },
        {
          step: 7,
          title: 'Performance Report',
          description: 'Generate comprehensive report with strengths, weaknesses, and recommendations',
          implementation: 'POST /api/dynamic-questions/generate-report'
        }
      ],
      features: [
        'RAG-enhanced question generation',
        'Real-time difficulty adjustment',
        'Contextual follow-up questions',
        'Performance analytics',
        'Adaptive learning path'
      ]
    };

    res.json({
      success: true,
      message: 'Algorithm information retrieved',
      data: {
        algorithm
      }
    });
  } catch (error) {
    console.error('Algorithm info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get algorithm information',
      error: error.message
    });
  }
});

export default router;
