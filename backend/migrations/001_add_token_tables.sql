-- Migration: Add token management tables
-- Created: 2026-01-21
-- Updated: 2026-03-27 (fix: PostgreSQL-compatible syntax)
-- Description: Adds tables for refresh tokens and revoked tokens to improve JWT security

-- Table for storing refresh tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Table for storing revoked access tokens (blacklist)
CREATE TABLE IF NOT EXISTS revoked_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(500) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    reason VARCHAR(100) -- 'logout', 'security', 'password_change', etc.
);

CREATE INDEX IF NOT EXISTS idx_revoked_tokens_token ON revoked_tokens(token);
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires_at ON revoked_tokens(expires_at);

-- Function to auto-delete expired tokens (cleanup)
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
    -- Delete expired refresh tokens
    DELETE FROM refresh_tokens WHERE expires_at < NOW();

    -- Delete expired revoked tokens (no need to keep them after expiration)
    DELETE FROM revoked_tokens WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job to run cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-tokens', '0 3 * * *', $$SELECT cleanup_expired_tokens()$$);

-- Comments for documentation
COMMENT ON TABLE refresh_tokens IS 'Stores valid refresh tokens for JWT authentication';
COMMENT ON TABLE revoked_tokens IS 'Blacklist of revoked access tokens before expiration';
COMMENT ON FUNCTION cleanup_expired_tokens() IS 'Removes expired tokens from both tables';
