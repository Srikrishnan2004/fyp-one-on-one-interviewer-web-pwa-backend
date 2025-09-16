import RAGService from './ragService.js';
import { promises as fs } from 'fs';
import path from 'path';

export class KnowledgeBaseService {
  constructor() {
    this.ragService = new RAGService();
    this.knowledgeBasePath = './knowledge_base';
    this.categories = {
      technical: ['programming', 'algorithms', 'data-structures', 'system-design', 'databases'],
      behavioral: ['leadership', 'teamwork', 'problem-solving', 'communication', 'adaptability'],
      domain: ['frontend', 'backend', 'fullstack', 'mobile', 'devops', 'ai-ml'],
      difficulty: ['beginner', 'intermediate', 'advanced', 'expert']
    };
  }

  /**
   * Initialize knowledge base service
   */
  async initialize() {
    try {
      await this.ragService.initialize();
      await this.ensureKnowledgeBaseDirectory();
      console.log('Knowledge base service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize knowledge base service:', error);
      throw new Error(`Knowledge base initialization failed: ${error.message}`);
    }
  }

  /**
   * Ensure knowledge base directory exists
   */
  async ensureKnowledgeBaseDirectory() {
    try {
      await fs.mkdir(this.knowledgeBasePath, { recursive: true });
    } catch (error) {
      console.error('Error creating knowledge base directory:', error);
    }
  }

  /**
   * Add interview question to knowledge base
   * @param {Object} questionData - Question data
   * @returns {Promise<Object>} Add result
   */
  async addInterviewQuestion(questionData) {
    try {
      const {
        question,
        answer,
        category = 'technical',
        difficulty = 'medium',
        tags = [],
        topic,
        explanation
      } = questionData;

      if (!question || typeof question !== 'string') {
        throw new Error('Question text is required');
      }

      const knowledgeItem = {
        text: question,
        title: `Interview Question: ${topic || category}`,
        category,
        difficulty,
        tags: [...tags, 'interview-question'],
        metadata: {
          type: 'interview_question',
          topic,
          answer: answer || '',
          explanation: explanation || '',
          created_at: new Date().toISOString()
        }
      };

      const result = await this.ragService.addKnowledge(knowledgeItem, 'question_bank');

      // Also add the answer if provided
      if (answer) {
        const answerItem = {
          text: answer,
          title: `Answer for: ${question.substring(0, 50)}...`,
          category,
          difficulty,
          tags: [...tags, 'interview-answer'],
          metadata: {
            type: 'interview_answer',
            question_id: result.documentId,
            topic,
            explanation: explanation || '',
            created_at: new Date().toISOString()
          }
        };

        await this.ragService.addKnowledge(answerItem, 'answer_bank');
      }

      return {
        success: true,
        questionId: result.documentId,
        message: 'Interview question added successfully'
      };
    } catch (error) {
      console.error('Error adding interview question:', error);
      throw new Error(`Failed to add interview question: ${error.message}`);
    }
  }

  /**
   * Add multiple interview questions
   * @param {Array} questionsData - Array of question data
   * @returns {Promise<Object>} Add result
   */
  async addMultipleInterviewQuestions(questionsData) {
    try {
      if (!Array.isArray(questionsData) || questionsData.length === 0) {
        throw new Error('Questions data must be a non-empty array');
      }

      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (const questionData of questionsData) {
        try {
          const result = await this.addInterviewQuestion(questionData);
          results.push({ success: true, ...result });
          successCount++;
        } catch (error) {
          results.push({ 
            success: false, 
            error: error.message,
            question: questionData.question 
          });
          errorCount++;
        }
      }

      return {
        success: true,
        totalProcessed: questionsData.length,
        successCount,
        errorCount,
        results,
        message: `Processed ${questionsData.length} questions: ${successCount} successful, ${errorCount} failed`
      };
    } catch (error) {
      console.error('Error adding multiple interview questions:', error);
      throw new Error(`Failed to add multiple interview questions: ${error.message}`);
    }
  }

  /**
   * Add technical knowledge
   * @param {Object} knowledgeData - Knowledge data
   * @returns {Promise<Object>} Add result
   */
  async addTechnicalKnowledge(knowledgeData) {
    try {
      const {
        title,
        content,
        category = 'technical',
        difficulty = 'medium',
        tags = [],
        codeExamples = [],
        references = []
      } = knowledgeData;

      if (!content || typeof content !== 'string') {
        throw new Error('Knowledge content is required');
      }

      const knowledgeItem = {
        text: content,
        title: title || 'Technical Knowledge',
        category,
        difficulty,
        tags: [...tags, 'technical-knowledge'],
        metadata: {
          type: 'technical_knowledge',
          code_examples: codeExamples,
          references: references,
          created_at: new Date().toISOString()
        }
      };

      const result = await this.ragService.addKnowledge(knowledgeItem);

      return {
        success: true,
        knowledgeId: result.documentId,
        message: 'Technical knowledge added successfully'
      };
    } catch (error) {
      console.error('Error adding technical knowledge:', error);
      throw new Error(`Failed to add technical knowledge: ${error.message}`);
    }
  }

  /**
   * Search for interview questions
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  async searchInterviewQuestions(query, options = {}) {
    try {
      const {
        category,
        difficulty,
        nResults = 10,
        includeAnswers = false
      } = options;

      const searchOptions = {
        collection: 'question_bank',
        nResults,
        category,
        difficulty,
        minScore: 0.3
      };

      const results = await this.ragService.searchKnowledge(query, searchOptions);

      // Format results for interview questions
      const formattedResults = results.results.map(result => ({
        id: result.metadata.id,
        question: result.text,
        category: result.metadata.category,
        difficulty: result.metadata.difficulty,
        topic: result.metadata.topic,
        tags: result.metadata.tags,
        score: result.score,
        created_at: result.metadata.created_at
      }));

      return {
        success: true,
        query,
        questions: formattedResults,
        totalResults: formattedResults.length,
        searchOptions
      };
    } catch (error) {
      console.error('Error searching interview questions:', error);
      throw new Error(`Failed to search interview questions: ${error.message}`);
    }
  }

  /**
   * Get questions by category
   * @param {string} category - Question category
   * @param {Object} options - Options
   * @returns {Promise<Object>} Questions
   */
  async getQuestionsByCategory(category, options = {}) {
    try {
      const {
        difficulty,
        limit = 20,
        offset = 0
      } = options;

      const searchOptions = {
        collection: 'question_bank',
        nResults: limit,
        category,
        difficulty
      };

      // Use a broad query to get questions from the category
      const results = await this.ragService.searchKnowledge(category, searchOptions);

      const questions = results.results.map(result => ({
        id: result.metadata.id,
        question: result.text,
        category: result.metadata.category,
        difficulty: result.metadata.difficulty,
        topic: result.metadata.topic,
        tags: result.metadata.tags,
        score: result.score,
        created_at: result.metadata.created_at
      }));

      return {
        success: true,
        category,
        questions,
        totalResults: questions.length,
        options
      };
    } catch (error) {
      console.error('Error getting questions by category:', error);
      throw new Error(`Failed to get questions by category: ${error.message}`);
    }
  }

  /**
   * Get knowledge base statistics
   * @returns {Promise<Object>} Statistics
   */
  async getKnowledgeBaseStatistics() {
    try {
      const stats = await this.ragService.getKnowledgeBaseStats();
      
      // Get category breakdown
      const categoryStats = {};
      for (const category of Object.keys(this.categories)) {
        try {
          const categoryResults = await this.getQuestionsByCategory(category, { limit: 1000 });
          categoryStats[category] = categoryResults.totalResults;
        } catch (error) {
          categoryStats[category] = 0;
        }
      }

      return {
        success: true,
        ...stats,
        categoryBreakdown: categoryStats,
        availableCategories: Object.keys(this.categories),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting knowledge base statistics:', error);
      throw new Error(`Failed to get knowledge base statistics: ${error.message}`);
    }
  }

  /**
   * Export knowledge base to JSON
   * @param {string} filename - Export filename
   * @returns {Promise<Object>} Export result
   */
  async exportKnowledgeBase(filename = 'knowledge_base_export.json') {
    try {
      const collections = ['interview_knowledge_base', 'question_bank', 'answer_bank'];
      const exportData = {};

      for (const collectionName of collections) {
        try {
          const documents = await this.ragService.chromaService.getAllDocuments(collectionName);
          exportData[collectionName] = {
            documents: documents.documents[0] || [],
            metadatas: documents.metadatas[0] || [],
            ids: documents.ids[0] || []
          };
        } catch (error) {
          exportData[collectionName] = { error: error.message };
        }
      }

      const exportPath = path.join(this.knowledgeBasePath, filename);
      await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));

      return {
        success: true,
        filename,
        path: exportPath,
        collections: Object.keys(exportData),
        message: 'Knowledge base exported successfully'
      };
    } catch (error) {
      console.error('Error exporting knowledge base:', error);
      throw new Error(`Failed to export knowledge base: ${error.message}`);
    }
  }

  /**
   * Import knowledge base from JSON
   * @param {string} filePath - Import file path
   * @returns {Promise<Object>} Import result
   */
  async importKnowledgeBase(filePath) {
    try {
      const fileContent = await fs.readFile(filePath, 'utf8');
      const importData = JSON.parse(fileContent);

      const results = {};
      let totalImported = 0;

      for (const [collectionName, collectionData] of Object.entries(importData)) {
        if (collectionData.error) {
          results[collectionName] = { error: collectionData.error };
          continue;
        }

        const documents = [];
        const { documents: texts, metadatas, ids } = collectionData;

        for (let i = 0; i < texts.length; i++) {
          documents.push({
            id: ids[i] || `imported_${Date.now()}_${i}`,
            text: texts[i],
            metadata: metadatas[i] || {}
          });
        }

        if (documents.length > 0) {
          try {
            await this.ragService.chromaService.addDocuments(collectionName, documents);
            results[collectionName] = { imported: documents.length };
            totalImported += documents.length;
          } catch (error) {
            results[collectionName] = { error: error.message };
          }
        }
      }

      return {
        success: true,
        totalImported,
        results,
        message: `Imported ${totalImported} documents successfully`
      };
    } catch (error) {
      console.error('Error importing knowledge base:', error);
      throw new Error(`Failed to import knowledge base: ${error.message}`);
    }
  }

  /**
   * Test knowledge base service
   * @returns {Promise<Object>} Test results
   */
  async test() {
    try {
      const ragTest = await this.ragService.test();
      const stats = await this.getKnowledgeBaseStatistics();
      
      return {
        success: ragTest.success,
        rag: ragTest,
        statistics: stats,
        message: 'Knowledge base service test completed'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Knowledge base service test failed'
      };
    }
  }

  /**
   * Close knowledge base service
   */
  async close() {
    try {
      await this.ragService.close();
      console.log('Knowledge base service closed');
    } catch (error) {
      console.error('Error closing knowledge base service:', error);
    }
  }
}

export default KnowledgeBaseService;
