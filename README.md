# ParcelGuard

Multi-camera security system for monitoring communal areas in residential buildings, focused on detecting and recording parcel theft.

## Tech Stack

- **Frontend:** React PWA + TypeScript + Tailwind CSS
- **Backend:** Node.js + Fastify + TypeScript
- **Database:** SQLite
- **Video Processing:** Frigate
- **Testing:** Vitest (unit), Playwright (E2E)

## Project Structure

```
parcelguard/
├── apps/
│   ├── web/          # React PWA frontend
│   └── api/          # Fastify backend
├── packages/
│   └── shared/       # Shared types and utilities
└── scripts/
    ├── pi-zero/      # Camera unit setup scripts
    └── pi-hub/       # Hub setup scripts
```

## Prerequisites

- Node.js 20+
- npm 10+

## Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/parcelguard.git
cd parcelguard

# Install dependencies
npm install

# Build shared package
npm run build -w packages/shared
```

### Development

```bash
# Start both web and API in development mode
npm run dev

# Or start individually
npm run dev -w apps/web    # Frontend on http://localhost:5173
npm run dev -w apps/api    # API on http://localhost:3000
```

### Testing

```bash
# Run all tests
npm run test

# Run unit tests only
npm run test:unit

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui -w apps/web
```

### Code Quality

```bash
# Lint
npm run lint

# Format
npm run format

# Type check
npm run typecheck
```

### Build

```bash
# Build all packages
npm run build
```

## Documentation

- [CLAUDE.md](./CLAUDE.md) - Development standards
- [HARDWARE_SPEC.md](./HARDWARE_SPEC.md) - Hardware architecture
- [SCOPE_OF_WORK.md](./SCOPE_OF_WORK.md) - Feature specifications
- [DEPLOYMENT_SPEC.md](./DEPLOYMENT_SPEC.md) - Deployment procedures
- [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) - Implementation plan

## License

Private - All rights reserved
