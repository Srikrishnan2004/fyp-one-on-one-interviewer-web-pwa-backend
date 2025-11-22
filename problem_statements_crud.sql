-- CRUD Operations for Problem Statements Schema
-- This file contains all Create, Read, Update, Delete operations for the problem statements system

-- =============================================================================
-- PROBLEM CATEGORIES CRUD OPERATIONS
-- =============================================================================

-- CREATE: Insert new problem category
INSERT INTO problem_categories (name, description, parent_category_id) 
VALUES ($1, $2, $3) 
RETURNING *;

-- READ: Get all categories
SELECT * FROM problem_categories ORDER BY name;

-- READ: Get category by ID
SELECT * FROM problem_categories WHERE id = $1;

-- READ: Get categories with parent-child relationships
SELECT 
    c.*,
    p.name as parent_name
FROM problem_categories c
LEFT JOIN problem_categories p ON c.parent_category_id = p.id
ORDER BY c.name;

-- READ: Get categories with problem count
SELECT 
    c.*,
    COUNT(ps.id) as problem_count
FROM problem_categories c
LEFT JOIN problem_statements ps ON c.id = ps.category_id AND ps.is_active = true
GROUP BY c.id
ORDER BY c.name;

-- UPDATE: Update category
UPDATE problem_categories 
SET name = $2, description = $3, parent_category_id = $4, updated_at = CURRENT_TIMESTAMP
WHERE id = $1 
RETURNING *;

-- DELETE: Delete category (soft delete by setting inactive)
UPDATE problem_categories 
SET updated_at = CURRENT_TIMESTAMP
WHERE id = $1;

-- =============================================================================
-- PROBLEM STATEMENTS CRUD OPERATIONS
-- =============================================================================

-- CREATE: Insert new problem statement
INSERT INTO problem_statements (
    title, description, difficulty, category_id, problem_statement, 
    input_format, output_format, constraints, examples, expected_time_complexity, 
    expected_space_complexity, tags, source, source_url, problem_number, 
    points, time_limit_seconds, memory_limit_mb, is_active, is_public, created_by
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
) RETURNING *;

-- READ: Get all active problems with pagination
SELECT 
    ps.*,
    pc.name as category_name,
    dl.color_code as difficulty_color
FROM problem_statements ps
LEFT JOIN problem_categories pc ON ps.category_id = pc.id
LEFT JOIN difficulty_levels dl ON ps.difficulty = dl.level_name
WHERE ps.is_active = true
ORDER BY ps.created_at DESC
LIMIT $1 OFFSET $2;

-- READ: Get problem by ID with full details
SELECT 
    ps.*,
    pc.name as category_name,
    dl.color_code as difficulty_color,
    u.username as created_by_username
FROM problem_statements ps
LEFT JOIN problem_categories pc ON ps.category_id = pc.id
LEFT JOIN difficulty_levels dl ON ps.difficulty = dl.level_name
LEFT JOIN users u ON ps.created_by = u.id
WHERE ps.id = $1;

-- READ: Search problems by title, tags, or difficulty
SELECT 
    ps.*,
    pc.name as category_name,
    dl.color_code as difficulty_color
FROM problem_statements ps
LEFT JOIN problem_categories pc ON ps.category_id = pc.id
LEFT JOIN difficulty_levels dl ON ps.difficulty = dl.level_name
WHERE ps.is_active = true
  AND (
    ps.title ILIKE '%' || $1 || '%' OR
    ps.tags && $2 OR
    ps.difficulty = $3 OR
    pc.name ILIKE '%' || $4 || '%'
  )
ORDER BY ps.created_at DESC
LIMIT $5 OFFSET $6;

-- READ: Get problems by category
SELECT 
    ps.*,
    pc.name as category_name,
    dl.color_code as difficulty_color
FROM problem_statements ps
LEFT JOIN problem_categories pc ON ps.category_id = pc.id
LEFT JOIN difficulty_levels dl ON ps.difficulty = dl.level_name
WHERE ps.category_id = $1 AND ps.is_active = true
ORDER BY ps.created_at DESC;

-- READ: Get problems by difficulty
SELECT 
    ps.*,
    pc.name as category_name,
    dl.color_code as difficulty_color
FROM problem_statements ps
LEFT JOIN problem_categories pc ON ps.category_id = pc.id
LEFT JOIN difficulty_levels dl ON ps.difficulty = dl.level_name
WHERE ps.difficulty = $1 AND ps.is_active = true
ORDER BY ps.created_at DESC;

-- READ: Get random problems for practice
SELECT 
    ps.*,
    pc.name as category_name,
    dl.color_code as difficulty_color
FROM problem_statements ps
LEFT JOIN problem_categories pc ON ps.category_id = pc.id
LEFT JOIN difficulty_levels dl ON ps.difficulty = dl.level_name
WHERE ps.is_active = true AND ps.is_public = true
ORDER BY RANDOM()
LIMIT $1;

-- UPDATE: Update problem statement
UPDATE problem_statements 
SET 
    title = $2,
    description = $3,
    difficulty = $4,
    category_id = $5,
    problem_statement = $6,
    input_format = $7,
    output_format = $8,
    constraints = $9,
    examples = $10,
    expected_time_complexity = $11,
    expected_space_complexity = $12,
    tags = $13,
    source = $14,
    source_url = $15,
    problem_number = $16,
    points = $17,
    time_limit_seconds = $18,
    memory_limit_mb = $19,
    is_active = $20,
    is_public = $21,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1 
RETURNING *;

-- DELETE: Soft delete problem (set inactive)
UPDATE problem_statements 
SET is_active = false, updated_at = CURRENT_TIMESTAMP
WHERE id = $1;

-- =============================================================================
-- TEST CASES CRUD OPERATIONS
-- =============================================================================

-- CREATE: Insert new test case
INSERT INTO test_cases (
    problem_id, test_case_number, test_case_type, input_data, 
    expected_output, explanation, is_visible, execution_order
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
) RETURNING *;

-- READ: Get all test cases for a problem
SELECT * FROM test_cases 
WHERE problem_id = $1 
ORDER BY test_case_number;

-- READ: Get visible test cases for a problem (for users)
SELECT * FROM test_cases 
WHERE problem_id = $1 AND is_visible = true
ORDER BY test_case_number;

-- READ: Get hidden test cases for a problem (for validation)
SELECT * FROM test_cases 
WHERE problem_id = $1 AND test_case_type = 'hidden'
ORDER BY execution_order;

-- READ: Get test case by ID
SELECT * FROM test_cases WHERE id = $1;

-- UPDATE: Update test case
UPDATE test_cases 
SET 
    test_case_number = $2,
    test_case_type = $3,
    input_data = $4,
    expected_output = $5,
    explanation = $6,
    is_visible = $7,
    execution_order = $8,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1 
RETURNING *;

-- DELETE: Delete test case
DELETE FROM test_cases WHERE id = $1;

-- =============================================================================
-- PROBLEM SOLUTIONS CRUD OPERATIONS
-- =============================================================================

-- CREATE: Insert new solution
INSERT INTO problem_solutions (
    problem_id, solution_type, solution_code, programming_language,
    time_complexity, space_complexity, explanation, approach_description,
    is_official, difficulty_rating
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
) RETURNING *;

-- READ: Get all solutions for a problem
SELECT * FROM problem_solutions 
WHERE problem_id = $1 
ORDER BY is_official DESC, difficulty_rating ASC;

-- READ: Get official solutions for a problem
SELECT * FROM problem_solutions 
WHERE problem_id = $1 AND is_official = true
ORDER BY difficulty_rating ASC;

-- READ: Get solutions by programming language
SELECT * FROM problem_solutions 
WHERE problem_id = $1 AND programming_language = $2
ORDER BY is_official DESC, difficulty_rating ASC;

-- READ: Get solution by ID
SELECT * FROM problem_solutions WHERE id = $1;

-- UPDATE: Update solution
UPDATE problem_solutions 
SET 
    solution_type = $2,
    solution_code = $3,
    programming_language = $4,
    time_complexity = $5,
    space_complexity = $6,
    explanation = $7,
    approach_description = $8,
    is_official = $9,
    difficulty_rating = $10,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1 
RETURNING *;

-- DELETE: Delete solution
DELETE FROM problem_solutions WHERE id = $1;

-- =============================================================================
-- USER PROBLEM ATTEMPTS CRUD OPERATIONS
-- =============================================================================

-- CREATE: Insert new attempt
INSERT INTO user_problem_attempts (
    user_id, problem_id, session_id, submitted_code, programming_language,
    submission_status, execution_time_ms, memory_used_mb, test_cases_passed,
    total_test_cases, score, feedback, error_message, completed_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
) RETURNING *;

-- READ: Get user's attempts for a problem
SELECT 
    upa.*,
    ps.title as problem_title,
    ps.difficulty as problem_difficulty
FROM user_problem_attempts upa
JOIN problem_statements ps ON upa.problem_id = ps.id
WHERE upa.user_id = $1 AND upa.problem_id = $2
ORDER BY upa.submitted_at DESC;

-- READ: Get user's all attempts with pagination
SELECT 
    upa.*,
    ps.title as problem_title,
    ps.difficulty as problem_difficulty,
    pc.name as category_name
FROM user_problem_attempts upa
JOIN problem_statements ps ON upa.problem_id = ps.id
LEFT JOIN problem_categories pc ON ps.category_id = pc.id
WHERE upa.user_id = $1
ORDER BY upa.submitted_at DESC
LIMIT $2 OFFSET $3;

-- READ: Get user's attempts by status
SELECT 
    upa.*,
    ps.title as problem_title,
    ps.difficulty as problem_difficulty
FROM user_problem_attempts upa
JOIN problem_statements ps ON upa.problem_id = ps.id
WHERE upa.user_id = $1 AND upa.submission_status = $2
ORDER BY upa.submitted_at DESC;

-- READ: Get user's best attempt for each problem
SELECT DISTINCT ON (upa.problem_id)
    upa.*,
    ps.title as problem_title,
    ps.difficulty as problem_difficulty
FROM user_problem_attempts upa
JOIN problem_statements ps ON upa.problem_id = ps.id
WHERE upa.user_id = $1
ORDER BY upa.problem_id, upa.score DESC NULLS LAST, upa.submitted_at DESC;

-- READ: Get attempt by ID
SELECT 
    upa.*,
    ps.title as problem_title,
    ps.difficulty as problem_difficulty,
    u.username
FROM user_problem_attempts upa
JOIN problem_statements ps ON upa.problem_id = ps.id
JOIN users u ON upa.user_id = u.id
WHERE upa.id = $1;

-- UPDATE: Update attempt status and results
UPDATE user_problem_attempts 
SET 
    submission_status = $2,
    execution_time_ms = $3,
    memory_used_mb = $4,
    test_cases_passed = $5,
    total_test_cases = $6,
    score = $7,
    feedback = $8,
    error_message = $9,
    completed_at = CURRENT_TIMESTAMP
WHERE id = $1 
RETURNING *;

-- DELETE: Delete attempt (admin only)
DELETE FROM user_problem_attempts WHERE id = $1;

-- =============================================================================
-- DIFFICULTY LEVELS CRUD OPERATIONS
-- =============================================================================

-- CREATE: Insert new difficulty level
INSERT INTO difficulty_levels (level_name, level_order, description, color_code) 
VALUES ($1, $2, $3, $4) 
RETURNING *;

-- READ: Get all difficulty levels
SELECT * FROM difficulty_levels ORDER BY level_order;

-- READ: Get difficulty level by name
SELECT * FROM difficulty_levels WHERE level_name = $1;

-- UPDATE: Update difficulty level
UPDATE difficulty_levels 
SET level_name = $2, level_order = $3, description = $4, color_code = $5
WHERE id = $1 
RETURNING *;

-- DELETE: Delete difficulty level
DELETE FROM difficulty_levels WHERE id = $1;

-- =============================================================================
-- PROGRAMMING LANGUAGES CRUD OPERATIONS
-- =============================================================================

-- CREATE: Insert new programming language
INSERT INTO programming_languages (language_name, language_code, file_extension, execution_command, is_active) 
VALUES ($1, $2, $3, $4, $5) 
RETURNING *;

-- READ: Get all active programming languages
SELECT * FROM programming_languages WHERE is_active = true ORDER BY language_name;

-- READ: Get all programming languages
SELECT * FROM programming_languages ORDER BY language_name;

-- READ: Get programming language by code
SELECT * FROM programming_languages WHERE language_code = $1;

-- UPDATE: Update programming language
UPDATE programming_languages 
SET language_name = $2, language_code = $3, file_extension = $4, execution_command = $5, is_active = $6
WHERE id = $1 
RETURNING *;

-- DELETE: Soft delete programming language (set inactive)
UPDATE programming_languages 
SET is_active = false
WHERE id = $1;

-- =============================================================================
-- ANALYTICS AND REPORTING QUERIES
-- =============================================================================

-- Get problem statistics
SELECT 
    COUNT(*) as total_problems,
    COUNT(CASE WHEN difficulty = 'easy' THEN 1 END) as easy_count,
    COUNT(CASE WHEN difficulty = 'medium' THEN 1 END) as medium_count,
    COUNT(CASE WHEN difficulty = 'hard' THEN 1 END) as hard_count,
    COUNT(CASE WHEN difficulty = 'expert' THEN 1 END) as expert_count
FROM problem_statements 
WHERE is_active = true;

-- Get user performance statistics
SELECT 
    u.username,
    COUNT(upa.id) as total_attempts,
    COUNT(CASE WHEN upa.submission_status = 'accepted' THEN 1 END) as accepted_count,
    ROUND(AVG(upa.score), 2) as average_score,
    ROUND(AVG(upa.execution_time_ms), 2) as average_execution_time
FROM users u
LEFT JOIN user_problem_attempts upa ON u.id = upa.user_id
GROUP BY u.id, u.username
ORDER BY average_score DESC NULLS LAST;

-- Get problem popularity (most attempted)
SELECT 
    ps.title,
    ps.difficulty,
    COUNT(upa.id) as attempt_count,
    COUNT(CASE WHEN upa.submission_status = 'accepted' THEN 1 END) as success_count,
    ROUND(COUNT(CASE WHEN upa.submission_status = 'accepted' THEN 1 END) * 100.0 / COUNT(upa.id), 2) as success_rate
FROM problem_statements ps
LEFT JOIN user_problem_attempts upa ON ps.id = upa.problem_id
WHERE ps.is_active = true
GROUP BY ps.id, ps.title, ps.difficulty
ORDER BY attempt_count DESC;

-- Get category statistics
SELECT 
    pc.name as category_name,
    COUNT(ps.id) as problem_count,
    COUNT(upa.id) as total_attempts,
    ROUND(AVG(upa.score), 2) as average_score
FROM problem_categories pc
LEFT JOIN problem_statements ps ON pc.id = ps.category_id AND ps.is_active = true
LEFT JOIN user_problem_attempts upa ON ps.id = upa.problem_id
GROUP BY pc.id, pc.name
ORDER BY problem_count DESC;

-- =============================================================================
-- UTILITY FUNCTIONS
-- =============================================================================

-- Function to get next test case number for a problem
CREATE OR REPLACE FUNCTION get_next_test_case_number(problem_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    next_number INTEGER;
BEGIN
    SELECT COALESCE(MAX(test_case_number), 0) + 1
    INTO next_number
    FROM test_cases
    WHERE problem_id = problem_uuid;
    
    RETURN next_number;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate problem success rate
CREATE OR REPLACE FUNCTION calculate_problem_success_rate(problem_uuid UUID)
RETURNS DECIMAL AS $$
DECLARE
    success_rate DECIMAL;
BEGIN
    SELECT ROUND(
        COUNT(CASE WHEN submission_status = 'accepted' THEN 1 END) * 100.0 / 
        NULLIF(COUNT(*), 0), 2
    )
    INTO success_rate
    FROM user_problem_attempts
    WHERE problem_id = problem_uuid;
    
    RETURN COALESCE(success_rate, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get user's problem completion status
CREATE OR REPLACE FUNCTION get_user_problem_status(user_uuid UUID, problem_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    status TEXT;
BEGIN
    SELECT submission_status
    INTO status
    FROM user_problem_attempts
    WHERE user_id = user_uuid AND problem_id = problem_uuid
    ORDER BY submitted_at DESC
    LIMIT 1;
    
    RETURN COALESCE(status, 'not_attempted');
END;
$$ LANGUAGE plpgsql;
