# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.8.0] - 2024-12-04

### Added
- Phase 7A: Polish & Optimisation (Part 1)
  - Toast Notification System
    - `apps/web/src/contexts/ToastContext.tsx` - Toast provider with success/error/info/warning types
    - `apps/web/src/components/ui/Toast.tsx` - Animated toast component with dismiss
    - `apps/web/src/components/ui/ToastContainer.tsx` - Toast stack container
    - Auto-dismiss after 5 seconds with manual dismiss option
  - Skeleton Loading Components
    - `apps/web/src/components/ui/Skeleton.tsx` - Base skeleton with variants
    - `apps/web/src/components/events/EventCardSkeleton.tsx` - Event card/list skeletons
    - `apps/web/src/components/cameras/CameraCardSkeleton.tsx` - Camera card/grid skeletons
    - Integrated into Events and Live pages for initial load states
  - Code Splitting & Lazy Loading
    - All page components now lazy-loaded with React.lazy()
    - Suspense boundary with loading spinner
    - Separate chunks for each route (reduces initial bundle ~40%)
    - HLS.js lazy loaded on-demand (523KB only loaded when viewing streams)
  - Accessibility Enhancements
    - Skip to main content link for keyboard/screen reader users
    - ARIA labels on navigation and interactive elements
    - Focus trap hook for modals (`useFocusTrap.ts`)
    - Reduced motion support via CSS media query
    - Focus-visible styles for keyboard navigation
  - Network Status & PWA
    - `apps/web/src/hooks/useOnlineStatus.ts` - Online/offline detection
    - `apps/web/src/components/ui/OfflineIndicator.tsx` - Offline banner
    - `apps/web/src/hooks/usePwaInstall.ts` - PWA install prompt handling
    - `apps/web/src/components/ui/InstallPrompt.tsx` - Install app prompt UI
  - Pull-to-Refresh
    - `apps/web/src/hooks/usePullToRefresh.ts` - Touch gesture handling
    - `apps/web/src/components/ui/PullToRefresh.tsx` - Pull indicator component
    - Integrated into Events and Live pages
  - Keyboard Shortcuts (Desktop)
    - `apps/web/src/hooks/useKeyboardShortcuts.ts` - Global keyboard navigation
    - 1/2/3/4 for quick navigation to main pages
    - Escape to go back, / to focus search
  - Virtual Scrolling for Large Lists
    - `apps/web/src/hooks/useVirtualScroll.ts` - IntersectionObserver-based virtualization
    - Optimizes EventList for >50 items by replacing off-screen cards with placeholders
    - Reduces DOM complexity while maintaining scroll position
  - First-Time Onboarding Flow
    - `apps/web/src/components/onboarding/OnboardingWizard.tsx` - Step-by-step wizard
    - Welcome step with feature highlights
    - Add camera step with stream URL testing
    - Notifications configuration step
    - Completion step with next steps guidance
    - `onboardingComplete` setting to track setup status
  - Offline Mode & Caching
    - Workbox runtime caching for API responses (events, thumbnails, cameras, settings)
    - `apps/web/src/hooks/useOfflineData.ts` - Hook for offline-first data fetching
    - `apps/web/src/components/ui/CachedDataBadge.tsx` - Visual indicator when showing cached data
    - Dashboard now uses offline-first data fetching with localStorage fallback
    - Stale-while-revalidate strategy for frequently changing data
    - Cache-first strategy for thumbnails (7-day retention)
  - Unit tests for Toast, Skeleton, and VirtualScroll components (95 total)
  - Fixed pre-existing test type errors
  - User Documentation
    - `docs/USER_GUIDE.md` - Comprehensive user guide covering all app features
    - `docs/TROUBLESHOOTING.md` - Troubleshooting guide for common issues
  - API Client Enhancements
    - Auto-retry for transient failures with exponential backoff
    - In-memory response caching with configurable TTL
    - Cache invalidation on mutations
  - Background Sync for Offline Actions
    - `apps/web/src/hooks/useBackgroundSync.ts` - Queue and sync actions when back online
    - `apps/web/src/components/ui/SyncStatus.tsx` - Pending sync status indicator
    - Automatic retry with max attempts
  - API Documentation
    - `docs/API.md` - Human-readable API documentation
    - `docs/openapi.yaml` - OpenAPI 3.0 specification
  - `CONTRIBUTING.md` - Contribution guidelines for developers

### Changed
- Updated DeleteConfirmModal with focus trap and escape key handling
- Updated BottomNav with improved ARIA labels
- Updated AppShell with skip link and keyboard shortcuts

## [0.7.0] - 2024-12-03

### Added
- Settings & Administration UI (Phase 6A - Pre-Hardware)
  - Camera Management UI
    - `apps/web/src/pages/Cameras.tsx` - Camera list page with add/delete
    - `apps/web/src/pages/CameraSettings.tsx` - Individual camera settings
    - `apps/web/src/components/cameras/AddCameraModal.tsx` - Add camera wizard with URL testing
    - `apps/web/src/components/ui/DeleteConfirmModal.tsx` - Reusable delete confirmation modal
    - Camera CRUD operations via UI
    - Stream URL validation with accessibility check
  - System Settings Components
    - `apps/web/src/components/settings/PinChangeModal.tsx` - PIN change with validation (4-8 digits)
    - `apps/web/src/components/settings/StorageSettings.tsx` - Storage usage, retention slider, cleanup button
    - `apps/web/src/components/settings/ThemeToggle.tsx` - Light/Dark/System theme switcher
  - System Health Dashboard
    - `apps/web/src/pages/System.tsx` - System health dashboard page
    - `apps/web/src/components/system/SystemStats.tsx` - Version, uptime, memory stats
    - `apps/web/src/components/system/StorageChart.tsx` - Storage visualization with breakdown
    - `apps/web/src/components/system/CameraHealthTable.tsx` - Camera status table
    - Auto-refresh every 30 seconds
    - Storage warning indicators (>80% threshold)
  - API Enhancements
    - `POST /api/cameras/test-stream` - Test stream URL accessibility
    - Updated `/api/system/storage` response format with formatted breakdown
  - Navigation Updates
    - Settings page links to Cameras and System Health pages
    - Back navigation from sub-pages
  - New routes: `/cameras`, `/cameras/:id`, `/system`
  - Unit tests (64 tests total, 43 new for Phase 6A components)
  - E2E tests (36 tests for cameras, settings, system pages)

### Changed
- Updated Settings page with organized sections (Manage, Account, System)
- Updated app version display to v0.6.0 / Phase 6A
- Storage API response now includes `formatted` and `breakdown` objects

## [0.6.0] - 2024-12-03

### Added
- Notifications System (Phase 5)
  - ntfy.sh integration for push notifications
    - `apps/api/src/services/ntfy.ts` - HTTP client for ntfy.sh
    - Support for self-hosted ntfy servers via `NTFY_SERVER` env var
    - Thumbnail attachments via ntfy attachment API
    - Deep links to event detail pages
  - Notification service with smart delivery
    - `apps/api/src/services/notifications.ts` - Core notification logic
    - Quiet hours support (handles overnight periods like 22:00-07:00)
    - Per-camera cooldown tracking to prevent spam
    - Global and per-camera enable/disable
  - Notification API endpoints:
    - `GET /api/notifications/status` - Get notification configuration status
    - `POST /api/notifications/test` - Send test notification
  - Notification settings UI
    - `apps/web/src/components/settings/NotificationSettings.tsx` - Full settings modal
    - Enable/disable global notifications toggle
    - Quiet hours configuration with time pickers
    - Cooldown period slider (30s - 5min)
    - Per-camera notification toggles
    - Test notification button
    - ntfy configuration status display
  - Frontend API client updates
    - `camerasApi.update()` for updating camera notification settings
    - `settingsApi.getNotificationStatus()` for notification status
    - `settingsApi.testNotification()` for sending test notifications
  - Environment configuration
    - `NTFY_TOPIC` - ntfy.sh topic name (required for notifications)
    - `NTFY_SERVER` - ntfy server URL (optional, defaults to https://ntfy.sh)
    - `APP_URL` - Base URL for deep links in notifications
    - `API_URL` - Base URL for thumbnail attachments
  - Unit tests for notification service (29 tests)
  - E2E tests for notification settings (15 tests)

### Changed
- Updated Settings page to integrate notification settings modal
- Updated app version display to v0.5.0 / Phase 5

## [0.5.0] - 2024-12-03

### Added
- Event Timeline & Playback (Phase 4)
  - `EventCard` component with thumbnail, camera name, timestamp, badges
  - `EventList` component with infinite scroll pagination
  - `EventFilters` component with camera, date range, importance filters
  - `EventVideoPlayer` component with full playback controls
  - `EventDetail` page with video player and event actions
  - `EventStats` component showing today's count, important, false alarms
  - `/events` page with event list and filtering
  - `/events/:id` page for single event detail view
  - Dashboard integration with recent events and quick stats
  - Event actions: mark important, mark false alarm, delete, download
  - Filter state persistence in URL query parameters
  - Playback speed control (0.5x, 1x, 1.5x, 2x)
  - Fullscreen video toggle
  - Delete confirmation modal
  - Unit tests for event components (20 tests)
  - E2E tests for event browsing and playback (14 tests)

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
