import { pipeline } from '@xenova/transformers';
import dotenv from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';

dotenv.config();

const MODEL_NAME = process.env.EMBEDDING_MODEL_NAME || 'sentence-transformers/all-MiniLM-L6-v2';
const MODEL_PATH = process.env.EMBEDDING_MODEL_PATH || './models/embeddings';

async function downloadModel() {
  try {
    console.log('Starting model download...');
    console.log(`Model: ${MODEL_NAME}`);
    console.log(`Path: ${MODEL_PATH}`);
    
    // Create models directory if it doesn't exist
    await fs.mkdir(MODEL_PATH, { recursive: true });
    console.log(`Created directory: ${MODEL_PATH}`);
    
    // Download and initialize the model
    console.log('Downloading model files...');
    const featureExtractor = await pipeline('feature-extraction', MODEL_NAME, {
      local_files_only: false, // Allow downloading
      cache_dir: MODEL_PATH,
      progress_callback: (progress) => {
        if (progress.status === 'downloading') {
          console.log(`Downloading: ${progress.file} (${Math.round(progress.progress * 100)}%)`);
        }
      }
    });
    
    console.log('Model downloaded successfully!');
    
    // Test the model
    console.log('Testing the model...');
    const testText = "This is a test sentence for embedding generation.";
    const result = await featureExtractor(testText, {
      pooling: 'mean',
      normalize: true
    });
    
    console.log('Model test successful!');
    console.log(`Embedding dimension: ${result.data.length}`);
    console.log(`First 5 values: [${Array.from(result.data).slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`);
    
    // List downloaded files
    try {
      const files = await fs.readdir(MODEL_PATH);
      console.log('\nDownloaded files:');
      files.forEach(file => {
        console.log(`  - ${file}`);
      });
    } catch (error) {
      console.log('Could not list files in model directory');
    }
    
    console.log('\nModel download completed successfully!');
    console.log('You can now use the embedding service without an API key.');
    
  } catch (error) {
    console.error('Error downloading model:', error);
    console.error('Please check your internet connection and try again.');
    process.exit(1);
  }
}

// Run the download
downloadModel();
