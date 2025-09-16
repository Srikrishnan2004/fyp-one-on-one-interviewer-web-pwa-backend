import { query } from '../config/database.js';

export class Session {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.session_name = data.session_name;
    this.session_type = data.session_type;
    this.status = data.status;
    this.started_at = data.started_at;
    this.ended_at = data.ended_at;
    this.duration_minutes = data.duration_minutes;
    this.total_questions = data.total_questions;
    this.completed_questions = data.completed_questions;
    this.session_metadata = data.session_metadata;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create a new session
  static async create(sessionData) {
    const { 
      user_id, 
      session_name, 
      session_type = 'interview',
      session_metadata = {}
    } = sessionData;
    
    const queryText = `
      INSERT INTO sessions (user_id, session_name, session_type, session_metadata)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const values = [user_id, session_name, session_type, JSON.stringify(session_metadata)];
    const result = await query(queryText, values);
    
    return new Session(result.rows[0]);
  }

  // Find session by ID
  static async findById(id) {
    const queryText = 'SELECT * FROM sessions WHERE id = $1';
    const result = await query(queryText, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return new Session(result.rows[0]);
  }

  // Find sessions by user ID
  static async findByUserId(userId, options = {}) {
    const { status, limit = 50, offset = 0 } = options;
    
    let queryText = 'SELECT * FROM sessions WHERE user_id = $1';
    const values = [userId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      queryText += ` AND status = $${paramCount}`;
      values.push(status);
    }

    queryText += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    values.push(limit, offset);

    const result = await query(queryText, values);
    return result.rows.map(row => new Session(row));
  }

  // Update session
  async update(updateData) {
    const allowedFields = [
      'session_name', 
      'session_type', 
      'status', 
      'ended_at',
      'total_questions',
      'completed_questions',
      'session_metadata'
    ];
    
    const updates = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        if (key === 'session_metadata') {
          updates.push(`${key} = $${paramCount}`);
          values.push(JSON.stringify(value));
        } else {
          updates.push(`${key} = $${paramCount}`);
          values.push(value);
        }
        paramCount++;
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(this.id);
    const queryText = `
      UPDATE sessions 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await query(queryText, values);
    return new Session(result.rows[0]);
  }

  // Start session
  async start() {
    const queryText = `
      UPDATE sessions 
      SET status = 'active', started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await query(queryText, [this.id]);
    return new Session(result.rows[0]);
  }

  // End session
  async end() {
    const queryText = `
      UPDATE sessions 
      SET status = 'completed', ended_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await query(queryText, [this.id]);
    return new Session(result.rows[0]);
  }

  // Pause session
  async pause() {
    const queryText = `
      UPDATE sessions 
      SET status = 'paused', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await query(queryText, [this.id]);
    return new Session(result.rows[0]);
  }

  // Resume session
  async resume() {
    const queryText = `
      UPDATE sessions 
      SET status = 'active', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await query(queryText, [this.id]);
    return new Session(result.rows[0]);
  }

  // Abandon session
  async abandon() {
    const queryText = `
      UPDATE sessions 
      SET status = 'abandoned', ended_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await query(queryText, [this.id]);
    return new Session(result.rows[0]);
  }

  // Update question count
  async updateQuestionCount(totalQuestions, completedQuestions) {
    const queryText = `
      UPDATE sessions 
      SET total_questions = $1, completed_questions = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    
    const result = await query(queryText, [totalQuestions, completedQuestions, this.id]);
    return new Session(result.rows[0]);
  }

  // Get session conversations
  async getConversations() {
    const queryText = `
      SELECT * FROM conversations 
      WHERE session_id = $1 
      ORDER BY question_number ASC
    `;
    
    const result = await query(queryText, [this.id]);
    return result.rows;
  }

  // Get session performance metrics
  async getPerformanceMetrics() {
    const queryText = `
      SELECT 
        metric_type,
        AVG(metric_value) as avg_score,
        COUNT(*) as total_metrics,
        MIN(metric_value) as min_score,
        MAX(metric_value) as max_score
      FROM performance 
      WHERE session_id = $1 
      GROUP BY metric_type
      ORDER BY metric_type
    `;
    
    const result = await query(queryText, [this.id]);
    return result.rows;
  }

  // Get session statistics
  async getStats() {
    const queryText = `
      SELECT 
        COUNT(*) as total_conversations,
        AVG(time_taken_seconds) as avg_answer_time,
        AVG(confidence_score) as avg_confidence,
        COUNT(CASE WHEN confidence_score >= 0.7 THEN 1 END) as high_confidence_answers,
        COUNT(CASE WHEN confidence_score < 0.4 THEN 1 END) as low_confidence_answers
      FROM conversations 
      WHERE session_id = $1
    `;
    
    const result = await query(queryText, [this.id]);
    return result.rows[0];
  }

  // Delete session (and all related data)
  async delete() {
    const queryText = 'DELETE FROM sessions WHERE id = $1';
    await query(queryText, [this.id]);
    return true;
  }

  // Get active sessions for a user
  static async getActiveSessions(userId) {
    const queryText = `
      SELECT * FROM sessions 
      WHERE user_id = $1 AND status = 'active'
      ORDER BY started_at DESC
    `;
    
    const result = await query(queryText, [userId]);
    return result.rows.map(row => new Session(row));
  }

  // Get session summary for dashboard
  static async getSessionSummary(userId, days = 30) {
    const queryText = `
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_sessions,
        COUNT(CASE WHEN status = 'paused' THEN 1 END) as paused_sessions,
        AVG(duration_minutes) as avg_duration,
        SUM(total_questions) as total_questions_asked,
        SUM(completed_questions) as total_questions_answered
      FROM sessions 
      WHERE user_id = $1 
      AND created_at >= CURRENT_TIMESTAMP - INTERVAL '${days} days'
    `;
    
    const result = await query(queryText, [userId]);
    return result.rows[0];
  }

  // Convert to JSON
  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      session_name: this.session_name,
      session_type: this.session_type,
      status: this.status,
      started_at: this.started_at,
      ended_at: this.ended_at,
      duration_minutes: this.duration_minutes,
      total_questions: this.total_questions,
      completed_questions: this.completed_questions,
      session_metadata: this.session_metadata,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}
