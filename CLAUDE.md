# CLAUDE.md - ParcelGuard Development Standards

## Project Overview

**ParcelGuard** is a DIY multi-camera security system for monitoring communal areas in residential buildings, focused on detecting and recording parcel theft.

### Tech Stack
- **Frontend:** React (PWA) + TypeScript + Tailwind CSS
- **Backend:** Node.js + Express/Fastify + TypeScript
- **Database:** SQLite
- **Video Processing:** Frigate/Motion
- **Testing:** Vitest (unit), Playwright (E2E)
- **Build Tool:** Vite

### Key Documentation
- `HARDWARE_SPEC.md` - Hardware components and architecture
- `SCOPE_OF_WORK.md` - Feature specifications and development phases
- `DEPLOYMENT_SPEC.md` - Deployment architecture and setup procedures
- `DEVELOPMENT_PLAN.md` - Phase-by-phase implementation plan
- `CHANGELOG.md` - Version history and changes
- `README.md` - Project setup and usage

---

## 1. Coding Standards

### 1.1 Naming Conventions

| Context | Convention | Example |
|---------|------------|---------|
| Database tables | snake_case | `motion_events`, `camera_settings` |
| Database columns | camelCase | `cameraId`, `createdAt`, `isImportant` |
| TypeScript variables | camelCase | `eventList`, `isLoading`, `handleClick` |
| TypeScript functions | camelCase | `fetchEvents()`, `formatTimestamp()` |
| React components | PascalCase | `CameraGrid`, `EventTimeline`, `SettingsPanel` |
| Types & Interfaces | PascalCase | `Camera`, `MotionEvent`, `AppSettings` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRY_ATTEMPTS`, `DEFAULT_RETENTION_DAYS` |
| Files (components) | PascalCase | `CameraGrid.tsx`, `EventCard.tsx` |
| Files (utilities) | camelCase | `formatDate.ts`, `apiClient.ts` |
| Files (hooks) | camelCase, `use` prefix | `useCamera.ts`, `useEvents.ts` |
| CSS/Tailwind classes | kebab-case | `camera-grid`, `event-card` |
| Environment variables | SCREAMING_SNAKE_CASE | `VITE_API_URL`, `DATABASE_PATH` |

### 1.2 Formatting

- **Prettier** for all formatting - run before committing
- **ESLint** for code quality
- When unsure, follow existing patterns in the codebase
- 2 spaces for indentation
- Single quotes for strings
- Trailing commas in multi-line structures
- No semicolons (Prettier default)

### 1.3 TypeScript Standards

- Strict mode enabled
- Explicit return types on functions
- Prefer `interface` over `type` for object shapes
- Use `unknown` over `any` where possible
- Null checks with optional chaining (`?.`) and nullish coalescing (`??`)

```typescript
// Good
interface Camera {
  id: string
  name: string
  status: 'online' | 'offline'
}

function getCamera(id: string): Camera | null {
  // ...
}

// Avoid
type Camera = {
  id: any
  name: any
}
```

### 1.4 React Standards

- Functional components only (no class components)
- Custom hooks for reusable logic
- Props interfaces defined above component
- Destructure props in function signature
- Memoisation (`useMemo`, `useCallback`) only when necessary

```typescript
interface CameraCardProps {
  camera: Camera
  onSelect: (id: string) => void
}

export function CameraCard({ camera, onSelect }: CameraCardProps) {
  // ...
}
```

### 1.5 Error Handling

#### Frontend (React)
- Error boundaries for component-level failures
- Try/catch in async operations
- User-friendly error messages (no raw error dumps)
- Loading and error states for all async UI

```typescript
// API calls
try {
  const data = await fetchEvents()
  setEvents(data)
} catch (error) {
  setError('Failed to load events. Please try again.')
  console.error('Event fetch failed:', error)
}
```

#### Backend (API)
- Consistent error response format
- Appropriate HTTP status codes
- Log errors with context

```typescript
// Consistent API error format
interface ApiError {
  error: string
  message: string
  details?: unknown
}

// Example response
res.status(404).json({
  error: 'NOT_FOUND',
  message: 'Camera not found',
  details: { cameraId }
})
```

---

## 2. Project Structure

```
parcelguard/
├── apps/
│   ├── web/                    # React PWA frontend
│   │   ├── src/
│   │   │   ├── components/     # React components
│   │   │   │   ├── ui/         # Generic UI components
│   │   │   │   ├── cameras/    # Camera-related components
│   │   │   │   ├── events/     # Event-related components
│   │   │   │   └── settings/   # Settings components
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── pages/          # Page-level components
│   │   │   ├── lib/            # Utilities and helpers
│   │   │   ├── types/          # TypeScript type definitions
│   │   │   ├── styles/         # Global styles
│   │   │   └── App.tsx
│   │   ├── public/
│   │   ├── tests/
│   │   │   ├── unit/           # Vitest unit tests
│   │   │   └── e2e/            # Playwright E2E tests
│   │   └── package.json
│   │
│   └── api/                    # Backend API server
│       ├── src/
│       │   ├── routes/         # API route handlers
│       │   ├── services/       # Business logic
│       │   ├── db/             # Database access
│       │   │   ├── migrations/ # Schema migrations
│       │   │   └── schema.ts   # Database schema
│       │   ├── lib/            # Utilities
│       │   └── types/          # Shared types
│       ├── tests/
│       └── package.json
│
├── packages/                   # Shared packages (if needed)
│   └── shared/                 # Shared types, utilities
│
├── scripts/                    # Setup and deployment scripts
│   ├── pi-zero/               # Camera unit setup
│   └── pi-hub/                # Hub setup
│
├── docs/                       # Additional documentation
├── CLAUDE.md
├── HARDWARE_SPEC.md
├── SCOPE_OF_WORK.md
├── CHANGELOG.md
├── README.md
└── package.json
```

### Component File Structure

```typescript
// ComponentName.tsx
import { useState } from 'react'

import { useCustomHook } from '@/hooks/useCustomHook'
import { helperFunction } from '@/lib/helpers'
import { SomeType } from '@/types'

import { ChildComponent } from './ChildComponent'

interface ComponentNameProps {
  // props
}

export function ComponentName({ prop1, prop2 }: ComponentNameProps) {
  // hooks first
  // state second
  // derived values third
  // effects fourth
  // handlers fifth
  // render
}
```

---

## 3. Development Workflow

### 3.1 PLAN FIRST - Enter Plan Mode

Before writing any code, thoroughly analyse and plan:

1. **Assess Current State**
   - Review existing codebase structure
   - Understand current architecture and patterns
   - Identify how the new feature integrates with existing functionality

2. **Create Implementation Plan**
   - Files to be created or modified
   - Components, hooks, or utilities needed
   - Database changes (migrations required?)
   - Impact assessment on existing functionality (BE THOROUGH!)
   - Required changes to existing unit & E2E test scripts
   - New test scripts to be created

3. **Present Plan for Approval**
   - Summarise the approach clearly
   - Highlight any risks or breaking changes
   - **DO NOT begin coding until the plan is explicitly approved**

### 3.2 Branch Creation

Create a new branch with a descriptive name:

| Type | Prefix | Example |
|------|--------|---------|
| New feature | `feature/` | `feature/live-view-grid` |
| Bug fix | `fix/` | `fix/camera-reconnect-loop` |
| Refactoring | `refactor/` | `refactor/event-storage` |
| Maintenance | `chore/` | `chore/update-dependencies` |

```bash
git checkout -b feature/descriptive-name
```

### 3.3 Implementation

- All work is done locally on the feature branch
- Follow coding standards defined in this document
- Commit frequently with meaningful messages
- Work must be explicitly signed off before merging to main

### 3.4 Manual Testing

After build is complete, pause for manual testing:

1. Test the feature in QA environment
2. Document any issues found during testing
3. Update implementation plan with required changes
4. Implement fixes and repeat testing
5. Continue until feature is approved

### 3.5 Regression Testing

Run the full suite of unit and E2E tests:

```bash
# Unit tests
npm run test:unit

# E2E tests
npm run test:e2e

# All tests
npm run test
```

**If any tests fail:**

1. Investigate the failure
2. Propose a fix for the regression
3. Update implementation plan and documentation
4. Implement the fix
5. Re-run the failing test to verify
6. Once individual tests pass, re-run entire suite
7. **Achieve 100% pass rate before proceeding**

### 3.6 New Test Creation

Only after all regression tests pass:

1. Create unit tests for new functionality
2. Create comprehensive Playwright E2E tests
3. Add tests to appropriate directories following existing patterns
4. Run new tests to confirm they pass
5. Run full test suite to ensure integration

#### Test File Naming
- Unit tests: `ComponentName.test.ts` or `functionName.test.ts`
- E2E tests: `feature-name.spec.ts`

### 3.7 Documentation Phase

1. **README.md** - Update if feature adds user-facing functionality
2. **CHANGELOG.md** - Add summary of changes under appropriate version
3. **Code comments** - Add JSDoc for complex functions
4. **Type definitions** - Ensure all new types are documented

### 3.8 Commit Phase

**Only commit after:**
- [ ] Feature works correctly in QA
- [ ] 100% regression test pass rate
- [ ] Any skipped tests have documented justification
- [ ] New feature tests created and passing
- [ ] Documentation updated

**Commit Message Format:**

```
type: Brief description

Longer description if needed. Explain what changed and why.

- Bullet points for multiple changes
- Reference any related issues
```

**Types:** `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `style`

**Examples:**
```
feat: Add multi-camera grid view

Implements the dashboard camera grid showing all connected cameras.
Grid auto-adjusts based on number of cameras (2x2, 3x3, etc.).

- Add CameraGrid component
- Add useCameras hook for stream management
- Add grid layout responsive styles
```

```
fix: Resolve camera reconnection loop

Camera was attempting reconnect every 100ms when offline,
causing performance issues. Now uses exponential backoff
starting at 1s, max 30s.

- Add reconnection backoff logic
- Add max retry limit (10 attempts)
- Update tests for new behaviour
```

### 3.9 Merge to Main

```bash
git checkout main
git merge feature/your-feature-name
git push origin main
```

### 3.10 Production Deployment

**ALWAYS ask permission before deploying to production.**

1. Confirm approval to deploy
2. Switch to production configuration
3. Deploy to production environment
4. Test critical paths in production
5. Monitor for errors

---

## 4. Environment Configuration

### 4.1 Environment Structure

| Environment | Purpose | Config File |
|-------------|---------|-------------|
| Development | Local development | `.env.development` |
| QA | Testing before production | `.env.qa` |
| Production | Live system | `.env.production` |

### 4.2 Environment Variables

```bash
# .env.example

# API Configuration
VITE_API_URL=http://localhost:3000
API_PORT=3000

# Database
DATABASE_PATH=./data/parcelguard.db

# Video Processing
FRIGATE_URL=http://localhost:5000
STREAM_PROTOCOL=hls  # hls | webrtc

# Notifications (optional)
NTFY_TOPIC=parcelguard
PUSHOVER_TOKEN=
PUSHOVER_USER=

# Security
APP_SECRET=your-secret-key-here
```

### 4.3 Secrets Management

- **NEVER** commit `.env` files with real secrets
- Use `.env.example` as a template
- Keep production secrets secure and separate
- Rotate secrets if accidentally exposed

---

## 5. Database Standards

### 5.1 Migrations

All schema changes must be done via migrations:

```
apps/api/src/db/migrations/
├── 001_initial_schema.sql
├── 002_add_motion_zones.sql
└── 003_add_notification_settings.sql
```

**Migration file format:**
```sql
-- Migration: 002_add_motion_zones
-- Created: 2024-01-15
-- Description: Add motion zone configuration to cameras

ALTER TABLE camera_settings
ADD COLUMN motionZones TEXT DEFAULT '[]';
```

### 5.2 Schema Conventions

```sql
-- Table names: snake_case, plural
CREATE TABLE motion_events (
  -- Columns: camelCase
  id TEXT PRIMARY KEY,
  cameraId TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  duration INTEGER,
  isImportant INTEGER DEFAULT 0,
  createdAt INTEGER DEFAULT (unixepoch()),
  updatedAt INTEGER DEFAULT (unixepoch()),
  
  FOREIGN KEY (cameraId) REFERENCES cameras(id)
);

-- Indexes: descriptive names
CREATE INDEX idx_motion_events_cameraId ON motion_events(cameraId);
CREATE INDEX idx_motion_events_timestamp ON motion_events(timestamp);
```

---

## 6. Testing Standards

### 6.1 Unit Tests (Vitest)

```typescript
// ComponentName.test.ts
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { ComponentName } from './ComponentName'

describe('ComponentName', () => {
  it('should render correctly', () => {
    render(<ComponentName />)
    expect(screen.getByText('Expected text')).toBeInTheDocument()
  })

  it('should handle user interaction', async () => {
    const onAction = vi.fn()
    render(<ComponentName onAction={onAction} />)
    
    await userEvent.click(screen.getByRole('button'))
    
    expect(onAction).toHaveBeenCalledOnce()
  })
})
```

### 6.2 E2E Tests (Playwright)

```typescript
// feature-name.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should complete user flow', async ({ page }) => {
    // Arrange
    await page.getByRole('button', { name: 'Start' }).click()

    // Act
    await page.fill('[name="input"]', 'value')
    await page.click('button[type="submit"]')

    // Assert
    await expect(page.getByText('Success')).toBeVisible()
  })
})
```

### 6.3 Test Coverage

- Comprehensive coverage for all new features
- Critical paths must have E2E coverage
- Edge cases and error states should be tested
- Mock external dependencies (API calls, video streams)

---

## 7. Git Workflow Summary

```
main (production-ready)
  │
  ├── feature/live-view-grid
  │     ├── implement feature
  │     ├── manual testing
  │     ├── regression tests (100% pass)
  │     ├── new tests created
  │     ├── documentation updated
  │     └── merge to main
  │
  ├── fix/camera-reconnect
  │     └── (same process)
  │
  └── refactor/event-storage
        └── (same process)
```

---

## 8. Quick Reference Commands

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run preview          # Preview production build

# Testing
npm run test             # Run all tests
npm run test:unit        # Run unit tests only
npm run test:e2e         # Run Playwright E2E tests
npm run test:coverage    # Run tests with coverage report

# Code Quality
npm run lint             # Run ESLint
npm run format           # Run Prettier
npm run typecheck        # Run TypeScript compiler check

# Database
npm run db:migrate       # Run pending migrations
npm run db:reset         # Reset database (development only)

# Deployment
npm run deploy:qa        # Deploy to QA environment
npm run deploy:prod      # Deploy to production (ask first!)
```

---

## 9. Checklist Templates

### New Feature Checklist

```markdown
## Feature: [Name]

### Planning
- [ ] Reviewed existing codebase
- [ ] Created implementation plan
- [ ] Plan approved

### Implementation
- [ ] Branch created: `feature/...`
- [ ] Code follows standards
- [ ] No TypeScript errors
- [ ] No ESLint warnings

### Testing
- [ ] Manual testing complete
- [ ] Regression tests pass (100%)
- [ ] New unit tests created
- [ ] New E2E tests created
- [ ] All tests pass

### Documentation
- [ ] README updated (if needed)
- [ ] CHANGELOG updated
- [ ] Code comments added

### Deployment
- [ ] Merged to main
- [ ] QA verified
- [ ] Production deployment approved
- [ ] Production verified
```

---

*Last updated: [Date]*
*Version: 1.0.0*
