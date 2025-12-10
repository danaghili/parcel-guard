-- Migration: 003_add_camera_rotation
-- Created: 2025-12-09
-- Description: Add rotation setting to cameras table for upside-down mounting

ALTER TABLE cameras ADD COLUMN rotation INTEGER DEFAULT 0;
