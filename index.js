import dotenv from "dotenv";
import https from "https";
import fs from "fs";
import app from "./app.js";
import { closePool } from "./config/database.js";

dotenv.config();

const port = process.env.PORT || 3000;

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await closePool();
  process.exit(0);
});

// HTTPS configuration for development
const httpsOptions = {
  key: fs.readFileSync('./certs/localhost-key.pem'),
  cert: fs.readFileSync('./certs/localhost-cert.pem')
};

// Create HTTPS server
https.createServer(httpsOptions, app).listen(port, '0.0.0.0', () => {
  console.log(`Virtual AI Interviewer Backend listening on port ${port}`);
  console.log(`Health check: https://localhost:${port}/health`);
  console.log(`API Documentation: https://localhost:${port}/api`);
  console.log(`Network access: https://0.0.0.0:${port}`);
  console.log('⚠️  Using self-signed certificate for development');
});
