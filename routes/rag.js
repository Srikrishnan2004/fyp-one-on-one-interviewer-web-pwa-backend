import express from 'express';
import RAGService from '../services/ragService.js';
import KnowledgeBaseService from '../services/knowledgeBaseService.js';
import { authenticateToken, validateInput } from '../middleware/auth.js';
import Joi from 'joi';

const router = express.Router();

// Initialize services
const ragService = new RAGService();
const knowledgeBaseService = new KnowledgeBaseService();

// Initialize services on startup
ragService.initialize().catch(console.error);
knowledgeBaseService.initialize().catch(console.error);

// Validation schemas
const addKnowledgeSchema = Joi.object({
  text: Joi.string().min(1).required(),
  title: Joi.string().min(1).optional(),
  category: Joi.string().valid('technical', 'behavioral', 'domain', 'general').default('general'),
  difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced', 'expert').default('medium'),
  tags: Joi.array().items(Joi.string()).default([]),
  metadata: Joi.object().optional()
});

const addQuestionSchema = Joi.object({
  question: Joi.string().min(1).required(),
  answer: Joi.string().optional(),
  category: Joi.string().valid('technical', 'behavioral', 'domain', 'general').default('technical'),
  difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced', 'expert').default('medium'),
  tags: Joi.array().items(Joi.string()).default([]),
  topic: Joi.string().optional(),
  explanation: Joi.string().optional()
});

const searchSchema = Joi.object({
  query: Joi.string().min(1).required(),
  category: Joi.string().valid('technical', 'behavioral', 'domain', 'general').optional(),
  difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced', 'expert').optional(),
  nResults: Joi.number().integer().min(1).max(50).default(5),
  minScore: Joi.number().min(0).max(1).default(0.3)
});

const ragQuerySchema = Joi.object({
  query: Joi.string().min(1).required(),
  collection: Joi.string().optional(),
  nResults: Joi.number().integer().min(1).max(10).default(3),
  ollamaModel: Joi.string().default('llama2'),
  context: Joi.string().optional(),
  includeSources: Joi.boolean().default(true)
});

const generateQuestionsSchema = Joi.object({
  topic: Joi.string().min(1).required(),
  difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced', 'expert').default('medium'),
  category: Joi.string().valid('technical', 'behavioral', 'domain', 'general').default('technical'),
  count: Joi.number().integer().min(1).max(20).default(5),
  includeAnswers: Joi.boolean().default(false)
});

// Health check for RAG services
router.get('/health', async (req, res) => {
  try {
    const ragTest = await ragService.test();
    const kbTest = await knowledgeBaseService.test();
    
    res.json({
      success: true,
      message: 'RAG services health check',
      rag: ragTest,
      knowledgeBase: kbTest,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'RAG services health check failed',
      error: error.message
    });
  }
});

// Add knowledge to the knowledge base
router.post('/knowledge', authenticateToken, validateInput(addKnowledgeSchema), async (req, res) => {
  try {
    const knowledgeData = req.body;
    const result = await ragService.addKnowledge(knowledgeData);
    
    res.status(201).json({
      success: true,
      message: 'Knowledge added successfully',
      data: result
    });
  } catch (error) {
    console.error('Error adding knowledge:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add knowledge',
      error: error.message
    });
  }
});

// Add multiple knowledge items
router.post('/knowledge/batch', authenticateToken, async (req, res) => {
  try {
    const { knowledgeItems, collection } = req.body;
    
    if (!Array.isArray(knowledgeItems) || knowledgeItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Knowledge items must be a non-empty array'
      });
    }

    const result = await ragService.addMultipleKnowledge(knowledgeItems, collection);
    
    res.status(201).json({
      success: true,
      message: 'Knowledge items added successfully',
      data: result
    });
  } catch (error) {
    console.error('Error adding multiple knowledge:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add multiple knowledge',
      error: error.message
    });
  }
});

// Search knowledge base
router.post('/search', authenticateToken, validateInput(searchSchema), async (req, res) => {
  try {
    const { query, category, difficulty, nResults, minScore } = req.body;
    
    const result = await ragService.searchKnowledge(query, {
      category,
      difficulty,
      nResults,
      minScore
    });
    
    res.json({
      success: true,
      message: 'Knowledge search completed',
      data: result
    });
  } catch (error) {
    console.error('Error searching knowledge:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search knowledge',
      error: error.message
    });
  }
});

// Generate RAG-enhanced response
router.post('/query', authenticateToken, validateInput(ragQuerySchema), async (req, res) => {
  try {
    const { query, collection, nResults, ollamaModel, context, includeSources } = req.body;
    
    const result = await ragService.generateRAGResponse(query, {
      collection,
      nResults,
      ollamaModel,
      context,
      includeSources
    });
    
    res.json({
      success: true,
      message: 'RAG response generated successfully',
      data: result
    });
  } catch (error) {
    console.error('Error generating RAG response:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate RAG response',
      error: error.message
    });
  }
});

// Generate interview questions with RAG
router.post('/questions/generate', authenticateToken, validateInput(generateQuestionsSchema), async (req, res) => {
  try {
    const { topic, difficulty, category, count, includeAnswers } = req.body;
    
    const result = await ragService.generateInterviewQuestions(topic, {
      difficulty,
      category,
      count,
      includeAnswers
    });
    
    res.json({
      success: true,
      message: 'Interview questions generated successfully',
      data: result
    });
  } catch (error) {
    console.error('Error generating interview questions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate interview questions',
      error: error.message
    });
  }
});

// Add interview question to knowledge base
router.post('/questions', authenticateToken, validateInput(addQuestionSchema), async (req, res) => {
  try {
    const questionData = req.body;
    const result = await knowledgeBaseService.addInterviewQuestion(questionData);
    
    res.status(201).json({
      success: true,
      message: 'Interview question added successfully',
      data: result
    });
  } catch (error) {
    console.error('Error adding interview question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add interview question',
      error: error.message
    });
  }
});

// Add multiple interview questions
router.post('/questions/batch', authenticateToken, async (req, res) => {
  try {
    const { questions } = req.body;
    
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Questions must be a non-empty array'
      });
    }

    const result = await knowledgeBaseService.addMultipleInterviewQuestions(questions);
    
    res.status(201).json({
      success: true,
      message: 'Interview questions added successfully',
      data: result
    });
  } catch (error) {
    console.error('Error adding multiple interview questions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add multiple interview questions',
      error: error.message
    });
  }
});

// Search interview questions
router.post('/questions/search', authenticateToken, validateInput(searchSchema), async (req, res) => {
  try {
    const { query, category, difficulty, nResults, includeAnswers } = req.body;
    
    const result = await knowledgeBaseService.searchInterviewQuestions(query, {
      category,
      difficulty,
      nResults,
      includeAnswers
    });
    
    res.json({
      success: true,
      message: 'Interview questions search completed',
      data: result
    });
  } catch (error) {
    console.error('Error searching interview questions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search interview questions',
      error: error.message
    });
  }
});

// Get questions by category
router.get('/questions/category/:category', authenticateToken, async (req, res) => {
  try {
    const { category } = req.params;
    const { difficulty, limit = 20, offset = 0 } = req.query;
    
    const result = await knowledgeBaseService.getQuestionsByCategory(category, {
      difficulty,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      success: true,
      message: `Questions for category '${category}' retrieved successfully`,
      data: result
    });
  } catch (error) {
    console.error('Error getting questions by category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get questions by category',
      error: error.message
    });
  }
});

// Get knowledge base statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const result = await knowledgeBaseService.getKnowledgeBaseStatistics();
    
    res.json({
      success: true,
      message: 'Knowledge base statistics retrieved successfully',
      data: result
    });
  } catch (error) {
    console.error('Error getting knowledge base statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get knowledge base statistics',
      error: error.message
    });
  }
});

// Export knowledge base
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const { filename } = req.query;
    const result = await knowledgeBaseService.exportKnowledgeBase(filename);
    
    res.json({
      success: true,
      message: 'Knowledge base exported successfully',
      data: result
    });
  } catch (error) {
    console.error('Error exporting knowledge base:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export knowledge base',
      error: error.message
    });
  }
});

// Import knowledge base
router.post('/import', authenticateToken, async (req, res) => {
  try {
    const { filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({
        success: false,
        message: 'File path is required'
      });
    }

    const result = await knowledgeBaseService.importKnowledgeBase(filePath);
    
    res.json({
      success: true,
      message: 'Knowledge base imported successfully',
      data: result
    });
  } catch (error) {
    console.error('Error importing knowledge base:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import knowledge base',
      error: error.message
    });
  }
});

// Get available categories
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const categories = {
      technical: ['programming', 'algorithms', 'data-structures', 'system-design', 'databases'],
      behavioral: ['leadership', 'teamwork', 'problem-solving', 'communication', 'adaptability'],
      domain: ['frontend', 'backend', 'fullstack', 'mobile', 'devops', 'ai-ml'],
      difficulty: ['beginner', 'intermediate', 'advanced', 'expert']
    };
    
    res.json({
      success: true,
      message: 'Available categories retrieved successfully',
      data: { categories }
    });
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get categories',
      error: error.message
    });
  }
});

// Test embedding service
router.get('/test/embedding', authenticateToken, async (req, res) => {
  try {
    const result = await ragService.embeddingService.test();
    
    res.json({
      success: true,
      message: 'Embedding service test completed',
      data: result
    });
  } catch (error) {
    console.error('Error testing embedding service:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test embedding service',
      error: error.message
    });
  }
});

// Test ChromaDB service
router.get('/test/chroma', authenticateToken, async (req, res) => {
  try {
    const result = await ragService.chromaService.test();
    
    res.json({
      success: true,
      message: 'ChromaDB service test completed',
      data: result
    });
  } catch (error) {
    console.error('Error testing ChromaDB service:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test ChromaDB service',
      error: error.message
    });
  }
});

export default router;
