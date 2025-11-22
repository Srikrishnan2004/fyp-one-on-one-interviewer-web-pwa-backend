import express from 'express';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import OllamaService from '../ollama/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const execAsync = promisify(exec);

// Initialize Ollama service
const ollamaService = new OllamaService();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'audios/');
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const baseFileName = `learn_coding_${timestamp}`;
    req.audioFileName = baseFileName;
    cb(null, `${baseFileName}.wav`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'), false);
    }
  }
});

// Helper function to convert audio to WAV format if needed
const convertToWav = async (inputPath, outputPath) => {
  try {
    // Use ffmpeg to convert to WAV format
    await execAsync(`ffmpeg -i "${inputPath}" -acodec pcm_s16le -ar 16000 "${outputPath}" -y`);
    return outputPath;
  } catch (error) {
    console.error('Error converting audio to WAV:', error);
    throw new Error('Failed to convert audio to WAV format');
  }
};

// Helper function to transcribe audio using Whisper
const transcribeAudio = async (audioPath) => {
  try {
    // Use local Whisper service for transcription
    const whisperCommand = `python whisper_local.py "${audioPath}"`;
    const { stdout } = await execAsync(whisperCommand);
    
    // Parse the transcription result
    const transcription = stdout.trim();
    
    // Check if transcription is empty or contains error messages
    if (!transcription || transcription.includes('ModuleNotFoundError') || transcription.includes('Traceback')) {
      throw new Error('Whisper transcription failed - module not properly installed');
    }
    
    return transcription;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    
    // Provide more specific error messages
    if (error.message.includes('ModuleNotFoundError') || error.stderr?.includes('ModuleNotFoundError')) {
      throw new Error('Whisper module not installed. Please install: pip install openai-whisper');
    } else if (error.message.includes('Command failed')) {
      throw new Error('Whisper transcription service unavailable. Please check Whisper installation.');
    } else {
      throw new Error('Failed to transcribe audio. Please ensure Whisper is properly installed and configured.');
    }
  }
};

// Helper function to generate LLM response
const generateLLMResponse = async (code, transcription, language = 'python') => {
  try {
    let prompt;
    
    if (transcription.includes('Voice explanation not available')) {
      // Fallback prompt when transcription fails
      prompt = `
You are an expert coding instructor. A student has submitted code for analysis.

Code:
\`\`\`${language}
${code}
\`\`\`

Note: The student's voice explanation could not be transcribed due to technical issues.

Please provide a comprehensive analysis including:
1. Code explanation and how it works
2. Code quality assessment
3. Suggestions for improvement
4. Alternative approaches
5. Best practices related to this code
6. Common mistakes to avoid

Format your response as a detailed explanation that would be helpful for learning.
`;
    } else {
      // Normal prompt with transcription
      prompt = `
You are an expert coding instructor. A student has submitted code and provided a voice explanation.

Code:
\`\`\`${language}
${code}
\`\`\`

Student's Voice Explanation:
"${transcription}"

Please provide a comprehensive analysis including:
1. Code explanation and how it works
2. Analysis of the student's understanding based on their explanation
3. Suggestions for improvement
4. Alternative approaches
5. Best practices related to this code
6. Common mistakes to avoid

Format your response as a detailed explanation that would be helpful for learning.
`;
    }

    const response = await ollamaService.generateResponse(prompt);
    
    // Handle the new structured response format for learn coding
    if (response && typeof response === 'object' && response.text) {
      return {
        text: response.text,
        code: response.code || null
      };
    } else if (Array.isArray(response) && response.length > 0) {
      // Fallback for old format
      return {
        text: response[0]?.text || response[0] || 'No response generated',
        code: null
      };
    } else if (typeof response === 'string') {
      // Fallback for string response
      return {
        text: response,
        code: null
      };
    } else {
      console.warn('Unexpected Ollama response format:', response);
      return {
        text: 'Code analysis completed, but response format was unexpected.',
        code: null
      };
    }
  } catch (error) {
    console.error('Error generating LLM response:', error);
    throw new Error('Failed to generate LLM response');
  }
};

// Helper function to execute commands (matching interview route pattern)
const execCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(error);
      resolve(stdout);
    });
  });
};

// Helper function to call Piper TTS Python script (exactly matching interview route pattern)
const piperTTS = async (text, modelPath, outputFile) => {
  return new Promise((resolve, reject) => {
    // Truncate text if too long and escape properly
    const maxLength = 500; // Limit text length to prevent command line issues
    const truncatedText = text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
    
    // Escape quotes and special characters properly for command line
    const escapedText = truncatedText
      .replace(/"/g, '\\"')
      .replace(/\n/g, ' ')
      .replace(/\r/g, ' ')
      .replace(/\t/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    const command = `python piper_tts.py "${escapedText}" "${modelPath}" "${outputFile}"`;
    console.log(`Executing: ${command}`);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Piper TTS error: ${error.message}`);
        console.error(`Stderr: ${stderr}`);
        reject(error);
      } else {
        console.log(`Piper TTS output: ${stdout}`);
        resolve(stdout);
      }
    });
  });
};

// Helper function to generate lip-sync using Rhubarb (exactly matching interview route pattern)
const lipSyncMessage = async (baseFileName) => {
  const time = new Date().getTime();
  console.log(`Starting lip sync for message ${baseFileName}`);
  // Since Piper TTS already generates WAV files, we can skip the MP3 to WAV conversion
  await execCommand(
    `"C:\\Program Files\\Rhubarb-Lip-Sync-1.14.0-Windows\\rhubarb.exe" -f json -o audios/${baseFileName}.json audios/${baseFileName}.wav -r phonetic`
  );
  // -r phonetic is faster but less accurate
  console.log(`Lip sync done in ${new Date().getTime() - time}ms`);
};

// Helper function to convert audio file to base64
const audioFileToBase64 = async (filePath) => {
  try {
    const data = await fs.readFile(filePath);
    return data.toString('base64');
  } catch (error) {
    console.error('Error converting audio to base64:', error);
    throw new Error('Failed to convert audio to base64');
  }
};

// Helper function to read JSON transcript (matching interview route pattern)
const readJsonTranscript = async (file) => {
  try {
    const data = await fs.readFile(file, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading JSON transcript:', error);
    throw new Error('Failed to read JSON transcript');
  }
};

// Main endpoint for Learn Coding feature
router.post('/learn-coding', authenticateToken, upload.single('audio'), async (req, res) => {
  try {
    const { code, language = 'python' } = req.body;
    const audioFile = req.file;
    
    // Validate required fields
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Code is required'
      });
    }
    
    if (!audioFile) {
      return res.status(400).json({
        success: false,
        message: 'Audio file is required'
      });
    }
    
    const timestamp = Date.now();
    const baseFileName = req.audioFileName || `learn_coding_${timestamp}`;
    
    // Step 1: Convert audio to WAV format if needed
    let wavPath = audioFile.path;
    if (!audioFile.path.endsWith('.wav')) {
      wavPath = `audios/${baseFileName}_converted.wav`;
      await convertToWav(audioFile.path, wavPath);
    }
    
    // Step 2: Transcribe audio using Whisper (with fallback)
    console.log('Transcribing audio...');
    let transcription = '';
    let transcriptionError = null;
    
    try {
      transcription = await transcribeAudio(wavPath);
    } catch (error) {
      console.warn('Transcription failed, proceeding without voice explanation:', error.message);
      transcriptionError = error.message;
      transcription = 'Voice explanation not available - Whisper module not installed.';
    }
    
    // Step 3: Generate LLM response
    console.log('Generating LLM response...');
    const llmResponseData = await generateLLMResponse(code, transcription, language);
    
    // Step 4: Generate TTS audio from LLM response (following interview route pattern)
    console.log('Generating TTS audio...');
    const piperModel = "models/en_US-amy-medium.onnx";
    const fileName = `audios/${baseFileName}_response.wav`;
    
    try {
      // Generate audio file using Piper TTS
      await piperTTS(llmResponseData.text, piperModel, fileName);
      // Generate lipsync
      await lipSyncMessage(`${baseFileName}_response`);
      
      // Convert audio to base64 and read lip-sync JSON
      const [audioBase64, lipSyncData] = await Promise.all([
        audioFileToBase64(fileName),
        readJsonTranscript(`audios/${baseFileName}_response.json`)
      ]);
      
      // Step 5: Return comprehensive response
      res.json({
        success: true,
        message: 'Learn coding session processed successfully',
        data: {
          session_id: `learn_${timestamp}`,
          code: {
            content: code,
            language: language
          },
          transcription: {
            text: transcription,
            confidence: transcriptionError ? 0 : 0.95,
            status: transcriptionError ? 'failed' : 'success',
            error: transcriptionError || null
          },
          llm_response: {
            text: llmResponseData.text,
            code: llmResponseData.code,
            audio: audioBase64,
            lipsync: lipSyncData
          },
          metadata: {
            processing_time: Date.now() - timestamp,
            audio_duration: 'calculated_duration', // You can calculate this
            created_at: new Date().toISOString()
          }
        }
      });
      
    } catch (audioError) {
      console.error('Failed to generate audio for LLM response:', audioError);
      
      // Return response without audio if TTS fails
      res.json({
        success: true,
        message: 'Learn coding session processed successfully (audio generation failed)',
        data: {
          session_id: `learn_${timestamp}`,
          code: {
            content: code,
            language: language
          },
          transcription: {
            text: transcription,
            confidence: transcriptionError ? 0 : 0.95,
            status: transcriptionError ? 'failed' : 'success',
            error: transcriptionError || null
          },
          llm_response: {
            text: llmResponseData.text,
            code: llmResponseData.code,
            audio: null,
            lipsync: null
          },
          metadata: {
            processing_time: Date.now() - timestamp,
            audio_duration: null,
            created_at: new Date().toISOString()
          }
        }
      });
    }
    
  } catch (error) {
    console.error('Error in learn coding endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process learn coding session',
      error: error.message
    });
  }
});

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    // Check if required services are available
    const checks = {
      whisper: false,
      rhubarb: false,
      ollama: false,
      piper: false
    };
    
    try {
      // Check Whisper by trying to import the module
      await execAsync('python -c "import whisper; print(\'Whisper available\')"');
      checks.whisper = true;
    } catch (e) {
      console.warn('Whisper not available - ModuleNotFoundError: No module named \'whisper\'');
      checks.whisper = false;
    }
    
    try {
      // Check Rhubarb
      await execAsync('"C:\\Program Files\\Rhubarb-Lip-Sync-1.14.0-Windows\\rhubarb.exe" --version');
      checks.rhubarb = true;
    } catch (e) {
      console.warn('Rhubarb not available');
    }
    
    try {
      // Check Ollama
      await ollamaService.generateResponse('test');
      checks.ollama = true;
    } catch (e) {
      console.warn('Ollama not available');
    }
    
    try {
      // Check Piper TTS
      await execAsync('python piper_tts.py --version');
      checks.piper = true;
    } catch (e) {
      console.warn('Piper TTS not available');
    }
    
    res.json({
      success: true,
      message: 'Learn Coding service health check',
      services: checks,
      status: Object.values(checks).every(check => check) ? 'healthy' : 'degraded'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

export default router;
