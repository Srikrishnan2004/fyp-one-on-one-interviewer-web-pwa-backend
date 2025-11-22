-- Learning Sessions Table for Learn Coding Feature
-- This table stores the learning sessions where users submit code with voice explanations

-- Create learning_sessions table
CREATE TABLE learning_sessions (
    id VARCHAR(50) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    
    -- Code and language information
    code TEXT NOT NULL,
    language VARCHAR(50) NOT NULL DEFAULT 'python',
    
    -- Audio transcription
    transcription TEXT,
    
    -- LLM response
    llm_response TEXT,
    
    -- File paths
    audio_file_path VARCHAR(500),
    lip_sync_path VARCHAR(500),
    
    -- Metadata
    processing_time_ms INTEGER,
    audio_duration_seconds DECIMAL(10,2),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_learning_sessions_user_id ON learning_sessions(user_id);
CREATE INDEX idx_learning_sessions_session_id ON learning_sessions(session_id);
CREATE INDEX idx_learning_sessions_created_at ON learning_sessions(created_at);
CREATE INDEX idx_learning_sessions_language ON learning_sessions(language);

-- Create trigger to automatically update the updated_at timestamp
CREATE TRIGGER update_learning_sessions_updated_at BEFORE UPDATE ON learning_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE learning_sessions IS 'Stores learning sessions where users submit code with voice explanations';
COMMENT ON COLUMN learning_sessions.code IS 'The code submitted by the user';
COMMENT ON COLUMN learning_sessions.transcription IS 'Transcribed text from user voice explanation';
COMMENT ON COLUMN learning_sessions.llm_response IS 'LLM generated response explaining the code';
COMMENT ON COLUMN learning_sessions.audio_file_path IS 'Path to generated TTS audio file';
COMMENT ON COLUMN learning_sessions.lip_sync_path IS 'Path to generated lip-sync JSON file';
