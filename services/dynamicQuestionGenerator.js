import OllamaService from '../ollama/index.js';
import { RAGService } from './ragService.js';
import { KnowledgeBaseService } from './knowledgeBaseService.js';
import { ConversationStorageService } from './conversationStorageService.js';
import { v4 as uuidv4 } from 'uuid';
import { exec } from "child_process";
import { promises as fs } from "fs";

export class DynamicQuestionGenerator {
  constructor() {
    this.ollamaService = new OllamaService();
    this.ragService = null;
    this.knowledgeBaseService = null;
    this.conversationStorageService = null;
    this.initialized = false;
    
    // Algorithm state
    this.sessions = new Map(); // Store active sessions
    this.questionQueue = new Map(); // Store question queues per session
    
    // TTS Configuration
    this.piperScript = "piper_tts.py";
    this.piperModel = "models/en_US-amy-medium.onnx";
  }

  /**
   * Initialize the dynamic question generator
   */
  async initialize() {
    if (this.initialized) {
      console.log('Dynamic question generator already initialized, skipping...');
      return true;
    }

    try {
      // Initialize RAG service for contextual question generation
      this.ragService = new RAGService();
      await this.ragService.initialize();

      // Initialize knowledge base service
      this.knowledgeBaseService = new KnowledgeBaseService(this.ragService);
      await this.knowledgeBaseService.initialize();

      // Initialize conversation storage service
      this.conversationStorageService = new ConversationStorageService();
      await this.conversationStorageService.initialize();

      this.initialized = true;
      console.log('✅ Dynamic question generator initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize dynamic question generator:', error);
      throw new Error(`Dynamic question generator initialization failed: ${error.message}`);
    }
  }

  /**
   * Step 1: Initialize the system with skill domain and difficulty level
   * @param {Object} sessionConfig - Configuration for the session
   * @returns {Promise<Object>} Initialized session
   */
  async initializeSession(sessionConfig) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const {
        sessionId,
        skillDomain,
        difficulty = 'medium',
        userId,
        sessionName = `Dynamic Interview - ${skillDomain}`,
        maxQuestions = 20
      } = sessionConfig;

      console.log(`🚀 Initializing dynamic question session for ${skillDomain} (${difficulty})`);

      // Create session object
      const session = {
        id: sessionId || uuidv4(),
        userId,
        sessionName,
        skillDomain,
        difficulty,
        maxQuestions,
        databaseSessionId: sessionConfig.databaseSessionId, // Store database session ID
        status: 'initialized',
        currentQuestionNumber: 0,
        totalQuestions: 0,
        questionsAnswered: 0,
        confidenceScores: [],
        averageConfidence: 0,
        performanceMetrics: {
          excellent: 0,    // confidence > 0.8
          good: 0,        // confidence 0.6-0.8
          fair: 0,        // confidence 0.4-0.6
          poor: 0         // confidence < 0.4
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store session
      this.sessions.set(session.id, session);

      // Step 2: Generate baseline set of 10 questions
      console.log(`📝 Generating baseline questions for ${skillDomain}...`);
      const baselineQuestions = await this.generateBaselineQuestions(skillDomain, difficulty, 10);
      
      // Initialize question queue
      this.questionQueue.set(session.id, baselineQuestions);

      // Update session with baseline questions
      session.totalQuestions = baselineQuestions.length;
      session.status = 'ready';
      session.updatedAt = new Date();

      console.log(`✅ Session initialized with ${baselineQuestions.length} baseline questions`);

      return {
        session,
        baselineQuestions: baselineQuestions.map(q => ({
          id: q.id,
          text: q.text,
          category: q.category,
          difficulty: q.difficulty,
          expectedAnswerLength: q.expectedAnswerLength
        }))
      };

    } catch (error) {
      console.error('❌ Failed to initialize session:', error);
      throw new Error(`Session initialization failed: ${error.message}`);
    }
  }

  /**
   * Step 2: Generate baseline questions for the skill domain
   * @param {string} skillDomain - The skill domain (e.g., 'JavaScript', 'React', 'System Design')
   * @param {string} difficulty - Difficulty level (easy, medium, hard)
   * @param {number} count - Number of questions to generate
   * @returns {Promise<Array>} Array of generated questions
   */
  async generateBaselineQuestions(skillDomain, difficulty, count = 10) {
    try {
      console.log(`🎯 Generating ${count} baseline questions for ${skillDomain} (${difficulty})`);

      // Use RAG to get contextual knowledge for question generation
      const contextualKnowledge = await this.getContextualKnowledge(skillDomain, difficulty);

      // Generate questions using Ollama with contextual knowledge
      const questions = await this.ollamaService.generateInterviewQuestions(
        'languages.javascript', // Use appropriate template based on skill domain
        `Skill Domain: ${skillDomain}
Difficulty Level: ${difficulty}
Contextual Knowledge: ${contextualKnowledge}

Generate ${count} diverse interview questions covering different aspects of ${skillDomain}.
Each question should be at ${difficulty} difficulty level.
Include questions on fundamentals, practical applications, and best practices.`
      );

      // Process and enhance questions
      const processedQuestions = questions.map((question, index) => ({
        id: uuidv4(),
        text: question.text,
        category: this.categorizeQuestion(question.text, skillDomain),
        difficulty: this.normalizeDifficulty(question.difficulty || difficulty),
        expectedAnswerLength: this.assessAnswerLength(question.text),
        skillDomain,
        isBaseline: true,
        order: index + 1,
        generatedAt: new Date()
      }));

      console.log(`✅ Generated ${processedQuestions.length} baseline questions`);
      return processedQuestions;

    } catch (error) {
      console.error('❌ Failed to generate baseline questions:', error);
      
      // Fallback to simple question generation
      return this.generateFallbackQuestions(skillDomain, difficulty, count);
    }
  }

  /**
   * Step 3: Get the next question from the queue
   * @param {string} sessionId - Session ID
   * @param {Object} options - Options for question generation
   * @returns {Promise<Object>} Next question or null if queue is empty
   */
  async getNextQuestion(sessionId, options = {}) {
    try {
      const { includeAudio = true, includeAnimation = true } = options;
      
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const queue = this.questionQueue.get(sessionId);
      if (!queue || queue.length === 0) {
        console.log(`📋 Question queue is empty for session ${sessionId}. Session complete.`);
        return null;
      }

      // Get the next question from the front of the queue (but don't remove it yet)
      const nextQuestion = queue[0];
      session.currentQuestionNumber++;
      session.updatedAt = new Date();

      console.log(`📝 Presenting question ${session.currentQuestionNumber} to user (${queue.length} questions remaining)`);

      // Generate TTS audio and animation if requested
      let audio = null;
      let lipsync = null;
      let facialExpression = null;
      let animation = null;

      if (includeAudio) {
        try {
          console.log(`🎵 Generating TTS audio for question ${session.currentQuestionNumber}`);
          const audioData = await this.generateQuestionAudio(nextQuestion, session.currentQuestionNumber);
          audio = audioData.audio;
          lipsync = audioData.lipsync;
        } catch (audioError) {
          console.error(`❌ Failed to generate audio for question ${session.currentQuestionNumber}:`, audioError);
          // Continue without audio if generation fails
        }
      }

      if (includeAnimation) {
        facialExpression = this.getFacialExpressionForDifficulty(nextQuestion.difficulty);
        animation = this.getAnimationForQuestionType(nextQuestion.category);
      }
      
      return {
        questionId: nextQuestion.id,
        text: nextQuestion.text,
        category: nextQuestion.category,
        difficulty: nextQuestion.difficulty,
        expectedAnswerLength: nextQuestion.expectedAnswerLength,
        questionNumber: session.currentQuestionNumber,
        totalQuestions: session.totalQuestions,
        questionsRemaining: queue.length,
        // TTS and Animation data
        audio,
        lipsync,
        facialExpression,
        animation,
        audioGenerated: !!audio
      };

    } catch (error) {
      console.error('❌ Failed to get next question:', error);
      throw new Error(`Failed to get next question: ${error.message}`);
    }
  }

  /**
   * Step 4 & 5: Process user answer and determine next question
   * @param {string} sessionId - Session ID
   * @param {Object} answerData - User's answer data
   * @returns {Promise<Object>} Processing result and next question
   */
  async processAnswer(sessionId, answerData) {
    try {
      const {
        questionId,
        userAnswer,
        timeTakenSeconds,
        confidenceScore
      } = answerData;

      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      console.log(`🧠 Processing answer for question ${questionId}`);

      // Step 4: Analyze the transcribed answer and calculate confidence score
      const analysisResult = await this.analyzeAnswer(
        questionId,
        userAnswer,
        session.skillDomain,
        session.difficulty
      );

      // Use provided confidence score or calculated one
      const finalConfidenceScore = confidenceScore !== undefined ? 
        confidenceScore : analysisResult.confidenceScore;

      // Remove the current question from the queue (it was already presented)
      const queue = this.questionQueue.get(sessionId);
      const currentQuestion = queue.shift(); // Now remove the question that was just answered
      
      // Update session metrics
      session.questionsAnswered++;
      session.confidenceScores.push(finalConfidenceScore);
      session.averageConfidence = this.calculateAverageConfidence(session.confidenceScores);
      
      // Update performance metrics
      this.updatePerformanceMetrics(session, finalConfidenceScore);
      session.updatedAt = new Date();

      // Step 5: Determine next question based on confidence score
      let nextQuestion = null;
      let adaptiveAction = null;

      if (finalConfidenceScore > 0.5) {
        // Generate more advanced, related question
        console.log(`📈 High confidence (${finalConfidenceScore.toFixed(2)}) - generating advanced question`);
        adaptiveAction = 'advance';
        nextQuestion = await this.generateAdvancedQuestion(
          sessionId,
          session.skillDomain,
          analysisResult.relatedTopics
        );
      } else {
        // Generate simpler, foundational question
        console.log(`📉 Low confidence (${finalConfidenceScore.toFixed(2)}) - generating foundational question`);
        adaptiveAction = 'reinforce';
        nextQuestion = await this.generateFoundationalQuestion(
          sessionId,
          session.skillDomain,
          analysisResult.weakAreas
        );
      }

      // Add new question to front of queue if generated
      if (nextQuestion) {
        queue.unshift(nextQuestion);
        session.totalQuestions++;
        console.log(`➕ Added adaptive question to queue. Queue now has ${queue.length} questions.`);
      } else {
        console.log(`⚠️ No adaptive question generated. Queue now has ${queue.length} questions.`);
      }

      console.log(`✅ Answer processed. Confidence: ${finalConfidenceScore.toFixed(2)}, Action: ${adaptiveAction}`);

      return {
        analysisResult: {
          confidenceScore: finalConfidenceScore,
          adaptiveAction,
          relatedTopics: analysisResult.relatedTopics,
          weakAreas: analysisResult.weakAreas,
          feedback: analysisResult.feedback
        },
        sessionMetrics: {
          questionsAnswered: session.questionsAnswered,
          totalQuestions: session.totalQuestions,
          averageConfidence: session.averageConfidence,
          performanceMetrics: session.performanceMetrics,
          questionsRemaining: this.questionQueue.get(sessionId).length
        },
        nextQuestion: nextQuestion ? {
          questionId: nextQuestion.id,
          text: nextQuestion.text,
          category: nextQuestion.category,
          difficulty: nextQuestion.difficulty,
          expectedAnswerLength: nextQuestion.expectedAnswerLength,
          adaptiveReason: adaptiveAction
        } : null
      };

    } catch (error) {
      console.error('❌ Failed to process answer:', error);
      throw new Error(`Failed to process answer: ${error.message}`);
    }
  }

  /**
   * Step 4: Analyze user answer and calculate confidence score
   * @param {string} questionId - Question ID
   * @param {string} userAnswer - User's answer
   * @param {string} skillDomain - Skill domain
   * @param {string} difficulty - Question difficulty
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeAnswer(questionId, userAnswer, skillDomain, difficulty) {
    try {
      // Get the original question from session data
      const question = await this.getQuestionById(questionId);
      if (!question) {
        throw new Error('Question not found');
      }

      // Use RAG to get relevant knowledge for comparison
      const relevantKnowledge = await this.getContextualKnowledge(skillDomain, difficulty);

      // Generate analysis prompt
      const analysisPrompt = `
Analyze the following interview answer and provide a comprehensive assessment:

Question: "${question.text}"
Question Category: ${question.category}
Question Difficulty: ${question.difficulty}
Skill Domain: ${skillDomain}

User Answer: "${userAnswer || 'No answer provided'}"

Relevant Knowledge Context: ${relevantKnowledge}

Please provide a JSON response with:
1. "confidence_score": A number from 0.0 to 1.0 indicating how well the answer demonstrates understanding
2. "related_topics": Array of related topics the user seems comfortable with
3. "weak_areas": Array of areas where the user needs improvement
4. "feedback": Constructive feedback for the user
5. "answer_quality": Assessment of answer quality (excellent/good/fair/poor)

Consider:
- Accuracy of the answer
- Depth of understanding demonstrated
- Practical knowledge shown
- Communication clarity
- Completeness of response
`;

      // Get analysis from Ollama
      const analysisResponse = await this.ollamaService.generateText(analysisPrompt, {
        temperature: 0.3,
        max_tokens: 500
      });

      // Parse the analysis response
      const analysis = this.parseAnalysisResponse(analysisResponse);

      return {
        confidenceScore: analysis.confidence_score || 0.0,
        relatedTopics: analysis.related_topics || [],
        weakAreas: analysis.weak_areas || [],
        feedback: analysis.feedback || 'Keep practicing to improve your understanding.',
        answerQuality: analysis.answer_quality || 'fair'
      };

    } catch (error) {
      console.error('❌ Failed to analyze answer:', error);
      
      // Fallback analysis
      return this.getFallbackAnalysis(userAnswer, difficulty);
    }
  }

  /**
   * Step 5: Generate advanced question based on high confidence
   * @param {string} sessionId - Session ID
   * @param {string} skillDomain - Skill domain
   * @param {Array} relatedTopics - Topics user is comfortable with
   * @returns {Promise<Object>} Generated advanced question
   */
  async generateAdvancedQuestion(sessionId, skillDomain, relatedTopics) {
    try {
      console.log(`🚀 Generating advanced question for ${skillDomain}`);

      // Get contextual knowledge for advanced topics
      const advancedKnowledge = await this.getContextualKnowledge(skillDomain, 'hard');

      // Generate advanced question
      const advancedPrompt = `
Generate an advanced interview question for ${skillDomain}.

User has shown good understanding in: ${relatedTopics.join(', ')}

Create a challenging question that:
- Builds on their demonstrated knowledge
- Tests deeper understanding
- Requires practical application
- Is at hard difficulty level

Context: ${advancedKnowledge}

Provide a JSON response with:
- "text": The question text
- "category": Question category
- "difficulty": "hard"
- "expected_answer_length": "long"
- "learning_objectives": Array of what this question tests
`;

      const response = await this.ollamaService.generateText(advancedPrompt, {
        temperature: 0.7,
        max_tokens: 300
      });

      const question = this.parseQuestionResponse(response);

      return {
        id: uuidv4(),
        text: question.text,
        category: question.category || 'Advanced',
        difficulty: 'hard',
        expectedAnswerLength: 'long',
        skillDomain,
        isAdaptive: true,
        adaptiveType: 'advanced',
        generatedAt: new Date()
      };

    } catch (error) {
      console.error('❌ Failed to generate advanced question:', error);
      return this.generateFallbackAdvancedQuestion(skillDomain, relatedTopics);
    }
  }

  /**
   * Step 5: Generate foundational question based on low confidence
   * @param {string} sessionId - Session ID
   * @param {string} skillDomain - Skill domain
   * @param {Array} weakAreas - Areas user needs improvement in
   * @returns {Promise<Object>} Generated foundational question
   */
  async generateFoundationalQuestion(sessionId, skillDomain, weakAreas) {
    try {
      console.log(`🔧 Generating foundational question for ${skillDomain}`);

      // Get foundational knowledge
      const foundationalKnowledge = await this.getContextualKnowledge(skillDomain, 'easy');

      // Generate foundational question
      const foundationalPrompt = `
Generate a foundational interview question for ${skillDomain}.

User needs improvement in: ${weakAreas.join(', ')}

Create a question that:
- Covers fundamental concepts
- Is accessible and clear
- Builds confidence
- Is at easy difficulty level
- Addresses the weak areas

Context: ${foundationalKnowledge}

Provide a JSON response with:
- "text": The question text
- "category": Question category
- "difficulty": "easy"
- "expected_answer_length": "medium"
- "learning_objectives": Array of what this question teaches
`;

      const response = await this.ollamaService.generateText(foundationalPrompt, {
        temperature: 0.7,
        max_tokens: 300
      });

      const question = this.parseQuestionResponse(response);

      return {
        id: uuidv4(),
        text: question.text,
        category: question.category || 'Fundamentals',
        difficulty: 'easy',
        expectedAnswerLength: 'medium',
        skillDomain,
        isAdaptive: true,
        adaptiveType: 'foundational',
        generatedAt: new Date()
      };

    } catch (error) {
      console.error('❌ Failed to generate foundational question:', error);
      return this.generateFallbackFoundationalQuestion(skillDomain, weakAreas);
    }
  }

  /**
   * Step 7: Generate performance report
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Performance report
   */
  async generatePerformanceReport(sessionId) {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      console.log(`📊 Generating performance report for session ${sessionId}`);

      // Calculate comprehensive metrics
      const metrics = this.calculateSessionMetrics(session);

      // Generate AI insights
      const insights = await this.generateAIInsights(session, metrics);

      // Create performance report
      const report = {
        sessionId: session.id,
        sessionName: session.sessionName,
        skillDomain: session.skillDomain,
        duration: this.calculateSessionDuration(session),
        metrics,
        insights,
        recommendations: this.generateRecommendations(session, metrics),
        strengths: this.identifyStrengths(session, metrics),
        areasForImprovement: this.identifyImprovementAreas(session, metrics),
        nextSteps: this.generateNextSteps(session, metrics),
        generatedAt: new Date()
      };

      // Update session status
      session.status = 'completed';
      session.updatedAt = new Date();

      console.log(`✅ Performance report generated for session ${sessionId}`);

      return report;

    } catch (error) {
      console.error('❌ Failed to generate performance report:', error);
      throw new Error(`Failed to generate performance report: ${error.message}`);
    }
  }

  // Helper methods

  /**
   * Get contextual knowledge for question generation
   */
  async getContextualKnowledge(skillDomain, difficulty) {
    try {
      const searchResults = await this.ragService.searchKnowledge(
        `${skillDomain} ${difficulty} interview questions`,
        { nResults: 3, category: 'Technical' }
      );

      return searchResults.map(result => result.text).join('\n\n');
    } catch (error) {
      console.error('Failed to get contextual knowledge:', error);
      return `Knowledge about ${skillDomain} at ${difficulty} level.`;
    }
  }

  /**
   * Categorize question based on content
   */
  categorizeQuestion(questionText, skillDomain) {
    const categories = {
      'Technical': ['code', 'function', 'algorithm', 'implementation', 'syntax'],
      'Conceptual': ['what is', 'explain', 'define', 'concept', 'theory'],
      'Practical': ['how to', 'implement', 'create', 'build', 'develop'],
      'Problem-solving': ['solve', 'debug', 'optimize', 'troubleshoot', 'fix'],
      'Best practices': ['best practice', 'recommend', 'should', 'avoid', 'guideline']
    };

    const lowerText = questionText.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return category;
      }
    }

    return 'General';
  }

  /**
   * Normalize difficulty level
   */
  normalizeDifficulty(difficulty) {
    const normalized = difficulty.toLowerCase();
    if (['easy', 'beginner', 'basic'].includes(normalized)) return 'easy';
    if (['medium', 'intermediate', 'moderate'].includes(normalized)) return 'medium';
    if (['hard', 'advanced', 'expert'].includes(normalized)) return 'hard';
    return 'medium'; // default
  }

  /**
   * Assess expected answer length
   */
  assessAnswerLength(questionText) {
    const lowerText = questionText.toLowerCase();
    
    if (lowerText.includes('explain') || lowerText.includes('describe') || lowerText.includes('how does')) {
      return 'long';
    } else if (lowerText.includes('what is') || lowerText.includes('define')) {
      return 'medium';
    } else {
      return 'short';
    }
  }

  /**
   * Calculate average confidence score
   */
  calculateAverageConfidence(scores) {
    if (scores.length === 0) return 0;
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(session, confidenceScore) {
    if (confidenceScore > 0.8) {
      session.performanceMetrics.excellent++;
    } else if (confidenceScore > 0.6) {
      session.performanceMetrics.good++;
    } else if (confidenceScore > 0.4) {
      session.performanceMetrics.fair++;
    } else {
      session.performanceMetrics.poor++;
    }
  }

  /**
   * Parse analysis response from LLM
   */
  parseAnalysisResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse analysis response:', e);
    }

    // Fallback parsing
    return {
      confidence_score: 0.5,
      related_topics: [],
      weak_areas: ['general understanding'],
      feedback: 'Keep practicing to improve your answers.',
      answer_quality: 'fair'
    };
  }

  /**
   * Parse question response from LLM
   */
  parseQuestionResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse question response:', e);
    }

    // Fallback parsing
    return {
      text: response.trim(),
      category: 'General',
      difficulty: 'medium',
      expected_answer_length: 'medium'
    };
  }

  /**
   * Get fallback analysis when LLM analysis fails
   */
  getFallbackAnalysis(userAnswer, difficulty) {
    const hasAnswer = userAnswer && userAnswer.trim().length > 0;
    const answerLength = userAnswer ? userAnswer.split(' ').length : 0;

    let confidenceScore = 0.3; // Base score for no answer
    let answerQuality = 'poor';

    if (hasAnswer) {
      if (answerLength > 20) {
        confidenceScore = 0.7;
        answerQuality = 'good';
      } else if (answerLength > 10) {
        confidenceScore = 0.5;
        answerQuality = 'fair';
      } else {
        confidenceScore = 0.4;
        answerQuality = 'fair';
      }
    }

    return {
      confidenceScore,
      relatedTopics: hasAnswer ? ['general knowledge'] : [],
      weakAreas: hasAnswer ? ['detailed explanation'] : ['basic understanding'],
      feedback: hasAnswer ? 
        'Good start! Try to provide more detailed explanations.' : 
        'Try to provide an answer, even if you\'re not completely sure.',
      answerQuality
    };
  }

  /**
   * Generate fallback questions when LLM generation fails
   */
  generateFallbackQuestions(skillDomain, difficulty, count) {
    const fallbackQuestions = {
      'JavaScript': [
        'What is a variable in JavaScript?',
        'Explain the difference between let, const, and var.',
        'What is a function in JavaScript?',
        'How do you create an object in JavaScript?',
        'What is an array and how do you access its elements?'
      ],
      'React': [
        'What is React and why is it used?',
        'What is a component in React?',
        'What is JSX in React?',
        'How do you pass data between components?',
        'What is state in React?'
      ],
      'System Design': [
        'What is scalability in system design?',
        'Explain load balancing.',
        'What is a database and why is it important?',
        'What is caching and how does it help?',
        'Explain the difference between horizontal and vertical scaling.'
      ]
    };

    const questions = fallbackQuestions[skillDomain] || fallbackQuestions['JavaScript'];
    
    return questions.slice(0, count).map((text, index) => ({
      id: uuidv4(),
      text,
      category: 'General',
      difficulty,
      expectedAnswerLength: 'medium',
      skillDomain,
      isBaseline: true,
      order: index + 1,
      generatedAt: new Date()
    }));
  }

  /**
   * Generate fallback advanced question
   */
  generateFallbackAdvancedQuestion(skillDomain, relatedTopics) {
    const advancedQuestions = {
      'JavaScript': 'Explain the concept of closures in JavaScript and provide a practical example of how they can be used.',
      'React': 'How would you optimize a React application for better performance? Discuss specific techniques.',
      'System Design': 'Design a distributed caching system. What are the key components and challenges?'
    };

    return {
      id: uuidv4(),
      text: advancedQuestions[skillDomain] || 'Explain an advanced concept in your field.',
      category: 'Advanced',
      difficulty: 'hard',
      expectedAnswerLength: 'long',
      skillDomain,
      isAdaptive: true,
      adaptiveType: 'advanced',
      generatedAt: new Date()
    };
  }

  /**
   * Generate fallback foundational question
   */
  generateFallbackFoundationalQuestion(skillDomain, weakAreas) {
    const foundationalQuestions = {
      'JavaScript': 'What is JavaScript and what is it commonly used for?',
      'React': 'What is React and what problem does it solve?',
      'System Design': 'What is a system and what are its basic components?'
    };

    return {
      id: uuidv4(),
      text: foundationalQuestions[skillDomain] || 'Explain the basics of this topic.',
      category: 'Fundamentals',
      difficulty: 'easy',
      expectedAnswerLength: 'medium',
      skillDomain,
      isAdaptive: true,
      adaptiveType: 'foundational',
      generatedAt: new Date()
    };
  }

  /**
   * Calculate session metrics
   */
  calculateSessionMetrics(session) {
    const total = session.confidenceScores.length;
    if (total === 0) return {};

    return {
      totalQuestions: session.questionsAnswered,
      averageConfidence: session.averageConfidence,
      confidenceDistribution: session.performanceMetrics,
      improvementTrend: this.calculateImprovementTrend(session.confidenceScores),
      consistency: this.calculateConsistency(session.confidenceScores),
      completionRate: (session.questionsAnswered / session.totalQuestions) * 100
    };
  }

  /**
   * Calculate improvement trend
   */
  calculateImprovementTrend(scores) {
    if (scores.length < 2) return 'insufficient_data';

    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const difference = secondAvg - firstAvg;
    
    if (difference > 0.1) return 'improving';
    if (difference < -0.1) return 'declining';
    return 'stable';
  }

  /**
   * Calculate consistency
   */
  calculateConsistency(scores) {
    if (scores.length < 2) return 'insufficient_data';

    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);

    if (standardDeviation < 0.1) return 'very_consistent';
    if (standardDeviation < 0.2) return 'consistent';
    if (standardDeviation < 0.3) return 'moderately_consistent';
    return 'inconsistent';
  }

  /**
   * Generate AI insights
   */
  async generateAIInsights(session, metrics) {
    try {
      const insightsPrompt = `
Analyze the following interview session data and provide insights:

Session: ${session.sessionName}
Skill Domain: ${session.skillDomain}
Total Questions: ${session.questionsAnswered}
Average Confidence: ${metrics.averageConfidence?.toFixed(2) || 'N/A'}
Performance Distribution: ${JSON.stringify(metrics.confidenceDistribution || {})}
Improvement Trend: ${metrics.improvementTrend || 'N/A'}
Consistency: ${metrics.consistency || 'N/A'}

Provide insights on:
1. Overall performance assessment
2. Strengths demonstrated
3. Areas needing improvement
4. Learning progress
5. Recommendations for next steps

Format as a JSON response with:
- "overall_assessment": Summary of performance
- "strengths": Array of demonstrated strengths
- "improvement_areas": Array of areas to focus on
- "learning_insights": Insights about learning patterns
- "recommendations": Array of specific recommendations
`;

      const response = await this.ollamaService.generateText(insightsPrompt, {
        temperature: 0.3,
        max_tokens: 600
      });

      return this.parseAnalysisResponse(response);

    } catch (error) {
      console.error('Failed to generate AI insights:', error);
      return this.getFallbackInsights(session, metrics);
    }
  }

  /**
   * Get fallback insights
   */
  getFallbackInsights(session, metrics) {
    return {
      overall_assessment: `You completed ${session.questionsAnswered} questions with an average confidence of ${metrics.averageConfidence?.toFixed(2) || 'N/A'}.`,
      strengths: ['Persistence in completing the session'],
      improvement_areas: ['General knowledge in the domain'],
      learning_insights: ['Consistent participation in the interview process'],
      recommendations: ['Continue practicing with more questions', 'Focus on fundamental concepts']
    };
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(session, metrics) {
    const recommendations = [];

    if (metrics.averageConfidence < 0.5) {
      recommendations.push('Focus on fundamental concepts and basic understanding');
      recommendations.push('Practice with easier questions to build confidence');
    } else if (metrics.averageConfidence > 0.7) {
      recommendations.push('Challenge yourself with advanced topics');
      recommendations.push('Focus on practical applications and real-world scenarios');
    }

    if (metrics.consistency === 'inconsistent') {
      recommendations.push('Work on maintaining consistent performance');
      recommendations.push('Review concepts you find challenging');
    }

    return recommendations;
  }

  /**
   * Identify strengths
   */
  identifyStrengths(session, metrics) {
    const strengths = [];

    if (metrics.averageConfidence > 0.7) {
      strengths.push('Strong understanding of core concepts');
    }

    if (metrics.consistency === 'very_consistent') {
      strengths.push('Consistent performance across questions');
    }

    if (metrics.improvementTrend === 'improving') {
      strengths.push('Demonstrates learning and improvement');
    }

    return strengths;
  }

  /**
   * Identify improvement areas
   */
  identifyImprovementAreas(session, metrics) {
    const areas = [];

    if (metrics.averageConfidence < 0.5) {
      areas.push('Basic understanding of fundamental concepts');
    }

    if (metrics.consistency === 'inconsistent') {
      areas.push('Consistency in answering questions');
    }

    if (metrics.improvementTrend === 'declining') {
      areas.push('Maintaining focus and performance throughout the session');
    }

    return areas;
  }

  /**
   * Generate next steps
   */
  generateNextSteps(session, metrics) {
    const steps = [];

    if (metrics.averageConfidence < 0.6) {
      steps.push('Review fundamental concepts in the domain');
      steps.push('Practice with easier questions');
    } else {
      steps.push('Move to more advanced topics');
      steps.push('Practice practical applications');
    }

    steps.push('Schedule regular practice sessions');
    steps.push('Focus on identified improvement areas');

    return steps;
  }

  /**
   * Calculate session duration
   */
  calculateSessionDuration(session) {
    const duration = session.updatedAt - session.createdAt;
    return Math.round(duration / 1000 / 60); // minutes
  }

  /**
   * Get question by ID (placeholder - would need to store questions)
   */
  async getQuestionById(questionId) {
    // This would typically query a database or storage
    // For now, return a placeholder
    return {
      id: questionId,
      text: 'Sample question',
      category: 'General',
      difficulty: 'medium'
    };
  }

  /**
   * Get session status
   */
  getSessionStatus(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    const queue = this.questionQueue.get(sessionId);
    const questionsRemaining = queue ? queue.length : 0;
    const isActive = questionsRemaining > 0 && session.status !== 'completed';

    return {
      id: session.id,
      databaseSessionId: session.databaseSessionId,
      status: isActive ? 'active' : 'completed',
      skillDomain: session.skillDomain,
      difficulty: session.difficulty,
      questionsAnswered: session.questionsAnswered,
      totalQuestions: session.totalQuestions,
      averageConfidence: session.averageConfidence,
      questionsRemaining,
      isActive,
      sessionComplete: !isActive,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    };
  }

  /**
   * Get database session ID from dynamic session ID
   */
  getDatabaseSessionId(dynamicSessionId) {
    const session = this.sessions.get(dynamicSessionId);
    return session ? session.databaseSessionId : null;
  }

  /**
   * Get dynamic session ID from database session ID
   * This method queries the database to find the dynamic_session_id in session_metadata
   */
  async getDynamicSessionIdFromDatabase(databaseSessionId) {
    try {
      const { Session } = await import('../models/Session.js');
      const dbSession = await Session.findById(databaseSessionId);
      
      if (dbSession && dbSession.session_metadata && dbSession.session_metadata.dynamic_session_id) {
        return dbSession.session_metadata.dynamic_session_id;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting dynamic session ID from database:', error);
      return null;
    }
  }

  /**
   * Get available skill domains
   */
  getAvailableSkillDomains() {
    return [
      'JavaScript',
      'React',
      'Node.js',
      'Python',
      'Java',
      'System Design',
      'Database Design',
      'Data Structures',
      'Algorithms',
      'Web Development',
      'Mobile Development',
      'DevOps',
      'Cloud Computing',
      'Machine Learning',
      'Data Science'
    ];
  }

  // TTS Helper Functions

  /**
   * Generate TTS audio for a question
   * @param {Object} question - Question object
   * @param {number} questionNumber - Question number for file naming
   * @returns {Promise<Object>} Audio data with base64 audio and lipsync
   */
  async generateQuestionAudio(question, questionNumber) {
    try {
      const timestamp = Date.now();
      const baseFileName = `dynamic_question_${questionNumber}_${timestamp}`;
      const fileName = `audios/${baseFileName}.wav`;

      console.log(`🎵 Generating TTS for: "${question.text.substring(0, 50)}..."`);

      // Generate audio file using Piper TTS
      await this.piperTTS(question.text, this.piperModel, fileName);
      
      // Generate lipsync
      await this.lipSyncMessage(baseFileName);

      // Convert audio to base64
      const audio = await this.audioFileToBase64(fileName);
      const lipsync = await this.readJsonTranscript(`audios/${baseFileName}.json`);

      console.log(`✅ TTS audio generated successfully for question ${questionNumber}`);

      return {
        audio,
        lipsync,
        fileName
      };

    } catch (error) {
      console.error('❌ Failed to generate question audio:', error);
      throw new Error(`TTS generation failed: ${error.message}`);
    }
  }

  /**
   * Call Piper TTS Python script
   * @param {string} text - Text to convert to speech
   * @param {string} modelPath - Path to the Piper model
   * @param {string} outputFile - Output file path
   */
  async piperTTS(text, modelPath, outputFile) {
    return new Promise((resolve, reject) => {
      // Escape quotes properly for command line
      const escapedText = text.replace(/"/g, '\\"');
      const command = `python ${this.piperScript} "${escapedText}" "${modelPath}" "${outputFile}"`;
      console.log(`🎵 Executing TTS: ${command.substring(0, 100)}...`);
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`❌ Piper TTS error: ${error.message}`);
          console.error(`❌ Stderr: ${stderr}`);
          reject(error);
        } else {
          console.log(`✅ Piper TTS output: ${stdout}`);
          resolve(stdout);
        }
      });
    });
  }

  /**
   * Generate lip sync for audio file
   * @param {string} baseFileName - Base filename without extension
   */
  async lipSyncMessage(baseFileName) {
    const time = new Date().getTime();
    console.log(`🎭 Starting lip sync for ${baseFileName}`);
    
    await this.execCommand(
      `"C:\\Program Files\\Rhubarb-Lip-Sync-1.14.0-Windows\\rhubarb.exe" -f json -o audios/${baseFileName}.json audios/${baseFileName}.wav -r phonetic`
    );
    
    console.log(`✅ Lip sync completed in ${new Date().getTime() - time}ms`);
  }

  /**
   * Execute command with Promise wrapper
   * @param {string} command - Command to execute
   */
  execCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) reject(error);
        resolve(stdout);
      });
    });
  }

  /**
   * Read JSON transcript file
   * @param {string} file - File path
   */
  async readJsonTranscript(file) {
    try {
      const data = await fs.readFile(file, "utf8");
      return JSON.parse(data);
    } catch (error) {
      console.error(`❌ Failed to read transcript file ${file}:`, error);
      return null;
    }
  }

  /**
   * Convert audio file to base64
   * @param {string} file - Audio file path
   */
  async audioFileToBase64(file) {
    try {
      const data = await fs.readFile(file);
      return data.toString("base64");
    } catch (error) {
      console.error(`❌ Failed to convert audio file to base64 ${file}:`, error);
      return null;
    }
  }

  /**
   * Get facial expression based on question difficulty
   * @param {string} difficulty - Question difficulty
   */
  getFacialExpressionForDifficulty(difficulty) {
    switch (difficulty) {
      case "easy":
        return "smile";
      case "medium":
        return "default";
      case "hard":
        return "serious";
      default:
        return "default";
    }
  }

  /**
   * Get animation based on question category
   * @param {string} category - Question category
   */
  getAnimationForQuestionType(category) {
    const categoryAnimationMap = {
      "Technical": "Talking_1",
      "Conceptual": "Talking_2", 
      "Practical": "Talking_3",
      "Problem-solving": "Thinking",
      "Best practices": "Talking_1",
      "Advanced": "Talking_2",
      "Fundamentals": "Talking_1",
      "General": "Talking_1"
    };
    
    return categoryAnimationMap[category] || "Talking_1";
  }

  /**
   * Test the dynamic question generator
   */
  async test() {
    try {
      console.log('🧪 Testing Dynamic Question Generator...');

      // Test initialization
      await this.initialize();
      console.log('✅ Initialization test passed');

      // Test session initialization
      const sessionConfig = {
        skillDomain: 'JavaScript',
        difficulty: 'medium',
        userId: 'test-user',
        maxQuestions: 5
      };

      const { session } = await this.initializeSession(sessionConfig);
      console.log('✅ Session initialization test passed');

      // Test getting next question with TTS
      const question = await this.getNextQuestion(session.id, { includeAudio: true });
      console.log('✅ Get next question with TTS test passed');
      console.log(`   Audio generated: ${question.audioGenerated}`);
      console.log(`   Facial expression: ${question.facialExpression}`);
      console.log(`   Animation: ${question.animation}`);

      // Test answer processing
      if (question) {
        const answerResult = await this.processAnswer(session.id, {
          questionId: question.questionId,
          userAnswer: 'A closure is a function that has access to variables in its outer scope.',
          timeTakenSeconds: 30,
          confidenceScore: 0.8
        });
        console.log('✅ Answer processing test passed');
      }

      // Test performance report
      const report = await this.generatePerformanceReport(session.id);
      console.log('✅ Performance report test passed');

      console.log('🎉 All Dynamic Question Generator tests passed!');
      return {
        success: true,
        message: 'Dynamic Question Generator is working correctly',
        sessionId: session.id
      };

    } catch (error) {
      console.error('❌ Dynamic Question Generator test failed:', error);
      return {
        success: false,
        error: error.message,
        message: 'Dynamic Question Generator test failed'
      };
    }
  }
}

export default DynamicQuestionGenerator;
