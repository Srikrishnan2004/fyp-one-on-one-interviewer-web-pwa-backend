-- Problem Statements Schema for Virtual Interviewer Backend
-- This script creates tables to store coding problems with all necessary details

-- Enable UUID extension for generating unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Problem Categories Table - For organizing problems by topic/domain
CREATE TABLE problem_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_category_id UUID REFERENCES problem_categories(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Problem Statements Table - Main table for storing coding problems
CREATE TABLE problem_statements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
    category_id UUID REFERENCES problem_categories(id) ON DELETE SET NULL,
    
    -- Problem details
    problem_statement TEXT NOT NULL,
    input_format TEXT,
    output_format TEXT,
    constraints TEXT,
    examples JSONB, -- Store example test cases as JSON array
    
    -- Time and space complexity expectations
    expected_time_complexity VARCHAR(50),
    expected_space_complexity VARCHAR(50),
    
    -- Problem metadata
    tags TEXT[], -- Array of tags for filtering/searching
    source VARCHAR(100), -- LeetCode, HackerRank, custom, etc.
    source_url VARCHAR(500),
    problem_number VARCHAR(50), -- Original problem number from source
    
    -- Scoring and evaluation
    points INTEGER DEFAULT 100,
    time_limit_seconds INTEGER DEFAULT 300, -- Default 5 minutes
    memory_limit_mb INTEGER DEFAULT 256,
    
    -- Status and visibility
    is_active BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Test Cases Table - Store test cases for each problem
CREATE TABLE test_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    problem_id UUID NOT NULL REFERENCES problem_statements(id) ON DELETE CASCADE,
    test_case_number INTEGER NOT NULL,
    test_case_type VARCHAR(20) DEFAULT 'sample' CHECK (test_case_type IN ('sample', 'hidden', 'edge')),
    
    -- Input and expected output
    input_data TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    explanation TEXT, -- Explanation for sample test cases
    
    -- Test case metadata
    is_visible BOOLEAN DEFAULT TRUE, -- Whether user can see this test case
    execution_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(problem_id, test_case_number)
);

-- 4. Problem Solutions Table - Store official solutions and hints
CREATE TABLE problem_solutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    problem_id UUID NOT NULL REFERENCES problem_statements(id) ON DELETE CASCADE,
    solution_type VARCHAR(20) DEFAULT 'optimal' CHECK (solution_type IN ('brute_force', 'optimal', 'alternative')),
    
    -- Solution details
    solution_code TEXT NOT NULL,
    programming_language VARCHAR(50) NOT NULL,
    time_complexity VARCHAR(50),
    space_complexity VARCHAR(50),
    explanation TEXT,
    approach_description TEXT,
    
    -- Solution metadata
    is_official BOOLEAN DEFAULT FALSE,
    difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. User Problem Attempts Table - Track user submissions
CREATE TABLE user_problem_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    problem_id UUID NOT NULL REFERENCES problem_statements(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    
    -- Submission details
    submitted_code TEXT NOT NULL,
    programming_language VARCHAR(50) NOT NULL,
    submission_status VARCHAR(20) DEFAULT 'pending' CHECK (submission_status IN ('pending', 'accepted', 'wrong_answer', 'time_limit_exceeded', 'runtime_error', 'compilation_error')),
    
    -- Execution results
    execution_time_ms INTEGER,
    memory_used_mb DECIMAL(10,2),
    test_cases_passed INTEGER DEFAULT 0,
    total_test_cases INTEGER DEFAULT 0,
    
    -- Feedback and scoring
    score DECIMAL(5,2),
    feedback TEXT,
    error_message TEXT,
    
    -- Timestamps
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 6. Problem Difficulty Levels Table - For difficulty progression
CREATE TABLE difficulty_levels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level_name VARCHAR(20) UNIQUE NOT NULL,
    level_order INTEGER UNIQUE NOT NULL,
    description TEXT,
    color_code VARCHAR(7), -- Hex color for UI
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Programming Languages Table - Supported languages
CREATE TABLE programming_languages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    language_name VARCHAR(50) UNIQUE NOT NULL,
    language_code VARCHAR(10) UNIQUE NOT NULL, -- e.g., 'python', 'java', 'cpp'
    file_extension VARCHAR(10) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    execution_command TEXT, -- Command to execute the language
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_problem_statements_category_id ON problem_statements(category_id);
CREATE INDEX idx_problem_statements_difficulty ON problem_statements(difficulty);
CREATE INDEX idx_problem_statements_tags ON problem_statements USING GIN(tags);
CREATE INDEX idx_problem_statements_is_active ON problem_statements(is_active);
CREATE INDEX idx_problem_statements_created_by ON problem_statements(created_by);

CREATE INDEX idx_test_cases_problem_id ON test_cases(problem_id);
CREATE INDEX idx_test_cases_type ON test_cases(test_case_type);

CREATE INDEX idx_problem_solutions_problem_id ON problem_solutions(problem_id);
CREATE INDEX idx_problem_solutions_language ON problem_solutions(programming_language);

CREATE INDEX idx_user_attempts_user_id ON user_problem_attempts(user_id);
CREATE INDEX idx_user_attempts_problem_id ON user_problem_attempts(problem_id);
CREATE INDEX idx_user_attempts_session_id ON user_problem_attempts(session_id);
CREATE INDEX idx_user_attempts_status ON user_problem_attempts(submission_status);
CREATE INDEX idx_user_attempts_submitted_at ON user_problem_attempts(submitted_at);

-- Create triggers to automatically update the updated_at timestamp
CREATE TRIGGER update_problem_categories_updated_at BEFORE UPDATE ON problem_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_problem_statements_updated_at BEFORE UPDATE ON problem_statements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_cases_updated_at BEFORE UPDATE ON test_cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_problem_solutions_updated_at BEFORE UPDATE ON problem_solutions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default difficulty levels
INSERT INTO difficulty_levels (level_name, level_order, description, color_code) VALUES
('Easy', 1, 'Basic problems suitable for beginners', '#28a745'),
('Medium', 2, 'Intermediate problems requiring good understanding', '#ffc107'),
('Hard', 3, 'Advanced problems for experienced developers', '#dc3545'),
('Expert', 4, 'Very challenging problems for experts', '#6f42c1');

-- Insert default programming languages
INSERT INTO programming_languages (language_name, language_code, file_extension, execution_command) VALUES
('Python', 'python', 'py', 'python'),
('Java', 'java', 'java', 'java'),
('C++', 'cpp', 'cpp', 'g++ -o solution solution.cpp && ./solution'),
('JavaScript', 'javascript', 'js', 'node'),
('C#', 'csharp', 'cs', 'dotnet run'),
('Go', 'go', 'go', 'go run'),
('Rust', 'rust', 'rs', 'rustc solution.rs && ./solution');

-- Insert default problem categories
INSERT INTO problem_categories (name, description) VALUES
('Arrays', 'Problems involving array manipulation and algorithms'),
('Strings', 'String processing and manipulation problems'),
('Linked Lists', 'Problems involving linked list data structures'),
('Trees', 'Binary trees, BST, and tree traversal problems'),
('Graphs', 'Graph algorithms and traversal problems'),
('Dynamic Programming', 'DP problems and optimization'),
('Sorting', 'Various sorting algorithms and techniques'),
('Searching', 'Search algorithms and techniques'),
('Math', 'Mathematical problems and number theory'),
('Greedy', 'Greedy algorithm problems'),
('Backtracking', 'Backtracking and recursive problems'),
('Hash Tables', 'Hash table and dictionary problems'),
('Stacks and Queues', 'Stack and queue data structure problems'),
('Heaps', 'Heap data structure problems'),
('Bit Manipulation', 'Bitwise operations and manipulation');

-- Sample problem statement (optional - remove in production)
INSERT INTO problem_statements (
    title, description, difficulty, problem_statement, input_format, output_format, 
    constraints, examples, expected_time_complexity, expected_space_complexity, 
    tags, source, points, time_limit_seconds
) VALUES (
    'Two Sum',
    'Find two numbers in an array that add up to a target value',
    'easy',
    'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.',
    'The first line contains an integer n (2 ≤ n ≤ 10^4), the size of the array. The second line contains n integers separated by spaces. The third line contains the target integer.',
    'Output two integers separated by a space representing the indices of the two numbers.',
    '• 2 ≤ nums.length ≤ 10^4\n• -10^9 ≤ nums[i] ≤ 10^9\n• -10^9 ≤ target ≤ 10^9\n• Only one valid answer exists.',
    '[{"input": "4\n2 7 11 15\n9", "output": "0 1", "explanation": "nums[0] + nums[1] = 2 + 7 = 9"}, {"input": "3\n3 2 4\n6", "output": "1 2", "explanation": "nums[1] + nums[2] = 2 + 4 = 6"}]',
    'O(n)',
    'O(n)',
    ARRAY['arrays', 'hash-table', 'two-pointers'],
    'LeetCode',
    100,
    300
);

-- Sample test cases for the above problem
INSERT INTO test_cases (problem_id, test_case_number, test_case_type, input_data, expected_output, explanation, is_visible) 
SELECT 
    ps.id,
    1,
    'sample',
    '4\n2 7 11 15\n9',
    '0 1',
    'nums[0] + nums[1] = 2 + 7 = 9',
    true
FROM problem_statements ps WHERE ps.title = 'Two Sum';

INSERT INTO test_cases (problem_id, test_case_number, test_case_type, input_data, expected_output, explanation, is_visible) 
SELECT 
    ps.id,
    2,
    'sample',
    '3\n3 2 4\n6',
    '1 2',
    'nums[1] + nums[2] = 2 + 4 = 6',
    true
FROM problem_statements ps WHERE ps.title = 'Two Sum';

-- Comments for documentation
COMMENT ON TABLE problem_categories IS 'Categories for organizing coding problems by topic';
COMMENT ON TABLE problem_statements IS 'Main table storing coding problem statements and metadata';
COMMENT ON TABLE test_cases IS 'Test cases for validating problem solutions';
COMMENT ON TABLE problem_solutions IS 'Official solutions and alternative approaches for problems';
COMMENT ON TABLE user_problem_attempts IS 'User submissions and execution results for problems';
COMMENT ON TABLE difficulty_levels IS 'Difficulty levels for problems with UI styling';
COMMENT ON TABLE programming_languages IS 'Supported programming languages for code execution';

COMMENT ON COLUMN problem_statements.examples IS 'JSON array containing example test cases with input, output, and explanation';
COMMENT ON COLUMN problem_statements.tags IS 'Array of tags for filtering and searching problems';
COMMENT ON COLUMN test_cases.test_case_type IS 'Type of test case: sample (visible), hidden (for validation), edge (edge cases)';
COMMENT ON COLUMN user_problem_attempts.submission_status IS 'Status of code execution: accepted, wrong_answer, time_limit_exceeded, etc.';
