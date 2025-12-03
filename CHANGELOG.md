# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] - 2024-12-03

### Added
- Motion Detection Backend (Phase 3A - Pre-Hardware)
  - Frigate webhook endpoint `POST /api/frigate/events` for receiving motion events
  - Frigate event payload parser in shared package
  - Events service with full CRUD operations
  - Event API endpoints:
    - `GET /api/events` - list with filtering and pagination
    - `GET /api/events/:id` - single event details
    - `GET /api/events/stats` - event statistics
    - `PUT /api/events/:id` - update event (mark important/false alarm)
    - `DELETE /api/events/:id` - delete single event
    - `POST /api/events/bulk-delete` - bulk delete
    - `GET /api/events/:id/thumbnail` - serve thumbnail image
    - `GET /api/events/:id/video` - serve video clip
    - `GET /api/events/:id/download` - download video clip
  - Storage management service with disk usage tracking
  - Storage API endpoint `GET /api/system/storage`
  - Retention cleanup service (`deleteExpiredEvents`)
  - Camera settings API:
    - `POST /api/cameras` - create camera
    - `PUT /api/cameras/:id` - update camera settings
    - `DELETE /api/cameras/:id` - delete camera
  - Motion zone data structure (stored as JSON in camera record)
  - Event simulation script for development/testing
  - Comprehensive unit tests for events API
  - E2E tests for Phase 3A functionality

### Fixed
- PIN input selector in E2E tests (type="text" with inputmode="numeric")
- Web app unit test for login screen display

## [0.3.0] - 2024-12-03

### Added
- Live View with HLS streaming (Phase 2)
  - `useHlsStream` hook for HLS.js video streaming
  - `useFullscreen` hook for fullscreen video support
  - `CameraPlayer` component with stream status handling
  - `CameraOverlay` component for camera name and status display
  - `CameraCard` component for grid view thumbnails
  - `CameraGrid` component with responsive layout (1-4 cameras)
  - `/live` page with camera grid view
  - `/camera/:id` page for single camera fullscreen view
  - Auto-reconnection with exponential backoff
  - Offline camera handling with last-seen timestamps
  - Dashboard integration with camera status summary

## [0.2.0] - 2024-12-03

### Added
- Core Infrastructure (Phase 1)
  - Database schema with migrations (cameras, motion_events, settings, sessions)
  - Migration runner utility
  - Seed script for development data
  - Authentication API (`/api/auth/login`, `/api/auth/logout`, `/api/auth/verify`)
  - PIN hashing with bcrypt
  - Session-based authentication middleware
  - Camera API (`/api/cameras`, `/api/cameras/:id`, `/api/cameras/:id/health`)
  - System API (`/api/system/status`)
  - Settings API (`/api/settings`)
  - PWA manifest and service worker configuration
  - PIN entry component with validation
  - Auth context and `useAuth` hook
  - Protected route wrapper
  - App shell layout with bottom navigation
  - Loading spinner and error message components
  - Dark/light theme support via CSS variables
  - Pi Zero camera setup scripts (setup.sh, start-stream.sh, health-check.sh)
  - Pi 4 hub setup scripts (setup.sh, install-deps.sh, update.sh, backup.sh)
  - Nginx and Frigate configuration templates
  - systemd service file templates
  - SETUP_GUIDE.md - Hardware assembly and initial setup guide

## [0.1.0] - 2024-12-03

### Added
- Initial project scaffolding (Phase 0)
  - Monorepo structure with npm workspaces
  - React PWA frontend with Vite + Tailwind
  - Fastify backend with TypeScript
  - Shared types package (`@parcelguard/shared`)
    - Camera types
    - Event types
    - Settings types
    - API error types
  - Vitest for unit testing (web and api)
  - Playwright for E2E testing
  - ESLint + Prettier configuration
  - TypeScript project references
  - Root scripts for dev, build, test, lint, typecheck
  - README.md with setup instructions
  - CLAUDE.md development standards
  - HARDWARE_SPEC.md hardware documentation
  - SCOPE_OF_WORK.md feature specifications
  - DEPLOYMENT_SPEC.md deployment procedures
  - DEVELOPMENT_PLAN.md implementation plan
