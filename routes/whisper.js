import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import WhisperService from '../services/whisperService.js';
import { authenticateToken } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const whisperService = new WhisperService();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `audio-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/mp4', 
      'audio/m4a', 'audio/webm', 'audio/ogg'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio file type. Supported formats: MP3, WAV, MP4, M4A, WEBM, OGG'), false);
    }
  }
});

/**
 * @route POST /api/whisper/transcribe
 * @desc Convert recorded audio to text using local Whisper service
 * @access Private
 */
router.post('/transcribe', authenticateToken, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        text: null,
        error: 'No audio file provided'
      });
    }

    const options = {
      model: req.body.model || 'base',
      language: req.body.language || 'en',
      prompt: req.body.prompt || '',
      responseFormat: req.body.responseFormat || 'json',
      temperature: parseFloat(req.body.temperature) || 0.0
    };

    console.log(`🎤 Processing audio file: ${req.file.originalname}`);
    
    const result = await whisperService.transcribeFromFormData(req.file, options);
    
    // Clean up uploaded file
    try {
      const fs = await import('fs');
      fs.unlinkSync(req.file.path);
      console.log(`🗑️ Cleaned up uploaded file: ${req.file.path}`);
    } catch (cleanupError) {
      console.warn('⚠️ Failed to clean up uploaded file:', cleanupError.message);
    }

    if (result.success) {
      res.json({
        success: true,
        text: result.text,
        error: null
      });
    } else {
      res.status(400).json({
        success: false,
        text: null,
        error: result.error
      });
    }

  } catch (error) {
    console.error('❌ Transcription error:', error);
    res.status(500).json({
      success: false,
      text: null,
      error: error.message || 'Transcription failed'
    });
  }
});

/**
 * @route POST /api/whisper/transcribe-file
 * @desc Transcribe audio file from file upload
 * @access Private
 */
router.post('/transcribe-file', authenticateToken, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No audio file provided'
      });
    }

    const options = {
      model: req.body.model || 'base',
      language: req.body.language || 'en',
      prompt: req.body.prompt || '',
      responseFormat: req.body.responseFormat || 'json',
      temperature: parseFloat(req.body.temperature) || 0.0
    };

    console.log(`🎤 Processing audio file: ${req.file.originalname}`);
    
    const result = await whisperService.transcribeFromFormData(req.file, options);
    
    // Clean up uploaded file
    try {
      const fs = await import('fs');
      fs.unlinkSync(req.file.path);
      console.log(`🗑️ Cleaned up uploaded file: ${req.file.path}`);
    } catch (cleanupError) {
      console.warn('⚠️ Failed to clean up uploaded file:', cleanupError.message);
    }

    if (result.success) {
      res.json({
        success: true,
        transcription: result.text,
        language: result.language,
        timestamp: result.timestamp,
        metadata: {
          originalFilename: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('❌ File transcription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to transcribe audio file',
      message: error.message
    });
  }
});

/**
 * @route POST /api/whisper/transcribe-base64
 * @desc Transcribe audio from base64 data
 * @access Private
 */
router.post('/transcribe-base64', authenticateToken, async (req, res) => {
  try {
    const { audioData, filename, language, prompt, responseFormat, temperature, model } = req.body;

    if (!audioData) {
      return res.status(400).json({
        success: false,
        error: 'No audio data provided'
      });
    }

    const options = {
      model: model || 'base',
      language: language || 'en',
      prompt: prompt || '',
      responseFormat: responseFormat || 'json',
      temperature: parseFloat(temperature) || 0.0
    };

    console.log(`🎤 Processing base64 audio data`);
    
    const result = await whisperService.transcribeFromBase64(
      audioData, 
      filename || 'temp_audio.wav', 
      options
    );

    if (result.success) {
      res.json({
        success: true,
        transcription: result.text,
        language: result.language,
        timestamp: result.timestamp
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('❌ Base64 transcription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to transcribe audio data',
      message: error.message
    });
  }
});

/**
 * @route POST /api/whisper/transcribe-url
 * @desc Transcribe audio from URL
 * @access Private
 */
router.post('/transcribe-url', authenticateToken, async (req, res) => {
  try {
    const { audioUrl, language, prompt, responseFormat, temperature, model } = req.body;

    if (!audioUrl) {
      return res.status(400).json({
        success: false,
        error: 'No audio URL provided'
      });
    }

    // Download audio file from URL
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Failed to download audio from URL: ${response.statusText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    
    // Determine file extension from URL or content type
    const urlPath = new URL(audioUrl).pathname;
    const extension = path.extname(urlPath) || '.mp3';
    const filename = `url_audio_${Date.now()}${extension}`;

    const options = {
      model: model || 'base',
      language: language || 'en',
      prompt: prompt || '',
      responseFormat: responseFormat || 'json',
      temperature: parseFloat(temperature) || 0.0
    };

    console.log(`🎤 Processing audio from URL: ${audioUrl}`);
    
    const result = await whisperService.transcribeFromBase64(base64Audio, filename, options);

    if (result.success) {
      res.json({
        success: true,
        transcription: result.text,
        language: result.language,
        timestamp: result.timestamp,
        metadata: {
          sourceUrl: audioUrl,
          fileSize: audioBuffer.byteLength
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('❌ URL transcription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to transcribe audio from URL',
      message: error.message
    });
  }
});

/**
 * @route GET /api/whisper/languages
 * @desc Get supported languages
 * @access Public
 */
router.get('/languages', (req, res) => {
  try {
    const languages = whisperService.getSupportedLanguages();
    
    res.json({
      success: true,
      languages: languages,
      count: languages.length
    });
  } catch (error) {
    console.error('❌ Languages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get supported languages',
      message: error.message
    });
  }
});

/**
 * @route GET /api/whisper/models
 * @desc Get available Whisper models
 * @access Public
 */
router.get('/models', (req, res) => {
  try {
    const models = whisperService.getAvailableModels();
    
    res.json({
      success: true,
      models: models,
      count: models.length,
      default: 'base'
    });
  } catch (error) {
    console.error('❌ Models error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get available models',
      message: error.message
    });
  }
});

/**
 * @route GET /api/whisper/status
 * @desc Check if Whisper is available and working
 * @access Public
 */
router.get('/status', async (req, res) => {
  try {
    const isAvailable = await whisperService.isWhisperAvailable();
    
    res.json({
      success: true,
      available: isAvailable,
      message: isAvailable ? 'Whisper is ready' : 'Whisper is not available - check Python installation and dependencies'
    });
  } catch (error) {
    console.error('❌ Status check error:', error);
    res.status(500).json({
      success: false,
      available: false,
      error: 'Failed to check Whisper status',
      message: error.message
    });
  }
});

/**
 * @route POST /api/whisper/validate-file
 * @desc Validate audio file before transcription
 * @access Private
 */
router.post('/validate-file', authenticateToken, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No audio file provided'
      });
    }

    const validation = whisperService.validateAudioFile(req.file.path);
    
    // Clean up uploaded file
    try {
      const fs = await import('fs');
      fs.unlinkSync(req.file.path);
    } catch (cleanupError) {
      console.warn('⚠️ Failed to clean up uploaded file:', cleanupError.message);
    }

    res.json({
      success: true,
      valid: validation.valid,
      error: validation.error || null,
      metadata: {
        filename: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype
      }
    });

  } catch (error) {
    console.error('❌ File validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate audio file',
      message: error.message
    });
  }
});

export default router;
