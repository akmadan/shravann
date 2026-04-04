# Contributing to Shravann

Thanks for your interest in contributing! This guide covers the development setup and workflow.

## Prerequisites

To develop from source you need:

- **Node.js 22+** (for web, session, and site apps)
- **Go 1.24+** (for the API)
- **Python 3.12+** (for the worker)
- **PostgreSQL 16+**
- A [LiveKit Cloud](https://livekit.io/) account (free tier is fine)

## Development Setup

### 1. Clone and create the database

```bash
git clone https://github.com/akshitmadan/shravann.git
cd shravann
createdb db_shravann
```

### 2. Start the Go API

```bash
cd apps/api
cp .env.example .env   # fill in DATABASE_URL, LIVEKIT_*, ENCRYPTION_KEY
go run cmd/server/main.go
```

The API runs on `http://localhost:8080`. On first startup it auto-migrates the database and creates a default admin user (`admin@shravann.local` / `admin`).

### 3. Start the Web Dashboard

```bash
cd apps/web
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL=http://localhost:8080
npm run dev
```

Runs on `http://localhost:3000`.

### 4. Start the Session App

```bash
cd apps/session
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL, NEXT_PUBLIC_LIVEKIT_WS_URL
npm run dev
```

Runs on `http://localhost:3001`.

### 5. Start the Worker

```bash
cd apps/worker
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in LIVEKIT_*, DATABASE_URL, ENCRYPTION_KEY
python main.py start
```

### Alternative: Docker from source

If you prefer Docker, use the dev override file:

```bash
cp .env.example .env   # fill in LiveKit credentials
docker compose -f docker-compose.yaml -f docker-compose.dev.yaml up --build
```

## Project Structure

| Directory | Language | Description |
|-----------|----------|-------------|
| `apps/api` | Go | REST API (Chi router, GORM ORM, PostgreSQL) |
| `apps/web` | TypeScript | Dashboard (Next.js App Router, Tailwind CSS) |
| `apps/session` | TypeScript | Voice session UI (Next.js, LiveKit Client SDK) |
| `apps/worker` | Python | Voice agent runtime (LiveKit Agents SDK) |
| `site` | TypeScript | Landing page (Next.js) |
| `packages/create-shravann` | JavaScript | `npx create-shravann` CLI |

## Making Changes

### Branch naming

Use descriptive branch names: `feat/add-xyz`, `fix/issue-123`, `docs/update-readme`.

### Pull request process

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes
4. Ensure CI passes (see below)
5. Open a pull request against `main`
6. Describe what changed and why in the PR description

### Code style

**Go (apps/api)**

- Run `go vet ./...` before committing
- Run `go test ./...` to ensure tests pass
- Follow standard Go conventions

**Python (apps/worker)**

- Ensure all modules compile: `python -m py_compile main.py`
- Use type hints where practical

**TypeScript (apps/web, apps/session, site)**

- Run `npm run lint` (eslint) in each app
- Run `npm run build` to verify the production build succeeds

### CI checks

Every push and pull request runs automated CI:

| App | Checks |
|-----|--------|
| api | `go vet`, `go build`, `go test` |
| worker | `pip install`, `py_compile` on all modules |
| web | `npm ci`, `npm run lint`, `npm run build` |
| session | `npm ci`, `npm run build` |
| site | `npm ci`, `npm run build` |

### Database migrations

Migrations live in `apps/api/internal/db/migrations/`. They are auto-applied by GORM on API startup.

To add a new migration, create `000NNN_description.up.sql` and `000NNN_description.down.sql` files following the existing naming convention.

## Releasing

Docker images are published to DockerHub automatically when a version tag is pushed:

```bash
git tag v0.2.0
git push origin v0.2.0
```

This triggers the Docker Publish workflow which builds and pushes images for all 4 apps.

## Questions?

Open an issue on GitHub if you have questions or run into problems.
