import dotenv from "dotenv";
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

app.listen(port, () => {
  console.log(`Virtual AI Interviewer Backend listening on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`API Documentation: http://localhost:${port}/api`);
});
