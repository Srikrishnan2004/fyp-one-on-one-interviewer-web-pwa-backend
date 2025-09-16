# Virtual Interviewer Backend - Setup Guide

This guide will help you set up the complete Virtual Interviewer Backend with PostgreSQL database integration.

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- Python 3.x (for TTS functionality)
- Git

## Database Setup

### 1. Install PostgreSQL

**Windows:**
- Download from [postgresql.org](https://www.postgresql.org/download/windows/)
- Install with default settings
- Remember the password you set for the `postgres` user

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Create Database

1. Open PostgreSQL command line or pgAdmin
2. Create a new database:
```sql
CREATE DATABASE virtual_interviewer_db;
```

3. Run the database setup script:
```bash
psql -d virtual_interviewer_db -f database_setup.sql
```

Or copy the contents of `database_setup.sql` and run it in your PostgreSQL client.

## Application Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

1. Copy the environment template:
```bash
cp env.example .env
```

2. Edit `.env` file with your configuration:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=virtual_interviewer_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=3000
NODE_ENV=development

# OpenAI Configuration (if using OpenAI)
OPENAI_API_KEY=your_openai_api_key_here

# ElevenLabs Configuration (if using ElevenLabs)
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

### 3. Start the Application

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:3000`

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - User login
- `GET /profile` - Get user profile
- `PUT /profile` - Update user profile
- `PUT /change-password` - Change password
- `DELETE /account` - Deactivate account

### Sessions (`/api/sessions`)
- `POST /` - Create new session
- `GET /` - Get user sessions
- `GET /summary` - Get session summary
- `GET /active` - Get active sessions
- `GET /:id` - Get specific session
- `PUT /:id` - Update session
- `POST /:id/start` - Start session
- `POST /:id/end` - End session
- `POST /:id/pause` - Pause session
- `POST /:id/resume` - Resume session

### Conversations (`/api/conversations`)
- `POST /` - Create new conversation
- `GET /` - Get user conversations
- `GET /stats` - Get conversation statistics
- `GET /session/:sessionId` - Get session conversations
- `GET /:id` - Get specific conversation
- `PUT /:id/answer` - Submit user answer
- `PUT /:id/feedback` - Update LLM feedback

### Performance (`/api/performance`)
- `POST /` - Create performance record
- `POST /batch` - Create multiple performance records
- `GET /` - Get user performance records
- `GET /summary` - Get performance summary
- `GET /trends/:metricType` - Get performance trends
- `GET /insights` - Get performance insights
- `GET /dashboard/analytics` - Get dashboard analytics

## Database Schema

### Tables Created

1. **users** - User login details and profiles
2. **sessions** - Interview/practice sessions
3. **conversations** - Q&A interactions within sessions
4. **performance** - Performance metrics and analytics

### Key Features

- UUID primary keys for better security
- Automatic timestamps with triggers
- Foreign key constraints for data integrity
- Indexes for optimal performance
- JSONB support for flexible metadata

## Testing the API

### 1. Register a User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "first_name": "Test",
    "last_name": "User"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

### 3. Create a Session
```bash
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "session_name": "My First Interview",
    "session_type": "interview"
  }'
```

## Health Check

Visit `http://localhost:3000/health` to verify the application is running.

## API Documentation

Visit `http://localhost:3000/api` for complete API documentation.

## Troubleshooting

### Database Connection Issues
1. Verify PostgreSQL is running
2. Check database credentials in `.env`
3. Ensure database exists and tables are created

### Authentication Issues
1. Verify JWT_SECRET is set in `.env`
2. Check token format: `Authorization: Bearer <token>`

### Port Issues
1. Change PORT in `.env` if 3000 is occupied
2. Update CORS_ORIGIN if using different frontend port

## Development

### Project Structure
```
├── config/
│   └── database.js          # Database connection
├── middleware/
│   └── auth.js             # Authentication middleware
├── models/
│   ├── User.js             # User model
│   ├── Session.js          # Session model
│   ├── Conversation.js     # Conversation model
│   └── Performance.js      # Performance model
├── routes/
│   ├── auth.js             # Authentication routes
│   ├── sessions.js         # Session routes
│   ├── conversations.js    # Conversation routes
│   └── performance.js      # Performance routes
├── app.js                  # Main application
├── index.js                # Server entry point
├── database_setup.sql      # Database schema
└── package.json            # Dependencies
```

### Adding New Features

1. Create model in `models/` directory
2. Add routes in `routes/` directory
3. Import and use in `app.js`
4. Update API documentation

## Production Deployment

1. Set `NODE_ENV=production` in `.env`
2. Use a production PostgreSQL instance
3. Set strong JWT_SECRET
4. Configure proper CORS origins
5. Use a process manager like PM2

## Support

For issues or questions, please check the API documentation at `/api` or review the code comments in the source files.
