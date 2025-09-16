import { query } from '../config/database.js';

export class Performance {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.session_id = data.session_id;
    this.conversation_id = data.conversation_id;
    this.metric_type = data.metric_type;
    this.metric_value = data.metric_value;
    this.metric_max_value = data.metric_max_value;
    this.metric_unit = data.metric_unit;
    this.performance_category = data.performance_category;
    this.feedback_notes = data.feedback_notes;
    this.improvement_suggestions = data.improvement_suggestions;
    this.recorded_at = data.recorded_at;
    this.created_at = data.created_at;
  }

  // Create a new performance record
  static async create(performanceData) {
    const {
      user_id,
      session_id,
      conversation_id,
      metric_type,
      metric_value,
      metric_max_value = 100.00,
      metric_unit,
      performance_category,
      feedback_notes,
      improvement_suggestions
    } = performanceData;

    const queryText = `
      INSERT INTO performance (
        user_id, session_id, conversation_id, metric_type, metric_value,
        metric_max_value, metric_unit, performance_category, feedback_notes,
        improvement_suggestions
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      user_id, session_id, conversation_id, metric_type, metric_value,
      metric_max_value, metric_unit, performance_category, feedback_notes,
      improvement_suggestions
    ];

    const result = await query(queryText, values);
    return new Performance(result.rows[0]);
  }

  // Create multiple performance records
  static async createBatch(performanceRecords) {
    if (!performanceRecords || performanceRecords.length === 0) {
      return [];
    }

    const queryText = `
      INSERT INTO performance (
        user_id, session_id, conversation_id, metric_type, metric_value,
        metric_max_value, metric_unit, performance_category, feedback_notes,
        improvement_suggestions
      )
      VALUES ${performanceRecords.map((_, index) => 
        `($${index * 10 + 1}, $${index * 10 + 2}, $${index * 10 + 3}, $${index * 10 + 4}, $${index * 10 + 5}, $${index * 10 + 6}, $${index * 10 + 7}, $${index * 10 + 8}, $${index * 10 + 9}, $${index * 10 + 10})`
      ).join(', ')}
      RETURNING *
    `;

    const values = performanceRecords.flatMap(record => [
      record.user_id, record.session_id, record.conversation_id, record.metric_type,
      record.metric_value, record.metric_max_value, record.metric_unit,
      record.performance_category, record.feedback_notes, record.improvement_suggestions
    ]);

    const result = await query(queryText, values);
    return result.rows.map(row => new Performance(row));
  }

  // Find performance record by ID
  static async findById(id) {
    const queryText = 'SELECT * FROM performance WHERE id = $1';
    const result = await query(queryText, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return new Performance(result.rows[0]);
  }

  // Find performance records by user ID
  static async findByUserId(userId, options = {}) {
    const { 
      sessionId, 
      conversationId, 
      metricType, 
      performanceCategory,
      limit = 100, 
      offset = 0,
      days = 30
    } = options;

    let queryText = `
      SELECT * FROM performance 
      WHERE user_id = $1 
      AND recorded_at >= CURRENT_TIMESTAMP - INTERVAL '${days} days'
    `;
    const values = [userId];
    let paramCount = 1;

    if (sessionId) {
      paramCount++;
      queryText += ` AND session_id = $${paramCount}`;
      values.push(sessionId);
    }

    if (conversationId) {
      paramCount++;
      queryText += ` AND conversation_id = $${paramCount}`;
      values.push(conversationId);
    }

    if (metricType) {
      paramCount++;
      queryText += ` AND metric_type = $${paramCount}`;
      values.push(metricType);
    }

    if (performanceCategory) {
      paramCount++;
      queryText += ` AND performance_category = $${paramCount}`;
      values.push(performanceCategory);
    }

    queryText += ` ORDER BY recorded_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    values.push(limit, offset);

    const result = await query(queryText, values);
    return result.rows.map(row => new Performance(row));
  }

  // Get performance summary for a user
  static async getUserPerformanceSummary(userId, days = 30) {
    const queryText = `
      SELECT 
        metric_type,
        performance_category,
        COUNT(*) as total_records,
        AVG(metric_value) as avg_score,
        MIN(metric_value) as min_score,
        MAX(metric_value) as max_score,
        STDDEV(metric_value) as score_stddev,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY metric_value) as median_score,
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY metric_value) as q1_score,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY metric_value) as q3_score,
        MAX(recorded_at) as last_recorded
      FROM performance 
      WHERE user_id = $1 
      AND recorded_at >= CURRENT_TIMESTAMP - INTERVAL '${days} days'
      GROUP BY metric_type, performance_category
      ORDER BY metric_type, performance_category
    `;

    const result = await query(queryText, [userId]);
    return result.rows;
  }

  // Get performance trends over time
  static async getPerformanceTrends(userId, metricType, days = 30) {
    const queryText = `
      SELECT 
        DATE(recorded_at) as date,
        AVG(metric_value) as avg_score,
        COUNT(*) as record_count,
        MIN(metric_value) as min_score,
        MAX(metric_value) as max_score
      FROM performance 
      WHERE user_id = $1 
      AND metric_type = $2
      AND recorded_at >= CURRENT_TIMESTAMP - INTERVAL '${days} days'
      GROUP BY DATE(recorded_at)
      ORDER BY date ASC
    `;

    const result = await query(queryText, [userId, metricType]);
    return result.rows;
  }

  // Get performance comparison between sessions
  static async getSessionComparison(userId, sessionIds) {
    if (!sessionIds || sessionIds.length === 0) {
      return [];
    }

    const placeholders = sessionIds.map((_, index) => `$${index + 2}`).join(',');
    const queryText = `
      SELECT 
        session_id,
        metric_type,
        performance_category,
        AVG(metric_value) as avg_score,
        COUNT(*) as record_count,
        MIN(metric_value) as min_score,
        MAX(metric_value) as max_score
      FROM performance 
      WHERE user_id = $1 
      AND session_id IN (${placeholders})
      GROUP BY session_id, metric_type, performance_category
      ORDER BY session_id, metric_type, performance_category
    `;

    const result = await query(queryText, [userId, ...sessionIds]);
    return result.rows;
  }

  // Get performance insights and recommendations
  static async getPerformanceInsights(userId, days = 30) {
    const queryText = `
      WITH performance_stats AS (
        SELECT 
          metric_type,
          performance_category,
          AVG(metric_value) as avg_score,
          COUNT(*) as record_count,
          STDDEV(metric_value) as score_stddev
        FROM performance 
        WHERE user_id = $1 
        AND recorded_at >= CURRENT_TIMESTAMP - INTERVAL '${days} days'
        GROUP BY metric_type, performance_category
      ),
      recent_performance AS (
        SELECT 
          metric_type,
          performance_category,
          AVG(metric_value) as recent_avg_score
        FROM performance 
        WHERE user_id = $1 
        AND recorded_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
        GROUP BY metric_type, performance_category
      )
      SELECT 
        ps.metric_type,
        ps.performance_category,
        ps.avg_score,
        ps.record_count,
        ps.score_stddev,
        rp.recent_avg_score,
        CASE 
          WHEN rp.recent_avg_score > ps.avg_score THEN 'improving'
          WHEN rp.recent_avg_score < ps.avg_score THEN 'declining'
          ELSE 'stable'
        END as trend
      FROM performance_stats ps
      LEFT JOIN recent_performance rp ON ps.metric_type = rp.metric_type 
        AND ps.performance_category = rp.performance_category
      ORDER BY ps.avg_score DESC
    `;

    const result = await query(queryText, [userId]);
    return result.rows;
  }

  // Get performance leaderboard (top performers)
  static async getPerformanceLeaderboard(metricType, limit = 10) {
    const queryText = `
      SELECT 
        u.username,
        u.first_name,
        u.last_name,
        AVG(p.metric_value) as avg_score,
        COUNT(*) as total_records,
        MAX(p.recorded_at) as last_activity
      FROM performance p
      JOIN users u ON p.user_id = u.id
      WHERE p.metric_type = $1
      AND p.recorded_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
      GROUP BY u.id, u.username, u.first_name, u.last_name
      HAVING COUNT(*) >= 5
      ORDER BY avg_score DESC
      LIMIT $2
    `;

    const result = await query(queryText, [metricType, limit]);
    return result.rows;
  }

  // Update performance record
  async update(updateData) {
    const allowedFields = [
      'metric_value',
      'metric_max_value',
      'metric_unit',
      'performance_category',
      'feedback_notes',
      'improvement_suggestions'
    ];

    const updates = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(this.id);
    const queryText = `
      UPDATE performance 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await query(queryText, values);
    return new Performance(result.rows[0]);
  }

  // Delete performance record
  async delete() {
    const queryText = 'DELETE FROM performance WHERE id = $1';
    await query(queryText, [this.id]);
    return true;
  }

  // Get performance with related data
  async getWithRelatedData() {
    const queryText = `
      SELECT 
        p.*,
        u.username,
        u.first_name,
        u.last_name,
        s.session_name,
        s.session_type,
        c.question_text,
        c.question_category
      FROM performance p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN sessions s ON p.session_id = s.id
      LEFT JOIN conversations c ON p.conversation_id = c.id
      WHERE p.id = $1
    `;

    const result = await query(queryText, [this.id]);
    return result.rows[0];
  }

  // Convert to JSON
  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      session_id: this.session_id,
      conversation_id: this.conversation_id,
      metric_type: this.metric_type,
      metric_value: this.metric_value,
      metric_max_value: this.metric_max_value,
      metric_unit: this.metric_unit,
      performance_category: this.performance_category,
      feedback_notes: this.feedback_notes,
      improvement_suggestions: this.improvement_suggestions,
      recorded_at: this.recorded_at,
      created_at: this.created_at
    };
  }
}
