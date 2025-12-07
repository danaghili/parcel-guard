-- Migration: 002_add_users
-- Created: 2024-12-07
-- Description: Add users table for multi-user authentication

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  pinHash TEXT NOT NULL,
  displayName TEXT,
  isAdmin INTEGER DEFAULT 0,
  enabled INTEGER DEFAULT 1,
  createdAt INTEGER DEFAULT (unixepoch()),
  updatedAt INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_enabled ON users(enabled);

-- Add userId to sessions (SQLite doesn't support ADD COLUMN with constraints, so we recreate)
-- First, create new sessions table with userId
CREATE TABLE IF NOT EXISTS sessions_new (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  userId TEXT,
  createdAt INTEGER DEFAULT (unixepoch()),
  expiresAt INTEGER NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id)
);

-- Copy existing sessions (they'll have null userId and be invalidated on next verify)
INSERT INTO sessions_new (id, token, createdAt, expiresAt)
SELECT id, token, createdAt, expiresAt FROM sessions;

-- Drop old table and rename new one
DROP TABLE sessions;
ALTER TABLE sessions_new RENAME TO sessions;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expiresAt ON sessions(expiresAt);
CREATE INDEX IF NOT EXISTS idx_sessions_userId ON sessions(userId);
