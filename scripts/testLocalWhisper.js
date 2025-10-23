import WhisperService from '../services/whisperService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

async function testLocalWhisper() {
  console.log('🧪 Testing Local Whisper Integration...\n');

  const whisperService = new WhisperService();

  // Test 1: Check if Whisper script exists
  console.log('1. Checking Whisper Python script...');
  const scriptPath = path.join(__dirname, '..', 'whisper_local.py');
  if (fs.existsSync(scriptPath)) {
    console.log('✅ Whisper Python script found');
  } else {
    console.log('❌ Whisper Python script not found');
    console.log('   Expected location:', scriptPath);
    return;
  }

  // Test 2: Check Whisper availability
  console.log('\n2. Testing Whisper availability...');
  try {
    const isAvailable = await whisperService.isWhisperAvailable();
    if (isAvailable) {
      console.log('✅ Whisper is available and working');
    } else {
      console.log('❌ Whisper is not available');
      console.log('   Please check:');
      console.log('   - Python is installed and in PATH');
      console.log('   - Whisper is installed: pip install git+https://github.com/openai/whisper.git');
      console.log('   - FFmpeg is installed and in PATH');
      return;
    }
  } catch (error) {
    console.log('❌ Error checking Whisper availability:', error.message);
    return;
  }

  // Test 3: Check available models
  console.log('\n3. Testing available models...');
  const models = whisperService.getAvailableModels();
  console.log(`✅ Found ${models.length} available models:`, models.join(', '));

  // Test 4: Check supported languages
  console.log('\n4. Testing supported languages...');
  const languages = whisperService.getSupportedLanguages();
  console.log(`✅ Found ${languages.length} supported languages`);
  console.log(`   Sample languages: ${languages.slice(0, 10).join(', ')}...`);

  // Test 5: Test with existing audio file
  console.log('\n5. Testing with existing audio file...');
  const testAudioPath = path.join(__dirname, '..', 'audios', 'intro_0.wav');
  
  if (fs.existsSync(testAudioPath)) {
    console.log(`   Found test audio file: ${testAudioPath}`);
    
    try {
      console.log('   Starting transcription test...');
      const result = await whisperService.transcribeAudio(testAudioPath, {
        model: 'tiny', // Use smallest model for testing
        language: 'en'
      });
      
      if (result.success) {
        console.log('✅ Transcription test successful!');
        console.log(`   Transcribed text: "${result.text}"`);
        console.log(`   Detected language: ${result.language}`);
        console.log(`   Model used: ${result.model}`);
      } else {
        console.log('❌ Transcription test failed:', result.error);
      }
    } catch (error) {
      console.log('❌ Transcription test error:', error.message);
    }
  } else {
    console.log('⚠️  Test audio file not found, skipping transcription test');
    console.log(`   Expected location: ${testAudioPath}`);
  }

  // Test 6: Test file validation
  console.log('\n6. Testing file validation...');
  if (fs.existsSync(testAudioPath)) {
    const validation = whisperService.validateAudioFile(testAudioPath);
    if (validation.valid) {
      console.log('✅ File validation passed');
    } else {
      console.log('❌ File validation failed:', validation.error);
    }
  } else {
    console.log('⚠️  Skipping file validation test (no test file)');
  }

  console.log('\n🎉 Local Whisper integration test completed!');
  console.log('\n📋 Next Steps:');
  console.log('1. Install Python dependencies: pip install git+https://github.com/openai/whisper.git');
  console.log('2. Install FFmpeg for your operating system');
  console.log('3. Test the API endpoints with real audio files');
  console.log('4. Integrate with your frontend for voice input');
  console.log('\n📖 See LOCAL_WHISPER_SETUP_GUIDE.md for detailed setup instructions');
}

// Run the test
testLocalWhisper().catch(console.error);
