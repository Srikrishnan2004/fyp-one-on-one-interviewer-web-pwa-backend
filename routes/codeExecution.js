import express from 'express';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { promisify } from 'util';

const router = express.Router();
const execAsync = promisify(exec);

// Supported programming languages
const SUPPORTED_LANGUAGES = {
  'c': {
    extension: 'c',
    compileCommand: (filename) => `gcc ${filename} -o ${filename.replace('.c', '')}`,
    runCommand: (filename) => `./${filename.replace('.c', '')}`,
    timeout: 10000
  },
  'cpp': {
    extension: 'cpp',
    compileCommand: (filename) => `g++ ${filename} -o ${filename.replace('.cpp', '')}`,
    runCommand: (filename) => `./${filename.replace('.cpp', '')}`,
    timeout: 10000
  },
  'python': {
    extension: 'py',
    compileCommand: null, // Python doesn't need compilation
    runCommand: (filename) => `python3 ${filename}`,
    timeout: 10000
  },
  'java': {
    extension: 'java',
    compileCommand: (filename) => `javac ${filename}`,
    runCommand: (filename) => `java ${filename.replace('.java', '')}`,
    timeout: 10000
  },
  'csharp': {
    extension: 'cs',
    compileCommand: (filename) => `dotnet new console -n temp_project --force && dotnet build temp_project`,
    runCommand: (filename) => `dotnet run --project temp_project`,
    timeout: 10000
  },
  'javascript': {
    extension: 'js',
    compileCommand: null, // JavaScript doesn't need compilation
    runCommand: (filename) => `node ${filename}`,
    timeout: 10000
  }
};

// Execute code in Docker container
const executeCodeInContainer = async (code, language, input = '') => {
  const langConfig = SUPPORTED_LANGUAGES[language.toLowerCase()];
  
  if (!langConfig) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const timestamp = Date.now();
  const filename = `solution_${timestamp}.${langConfig.extension}`;
  const containerPath = `/app/solutions/${filename}`;
  
  try {
    // Ensure the solutions directory exists in the container
    await execAsync(`docker exec coding-challenge-env bash -c "mkdir -p /app/solutions"`);
    
    // Write code to a temporary file locally first, then copy to container
    const tempFile = `/tmp/solution_${timestamp}.${langConfig.extension}`;
    await fs.writeFile(tempFile, code, 'utf8');
    
    // Copy file to container
    await execAsync(`docker cp ${tempFile} coding-challenge-env:${containerPath}`);
    
    // Clean up local temp file
    await fs.unlink(tempFile);
    
    let output = '';
    let error = '';
    
    // Compile if needed
    if (langConfig.compileCommand) {
      const compileCmd = `docker exec coding-challenge-env bash -c "cd /app/solutions && ${langConfig.compileCommand(filename)}"`;
      try {
        await execAsync(compileCmd, { timeout: langConfig.timeout });
      } catch (compileError) {
        return {
          success: false,
          output: '',
          error: compileError.stdout || compileError.stderr || compileError.message,
          executionTime: 0,
          language: language
        };
      }
    }
    
    // Run the code
    let runCmd;
    if (input.trim()) {
      const escapedInput = input.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`');
      runCmd = `docker exec coding-challenge-env bash -c "cd /app/solutions && echo '${escapedInput}' | ${langConfig.runCommand(filename)}"`;
    } else {
      runCmd = `docker exec coding-challenge-env bash -c "cd /app/solutions && ${langConfig.runCommand(filename)}"`;
    }
    
    const startTime = Date.now();
    try {
      const result = await execAsync(runCmd, { timeout: langConfig.timeout });
      output = result.stdout || '';
      error = result.stderr || '';
    } catch (runError) {
      output = runError.stdout || '';
      error = runError.stderr || runError.message || '';
    }
    const executionTime = Date.now() - startTime;
    
    // Clean up files
    await execAsync(`docker exec coding-challenge-env bash -c "rm -f /app/solutions/${filename} /app/solutions/${filename.replace(langConfig.extension, '')}"`);
    
    return {
      success: !error || error.trim() === '',
      output: output.trim(),
      error: error.trim(),
      executionTime: executionTime,
      language: language
    };
    
  } catch (error) {
    // Clean up files on error
    try {
      await execAsync(`docker exec coding-challenge-env bash -c "rm -f /app/solutions/${filename} /app/solutions/${filename.replace(langConfig.extension, '')}"`);
      // Also clean up local temp file if it exists
      const tempFile = `/tmp/solution_${timestamp}.${langConfig.extension}`;
      try {
        await fs.unlink(tempFile);
      } catch (unlinkError) {
        // File might not exist, ignore error
      }
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }
    
    throw error;
  }
};

// POST /api/code-execution/run
router.post('/run', async (req, res) => {
  try {
    const { code, language, input = '' } = req.body;
    
    // Validation
    if (!code || !language) {
      return res.status(400).json({
        success: false,
        error: 'Code and language are required',
        example: {
          code: 'print("Hello World")',
          language: 'python',
          input: 'optional input for the program'
        }
      });
    }
    
    if (!SUPPORTED_LANGUAGES[language.toLowerCase()]) {
      return res.status(400).json({
        success: false,
        error: `Unsupported language: ${language}`,
        supportedLanguages: Object.keys(SUPPORTED_LANGUAGES)
      });
    }
    
    // Check if container is running
    try {
      await execAsync('docker ps --filter "name=coding-challenge-env" --filter "status=running" --format "{{.Names}}"');
    } catch (error) {
      return res.status(503).json({
        success: false,
        error: 'Coding environment container is not running',
        solution: 'Please start the container using: docker-compose up -d coding-environment'
      });
    }
    
    // Execute code
    const result = await executeCodeInContainer(code, language, input);
    
    res.json({
      success: true,
      result: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Code execution error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute code',
      message: error.message
    });
  }
});

// GET /api/code-execution/languages
router.get('/languages', (req, res) => {
  const languages = Object.keys(SUPPORTED_LANGUAGES).map(lang => ({
    name: lang,
    extension: SUPPORTED_LANGUAGES[lang].extension,
    needsCompilation: SUPPORTED_LANGUAGES[lang].compileCommand !== null,
    timeout: SUPPORTED_LANGUAGES[lang].timeout
  }));
  
  res.json({
    success: true,
    languages: languages,
    count: languages.length
  });
});

// GET /api/code-execution/status
router.get('/status', async (req, res) => {
  try {
    // Check if container is running
    const { stdout } = await execAsync('docker ps --filter "name=coding-challenge-env" --filter "status=running" --format "{{.Names}}"');
    const isRunning = stdout.trim() === 'coding-challenge-env';
    
    if (isRunning) {
      // Test if container is responsive
      try {
        await execAsync('docker exec coding-challenge-env whoami');
        res.json({
          success: true,
          status: 'running',
          container: 'coding-challenge-env',
          user: 'coder',
          message: 'Coding environment is ready'
        });
      } catch (error) {
        res.json({
          success: false,
          status: 'unresponsive',
          container: 'coding-challenge-env',
          error: 'Container is running but not responsive'
        });
      }
    } else {
      res.json({
        success: false,
        status: 'stopped',
        container: 'coding-challenge-env',
        message: 'Container is not running'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to check container status',
      message: error.message
    });
  }
});

// POST /api/code-execution/test
router.post('/test', async (req, res) => {
  try {
    const testCases = [
      {
        language: 'python',
        code: 'print("Hello from Python!")',
        expectedOutput: 'Hello from Python!'
      },
      {
        language: 'c',
        code: '#include <stdio.h>\nint main() { printf("Hello from C!\\n"); return 0; }',
        expectedOutput: 'Hello from C!'
      },
      {
        language: 'javascript',
        code: 'console.log("Hello from JavaScript!");',
        expectedOutput: 'Hello from JavaScript!'
      }
    ];
    
    const results = [];
    
    for (const testCase of testCases) {
      try {
        const result = await executeCodeInContainer(testCase.code, testCase.language);
        results.push({
          language: testCase.language,
          success: result.success,
          output: result.output,
          expectedOutput: testCase.expectedOutput,
          matches: result.output.includes(testCase.expectedOutput)
        });
      } catch (error) {
        results.push({
          language: testCase.language,
          success: false,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      testResults: results,
      summary: {
        total: testCases.length,
        passed: results.filter(r => r.success && r.matches).length,
        failed: results.filter(r => !r.success || !r.matches).length
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to run test cases',
      message: error.message
    });
  }
});

export default router;
