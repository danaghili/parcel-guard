# Contributing to ParcelGuard

Thank you for your interest in contributing to ParcelGuard! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Issue Guidelines](#issue-guidelines)

---

## Code of Conduct

Please be respectful and constructive in all interactions. We're all here to build something useful together.

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Git

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/parcel-guard.git
   cd parcel-guard
   ```
3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/parcel-guard.git
   ```

---

## Development Setup

### Install Dependencies

```bash
npm install
```

### Start Development Servers

```bash
npm run dev
```

This starts:
- Web app at http://localhost:5173
- API server at http://localhost:3000

### Default Credentials

- PIN: `1234` (development only)

### Environment Variables

Copy the example environment files:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

---

## Making Changes

### Branch Naming

Create a descriptive branch for your changes:

| Type | Prefix | Example |
|------|--------|---------|
| New feature | `feature/` | `feature/dark-mode-toggle` |
| Bug fix | `fix/` | `fix/camera-reconnect-loop` |
| Refactoring | `refactor/` | `refactor/event-storage` |
| Documentation | `docs/` | `docs/api-reference` |
| Maintenance | `chore/` | `chore/update-dependencies` |

```bash
git checkout -b feature/your-feature-name
```

### Keep Your Fork Updated

Before starting work, sync with upstream:

```bash
git fetch upstream
git checkout main
git merge upstream/main
```

---

## Coding Standards

We follow the conventions defined in [CLAUDE.md](./CLAUDE.md). Key points:

### TypeScript

- Strict mode enabled
- Explicit return types on functions
- Use `interface` over `type` for object shapes
- Use `unknown` over `any`

### React

- Functional components only
- Custom hooks for reusable logic
- Props interfaces defined above component

### Naming Conventions

| Context | Convention | Example |
|---------|------------|---------|
| Components | PascalCase | `CameraGrid.tsx` |
| Hooks | camelCase with `use` | `useCamera.ts` |
| Utilities | camelCase | `formatDate.ts` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRIES` |

### Formatting

We use Prettier for formatting. Run before committing:

```bash
npm run format
```

### Linting

Check for issues:

```bash
npm run lint
```

### Type Checking

Ensure no TypeScript errors:

```bash
npm run typecheck
```

---

## Testing

### Unit Tests

Run unit tests with Vitest:

```bash
npm run test:unit
```

Run in watch mode during development:

```bash
npm run test:unit -- --watch
```

### E2E Tests

Run Playwright E2E tests:

```bash
npm run test:e2e
```

Run specific test file:

```bash
npm run test:e2e -- tests/e2e/auth.spec.ts
```

### Test Requirements

- All new features should have unit tests
- Critical user flows should have E2E tests
- All tests must pass before submitting PR:

```bash
npm run test
```

### Writing Tests

**Unit Test Example:**
```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MyComponent } from './MyComponent'

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Expected text')).toBeInTheDocument()
  })
})
```

**E2E Test Example:**
```typescript
import { test, expect } from '@playwright/test'

test('should complete user flow', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(page.getByText('Success')).toBeVisible()
})
```

---

## Submitting Changes

### Before Submitting

1. **Update your branch:**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run all checks:**
   ```bash
   npm run lint
   npm run typecheck
   npm run test
   ```

3. **Build successfully:**
   ```bash
   npm run build
   ```

### Commit Messages

Follow conventional commit format:

```
type: Brief description

Longer description if needed. Explain what changed and why.

- Bullet points for multiple changes
```

**Types:** `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `style`

**Examples:**
```
feat: Add camera offline indicator

Shows visual indicator when camera stream disconnects.
Includes automatic reconnection with exponential backoff.
```

```
fix: Resolve event pagination edge case

Fixed issue where last page showed incorrect item count
when total events not divisible by page size.
```

### Pull Request Process

1. **Push your branch:**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open a Pull Request** on GitHub

3. **Fill out the PR template:**
   - Summary of changes
   - Related issue (if any)
   - Testing performed
   - Screenshots (for UI changes)

4. **Address review feedback** promptly

5. **Keep PR focused** - one feature/fix per PR

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Tests added/updated for changes
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] No lint warnings
- [ ] Documentation updated (if applicable)
- [ ] CHANGELOG.md updated (for significant changes)

---

## Issue Guidelines

### Reporting Bugs

Include:
- ParcelGuard version
- Browser and version
- Device type (desktop/mobile, OS)
- Steps to reproduce
- Expected vs actual behavior
- Error messages or screenshots

### Feature Requests

Include:
- Clear description of the feature
- Use case / problem it solves
- Any implementation ideas (optional)

### Labels

| Label | Description |
|-------|-------------|
| `bug` | Something isn't working |
| `feature` | New feature request |
| `docs` | Documentation improvement |
| `good first issue` | Good for newcomers |
| `help wanted` | Extra attention needed |

---

## Project Structure

```
parcel-guard/
├── apps/
│   ├── web/          # React PWA frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── pages/
│   │   │   └── lib/
│   │   └── tests/
│   └── api/          # Fastify backend
│       ├── src/
│       │   ├── routes/
│       │   ├── services/
│       │   └── db/
│       └── tests/
├── packages/
│   └── shared/       # Shared types
├── scripts/          # Setup scripts
└── docs/             # Documentation
```

---

## Getting Help

- Check existing [issues](../../issues)
- Read the [documentation](./docs/)
- Review [CLAUDE.md](./CLAUDE.md) for detailed standards

---

## License

By contributing, you agree that your contributions will be licensed under the project's MIT License.

---

Thank you for contributing to ParcelGuard!
