import OllamaService from '../ollama/index.js';
import { RAGService } from './ragService.js';
import { KnowledgeBaseService } from './knowledgeBaseService.js';

export class DynamicQuestionService {
  constructor() {
    this.ollamaService = new OllamaService();
    this.ragService = new RAGService();
    this.knowledgeBaseService = new KnowledgeBaseService(this.ragService);
    this.initialized = false;
  }

  /**
   * Initialize the dynamic question service
   */
  async initialize() {
    if (this.initialized) {
      return true;
    }

    try {
      await this.ragService.initialize();
      await this.knowledgeBaseService.initialize();
      this.initialized = true;
      console.log('✅ Dynamic Question Service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Dynamic Question Service:', error);
      throw error;
    }
  }

  /**
   * Step 1: Initialize the system with skill domain and difficulty
   * @param {string} skillDomain - The skill domain (e.g., 'JavaScript', 'React', 'System Design')
   * @param {string} difficulty - Initial difficulty level ('easy', 'medium', 'hard')
   * @param {string} sessionId - Session ID for tracking
   * @returns {Promise<Object>} Initialization result with baseline questions
   */
  async initializeSession(skillDomain, difficulty = 'medium', sessionId) {
    try {
      console.log(`🚀 Initializing dynamic question session for ${skillDomain} (${difficulty})`);
      
      // Generate baseline set of 10 questions
      const baselineQuestions = await this.generateBaselineQuestions(skillDomain, difficulty);
      
      // Create question queue
      const questionQueue = [...baselineQuestions];
      
      // Initialize session state
      const sessionState = {
        sessionId,
        skillDomain,
        currentDifficulty: difficulty,
        questionQueue,
        answeredQuestions: [],
        performanceMetrics: {
          totalQuestions: 0,
          answeredQuestions: 0,
          avgConfidenceScore: 0,
          difficultyProgression: [],
          strengths: [],
          weaknesses: []
        },
        createdAt: new Date()
      };

      console.log(`✅ Session initialized with ${baselineQuestions.length} baseline questions`);
      
      return {
        success: true,
        sessionState,
        nextQuestion: questionQueue[0],
        queueLength: questionQueue.length
      };
    } catch (error) {
      console.error('❌ Failed to initialize session:', error);
      throw error;
    }
  }

  /**
   * Step 2: Generate baseline set of 10 questions
   * @param {string} skillDomain - The skill domain
   * @param {string} difficulty - Difficulty level
   * @returns {Promise<Array>} Array of baseline questions
   */
  async generateBaselineQuestions(skillDomain, difficulty) {
    try {
      // Use RAG to find relevant knowledge for the skill domain
      const knowledgeContext = await this.getKnowledgeContext(skillDomain, difficulty);
      
      // Generate questions using Ollama with RAG context
      const questions = await this.generateQuestionsWithRAG(skillDomain, difficulty, knowledgeContext, 10);
      
      return questions.map((question, index) => ({
        id: `baseline_${index + 1}`,
        text: question.text,
        category: question.category || skillDomain,
        difficulty: this.normalizeDifficulty(question.difficulty || difficulty),
        followUp: question.followUp || "Can you provide more details?",
        isBaseline: true,
        generatedAt: new Date(),
        knowledgeContext: knowledgeContext.slice(0, 3) // Include top 3 relevant knowledge items
      }));
    } catch (error) {
      console.error('❌ Failed to generate baseline questions:', error);
      // Fallback to template-based generation
      return await this.generateFallbackQuestions(skillDomain, difficulty, 10);
    }
  }

  /**
   * Step 3: Present next question and capture user response
   * @param {string} sessionId - Session ID
   * @param {string} userAnswer - User's transcribed answer
   * @param {number} timeTakenSeconds - Time taken to answer
   * @returns {Promise<Object>} Next question and updated session state
   */
  async processAnswer(sessionId, userAnswer, timeTakenSeconds = 0) {
    try {
      console.log(`🔄 Processing answer for session ${sessionId}`);
      
      // Get session state (in real implementation, this would be stored in database)
      const sessionState = await this.getSessionState(sessionId);
      if (!sessionState) {
        throw new Error('Session not found');
      }

      // Get current question
      const currentQuestion = sessionState.questionQueue[0];
      if (!currentQuestion) {
        throw new Error('No more questions in queue');
      }

      // Step 4: Analyze the transcribed answer to calculate confidence score
      const confidenceScore = await this.calculateConfidenceScore(
        currentQuestion.text,
        userAnswer,
        currentQuestion.category,
        currentQuestion.difficulty
      );

      // Update session state
      sessionState.answeredQuestions.push({
        questionId: currentQuestion.id,
        questionText: currentQuestion.text,
        userAnswer: userAnswer || null,
        confidenceScore,
        timeTakenSeconds,
        difficulty: currentQuestion.difficulty,
        answeredAt: new Date()
      });

      sessionState.performanceMetrics.totalQuestions++;
      sessionState.performanceMetrics.answeredQuestions++;
      
      // Update average confidence score
      const totalConfidence = sessionState.answeredQuestions.reduce((sum, q) => sum + q.confidenceScore, 0);
      sessionState.performanceMetrics.avgConfidenceScore = totalConfidence / sessionState.answeredQuestions.length;

      // Step 5: Determine next question based on confidence score
      const nextQuestion = await this.generateNextQuestion(sessionState, confidenceScore);

      // Remove current question from queue
      sessionState.questionQueue.shift();

      // Add next question to front of queue if generated
      if (nextQuestion) {
        sessionState.questionQueue.unshift(nextQuestion);
        console.log(`✅ Generated ${nextQuestion.difficulty} follow-up question`);
      }

      // Update session state
      await this.updateSessionState(sessionId, sessionState);

      return {
        success: true,
        currentQuestion: currentQuestion,
        confidenceScore,
        nextQuestion: sessionState.questionQueue[0] || null,
        queueLength: sessionState.questionQueue.length,
        sessionState: {
          totalQuestions: sessionState.performanceMetrics.totalQuestions,
          answeredQuestions: sessionState.performanceMetrics.answeredQuestions,
          avgConfidenceScore: sessionState.performanceMetrics.avgConfidenceScore
        }
      };
    } catch (error) {
      console.error('❌ Failed to process answer:', error);
      throw error;
    }
  }

  /**
   * Step 4: Calculate confidence score for user answer
   * @param {string} questionText - The question asked
   * @param {string} userAnswer - User's answer
   * @param {string} category - Question category
   * @param {string} difficulty - Question difficulty
   * @returns {Promise<number>} Confidence score (0.0 to 1.0)
   */
  async calculateConfidenceScore(questionText, userAnswer, category, difficulty) {
    try {
      if (!userAnswer || userAnswer.trim() === '') {
        return 0.0; // No answer provided
      }

      // Use RAG to find relevant knowledge for comparison
      const relevantKnowledge = await this.ragService.searchKnowledge(
        questionText,
        { category, difficulty, nResults: 3 }
      );

      // Generate evaluation prompt
      const evaluationPrompt = this.buildEvaluationPrompt(
        questionText,
        userAnswer,
        relevantKnowledge,
        difficulty
      );

      // Use Ollama to evaluate the answer
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3',
          prompt: evaluationPrompt,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      const evaluation = data.response.trim();

      // Extract confidence score from evaluation
      const confidenceScore = this.extractConfidenceScore(evaluation);
      
      console.log(`📊 Confidence score calculated: ${confidenceScore}`);
      return confidenceScore;
    } catch (error) {
      console.error('❌ Failed to calculate confidence score:', error);
      // Fallback to simple heuristic
      return this.calculateFallbackConfidenceScore(userAnswer, difficulty);
    }
  }

  /**
   * Step 5: Generate next question based on confidence score
   * @param {Object} sessionState - Current session state
   * @param {number} confidenceScore - User's confidence score
   * @returns {Promise<Object|null>} Next question or null if session complete
   */
  async generateNextQuestion(sessionState, confidenceScore) {
    try {
      const { skillDomain, currentDifficulty, answeredQuestions } = sessionState;
      
      // Determine next difficulty based on confidence score
      let nextDifficulty = currentDifficulty;
      if (confidenceScore > 0.5) {
        // Move to more advanced question
        nextDifficulty = this.increaseDifficulty(currentDifficulty);
        console.log(`📈 Increasing difficulty: ${currentDifficulty} → ${nextDifficulty}`);
      } else {
        // Move to simpler question
        nextDifficulty = this.decreaseDifficulty(currentDifficulty);
        console.log(`📉 Decreasing difficulty: ${currentDifficulty} → ${nextDifficulty}`);
      }

      // Use RAG to generate contextually relevant question
      const contextualQuestion = await this.generateContextualQuestion(
        skillDomain,
        nextDifficulty,
        answeredQuestions
      );

      if (contextualQuestion) {
        return {
          id: `dynamic_${Date.now()}`,
          text: contextualQuestion.text,
          category: contextualQuestion.category || skillDomain,
          difficulty: nextDifficulty,
          followUp: contextualQuestion.followUp || "Can you elaborate on that?",
          isBaseline: false,
          generatedAt: new Date(),
          confidenceTrigger: confidenceScore,
          previousQuestionContext: answeredQuestions.slice(-2) // Include context from last 2 questions
        };
      }

      return null;
    } catch (error) {
      console.error('❌ Failed to generate next question:', error);
      return null;
    }
  }

  /**
   * Generate contextually relevant question using RAG
   * @param {string} skillDomain - Skill domain
   * @param {string} difficulty - Difficulty level
   * @param {Array} answeredQuestions - Previously answered questions
   * @returns {Promise<Object>} Contextual question
   */
  async generateContextualQuestion(skillDomain, difficulty, answeredQuestions) {
    try {
      // Build context from previous questions
      const context = this.buildQuestionContext(answeredQuestions);
      
      // Search for relevant knowledge
      const knowledgeContext = await this.getKnowledgeContext(skillDomain, difficulty);
      
      // Generate question using RAG-enhanced prompt
      const ragPrompt = this.buildRAGQuestionPrompt(skillDomain, difficulty, context, knowledgeContext);
      
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3',
          prompt: ragPrompt,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      const questionText = data.response.trim();

      return {
        text: this.cleanQuestionText(questionText),
        category: skillDomain,
        difficulty: difficulty,
        followUp: "Can you provide more details about this concept?"
      };
    } catch (error) {
      console.error('❌ Failed to generate contextual question:', error);
      return null;
    }
  }

  /**
   * Step 7: Generate performance report
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Performance report
   */
  async generatePerformanceReport(sessionId) {
    try {
      console.log(`📊 Generating performance report for session ${sessionId}`);
      
      const sessionState = await this.getSessionState(sessionId);
      if (!sessionState) {
        throw new Error('Session not found');
      }

      const { answeredQuestions, performanceMetrics, skillDomain } = sessionState;
      
      // Analyze performance patterns
      const analysis = this.analyzePerformance(answeredQuestions);
      
      // Generate insights using RAG
      const insights = await this.generatePerformanceInsights(analysis, skillDomain);
      
      const report = {
        sessionId,
        skillDomain,
        summary: {
          totalQuestions: performanceMetrics.totalQuestions,
          answeredQuestions: performanceMetrics.answeredQuestions,
          avgConfidenceScore: performanceMetrics.avgConfidenceScore,
          avgTimePerQuestion: this.calculateAverageTime(answeredQuestions),
          difficultyProgression: performanceMetrics.difficultyProgression
        },
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        insights: insights,
        recommendations: this.generateRecommendations(analysis),
        generatedAt: new Date()
      };

      console.log(`✅ Performance report generated`);
      return {
        success: true,
        report
      };
    } catch (error) {
      console.error('❌ Failed to generate performance report:', error);
      throw error;
    }
  }

  // Helper methods

  async getKnowledgeContext(skillDomain, difficulty) {
    try {
      const searchResults = await this.ragService.searchKnowledge(
        skillDomain,
        { category: skillDomain, difficulty, nResults: 5 }
      );
      return searchResults.results || [];
    } catch (error) {
      console.error('Failed to get knowledge context:', error);
      return [];
    }
  }

  async generateQuestionsWithRAG(skillDomain, difficulty, knowledgeContext, count) {
    const prompt = `Generate ${count} interview questions about ${skillDomain} at ${difficulty} difficulty level.

Context from knowledge base:
${knowledgeContext.map(k => `- ${k.text}`).join('\n')}

Return a JSON array of questions with this structure:
[
  {
    "text": "Question text here",
    "category": "${skillDomain}",
    "difficulty": "${difficulty}",
    "followUp": "Follow-up question"
  }
]`;

    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3',
        prompt: prompt,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    const questions = JSON.parse(data.response);
    return Array.isArray(questions) ? questions : [questions];
  }

  buildEvaluationPrompt(questionText, userAnswer, relevantKnowledge, difficulty) {
    return `Evaluate the following interview answer and provide a confidence score from 0.0 to 1.0.

Question: ${questionText}
User Answer: ${userAnswer}
Difficulty Level: ${difficulty}

Relevant Knowledge for Reference:
${relevantKnowledge.map(k => `- ${k.text}`).join('\n')}

Consider:
1. Accuracy of the answer
2. Completeness of the response
3. Understanding of concepts
4. Clarity of explanation
5. Relevance to the question

Provide your evaluation in this format:
Confidence Score: [0.0-1.0]
Reasoning: [Brief explanation of the score]`;
  }

  extractConfidenceScore(evaluation) {
    const scoreMatch = evaluation.match(/Confidence Score:\s*([0-9.]+)/i);
    if (scoreMatch) {
      return Math.max(0, Math.min(1, parseFloat(scoreMatch[1])));
    }
    return 0.5; // Default fallback
  }

  calculateFallbackConfidenceScore(userAnswer, difficulty) {
    if (!userAnswer || userAnswer.trim() === '') return 0.0;
    
    const wordCount = userAnswer.split(' ').length;
    const minWords = difficulty === 'easy' ? 10 : difficulty === 'medium' ? 20 : 30;
    
    return Math.min(1.0, wordCount / minWords);
  }

  increaseDifficulty(currentDifficulty) {
    const progression = { 'easy': 'medium', 'medium': 'hard', 'hard': 'hard' };
    return progression[currentDifficulty] || 'medium';
  }

  decreaseDifficulty(currentDifficulty) {
    const progression = { 'easy': 'easy', 'medium': 'easy', 'hard': 'medium' };
    return progression[currentDifficulty] || 'easy';
  }

  normalizeDifficulty(difficulty) {
    const normalized = difficulty.toLowerCase().trim();
    const difficultyMap = {
      'easy': 'easy', 'beginner': 'easy', 'basic': 'easy',
      'medium': 'medium', 'intermediate': 'medium', 'moderate': 'medium',
      'hard': 'hard', 'advanced': 'hard', 'expert': 'hard'
    };
    return difficultyMap[normalized] || 'medium';
  }

  buildQuestionContext(answeredQuestions) {
    return answeredQuestions.slice(-3).map(q => ({
      question: q.questionText,
      answer: q.userAnswer,
      confidence: q.confidenceScore,
      difficulty: q.difficulty
    }));
  }

  buildRAGQuestionPrompt(skillDomain, difficulty, context, knowledgeContext) {
    return `Generate a contextual interview question about ${skillDomain} at ${difficulty} difficulty level.

Previous Questions Context:
${context.map(c => `Q: ${c.question}\nA: ${c.answer} (Confidence: ${c.confidence})\n`).join('\n')}

Relevant Knowledge:
${knowledgeContext.map(k => `- ${k.text}`).join('\n')}

Generate a question that:
1. Builds upon previous questions
2. Is appropriate for ${difficulty} level
3. Tests deeper understanding
4. Is contextually relevant

Return only the question text.`;
  }

  cleanQuestionText(text) {
    // Remove common prefixes
    const prefixes = ['Question:', 'Q:', 'Here is a question:', 'Here\'s a question:'];
    for (const prefix of prefixes) {
      if (text.toLowerCase().startsWith(prefix.toLowerCase())) {
        text = text.substring(prefix.length).trim();
        break;
      }
    }
    return text;
  }

  analyzePerformance(answeredQuestions) {
    const strengths = [];
    const weaknesses = [];
    
    // Analyze by difficulty
    const difficultyScores = {};
    answeredQuestions.forEach(q => {
      if (!difficultyScores[q.difficulty]) {
        difficultyScores[q.difficulty] = [];
      }
      difficultyScores[q.difficulty].push(q.confidenceScore);
    });

    Object.entries(difficultyScores).forEach(([difficulty, scores]) => {
      const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      if (avgScore > 0.7) {
        strengths.push(`${difficulty} level questions`);
      } else if (avgScore < 0.4) {
        weaknesses.push(`${difficulty} level questions`);
      }
    });

    return { strengths, weaknesses };
  }

  async generatePerformanceInsights(analysis, skillDomain) {
    // Use RAG to generate insights based on performance
    const prompt = `Based on the following performance analysis for ${skillDomain}, provide insights:

Strengths: ${analysis.strengths.join(', ')}
Weaknesses: ${analysis.weaknesses.join(', ')}

Provide 3-5 actionable insights for improvement.`;

    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3',
          prompt: prompt,
          stream: false
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.response.trim().split('\n').filter(line => line.trim());
      }
    } catch (error) {
      console.error('Failed to generate insights:', error);
    }

    return [
      'Focus on areas with lower confidence scores',
      'Practice more questions in identified weak areas',
      'Review fundamental concepts before advanced topics'
    ];
  }

  generateRecommendations(analysis) {
    const recommendations = [];
    
    if (analysis.weaknesses.length > 0) {
      recommendations.push(`Focus on improving ${analysis.weaknesses.join(' and ')}`);
    }
    
    if (analysis.strengths.length > 0) {
      recommendations.push(`Continue building on strengths in ${analysis.strengths.join(' and ')}`);
    }
    
    recommendations.push('Practice regularly to maintain and improve skills');
    
    return recommendations;
  }

  calculateAverageTime(answeredQuestions) {
    const totalTime = answeredQuestions.reduce((sum, q) => sum + (q.timeTakenSeconds || 0), 0);
    return answeredQuestions.length > 0 ? totalTime / answeredQuestions.length : 0;
  }

  // Session state management (in real implementation, this would use database)
  async getSessionState(sessionId) {
    // This would typically fetch from database
    // For now, return null to indicate session not found
    return null;
  }

  async updateSessionState(sessionId, sessionState) {
    // This would typically save to database
    console.log(`💾 Session state updated for ${sessionId}`);
  }

  async generateFallbackQuestions(skillDomain, difficulty, count) {
    const questions = [];
    for (let i = 0; i < count; i++) {
      questions.push({
        id: `fallback_${i + 1}`,
        text: `What are the key concepts in ${skillDomain}?`,
        category: skillDomain,
        difficulty: difficulty,
        followUp: "Can you provide more details?",
        isBaseline: true,
        generatedAt: new Date()
      });
    }
    return questions;
  }
}

export default DynamicQuestionService;
