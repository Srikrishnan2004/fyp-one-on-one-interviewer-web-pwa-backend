import express from 'express';
import { query, transaction } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// =============================================================================
// PROBLEM CATEGORIES API ENDPOINTS
// =============================================================================

// GET /api/problems/categories - Get all problem categories
router.get('/categories', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        c.*,
        p.name as parent_name,
        COUNT(ps.id) as problem_count
      FROM problem_categories c
      LEFT JOIN problem_categories p ON c.parent_category_id = p.id
      LEFT JOIN problem_statements ps ON c.id = ps.category_id AND ps.is_active = true
      GROUP BY c.id, p.name
      ORDER BY c.name
    `);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
});

// GET /api/problems/categories/:id - Get category by ID
router.get('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT 
        c.*,
        p.name as parent_name
      FROM problem_categories c
      LEFT JOIN problem_categories p ON c.parent_category_id = p.id
      WHERE c.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category',
      error: error.message
    });
  }
});

// POST /api/problems/categories - Create new category
router.post('/categories', authenticateToken, async (req, res) => {
  try {
    const { name, description, parent_category_id } = req.body;
    
    const result = await query(`
      INSERT INTO problem_categories (name, description, parent_category_id) 
      VALUES ($1, $2, $3) 
      RETURNING *
    `, [name, description, parent_category_id]);
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Category created successfully'
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create category',
      error: error.message
    });
  }
});

// PUT /api/problems/categories/:id - Update category
router.put('/categories/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, parent_category_id } = req.body;
    
    const result = await query(`
      UPDATE problem_categories 
      SET name = $2, description = $3, parent_category_id = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 
      RETURNING *
    `, [id, name, description, parent_category_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Category updated successfully'
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update category',
      error: error.message
    });
  }
});

// DELETE /api/problems/categories/:id - Delete category
router.delete('/categories/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      UPDATE problem_categories 
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete category',
      error: error.message
    });
  }
});

// =============================================================================
// PROBLEM STATEMENTS API ENDPOINTS
// =============================================================================

// GET /api/problems - Get all problems with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      difficulty, 
      category_id, 
      search, 
      tags,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;
    
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE ps.is_active = true';
    const params = [];
    let paramCount = 0;
    
    if (difficulty) {
      paramCount++;
      whereClause += ` AND ps.difficulty = $${paramCount}`;
      params.push(difficulty);
    }
    
    if (category_id) {
      paramCount++;
      whereClause += ` AND ps.category_id = $${paramCount}`;
      params.push(category_id);
    }
    
    if (search) {
      paramCount++;
      whereClause += ` AND (ps.title ILIKE $${paramCount} OR ps.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      paramCount++;
      whereClause += ` AND ps.tags && $${paramCount}`;
      params.push(tagArray);
    }
    
    const validSortColumns = ['created_at', 'title', 'difficulty', 'points'];
    const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    params.push(limit, offset);
    
    const result = await query(`
      SELECT 
        ps.*,
        pc.name as category_name,
        dl.color_code as difficulty_color,
        u.username as created_by_username
      FROM problem_statements ps
      LEFT JOIN problem_categories pc ON ps.category_id = pc.id
      LEFT JOIN difficulty_levels dl ON ps.difficulty = dl.level_name
      LEFT JOIN users u ON ps.created_by = u.id
      ${whereClause}
      ORDER BY ps.${sortColumn} ${sortDirection}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, params);
    
    // Get total count for pagination
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM problem_statements ps
      ${whereClause}
    `, params.slice(0, paramCount));
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(countResult.rows[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching problems:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch problems',
      error: error.message
    });
  }
});

// GET /api/problems/random - Get random problems for practice
router.get('/random', async (req, res) => {
  try {
    const { limit = 5, difficulty, category_id } = req.query;
    
    let whereClause = 'WHERE ps.is_active = true AND ps.is_public = true';
    const params = [];
    let paramCount = 0;
    
    if (difficulty) {
      paramCount++;
      whereClause += ` AND ps.difficulty = $${paramCount}`;
      params.push(difficulty);
    }
    
    if (category_id) {
      paramCount++;
      whereClause += ` AND ps.category_id = $${paramCount}`;
      params.push(category_id);
    }
    
    params.push(limit);
    
    const result = await query(`
      SELECT 
        ps.*,
        pc.name as category_name,
        dl.color_code as difficulty_color
      FROM problem_statements ps
      LEFT JOIN problem_categories pc ON ps.category_id = pc.id
      LEFT JOIN difficulty_levels dl ON ps.difficulty = dl.level_name
      ${whereClause}
      ORDER BY RANDOM()
      LIMIT $${paramCount + 1}
    `, params);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching random problems:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch random problems',
      error: error.message
    });
  }
});

// GET /api/problems/:id - Get problem by ID with full details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      SELECT 
        ps.*,
        pc.name as category_name,
        dl.color_code as difficulty_color,
        u.username as created_by_username
      FROM problem_statements ps
      LEFT JOIN problem_categories pc ON ps.category_id = pc.id
      LEFT JOIN difficulty_levels dl ON ps.difficulty = dl.level_name
      LEFT JOIN users u ON ps.created_by = u.id
      WHERE ps.id = $1 AND ps.is_active = true
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching problem:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch problem',
      error: error.message
    });
  }
});

// POST /api/problems - Create new problem
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      title, description, difficulty, category_id, problem_statement,
      input_format, output_format, constraints, examples,
      expected_time_complexity, expected_space_complexity,
      tags, source, source_url, problem_number,
      points, time_limit_seconds, memory_limit_mb,
      is_active, is_public
    } = req.body;
    
    const result = await query(`
      INSERT INTO problem_statements (
        title, description, difficulty, category_id, problem_statement, 
        input_format, output_format, constraints, examples, expected_time_complexity, 
        expected_space_complexity, tags, source, source_url, problem_number, 
        points, time_limit_seconds, memory_limit_mb, is_active, is_public, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      ) RETURNING *
    `, [
      title, description, difficulty, category_id, problem_statement,
      input_format, output_format, constraints, examples,
      expected_time_complexity, expected_space_complexity,
      tags, source, source_url, problem_number,
      points, time_limit_seconds, memory_limit_mb,
      is_active !== undefined ? is_active : true,
      is_public !== undefined ? is_public : true,
      req.user.id
    ]);
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Problem created successfully'
    });
  } catch (error) {
    console.error('Error creating problem:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create problem',
      error: error.message
    });
  }
});

// PUT /api/problems/:id - Update problem
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title, description, difficulty, category_id, problem_statement,
      input_format, output_format, constraints, examples,
      expected_time_complexity, expected_space_complexity,
      tags, source, source_url, problem_number,
      points, time_limit_seconds, memory_limit_mb,
      is_active, is_public
    } = req.body;
    
    const result = await query(`
      UPDATE problem_statements 
      SET 
        title = $2, description = $3, difficulty = $4, category_id = $5,
        problem_statement = $6, input_format = $7, output_format = $8,
        constraints = $9, examples = $10, expected_time_complexity = $11,
        expected_space_complexity = $12, tags = $13, source = $14,
        source_url = $15, problem_number = $16, points = $17,
        time_limit_seconds = $18, memory_limit_mb = $19,
        is_active = $20, is_public = $21, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 
      RETURNING *
    `, [
      id, title, description, difficulty, category_id, problem_statement,
      input_format, output_format, constraints, examples,
      expected_time_complexity, expected_space_complexity,
      tags, source, source_url, problem_number,
      points, time_limit_seconds, memory_limit_mb,
      is_active, is_public
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Problem updated successfully'
    });
  } catch (error) {
    console.error('Error updating problem:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update problem',
      error: error.message
    });
  }
});

// DELETE /api/problems/:id - Soft delete problem
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      UPDATE problem_statements 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Problem deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting problem:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete problem',
      error: error.message
    });
  }
});

// =============================================================================
// TEST CASES API ENDPOINTS
// =============================================================================

// GET /api/problems/:id/test-cases - Get test cases for a problem
router.get('/:id/test-cases', async (req, res) => {
  try {
    const { id } = req.params;
    const { visible_only = false } = req.query;
    
    let whereClause = 'WHERE tc.problem_id = $1';
    const params = [id];
    
    if (visible_only === 'true') {
      whereClause += ' AND tc.is_visible = true';
    }
    
    const result = await query(`
      SELECT * FROM test_cases tc
      ${whereClause}
      ORDER BY tc.test_case_number
    `, params);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching test cases:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test cases',
      error: error.message
    });
  }
});

// POST /api/problems/:id/test-cases - Create new test case
router.post('/:id/test-cases', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      test_case_number, test_case_type, input_data,
      expected_output, explanation, is_visible, execution_order
    } = req.body;
    
    // If test_case_number not provided, get next number
    let caseNumber = test_case_number;
    if (!caseNumber) {
      const nextNumberResult = await query(`
        SELECT COALESCE(MAX(test_case_number), 0) + 1 as next_number
        FROM test_cases
        WHERE problem_id = $1
      `, [id]);
      caseNumber = nextNumberResult.rows[0].next_number;
    }
    
    const result = await query(`
      INSERT INTO test_cases (
        problem_id, test_case_number, test_case_type, input_data, 
        expected_output, explanation, is_visible, execution_order
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8
      ) RETURNING *
    `, [
      id, caseNumber, test_case_type, input_data,
      expected_output, explanation, is_visible !== undefined ? is_visible : true,
      execution_order || 0
    ]);
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Test case created successfully'
    });
  } catch (error) {
    console.error('Error creating test case:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create test case',
      error: error.message
    });
  }
});

// PUT /api/problems/test-cases/:testCaseId - Update test case
router.put('/test-cases/:testCaseId', authenticateToken, async (req, res) => {
  try {
    const { testCaseId } = req.params;
    const {
      test_case_number, test_case_type, input_data,
      expected_output, explanation, is_visible, execution_order
    } = req.body;
    
    const result = await query(`
      UPDATE test_cases 
      SET 
        test_case_number = $2, test_case_type = $3, input_data = $4,
        expected_output = $5, explanation = $6, is_visible = $7,
        execution_order = $8, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 
      RETURNING *
    `, [
      testCaseId, test_case_number, test_case_type, input_data,
      expected_output, explanation, is_visible, execution_order
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Test case not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Test case updated successfully'
    });
  } catch (error) {
    console.error('Error updating test case:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update test case',
      error: error.message
    });
  }
});

// DELETE /api/problems/test-cases/:testCaseId - Delete test case
router.delete('/test-cases/:testCaseId', authenticateToken, async (req, res) => {
  try {
    const { testCaseId } = req.params;
    
    const result = await query(`
      DELETE FROM test_cases WHERE id = $1
    `, [testCaseId]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Test case not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Test case deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting test case:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete test case',
      error: error.message
    });
  }
});

// =============================================================================
// PROBLEM SOLUTIONS API ENDPOINTS
// =============================================================================

// GET /api/problems/:id/solutions - Get solutions for a problem
router.get('/:id/solutions', async (req, res) => {
  try {
    const { id } = req.params;
    const { language, official_only = false } = req.query;
    
    let whereClause = 'WHERE ps.problem_id = $1';
    const params = [id];
    
    if (official_only === 'true') {
      whereClause += ' AND ps.is_official = true';
    }
    
    if (language) {
      params.push(language);
      whereClause += ` AND ps.programming_language = $${params.length}`;
    }
    
    const result = await query(`
      SELECT * FROM problem_solutions ps
      ${whereClause}
      ORDER BY ps.is_official DESC, ps.difficulty_rating ASC
    `, params);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching solutions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch solutions',
      error: error.message
    });
  }
});

// POST /api/problems/:id/solutions - Create new solution
router.post('/:id/solutions', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      solution_type, solution_code, programming_language,
      time_complexity, space_complexity, explanation,
      approach_description, is_official, difficulty_rating
    } = req.body;
    
    const result = await query(`
      INSERT INTO problem_solutions (
        problem_id, solution_type, solution_code, programming_language,
        time_complexity, space_complexity, explanation, approach_description,
        is_official, difficulty_rating
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      ) RETURNING *
    `, [
      id, solution_type, solution_code, programming_language,
      time_complexity, space_complexity, explanation,
      approach_description, is_official !== undefined ? is_official : false,
      difficulty_rating
    ]);
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Solution created successfully'
    });
  } catch (error) {
    console.error('Error creating solution:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create solution',
      error: error.message
    });
  }
});

// PUT /api/problems/solutions/:solutionId - Update solution
router.put('/solutions/:solutionId', authenticateToken, async (req, res) => {
  try {
    const { solutionId } = req.params;
    const {
      solution_type, solution_code, programming_language,
      time_complexity, space_complexity, explanation,
      approach_description, is_official, difficulty_rating
    } = req.body;
    
    const result = await query(`
      UPDATE problem_solutions 
      SET 
        solution_type = $2, solution_code = $3, programming_language = $4,
        time_complexity = $5, space_complexity = $6, explanation = $7,
        approach_description = $8, is_official = $9, difficulty_rating = $10,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 
      RETURNING *
    `, [
      solutionId, solution_type, solution_code, programming_language,
      time_complexity, space_complexity, explanation,
      approach_description, is_official, difficulty_rating
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Solution not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Solution updated successfully'
    });
  } catch (error) {
    console.error('Error updating solution:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update solution',
      error: error.message
    });
  }
});

// DELETE /api/problems/solutions/:solutionId - Delete solution
router.delete('/solutions/:solutionId', authenticateToken, async (req, res) => {
  try {
    const { solutionId } = req.params;
    
    const result = await query(`
      DELETE FROM problem_solutions WHERE id = $1
    `, [solutionId]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Solution not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Solution deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting solution:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete solution',
      error: error.message
    });
  }
});

// =============================================================================
// USER PROBLEM ATTEMPTS API ENDPOINTS
// =============================================================================

// GET /api/problems/attempts - Get user's attempts with pagination
router.get('/attempts', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, problem_id } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE upa.user_id = $1';
    const params = [req.user.id];
    
    if (status) {
      params.push(status);
      whereClause += ` AND upa.submission_status = $${params.length}`;
    }
    
    if (problem_id) {
      params.push(problem_id);
      whereClause += ` AND upa.problem_id = $${params.length}`;
    }
    
    params.push(limit, offset);
    
    const result = await query(`
      SELECT 
        upa.*,
        ps.title as problem_title,
        ps.difficulty as problem_difficulty,
        pc.name as category_name
      FROM user_problem_attempts upa
      JOIN problem_statements ps ON upa.problem_id = ps.id
      LEFT JOIN problem_categories pc ON ps.category_id = pc.id
      ${whereClause}
      ORDER BY upa.submitted_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);
    
    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM user_problem_attempts upa
      ${whereClause}
    `, params.slice(0, params.length - 2));
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(countResult.rows[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching attempts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attempts',
      error: error.message
    });
  }
});

// GET /api/problems/:id/attempts - Get user's attempts for specific problem
router.get('/:id/attempts', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      SELECT 
        upa.*,
        ps.title as problem_title,
        ps.difficulty as problem_difficulty
      FROM user_problem_attempts upa
      JOIN problem_statements ps ON upa.problem_id = ps.id
      WHERE upa.user_id = $1 AND upa.problem_id = $2
      ORDER BY upa.submitted_at DESC
    `, [req.user.id, id]);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching problem attempts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch problem attempts',
      error: error.message
    });
  }
});

// POST /api/problems/:id/attempts - Submit code attempt
router.post('/:id/attempts', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      submitted_code, programming_language, session_id
    } = req.body;
    
    // Create attempt record
    const result = await query(`
      INSERT INTO user_problem_attempts (
        user_id, problem_id, session_id, submitted_code, programming_language,
        submission_status
      ) VALUES (
        $1, $2, $3, $4, $5, 'pending'
      ) RETURNING *
    `, [
      req.user.id, id, session_id, submitted_code, programming_language
    ]);
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Code submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit code',
      error: error.message
    });
  }
});

// PUT /api/problems/attempts/:attemptId - Update attempt results
router.put('/attempts/:attemptId', authenticateToken, async (req, res) => {
  try {
    const { attemptId } = req.params;
    const {
      submission_status, execution_time_ms, memory_used_mb,
      test_cases_passed, total_test_cases, score,
      feedback, error_message
    } = req.body;
    
    const result = await query(`
      UPDATE user_problem_attempts 
      SET 
        submission_status = $2, execution_time_ms = $3, memory_used_mb = $4,
        test_cases_passed = $5, total_test_cases = $6, score = $7,
        feedback = $8, error_message = $9, completed_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $10
      RETURNING *
    `, [
      attemptId, submission_status, execution_time_ms, memory_used_mb,
      test_cases_passed, total_test_cases, score,
      feedback, error_message, req.user.id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Attempt updated successfully'
    });
  } catch (error) {
    console.error('Error updating attempt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update attempt',
      error: error.message
    });
  }
});

// =============================================================================
// ANALYTICS AND REPORTING API ENDPOINTS
// =============================================================================

// GET /api/problems/analytics/stats - Get problem statistics
router.get('/analytics/stats', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        COUNT(*) as total_problems,
        COUNT(CASE WHEN difficulty = 'easy' THEN 1 END) as easy_count,
        COUNT(CASE WHEN difficulty = 'medium' THEN 1 END) as medium_count,
        COUNT(CASE WHEN difficulty = 'hard' THEN 1 END) as hard_count,
        COUNT(CASE WHEN difficulty = 'expert' THEN 1 END) as expert_count
      FROM problem_statements 
      WHERE is_active = true
    `);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching problem stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch problem statistics',
      error: error.message
    });
  }
});

// GET /api/problems/analytics/popular - Get most popular problems
router.get('/analytics/popular', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const result = await query(`
      SELECT 
        ps.title,
        ps.difficulty,
        COUNT(upa.id) as attempt_count,
        COUNT(CASE WHEN upa.submission_status = 'accepted' THEN 1 END) as success_count,
        ROUND(COUNT(CASE WHEN upa.submission_status = 'accepted' THEN 1 END) * 100.0 / NULLIF(COUNT(upa.id), 0), 2) as success_rate
      FROM problem_statements ps
      LEFT JOIN user_problem_attempts upa ON ps.id = upa.problem_id
      WHERE ps.is_active = true
      GROUP BY ps.id, ps.title, ps.difficulty
      ORDER BY attempt_count DESC
      LIMIT $1
    `, [limit]);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching popular problems:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch popular problems',
      error: error.message
    });
  }
});

// GET /api/problems/analytics/categories - Get category statistics
router.get('/analytics/categories', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        pc.name as category_name,
        COUNT(ps.id) as problem_count,
        COUNT(upa.id) as total_attempts,
        ROUND(AVG(upa.score), 2) as average_score
      FROM problem_categories pc
      LEFT JOIN problem_statements ps ON pc.id = ps.category_id AND ps.is_active = true
      LEFT JOIN user_problem_attempts upa ON ps.id = upa.problem_id
      GROUP BY pc.id, pc.name
      ORDER BY problem_count DESC
    `);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching category stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category statistics',
      error: error.message
    });
  }
});

// GET /api/problems/analytics/user-performance - Get user performance stats
router.get('/analytics/user-performance', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        COUNT(upa.id) as total_attempts,
        COUNT(CASE WHEN upa.submission_status = 'accepted' THEN 1 END) as accepted_count,
        ROUND(AVG(upa.score), 2) as average_score,
        ROUND(AVG(upa.execution_time_ms), 2) as average_execution_time,
        COUNT(DISTINCT upa.problem_id) as problems_attempted
      FROM user_problem_attempts upa
      WHERE upa.user_id = $1
    `, [req.user.id]);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching user performance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user performance',
      error: error.message
    });
  }
});

// =============================================================================
// SUPPORTING DATA API ENDPOINTS
// =============================================================================

// GET /api/problems/difficulty-levels - Get all difficulty levels
router.get('/difficulty-levels', async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM difficulty_levels ORDER BY level_order
    `);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching difficulty levels:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch difficulty levels',
      error: error.message
    });
  }
});

// GET /api/problems/programming-languages - Get all programming languages
router.get('/programming-languages', async (req, res) => {
  try {
    const { active_only = true } = req.query;
    
    let whereClause = '';
    if (active_only === 'true') {
      whereClause = 'WHERE is_active = true';
    }
    
    const result = await query(`
      SELECT * FROM programming_languages 
      ${whereClause}
      ORDER BY language_name
    `);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching programming languages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch programming languages',
      error: error.message
    });
  }
});

export default router;
