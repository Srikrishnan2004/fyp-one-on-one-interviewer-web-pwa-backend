import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

export class WhisperService {
  constructor() {
    // Path to the local Whisper Python script
    this.whisperScript = path.join(__dirname, '..', 'whisper_local.py');
    
    // Supported audio formats
    this.supportedFormats = [
      'mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm', 'ogg', 'flac'
    ];
    
    // Maximum file size (100MB for local processing)
    this.maxFileSize = 100 * 1024 * 1024;
    
    // Available Whisper models
    this.availableModels = ['tiny', 'base', 'small', 'medium', 'large'];
    
    // Default model
    this.defaultModel = 'base';
  }

  /**
   * Transcribe audio file using local Whisper model
   * @param {string} audioFilePath - Path to the audio file
   * @param {Object} options - Transcription options
   * @returns {Promise<Object>} Transcription result
   */
  async transcribeAudio(audioFilePath, options = {}) {
    try {
      // Validate file exists
      if (!fs.existsSync(audioFilePath)) {
        throw new Error(`Audio file not found: ${audioFilePath}`);
      }

      // Check file size
      const stats = fs.statSync(audioFilePath);
      if (stats.size > this.maxFileSize) {
        throw new Error(`File too large. Maximum size is ${this.maxFileSize / (1024 * 1024)}MB`);
      }

      // Check file format
      const fileExtension = path.extname(audioFilePath).toLowerCase().slice(1);
      if (!this.supportedFormats.includes(fileExtension)) {
        throw new Error(`Unsupported audio format: ${fileExtension}. Supported formats: ${this.supportedFormats.join(', ')}`);
      }

      console.log(`🎤 Starting local Whisper transcription for: ${audioFilePath}`);
      
      // Prepare command arguments
      const model = options.model || this.defaultModel;
      const language = options.language || null;
      const prompt = options.prompt || null;
      const temperature = options.temperature || 0.0;
      
      // Build command
      let command = `python "${this.whisperScript}" "${audioFilePath}" --model ${model} --temperature ${temperature} --output-format json`;
      
      if (language) {
        command += ` --language ${language}`;
      }
      
      if (prompt) {
        // Escape quotes in prompt for command line
        const escapedPrompt = prompt.replace(/"/g, '\\"');
        command += ` --prompt "${escapedPrompt}"`;
      }
      
      console.log(`Executing: ${command}`);
      
      // Execute Python script
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr) {
        console.warn('Python script stderr:', stderr);
      }
      
      // Parse JSON result
      const result = JSON.parse(stdout);
      
      if (result.success) {
        console.log(`✅ Local Whisper transcription completed successfully`);
        return {
          success: true,
          text: result.text,
          language: result.language,
          model: result.model,
          metadata: result.metadata,
          timestamp: new Date().toISOString()
        };
      } else {
        throw new Error(result.error || 'Transcription failed');
      }

    } catch (error) {
      console.error('❌ Local Whisper transcription failed:', error);
      return {
        success: false,
        error: error.message,
        text: null
      };
    }
  }

  /**
   * Transcribe audio from base64 data
   * @param {string} base64Audio - Base64 encoded audio data
   * @param {string} filename - Filename for the temporary file
   * @param {Object} options - Transcription options
   * @returns {Promise<Object>} Transcription result
   */
  async transcribeFromBase64(base64Audio, filename = 'temp_audio.wav', options = {}) {
    try {
      // Create temporary file path
      const tempDir = path.join(__dirname, '..', 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempFilePath = path.join(tempDir, filename);
      
      // Convert base64 to file
      const audioBuffer = Buffer.from(base64Audio, 'base64');
      fs.writeFileSync(tempFilePath, audioBuffer);
      
      console.log(`📁 Created temporary audio file: ${tempFilePath}`);
      
      // Transcribe the temporary file
      const result = await this.transcribeAudio(tempFilePath, options);
      
      // Clean up temporary file
      try {
        fs.unlinkSync(tempFilePath);
        console.log(`🗑️ Cleaned up temporary file: ${tempFilePath}`);
      } catch (cleanupError) {
        console.warn('⚠️ Failed to clean up temporary file:', cleanupError.message);
      }
      
      return result;

    } catch (error) {
      console.error('❌ Base64 transcription failed:', error);
      return {
        success: false,
        error: error.message,
        text: null
      };
    }
  }

  /**
   * Transcribe audio from multipart form data
   * @param {Object} file - Multer file object
   * @param {Object} options - Transcription options
   * @returns {Promise<Object>} Transcription result
   */
  async transcribeFromFormData(file, options = {}) {
    try {
      if (!file) {
        throw new Error('No audio file provided');
      }

      console.log(`📤 Processing uploaded file: ${file.originalname}`);
      
      // Use the uploaded file path directly
      const result = await this.transcribeAudio(file.path, options);
      
      return result;

    } catch (error) {
      console.error('❌ Form data transcription failed:', error);
      return {
        success: false,
        error: error.message,
        text: null
      };
    }
  }

  /**
   * Get available Whisper models
   * @returns {Array} Array of available model names
   */
  getAvailableModels() {
    return this.availableModels;
  }

  /**
   * Get supported languages for Whisper
   * @returns {Array} Array of supported language codes
   */
  getSupportedLanguages() {
    return [
      'af', 'am', 'ar', 'as', 'az', 'ba', 'be', 'bg', 'bn', 'bo', 'br', 'bs', 'ca', 'cs', 'cy', 'da', 'de', 'el', 'en', 'es', 'et', 'eu', 'fa', 'fi', 'fo', 'fr', 'gl', 'gu', 'ha', 'haw', 'he', 'hi', 'hr', 'ht', 'hu', 'hy', 'id', 'is', 'it', 'ja', 'jw', 'ka', 'kk', 'km', 'kn', 'ko', 'la', 'lb', 'ln', 'lo', 'lt', 'lv', 'mg', 'mi', 'mk', 'ml', 'mn', 'mr', 'ms', 'mt', 'my', 'ne', 'nl', 'nn', 'no', 'oc', 'pa', 'pl', 'ps', 'pt', 'ro', 'ru', 'sa', 'sd', 'si', 'sk', 'sl', 'sn', 'so', 'sq', 'sr', 'su', 'sv', 'sw', 'ta', 'te', 'tg', 'th', 'tk', 'tl', 'tr', 'tt', 'uk', 'ur', 'uz', 'vi', 'yi', 'yo', 'zh'
    ];
  }

  /**
   * Check if Whisper Python script is available
   * @returns {Promise<boolean>} True if script is available
   */
  async isWhisperAvailable() {
    try {
      if (!fs.existsSync(this.whisperScript)) {
        return false;
      }
      
      // Try to run the script with --list-models to check if it works
      const { stdout } = await execAsync(`python "${this.whisperScript}" --list-models --output-format json`);
      const result = JSON.parse(stdout);
      return result.models && result.models.length > 0;
    } catch (error) {
      console.warn('Whisper availability check failed:', error.message);
      return false;
    }
  }

  /**
   * Validate audio file before transcription
   * @param {string} filePath - Path to audio file
   * @returns {Object} Validation result
   */
  validateAudioFile(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return { valid: false, error: 'File does not exist' };
      }

      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        return { valid: false, error: 'File is empty' };
      }

      if (stats.size > this.maxFileSize) {
        return { valid: false, error: `File too large. Maximum size is ${this.maxFileSize / (1024 * 1024)}MB` };
      }

      const fileExtension = path.extname(filePath).toLowerCase().slice(1);
      if (!this.supportedFormats.includes(fileExtension)) {
        return { valid: false, error: `Unsupported format: ${fileExtension}` };
      }

      return { valid: true };

    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
}

export default WhisperService;
