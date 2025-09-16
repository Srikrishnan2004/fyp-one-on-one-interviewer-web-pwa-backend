import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { corsOptions, errorHandler, notFound } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import sessionRoutes from './routes/sessions.js';
import conversationRoutes from './routes/conversations.js';
import performanceRoutes from './routes/performance.js';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Virtual Interviewer Backend is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/performance', performanceRoutes);

// API Documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Virtual Interviewer Backend API',
    version: '1.0.0',
    endpoints: {
      auth: {
        base: '/api/auth',
        routes: [
          'POST /register - Register new user',
          'POST /login - User login',
          'GET /profile - Get user profile',
          'PUT /profile - Update user profile',
          'PUT /change-password - Change password',
          'DELETE /account - Deactivate account',
          'POST /refresh - Refresh JWT token',
          'POST /logout - User logout',
          'GET /check-username/:username - Check username availability',
          'GET /check-email/:email - Check email availability'
        ]
      },
      sessions: {
        base: '/api/sessions',
        routes: [
          'POST / - Create new session',
          'GET / - Get user sessions',
          'GET /summary - Get session summary',
          'GET /active - Get active sessions',
          'GET /:id - Get specific session',
          'PUT /:id - Update session',
          'POST /:id/start - Start session',
          'POST /:id/end - End session',
          'POST /:id/pause - Pause session',
          'POST /:id/resume - Resume session',
          'POST /:id/abandon - Abandon session',
          'PUT /:id/question-count - Update question count',
          'DELETE /:id - Delete session'
        ]
      },
      conversations: {
        base: '/api/conversations',
        routes: [
          'POST / - Create new conversation',
          'GET / - Get user conversations',
          'GET /stats - Get conversation statistics',
          'GET /session/:sessionId - Get session conversations',
          'GET /category/:category - Get conversations by category',
          'GET /difficulty/:difficulty - Get conversations by difficulty',
          'GET /:id - Get specific conversation',
          'PUT /:id/answer - Submit user answer',
          'PUT /:id/feedback - Update LLM feedback',
          'PUT /:id - Update conversation',
          'DELETE /:id - Delete conversation'
        ]
      },
      performance: {
        base: '/api/performance',
        routes: [
          'POST / - Create performance record',
          'POST /batch - Create multiple performance records',
          'GET / - Get user performance records',
          'GET /summary - Get performance summary',
          'GET /trends/:metricType - Get performance trends',
          'GET /insights - Get performance insights',
          'GET /compare-sessions - Compare session performance',
          'GET /leaderboard/:metricType - Get performance leaderboard',
          'GET /dashboard/analytics - Get dashboard analytics',
          'GET /:id - Get specific performance record',
          'PUT /:id - Update performance record',
          'DELETE /:id - Delete performance record'
        ]
      }
    },
    authentication: {
      type: 'JWT Bearer Token',
      header: 'Authorization: Bearer <token>',
      note: 'Most endpoints require authentication except /health, /api, and auth endpoints'
    }
  });
});

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

export default app;
