# Code Execution API Documentation

## Overview
The Code Execution API allows you to execute code in multiple programming languages inside a secure Docker container. This is perfect for coding challenge platforms like LeetCode, where users can submit code and get immediate feedback.

## Base URL
```
http://localhost:3000/api/code-execution
```

## Supported Programming Languages
- **C** (`.c`) - Compiled language
- **C++** (`.cpp`) - Compiled language  
- **Python** (`.py`) - Interpreted language
- **Java** (`.java`) - Compiled language
- **C#** (`.cs`) - Compiled language
- **JavaScript** (`.js`) - Interpreted language

## API Endpoints

### 1. Execute Code
**POST** `/run`

Execute code in the Docker container and return the output.

#### Request Body
```json
{
  "code": "print('Hello World!')",
  "language": "python",
  "input": "optional input for the program"
}
```

#### Parameters
- `code` (required): The source code to execute
- `language` (required): Programming language (`c`, `cpp`, `python`, `java`, `csharp`, `javascript`)
- `input` (optional): Input data for the program (stdin)

#### Response
```json
{
  "success": true,
  "result": {
    "success": true,
    "output": "Hello World!",
    "error": "",
    "executionTime": 245,
    "language": "python"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Example Usage

**Python Code:**
```bash
curl -X POST http://localhost:3000/api/code-execution/run \
  -H "Content-Type: application/json" \
  -d '{
    "code": "print(\"Hello from Python!\")\nprint(\"2 + 3 =\", 2 + 3)",
    "language": "python"
  }'
```

**C Code:**
```bash
curl -X POST http://localhost:3000/api/code-execution/run \
  -H "Content-Type: application/json" \
  -d '{
    "code": "#include <stdio.h>\nint main() {\n    printf(\"Hello from C!\\n\");\n    return 0;\n}",
    "language": "c"
  }'
```

**JavaScript Code:**
```bash
curl -X POST http://localhost:3000/api/code-execution/run \
  -H "Content-Type: application/json" \
  -d '{
    "code": "console.log(\"Hello from JavaScript!\");\nconsole.log(\"2 * 5 =\", 2 * 5);",
    "language": "javascript"
  }'
```

### 2. Get Supported Languages
**GET** `/languages`

Get list of supported programming languages.

#### Response
```json
{
  "success": true,
  "languages": [
    {
      "name": "python",
      "extension": "py",
      "needsCompilation": false,
      "timeout": 10000
    },
    {
      "name": "c",
      "extension": "c",
      "needsCompilation": true,
      "timeout": 10000
    }
  ],
  "count": 6
}
```

### 3. Check Container Status
**GET** `/status`

Check if the coding environment Docker container is running.

#### Response
```json
{
  "success": true,
  "status": "running",
  "container": "coding-challenge-env",
  "user": "coder",
  "message": "Coding environment is ready"
}
```

### 4. Run Test Cases
**POST** `/test`

Run test cases to verify all programming languages are working correctly.

#### Response
```json
{
  "success": true,
  "testResults": [
    {
      "language": "python",
      "success": true,
      "output": "Hello from Python!",
      "expectedOutput": "Hello from Python!",
      "matches": true
    }
  ],
  "summary": {
    "total": 3,
    "passed": 3,
    "failed": 0
  }
}
```

## Error Responses

### Container Not Running
```json
{
  "success": false,
  "error": "Coding environment container is not running",
  "solution": "Please start the container using: docker-compose up -d coding-environment"
}
```

### Unsupported Language
```json
{
  "success": false,
  "error": "Unsupported language: ruby",
  "supportedLanguages": ["c", "cpp", "python", "java", "csharp", "javascript"]
}
```

### Compilation Error
```json
{
  "success": true,
  "result": {
    "success": false,
    "output": "",
    "error": "error: expected ';' before 'return'",
    "executionTime": 0,
    "language": "c"
  }
}
```

### Runtime Error
```json
{
  "success": true,
  "result": {
    "success": false,
    "output": "",
    "error": "ReferenceError: x is not defined",
    "executionTime": 150,
    "language": "javascript"
  }
}
```

## Security Features

1. **Sandboxed Execution**: Code runs inside a Docker container, isolated from the host system
2. **Non-root User**: Container runs as `coder` user, not root
3. **Timeout Protection**: All executions have a 10-second timeout
4. **File Cleanup**: Temporary files are automatically cleaned up after execution
5. **Resource Limits**: Docker container has resource constraints

## Prerequisites

1. **Docker Container Running**: The `coding-challenge-env` container must be running
2. **Container Name**: Container must be named `coding-challenge-env`
3. **User Permissions**: Container runs as `coder` user with appropriate permissions

## Starting the Environment

```bash
# Start the coding environment
docker-compose up -d coding-environment

# Check if container is running
docker ps | grep coding-challenge-env

# Test the API
curl http://localhost:3000/api/code-execution/status
```

## Troubleshooting

### Container Not Running
```bash
# Start the container
docker-compose up -d coding-environment

# Check container status
docker ps
```

### Permission Issues
```bash
# Check container user
docker exec coding-challenge-env whoami

# Should return: coder
```

### Language Not Working
```bash
# Test specific language
curl -X POST http://localhost:3000/api/code-execution/test
```

### Quote Handling Issues
The API uses a robust file copy method to handle all types of quotes and special characters:

1. **All quote types supported**: Single quotes, double quotes, backticks
2. **Special characters**: Dollar signs, backslashes, newlines all work correctly
3. **Complex code**: Multi-line code with mixed quotes works perfectly

**Example with complex quotes:**
```javascript
// This will work correctly
const code = 'console.log("Hello \\"World\\"!");\nconsole.log(\'Single quotes work too\');\nconst template = `Template literals work too!`;';
```

**How it works:**
- Solutions directory is created in the container if it doesn't exist
- Code is written to a temporary file locally
- File is copied to the Docker container using `docker cp`
- Code is executed in the container
- Temporary files are cleaned up automatically
- No shell escaping issues or quote conflicts

## Rate Limiting & Best Practices

1. **Timeout**: Each execution has a 10-second timeout
2. **Resource Usage**: Monitor container resource usage
3. **Error Handling**: Always handle both API errors and runtime errors
4. **Input Validation**: Validate code and language on the frontend
5. **Security**: Never execute untrusted code without proper validation

## Example Use Cases

1. **Coding Challenge Platform**: Users submit solutions and get immediate feedback
2. **Educational Platform**: Students practice coding with instant results
3. **Technical Interviews**: Candidates solve problems in real-time
4. **Code Testing**: Automated testing of user-submitted code
5. **Algorithm Practice**: Competitive programming practice platform
