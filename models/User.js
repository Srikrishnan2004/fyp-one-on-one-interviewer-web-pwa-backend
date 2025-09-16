import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';

export class User {
  constructor(data) {
    this.id = data.id;
    this.username = data.username;
    this.email = data.email;
    this.password_hash = data.password_hash;
    this.first_name = data.first_name;
    this.last_name = data.last_name;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.is_active = data.is_active;
    this.last_login = data.last_login;
  }

  // Create a new user
  static async create(userData) {
    const { username, email, password, first_name, last_name } = userData;
    
    // Hash the password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);
    
    const queryText = `
      INSERT INTO users (username, email, password_hash, first_name, last_name)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [username, email, password_hash, first_name, last_name];
    const result = await query(queryText, values);
    
    return new User(result.rows[0]);
  }

  // Find user by ID
  static async findById(id) {
    const queryText = 'SELECT * FROM users WHERE id = $1';
    const result = await query(queryText, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return new User(result.rows[0]);
  }

  // Find user by username
  static async findByUsername(username) {
    const queryText = 'SELECT * FROM users WHERE username = $1';
    const result = await query(queryText, [username]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return new User(result.rows[0]);
  }

  // Find user by email
  static async findByEmail(email) {
    const queryText = 'SELECT * FROM users WHERE email = $1';
    const result = await query(queryText, [email]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return new User(result.rows[0]);
  }

  // Verify password
  async verifyPassword(password) {
    return await bcrypt.compare(password, this.password_hash);
  }

  // Update user profile
  async update(updateData) {
    const allowedFields = ['first_name', 'last_name', 'email'];
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
      UPDATE users 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await query(queryText, values);
    return new User(result.rows[0]);
  }

  // Update password
  async updatePassword(newPassword) {
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(newPassword, saltRounds);
    
    const queryText = `
      UPDATE users 
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await query(queryText, [password_hash, this.id]);
    return new User(result.rows[0]);
  }

  // Update last login
  async updateLastLogin() {
    const queryText = `
      UPDATE users 
      SET last_login = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await query(queryText, [this.id]);
    return new User(result.rows[0]);
  }

  // Deactivate user account
  async deactivate() {
    const queryText = `
      UPDATE users 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await query(queryText, [this.id]);
    return new User(result.rows[0]);
  }

  // Get user's sessions
  async getSessions() {
    const queryText = `
      SELECT * FROM sessions 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `;
    
    const result = await query(queryText, [this.id]);
    return result.rows;
  }

  // Get user's performance summary
  async getPerformanceSummary() {
    const queryText = `
      SELECT 
        metric_type,
        AVG(metric_value) as avg_score,
        COUNT(*) as total_metrics,
        MAX(recorded_at) as last_recorded
      FROM performance 
      WHERE user_id = $1 
      GROUP BY metric_type
      ORDER BY metric_type
    `;
    
    const result = await query(queryText, [this.id]);
    return result.rows;
  }

  // Get user statistics
  async getStats() {
    const queryText = `
      SELECT 
        (SELECT COUNT(*) FROM sessions WHERE user_id = $1) as total_sessions,
        (SELECT COUNT(*) FROM sessions WHERE user_id = $1 AND status = 'completed') as completed_sessions,
        (SELECT COUNT(*) FROM conversations c 
         JOIN sessions s ON c.session_id = s.id 
         WHERE s.user_id = $1) as total_conversations,
        (SELECT AVG(duration_minutes) FROM sessions 
         WHERE user_id = $1 AND duration_minutes IS NOT NULL) as avg_session_duration
    `;
    
    const result = await query(queryText, [this.id]);
    return result.rows[0];
  }

  // Convert to JSON (exclude sensitive data)
  toJSON() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      first_name: this.first_name,
      last_name: this.last_name,
      created_at: this.created_at,
      updated_at: this.updated_at,
      is_active: this.is_active,
      last_login: this.last_login
    };
  }

  // Check if username exists
  static async usernameExists(username) {
    const queryText = 'SELECT id FROM users WHERE username = $1';
    const result = await query(queryText, [username]);
    return result.rows.length > 0;
  }

  // Check if email exists
  static async emailExists(email) {
    const queryText = 'SELECT id FROM users WHERE email = $1';
    const result = await query(queryText, [email]);
    return result.rows.length > 0;
  }
}
