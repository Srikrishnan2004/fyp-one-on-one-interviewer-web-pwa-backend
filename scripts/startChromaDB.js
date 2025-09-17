#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ChromaDB server configuration
const CHROMA_HOST = process.env.CHROMA_HOST || 'localhost';
const CHROMA_PORT = process.env.CHROMA_PORT || '8000';
const CHROMA_DB_PATH = process.env.CHROMA_DB_PATH || './chroma_db';

console.log('🚀 Starting ChromaDB Server...');
console.log(`📍 Host: ${CHROMA_HOST}`);
console.log(`🔌 Port: ${CHROMA_PORT}`);
console.log(`💾 Database Path: ${CHROMA_DB_PATH}`);

// Start ChromaDB server
const chromaProcess = spawn('chroma', [
  'run',
  '--host', CHROMA_HOST,
  '--port', CHROMA_PORT,
  '--path', CHROMA_DB_PATH
], {
  stdio: 'inherit',
  shell: true
});

chromaProcess.on('error', (error) => {
  console.error('❌ Failed to start ChromaDB server:', error.message);
  console.log('\n📋 To install ChromaDB server:');
  console.log('   pip install chromadb');
  console.log('\n📋 Or use Docker:');
  console.log('   docker run -p 8000:8000 chromadb/chroma');
  process.exit(1);
});

chromaProcess.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ ChromaDB server exited with code ${code}`);
  } else {
    console.log('✅ ChromaDB server stopped');
  }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down ChromaDB server...');
  chromaProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down ChromaDB server...');
  chromaProcess.kill('SIGTERM');
});

console.log('\n✅ ChromaDB server is starting...');
console.log(`🌐 Server will be available at: http://${CHROMA_HOST}:${CHROMA_PORT}`);
console.log('📝 Press Ctrl+C to stop the server');
