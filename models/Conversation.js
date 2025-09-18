import { query } from '../config/database.js';
import LLMAnswerService from '../services/llmAnswerService.js';
import FeedbackService from '../services/feedbackService.js';

export class Conversation {
  constructor(data) {
    this.id = data.id;
    this.session_id = data.session_id;
    this.question_number = data.question_number;
    this.question_text = data.question_text;
    this.question_category = data.question_category;
    this.question_difficulty = data.question_difficulty;
    this.llm_generated_answer = data.llm_generated_answer;
    this.user_answer = data.user_answer;
    this.user_answer_audio_url = data.user_answer_audio_url;
    this.answer_timestamp = data.answer_timestamp;
    this.time_taken_seconds = data.time_taken_seconds;
    this.llm_feedback = data.llm_feedback;
    this.confidence_score = data.confidence_score;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create a new conversation
  static async create(conversationData) {
    const {
      session_id,
      question_number,
      question_text,
      question_category,
      question_difficulty = 'medium',
      llm_generated_answer,
      user_answer,
      user_answer_audio_url,
      time_taken_seconds,
      llm_feedback,
      confidence_score,
      auto_generate_answer = true
    } = conversationData;

    let finalLlmAnswer = llm_generated_answer;

    // Auto-generate LLM answer if not provided and auto_generate_answer is true
    if (!finalLlmAnswer && auto_generate_answer) {
      try {
        const llmService = new LLMAnswerService();
        finalLlmAnswer = await llmService.generateAnswer(
          question_text,
          question_category || 'General',
          question_difficulty
        );
        console.log(`✅ Generated LLM answer for question ${question_number}`);
      } catch (error) {
        console.error(`❌ Failed to generate LLM answer for question ${question_number}:`, error.message);
        // Continue without LLM answer if generation fails
        finalLlmAnswer = null;
      }
    }

    const queryText = `
      INSERT INTO conversations (
        session_id, question_number, question_text, question_category,
        question_difficulty, llm_generated_answer, user_answer,
        user_answer_audio_url, time_taken_seconds, llm_feedback, confidence_score
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      session_id, question_number, question_text, question_category,
      question_difficulty, finalLlmAnswer, user_answer,
      user_answer_audio_url, time_taken_seconds, llm_feedback, confidence_score
    ];

    const result = await query(queryText, values);
    return new Conversation(result.rows[0]);
  }

  // Find conversation by ID
  static async findById(id) {
    const queryText = 'SELECT * FROM conversations WHERE id = $1';
    const result = await query(queryText, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return new Conversation(result.rows[0]);
  }

  // Find conversations by session ID
  static async findBySessionId(sessionId, options = {}) {
    const { limit = 100, offset = 0, orderBy = 'question_number' } = options;

    const queryText = `
      SELECT * FROM conversations 
      WHERE session_id = $1 
      ORDER BY ${orderBy} ASC
      LIMIT $2 OFFSET $3
    `;

    const result = await query(queryText, [sessionId, limit, offset]);
    return result.rows.map(row => new Conversation(row));
  }

  // Find conversations by user ID (through sessions)
  static async findByUserId(userId, options = {}) {
    const { limit = 100, offset = 0, sessionId } = options;

    let queryText = `
      SELECT c.* FROM conversations c
      JOIN sessions s ON c.session_id = s.id
      WHERE s.user_id = $1
    `;
    const values = [userId];
    let paramCount = 1;

    if (sessionId) {
      paramCount++;
      queryText += ` AND c.session_id = $${paramCount}`;
      values.push(sessionId);
    }

    queryText += ` ORDER BY c.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    values.push(limit, offset);

    const result = await query(queryText, values);
    return result.rows.map(row => new Conversation(row));
  }

  // Update conversation
  async update(updateData) {
    const allowedFields = [
      'user_answer',
      'user_answer_audio_url',
      'time_taken_seconds',
      'llm_feedback',
      'confidence_score',
      'answer_timestamp',
      'llm_generated_answer'
    ];

    const updates = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = $${paramCount}`);
        values.push(value === '' ? null : value); // Convert empty string to null
        paramCount++;
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(this.id);
    const queryText = `
      UPDATE conversations 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await query(queryText, values);
    return new Conversation(result.rows[0]);
  }

  // Submit user answer with automatic feedback generation
  async submitAnswer(userAnswer, options = {}) {
    const {
      user_answer_audio_url,
      time_taken_seconds,
      llm_feedback,
      confidence_score,
      auto_generate_feedback = true
    } = options;

    let finalLlmFeedback = llm_feedback;
    let finalConfidenceScore = confidence_score;

    // Auto-generate feedback if not provided and auto_generate_feedback is true
    if (!finalLlmFeedback && auto_generate_feedback && (userAnswer && userAnswer.trim() !== '')) {
      try {
        console.log(`🧠 Generating feedback for conversation ${this.id}...`);
        
        const feedbackService = new FeedbackService();
        const feedback = await feedbackService.generateFeedback(
          this.question_text,
          userAnswer,
          this.llm_generated_answer,
          this.question_category || 'General',
          this.question_difficulty
        );

        finalLlmFeedback = feedback.llm_feedback;
        finalConfidenceScore = feedback.confidence_score;

        console.log(`✅ Generated feedback with confidence score: ${finalConfidenceScore}`);
      } catch (error) {
        console.error(`❌ Failed to generate feedback for conversation ${this.id}:`, error.message);
        // Continue without feedback if generation fails
        finalLlmFeedback = finalLlmFeedback || 'Good effort! Keep practicing to improve your answers.';
        finalConfidenceScore = finalConfidenceScore || 0.5;
      }
    }

    const updateData = {
      user_answer: userAnswer,
      user_answer_audio_url,
      time_taken_seconds,
      llm_feedback: finalLlmFeedback,
      confidence_score: finalConfidenceScore,
      answer_timestamp: new Date()
    };

    return await this.update(updateData);
  }

  // Update LLM feedback
  async updateFeedback(feedback, confidenceScore) {
    const queryText = `
      UPDATE conversations 
      SET llm_feedback = $1, confidence_score = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;

    const result = await query(queryText, [feedback, confidenceScore, this.id]);
    return new Conversation(result.rows[0]);
  }

  // Get conversation with session details
  async getWithSessionDetails() {
    const queryText = `
      SELECT 
        c.*,
        s.session_name,
        s.session_type,
        s.status as session_status,
        u.username,
        u.first_name,
        u.last_name
      FROM conversations c
      JOIN sessions s ON c.session_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE c.id = $1
    `;

    const result = await query(queryText, [this.id]);
    return result.rows[0];
  }

  // Get conversation performance metrics
  async getPerformanceMetrics() {
    const queryText = `
      SELECT 
        metric_type,
        metric_value,
        metric_unit,
        performance_category,
        feedback_notes,
        improvement_suggestions
      FROM performance 
      WHERE conversation_id = $1
      ORDER BY recorded_at DESC
    `;

    const result = await query(queryText, [this.id]);
    return result.rows;
  }

  // Delete conversation
  async delete() {
    const queryText = 'DELETE FROM conversations WHERE id = $1';
    await query(queryText, [this.id]);
    return true;
  }

  // Get conversation statistics for a session
  static async getSessionStats(sessionId) {
    const queryText = `
      SELECT 
        COUNT(*) as total_questions,
        COUNT(CASE WHEN user_answer IS NOT NULL THEN 1 END) as answered_questions,
        COUNT(CASE WHEN user_answer IS NULL THEN 1 END) as unanswered_questions,
        AVG(time_taken_seconds) as avg_answer_time,
        AVG(confidence_score) as avg_confidence,
        COUNT(CASE WHEN confidence_score >= 0.7 THEN 1 END) as high_confidence_count,
        COUNT(CASE WHEN confidence_score < 0.4 THEN 1 END) as low_confidence_count,
        COUNT(CASE WHEN question_difficulty = 'easy' THEN 1 END) as easy_questions,
        COUNT(CASE WHEN question_difficulty = 'medium' THEN 1 END) as medium_questions,
        COUNT(CASE WHEN question_difficulty = 'hard' THEN 1 END) as hard_questions
      FROM conversations 
      WHERE session_id = $1
    `;

    const result = await query(queryText, [sessionId]);
    return result.rows[0];
  }

  // Get conversation statistics for a user
  static async getUserStats(userId, days = 30) {
    const queryText = `
      SELECT 
        COUNT(*) as total_conversations,
        COUNT(CASE WHEN c.user_answer IS NOT NULL THEN 1 END) as answered_conversations,
        AVG(c.time_taken_seconds) as avg_answer_time,
        AVG(c.confidence_score) as avg_confidence,
        COUNT(CASE WHEN c.confidence_score >= 0.7 THEN 1 END) as high_confidence_count,
        COUNT(CASE WHEN c.confidence_score < 0.4 THEN 1 END) as low_confidence_count,
        COUNT(DISTINCT c.question_category) as unique_categories,
        COUNT(DISTINCT c.session_id) as sessions_with_conversations
      FROM conversations c
      JOIN sessions s ON c.session_id = s.id
      WHERE s.user_id = $1 
      AND c.created_at >= CURRENT_TIMESTAMP - INTERVAL '${days} days'
    `;

    const result = await query(queryText, [userId]);
    return result.rows[0];
  }

  // Get conversations by category
  static async getByCategory(userId, category, options = {}) {
    const { limit = 50, offset = 0 } = options;

    const queryText = `
      SELECT c.* FROM conversations c
      JOIN sessions s ON c.session_id = s.id
      WHERE s.user_id = $1 AND c.question_category = $2
      ORDER BY c.created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const result = await query(queryText, [userId, category, limit, offset]);
    return result.rows.map(row => new Conversation(row));
  }

  // Get conversations by difficulty
  static async getByDifficulty(userId, difficulty, options = {}) {
    const { limit = 50, offset = 0 } = options;

    const queryText = `
      SELECT c.* FROM conversations c
      JOIN sessions s ON c.session_id = s.id
      WHERE s.user_id = $1 AND c.question_difficulty = $2
      ORDER BY c.created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const result = await query(queryText, [userId, difficulty, limit, offset]);
    return result.rows.map(row => new Conversation(row));
  }

  // Convert to JSON
  toJSON() {
    return {
      id: this.id,
      session_id: this.session_id,
      question_number: this.question_number,
      question_text: this.question_text,
      question_category: this.question_category,
      question_difficulty: this.question_difficulty,
      llm_generated_answer: this.llm_generated_answer,
      user_answer: this.user_answer,
      user_answer_audio_url: this.user_answer_audio_url,
      answer_timestamp: this.answer_timestamp,
      time_taken_seconds: this.time_taken_seconds,
      llm_feedback: this.llm_feedback,
      confidence_score: this.confidence_score,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}
