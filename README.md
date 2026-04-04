# Shravann

A platform for building and deploying multi-agent voice AI systems. Design conversational agents with configurable participants, handoff logic, and voice personas — then run them as real-time voice sessions powered by LiveKit, OpenAI Realtime, and Google Gemini Live.

## Quick Start

The fastest way to run Shravann is with Docker. You only need [Docker Desktop](https://docs.docker.com/get-docker/) and a [LiveKit Cloud](https://livekit.io/) account.

### Option 1: npx (one command)

```bash
npx create-shravann
```

This will prompt for your LiveKit credentials, generate secrets, pull all Docker images, and start the platform. When it's done you'll see:

```
  Dashboard       http://localhost:3000
  Session App     http://localhost:3001
  API             http://localhost:8080

  Default login
  Email:          admin@shravann.local
  Password:       admin
```

### Option 2: Docker Compose (manual)

```bash
git clone https://github.com/akshitmadan/shravann.git
cd shravann
cp .env.example .env   # fill in LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
docker compose up -d
```

### Option 3: From source (for contributors)

See [CONTRIBUTING.md](CONTRIBUTING.md) for full development setup instructions.

## Architecture

```
┌─────────────────┐       ┌─────────────────┐       ┌──────────────┐
│   Web App       │──────▶│   Go API        │──────▶│   Postgres   │
│   (Next.js)     │       │   (Chi + GORM)  │       │              │
│   Dashboard     │       │                 │       └──────▲───────┘
└─────────────────┘       └───────┬─────────┘              │
                            ▲     │                        │
                  HTTP      │     │ LiveKit Server SDK      │ psycopg
                            │     │                        │
                            │     ▼                        │
┌─────────────────┐       ┌─────────────────┐       ┌─────┴────────┐
│   Session App   │──────▶│   LiveKit       │◀──────│   Worker     │
│   (Next.js)     │  WSS  │   Cloud         │  job  │   (Python)   │
│   Voice UI      │       │                 │ dispatch              │
└────────┬────────┘       └─────────────────┘       └──────────────┘
         │
         │  HTTP (get agent, start/end session)
         └────────────────▶ Go API
```

| App | Stack | Purpose |
|-----|-------|---------|
| **web** | Next.js, React, Tailwind | Dashboard — create projects, design agents, view sessions |
| **api** | Go, Chi, GORM, Postgres | REST API — agent CRUD, session management, LiveKit room creation |
| **session** | Next.js, LiveKit Client SDK | Voice UI — users join here to talk to agents |
| **worker** | Python, LiveKit Agents SDK | Voice agent runtime — loads agent config from DB, runs real-time voice sessions |
| **site** | Next.js | Landing page and marketing site |

## Authentication

Shravann uses built-in username/password authentication (no external auth provider required).

On first startup, a default admin user is created:

- **Email:** `admin@shravann.local`
- **Password:** `admin`

You will be prompted to change the password on first login. Authentication is handled via JWT tokens stored in httpOnly cookies.

## Supported Voice Providers

The worker dynamically loads the voice provider configured per agent:

- **OpenAI Realtime** — GPT-4o real-time voice with voices like alloy, echo, nova, shimmer, coral, sage, etc.
- **Google Gemini Live** — Gemini real-time voice with voices like Puck, Charon, Zephyr.

Provider API keys are configured per-project in the dashboard Settings page and encrypted at rest (AES-256-GCM).

## The Agent Model

An **Agent** is a conversational AI definition. Each agent contains one or more **Participants** (sub-agents) that can hand off to each other during a session.

```
Agent
├── name, slug
├── system_prompt          ← shared context across all participants
├── model                  ← provider: "openai" or "google"
├── language
├── session_start_input_schema  ← form fields shown before session starts
│
├── Participant (entry point)
│   ├── name, role
│   ├── system_prompt      ← participant-specific instructions
│   ├── voice_id           ← voice identifier (e.g. "alloy", "Puck")
│   ├── handoff_description ← when should LLM hand off TO this participant
│   └── is_entry_point: true
│
├── Participant (specialist)
│   ├── name, role
│   ├── system_prompt
│   ├── handoff_description
│   └── ...
│
└── Participant (closer)
    └── ...
```

**Key concepts:**

- Exactly one participant is the **entry point** — the first voice the user hears.
- **Handoff description** tells the LLM when to transfer to that participant. The worker generates `to_{role}` function tools for each peer automatically.
- **System prompt** is composed as: agent-level shared context + participant-level prompt.
- The **session start input schema** defines a form (name, email, custom fields) shown to the user before the voice session begins.

## Session Flow

```
 ┌──────────┐    ┌─────────────┐    ┌──────────┐    ┌───────────┐    ┌──────────┐
 │  Browser  │    │ Session App │    │  Go API  │    │  LiveKit  │    │  Worker  │
 └────┬─────┘    └──────┬──────┘    └────┬─────┘    └─────┬─────┘    └────┬─────┘
      │                 │               │                │               │
      │  1. Open /{agentId}             │                │               │
      │────────────────>│               │                │               │
      │                 │               │                │               │
      │                 │  2. GET /agents/{id}           │               │
      │                 │──────────────>│                │               │
      │                 │  <── agent config ─────────────│               │
      │                 │               │                │               │
      │  3. Show pre-session form       │                │               │
      │<────────────────│               │                │               │
      │                 │               │                │               │
      │  4. Submit form │               │                │               │
      │────────────────>│               │                │               │
      │                 │  5. POST /agents/{id}/sessions/start           │
      │                 │──────────────>│                │               │
      │                 │               │                │               │
      │                 │               │  6. Create LiveKit room        │
      │                 │               │───────────────>│               │
      │                 │               │  <── room ─────│               │
      │                 │               │                │               │
      │                 │               │  7. Generate participant JWT   │
      │                 │               │  8. Insert session in Postgres │
      │                 │               │                │               │
      │                 │  <── { room_name, token, session } ───────────│
      │                 │               │                │               │
      │                 │  9. Connect to LiveKit via WebSocket           │
      │                 │──────────────────────────────>│               │
      │                 │               │                │               │
      │  10. Voice room UI              │                │               │
      │<────────────────│               │                │               │
      │                 │               │  11. Dispatch job              │
      │                 │               │                │──────────────>│
      │                 │               │                │               │
      │                 │               │                │  12. Load agent from DB
      │                 │               │                │  13. Build participant agents
      │                 │               │                │  14. Start AgentSession
      │                 │               │                │               │
      │  15. Bidirectional voice (WebRTC) ◀────────────────────────────>│
      │                 │               │                │               │
      │  16. End call   │               │                │               │
      │────────────────>│  POST /sessions/{id}/end       │               │
      │                 │──────────────>│                │               │
```

## Project Structure

```
shravann/
├── apps/
│   ├── web/              # Dashboard (Next.js)
│   │   ├── app/          # App router pages
│   │   ├── components/   # Agent builder, session list, etc.
│   │   └── lib/          # API client, user-sync
│   │
│   ├── session/          # Voice session UI (Next.js)
│   │   ├── app/          # /[agentId] route
│   │   ├── components/   # SessionStart, VoiceRoomUI
│   │   └── lib/          # API client
│   │
│   ├── api/              # REST API (Go)
│   │   ├── cmd/server/   # Entrypoint + admin seed
│   │   └── internal/
│   │       ├── api/      # Handlers, auth, router, middleware
│   │       ├── db/       # Models, migrations
│   │       ├── store/    # Database access layer
│   │       ├── livekit/  # Room creation, token generation
│   │       ├── crypto/   # AES-256-GCM encryption for API keys
│   │       └── config/   # Environment config
│   │
│   └── worker/           # Voice agent runtime (Python)
│       ├── main.py       # AgentServer entrypoint
│       └── agent/
│           ├── db.py     # Load agent config from Postgres
│           ├── factory.py # Build Agent instances with handoff tools
│           ├── base.py   # BaseAgent, SessionData, handoff logic
│           └── crypto.py # Decrypt project API keys
│
├── site/                 # Landing page (Next.js)
├── packages/
│   └── create-shravann/  # npx create-shravann CLI
└── docker-compose.yaml   # Run the full stack with Docker
```

## Environment Variables

| Variable | Used by | Description |
|----------|---------|-------------|
| `DATABASE_URL` | api, worker | Postgres connection string |
| `LIVEKIT_URL` | api, worker, session | LiveKit server URL (`wss://...`) |
| `LIVEKIT_API_KEY` | api, worker | LiveKit API key |
| `LIVEKIT_API_SECRET` | api, worker | LiveKit API secret |
| `ENCRYPTION_KEY` | api, worker | Hex-encoded 32-byte key for encrypting API keys at rest |
| `JWT_SECRET` | api | Secret for signing auth JWTs (random key generated if empty) |
| `NEXT_PUBLIC_API_URL` | web, session | Go API base URL (default: `http://localhost:8080`) |
| `NEXT_PUBLIC_SESSION_APP_URL` | web | Session app URL for "Copy link" feature |
| `NEXT_PUBLIC_LIVEKIT_URL` | session | LiveKit WebSocket URL for client connections |

Provider API keys (OpenAI, Google) are not set as environment variables. They are configured per-project in the dashboard Settings page and stored encrypted in the database.

## Docker Images

Pre-built images are published to DockerHub on every release:

- `akshitmadan/shravann-api`
- `akshitmadan/shravann-worker`
- `akshitmadan/shravann-web`
- `akshitmadan/shravann-session`

## CI/CD

GitHub Actions workflows run on every push/PR:

| Workflow | Trigger | What it does |
|----------|---------|-------------|
| API CI | `apps/api/**` | `go vet`, build, test |
| Worker CI | `apps/worker/**` | pip install, py_compile checks |
| Web CI | `apps/web/**` | npm ci, lint, build |
| Session CI | `apps/session/**` | npm ci, build |
| Site CI | `site/**` | npm ci, build |
| Docker Publish | `v*` tags | Build + push all 4 Docker images to DockerHub |

## License

[Apache License 2.0](LICENSE)
