# Problem Statements API Documentation

This document provides comprehensive documentation for the Problem Statements API endpoints in the Virtual Interviewer Backend.

## Base URL
```
/api/problems
```

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Response Format
All endpoints return responses in the following format:
```json
{
  "success": true|false,
  "data": <response-data>,
  "message": "<optional-message>",
  "error": "<error-message-if-failed>",
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

---

## Problem Statements Endpoints

### 1. Get All Problems
**GET** `/api/problems`

Get all problems with pagination and filtering options.

#### Query Parameters
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10)
- `difficulty` (string, optional): Filter by difficulty (`easy`, `medium`, `hard`, `expert`)
- `category_id` (string, optional): Filter by category ID
- `search` (string, optional): Search in title and description
- `tags` (array, optional): Filter by tags
- `sort_by` (string, optional): Sort field (`created_at`, `title`, `difficulty`, `points`)
- `sort_order` (string, optional): Sort order (`ASC`, `DESC`)

#### Example Request
```bash
GET /api/problems?page=1&limit=5&difficulty=medium&search=array
```

#### Example Response
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Two Sum",
      "description": "Find two numbers in an array that add up to a target value",
      "difficulty": "easy",
      "category_name": "Arrays",
      "difficulty_color": "#28a745",
      "points": 100,
      "tags": ["arrays", "hash-table"],
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 50,
    "pages": 10
  }
}
```

### 2. Get Random Problems
**GET** `/api/problems/random`

Get random problems for practice.

#### Query Parameters
- `limit` (number, optional): Number of problems (default: 5)
- `difficulty` (string, optional): Filter by difficulty
- `category_id` (string, optional): Filter by category

#### Example Request
```bash
GET /api/problems/random?limit=3&difficulty=medium
```

### 3. Get Problem by ID
**GET** `/api/problems/:id`

Get a specific problem with full details.

#### Example Request
```bash
GET /api/problems/uuid-here
```

#### Example Response
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Two Sum",
    "description": "Find two numbers in an array that add up to a target value",
    "difficulty": "easy",
    "problem_statement": "Given an array of integers nums and an integer target...",
    "input_format": "The first line contains an integer n...",
    "output_format": "Output two integers separated by a space...",
    "constraints": "• 2 ≤ nums.length ≤ 10^4\n• -10^9 ≤ nums[i] ≤ 10^9",
    "examples": [
      {
        "input": "4\n2 7 11 15\n9",
        "output": "0 1",
        "explanation": "nums[0] + nums[1] = 2 + 7 = 9"
      }
    ],
    "expected_time_complexity": "O(n)",
    "expected_space_complexity": "O(n)",
    "tags": ["arrays", "hash-table"],
    "points": 100,
    "time_limit_seconds": 300,
    "category_name": "Arrays",
    "difficulty_color": "#28a745"
  }
}
```

### 4. Create Problem
**POST** `/api/problems` 🔒

Create a new problem statement.

#### Request Body
```json
{
  "title": "Two Sum",
  "description": "Find two numbers in an array that add up to a target value",
  "difficulty": "easy",
  "category_id": "uuid",
  "problem_statement": "Given an array of integers nums and an integer target...",
  "input_format": "The first line contains an integer n...",
  "output_format": "Output two integers separated by a space...",
  "constraints": "• 2 ≤ nums.length ≤ 10^4",
  "examples": [
    {
      "input": "4\n2 7 11 15\n9",
      "output": "0 1",
      "explanation": "nums[0] + nums[1] = 2 + 7 = 9"
    }
  ],
  "expected_time_complexity": "O(n)",
  "expected_space_complexity": "O(n)",
  "tags": ["arrays", "hash-table"],
  "source": "LeetCode",
  "source_url": "https://leetcode.com/problems/two-sum/",
  "problem_number": "1",
  "points": 100,
  "time_limit_seconds": 300,
  "memory_limit_mb": 256,
  "is_active": true,
  "is_public": true
}
```

### 5. Update Problem
**PUT** `/api/problems/:id` 🔒

Update an existing problem.

### 6. Delete Problem
**DELETE** `/api/problems/:id` 🔒

Soft delete a problem (sets `is_active` to false).

---

## Problem Categories Endpoints

### 1. Get All Categories
**GET** `/api/problems/categories`

Get all problem categories with problem counts.

#### Example Response
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Arrays",
      "description": "Problems involving array manipulation and algorithms",
      "parent_name": null,
      "problem_count": 25
    }
  ]
}
```

### 2. Get Category by ID
**GET** `/api/problems/categories/:id`

### 3. Create Category
**POST** `/api/problems/categories` 🔒

#### Request Body
```json
{
  "name": "Dynamic Programming",
  "description": "DP problems and optimization",
  "parent_category_id": null
}
```

### 4. Update Category
**PUT** `/api/problems/categories/:id` 🔒

### 5. Delete Category
**DELETE** `/api/problems/categories/:id` 🔒

---

## Test Cases Endpoints

### 1. Get Test Cases for Problem
**GET** `/api/problems/:id/test-cases`

#### Query Parameters
- `visible_only` (boolean, optional): Only return visible test cases (default: false)

#### Example Response
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "problem_id": "uuid",
      "test_case_number": 1,
      "test_case_type": "sample",
      "input_data": "4\n2 7 11 15\n9",
      "expected_output": "0 1",
      "explanation": "nums[0] + nums[1] = 2 + 7 = 9",
      "is_visible": true,
      "execution_order": 0
    }
  ]
}
```

### 2. Create Test Case
**POST** `/api/problems/:id/test-cases` 🔒

#### Request Body
```json
{
  "test_case_number": 1,
  "test_case_type": "sample",
  "input_data": "4\n2 7 11 15\n9",
  "expected_output": "0 1",
  "explanation": "nums[0] + nums[1] = 2 + 7 = 9",
  "is_visible": true,
  "execution_order": 0
}
```

### 3. Update Test Case
**PUT** `/api/problems/test-cases/:testCaseId` 🔒

### 4. Delete Test Case
**DELETE** `/api/problems/test-cases/:testCaseId` 🔒

---

## Problem Solutions Endpoints

### 1. Get Solutions for Problem
**GET** `/api/problems/:id/solutions`

#### Query Parameters
- `language` (string, optional): Filter by programming language
- `official_only` (boolean, optional): Only return official solutions (default: false)

#### Example Response
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "problem_id": "uuid",
      "solution_type": "optimal",
      "solution_code": "def twoSum(nums, target):\n    hashmap = {}\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in hashmap:\n            return [hashmap[complement], i]\n        hashmap[num] = i\n    return []",
      "programming_language": "python",
      "time_complexity": "O(n)",
      "space_complexity": "O(n)",
      "explanation": "Use hashmap to store numbers and their indices...",
      "approach_description": "Hash Map approach",
      "is_official": true,
      "difficulty_rating": 3
    }
  ]
}
```

### 2. Create Solution
**POST** `/api/problems/:id/solutions` 🔒

#### Request Body
```json
{
  "solution_type": "optimal",
  "solution_code": "def twoSum(nums, target):\n    hashmap = {}\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in hashmap:\n            return [hashmap[complement], i]\n        hashmap[num] = i\n    return []",
  "programming_language": "python",
  "time_complexity": "O(n)",
  "space_complexity": "O(n)",
  "explanation": "Use hashmap to store numbers and their indices...",
  "approach_description": "Hash Map approach",
  "is_official": true,
  "difficulty_rating": 3
}
```

### 3. Update Solution
**PUT** `/api/problems/solutions/:solutionId` 🔒

### 4. Delete Solution
**DELETE** `/api/problems/solutions/:solutionId` 🔒

---

## User Problem Attempts Endpoints

### 1. Get User Attempts
**GET** `/api/problems/attempts` 🔒

Get user's attempts with pagination.

#### Query Parameters
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10)
- `status` (string, optional): Filter by submission status
- `problem_id` (string, optional): Filter by problem ID

#### Example Response
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "problem_id": "uuid",
      "problem_title": "Two Sum",
      "problem_difficulty": "easy",
      "category_name": "Arrays",
      "submitted_code": "def twoSum(nums, target):\n    ...",
      "programming_language": "python",
      "submission_status": "accepted",
      "execution_time_ms": 45,
      "memory_used_mb": 12.5,
      "test_cases_passed": 3,
      "total_test_cases": 3,
      "score": 100,
      "feedback": "Great solution!",
      "submitted_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

### 2. Get Attempts for Specific Problem
**GET** `/api/problems/:id/attempts` 🔒

### 3. Submit Code Attempt
**POST** `/api/problems/:id/attempts` 🔒

#### Request Body
```json
{
  "submitted_code": "def twoSum(nums, target):\n    hashmap = {}\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in hashmap:\n            return [hashmap[complement], i]\n        hashmap[num] = i\n    return []",
  "programming_language": "python",
  "session_id": "uuid"
}
```

### 4. Update Attempt Results
**PUT** `/api/problems/attempts/:attemptId` 🔒

#### Request Body
```json
{
  "submission_status": "accepted",
  "execution_time_ms": 45,
  "memory_used_mb": 12.5,
  "test_cases_passed": 3,
  "total_test_cases": 3,
  "score": 100,
  "feedback": "Great solution!",
  "error_message": null
}
```

---

## Analytics Endpoints

### 1. Get Problem Statistics
**GET** `/api/problems/analytics/stats`

#### Example Response
```json
{
  "success": true,
  "data": {
    "total_problems": 150,
    "easy_count": 50,
    "medium_count": 60,
    "hard_count": 30,
    "expert_count": 10
  }
}
```

### 2. Get Popular Problems
**GET** `/api/problems/analytics/popular`

#### Query Parameters
- `limit` (number, optional): Number of problems (default: 10)

#### Example Response
```json
{
  "success": true,
  "data": [
    {
      "title": "Two Sum",
      "difficulty": "easy",
      "attempt_count": 1250,
      "success_count": 980,
      "success_rate": 78.4
    }
  ]
}
```

### 3. Get Category Statistics
**GET** `/api/problems/analytics/categories`

#### Example Response
```json
{
  "success": true,
  "data": [
    {
      "category_name": "Arrays",
      "problem_count": 25,
      "total_attempts": 5000,
      "average_score": 75.5
    }
  ]
}
```

### 4. Get User Performance
**GET** `/api/problems/analytics/user-performance` 🔒

#### Example Response
```json
{
  "success": true,
  "data": {
    "total_attempts": 50,
    "accepted_count": 35,
    "average_score": 78.5,
    "average_execution_time": 120.5,
    "problems_attempted": 30
  }
}
```

---

## Supporting Data Endpoints

### 1. Get Difficulty Levels
**GET** `/api/problems/difficulty-levels`

#### Example Response
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "level_name": "Easy",
      "level_order": 1,
      "description": "Basic problems suitable for beginners",
      "color_code": "#28a745"
    }
  ]
}
```

### 2. Get Programming Languages
**GET** `/api/problems/programming-languages`

#### Query Parameters
- `active_only` (boolean, optional): Only return active languages (default: true)

#### Example Response
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "language_name": "Python",
      "language_code": "python",
      "file_extension": "py",
      "execution_command": "python",
      "is_active": true
    }
  ]
}
```

---

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created successfully |
| 400 | Bad request - Invalid parameters |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not found - Resource doesn't exist |
| 500 | Internal server error |

## Common Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

---

## Notes

- 🔒 indicates endpoints that require authentication
- All timestamps are in ISO 8601 format
- UUIDs are used for all ID fields
- Pagination is available for list endpoints
- Soft deletes are used for most resources (sets `is_active` to false)
- Test cases can be marked as visible (for users) or hidden (for validation)
- Solutions can be marked as official or alternative approaches
- User attempts track execution metrics and test case results
