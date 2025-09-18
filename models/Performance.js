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

  // Get AI insights for a specific session
  static async getSessionInsights(userId, sessionId) {
    try {
      // Get session performance data
      const sessionData = await this.getSessionPerformanceData(userId, sessionId);
      
      // Get conversation data for the session
      const conversationData = await this.getSessionConversationData(sessionId);
      
      // Generate AI insights using Ollama
      const insights = await this.generateAIInsights(sessionData, conversationData);
      
      return insights;
    } catch (error) {
      console.error('Error generating session insights:', error);
      // Return fallback insights if AI generation fails
      return this.getFallbackSessionInsights(userId, sessionId);
    }
  }

  // Get session performance data
  static async getSessionPerformanceData(userId, sessionId) {
    const queryText = `
      SELECT 
        metric_type,
        performance_category,
        AVG(metric_value) as avg_score,
        COUNT(*) as record_count,
        MIN(metric_value) as min_score,
        MAX(metric_value) as max_score,
        STDDEV(metric_value) as score_stddev,
        STRING_AGG(DISTINCT feedback_notes, '; ') as feedback_summary,
        STRING_AGG(DISTINCT improvement_suggestions, '; ') as suggestions_summary
      FROM performance 
      WHERE user_id = $1 AND session_id = $2
      GROUP BY metric_type, performance_category
      ORDER BY avg_score DESC
    `;

    const result = await query(queryText, [userId, sessionId]);
    return result.rows;
  }

  // Get session conversation data
  static async getSessionConversationData(sessionId) {
    const queryText = `
      SELECT 
        question_number,
        question_text,
        question_category,
        question_difficulty,
        llm_generated_answer,
        user_answer,
        time_taken_seconds,
        llm_feedback,
        confidence_score,
        answer_timestamp
      FROM conversations 
      WHERE session_id = $1
      ORDER BY question_number ASC
    `;

    const result = await query(queryText, [sessionId]);
    return result.rows;
  }

  // Generate AI insights using Ollama
  static async generateAIInsights(sessionData, conversationData) {
    try {
      // Build context for AI analysis
      const context = this.buildInsightContext(sessionData, conversationData);
      
      // Generate insights using Ollama
      const prompt = this.buildInsightPrompt(context);
      
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
      const aiResponse = data.response.trim();
      
      // Parse AI response into structured insights
      return this.parseAIInsights(aiResponse, sessionData, conversationData);
    } catch (error) {
      console.error('AI insight generation failed:', error);
      throw error;
    }
  }

  // Build context for AI analysis
  static buildInsightContext(sessionData, conversationData) {
    const performanceSummary = sessionData.map(item => ({
      metric: item.metric_type,
      category: item.performance_category,
      avgScore: item.avg_score,
      recordCount: item.record_count,
      minScore: item.min_score,
      maxScore: item.max_score,
      stdDev: item.score_stddev
    }));

    const conversationSummary = conversationData.map(item => ({
      questionNumber: item.question_number,
      category: item.question_category,
      difficulty: item.question_difficulty,
      confidenceScore: item.confidence_score,
      timeTaken: item.time_taken_seconds,
      hasAnswer: !!item.user_answer,
      feedback: item.llm_feedback
    }));

    return {
      performanceSummary,
      conversationSummary,
      totalQuestions: conversationData.length,
      answeredQuestions: conversationData.filter(c => c.user_answer).length,
      avgConfidence: conversationData.reduce((sum, c) => sum + (c.confidence_score || 0), 0) / conversationData.length,
      avgTimePerQuestion: conversationData.reduce((sum, c) => sum + (c.time_taken_seconds || 0), 0) / conversationData.length
    };
  }

  // Build AI prompt for insights
  static buildInsightPrompt(context) {
    return `Analyze the following interview session performance data and provide comprehensive AI insights:

SESSION PERFORMANCE DATA:
${JSON.stringify(context.performanceSummary, null, 2)}

CONVERSATION DATA:
${JSON.stringify(context.conversationSummary, null, 2)}

SESSION STATISTICS:
- Total Questions: ${context.totalQuestions}
- Answered Questions: ${context.answeredQuestions}
- Average Confidence Score: ${context.avgConfidence.toFixed(2)}
- Average Time per Question: ${context.avgTimePerQuestion.toFixed(1)} seconds

Please provide a comprehensive analysis in the following JSON format:
{
  "overall_assessment": "Overall performance assessment",
  "strengths": ["List of strengths"],
  "weaknesses": ["List of areas needing improvement"],
  "recommendations": ["Specific actionable recommendations"],
  "improvement_areas": [
    {
      "area": "Area name",
      "current_score": 0.75,
      "target_score": 0.85,
      "priority": "high|medium|low",
      "action_plan": "Specific steps to improve"
    }
  ],
  "next_steps": ["Immediate next steps"],
  "learning_path": "Suggested learning path",
  "confidence_analysis": "Analysis of confidence patterns",
  "time_management": "Analysis of time management",
  "communication_skills": "Analysis of communication effectiveness"
}

Focus on providing actionable, specific insights that will help improve interview performance.`;
  }

  // Parse AI response into structured insights
  static parseAIInsights(aiResponse, sessionData, conversationData) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedInsights = JSON.parse(jsonMatch[0]);
        return {
          ...parsedInsights,
          session_metadata: {
            total_questions: conversationData.length,
            answered_questions: conversationData.filter(c => c.user_answer).length,
            avg_confidence: conversationData.reduce((sum, c) => sum + (c.confidence_score || 0), 0) / conversationData.length,
            avg_time_per_question: conversationData.reduce((sum, c) => sum + (c.time_taken_seconds || 0), 0) / conversationData.length,
            performance_metrics: sessionData.length
          },
          generated_at: new Date().toISOString(),
          ai_generated: true
        };
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error);
    }

    // Fallback to structured response
    return this.getFallbackSessionInsights(null, null, sessionData, conversationData);
  }

  // Fallback insights when AI generation fails
  static async getFallbackSessionInsights(userId, sessionId, sessionData = null, conversationData = null) {
    if (!sessionData || !conversationData) {
      sessionData = await this.getSessionPerformanceData(userId, sessionId);
      conversationData = await this.getSessionConversationData(sessionId);
    }

    const avgConfidence = conversationData.reduce((sum, c) => sum + (c.confidence_score || 0), 0) / conversationData.length;
    const answeredQuestions = conversationData.filter(c => c.user_answer).length;
    const avgTimePerQuestion = conversationData.reduce((sum, c) => sum + (c.time_taken_seconds || 0), 0) / conversationData.length;

    // Analyze performance patterns
    const strengths = [];
    const weaknesses = [];
    const recommendations = [];

    // Analyze by confidence score
    if (avgConfidence > 0.7) {
      strengths.push("Good overall confidence in answers");
    } else if (avgConfidence < 0.5) {
      weaknesses.push("Low confidence in answers");
      recommendations.push("Practice more to build confidence");
    }

    // Analyze by completion rate
    const completionRate = answeredQuestions / conversationData.length;
    if (completionRate > 0.8) {
      strengths.push("High question completion rate");
    } else if (completionRate < 0.6) {
      weaknesses.push("Low question completion rate");
      recommendations.push("Focus on providing complete answers");
    }

    // Analyze by time management
    if (avgTimePerQuestion < 60) {
      strengths.push("Good time management");
    } else if (avgTimePerQuestion > 120) {
      weaknesses.push("Slow response time");
      recommendations.push("Practice time management techniques");
    }

    // Analyze by category
    const categoryPerformance = {};
    conversationData.forEach(c => {
      if (!categoryPerformance[c.question_category]) {
        categoryPerformance[c.question_category] = [];
      }
      categoryPerformance[c.question_category].push(c.confidence_score || 0);
    });

    Object.entries(categoryPerformance).forEach(([category, scores]) => {
      const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      if (avgScore > 0.7) {
        strengths.push(`Strong performance in ${category}`);
      } else if (avgScore < 0.5) {
        weaknesses.push(`Needs improvement in ${category}`);
        recommendations.push(`Focus on ${category} practice`);
      }
    });

    return {
      overall_assessment: avgConfidence > 0.7 ? "Good performance with room for improvement" : "Performance needs improvement",
      strengths: strengths.length > 0 ? strengths : ["Consistent effort in practice"],
      weaknesses: weaknesses.length > 0 ? weaknesses : ["Continue practicing to identify specific areas"],
      recommendations: recommendations.length > 0 ? recommendations : ["Continue regular practice sessions"],
      improvement_areas: [
        {
          area: "Overall Confidence",
          current_score: avgConfidence,
          target_score: Math.min(0.9, avgConfidence + 0.2),
          priority: avgConfidence < 0.6 ? "high" : "medium",
          action_plan: "Practice more interview questions to build confidence"
        }
      ],
      next_steps: [
        "Review questions with low confidence scores",
        "Practice time management",
        "Focus on identified weak areas"
      ],
      learning_path: "Continue structured practice with focus on identified improvement areas",
      confidence_analysis: `Average confidence score of ${avgConfidence.toFixed(2)} across ${conversationData.length} questions`,
      time_management: `Average ${avgTimePerQuestion.toFixed(1)} seconds per question`,
      communication_skills: "Continue practicing clear and concise communication",
      session_metadata: {
        total_questions: conversationData.length,
        answered_questions: answeredQuestions,
        avg_confidence: avgConfidence,
        avg_time_per_question: avgTimePerQuestion,
        performance_metrics: sessionData.length
      },
      generated_at: new Date().toISOString(),
      ai_generated: false
    };
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
