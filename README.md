# Shravann

[![Publish](https://github.com/akmadan/shravann/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/akmadan/shravann/actions/workflows/docker-publish.yml)
[![API CI](https://github.com/akmadan/shravann/actions/workflows/api-ci.yml/badge.svg)](https://github.com/akmadan/shravann/actions/workflows/api-ci.yml)
[![Worker CI](https://github.com/akmadan/shravann/actions/workflows/worker-ci.yml/badge.svg)](https://github.com/akmadan/shravann/actions/workflows/worker-ci.yml)
[![Web CI](https://github.com/akmadan/shravann/actions/workflows/web-ci.yml/badge.svg)](https://github.com/akmadan/shravann/actions/workflows/web-ci.yml)
[![Session CI](https://github.com/akmadan/shravann/actions/workflows/session-ci.yml/badge.svg)](https://github.com/akmadan/shravann/actions/workflows/session-ci.yml)
[![npm](https://img.shields.io/npm/v/create-shravann?label=create-shravann&color=cb3837)](https://www.npmjs.com/package/create-shravann)
[![Docker](https://img.shields.io/docker/v/akmadan/shravann-api?label=docker&color=2496ed&sort=semver)](https://hub.docker.com/u/akmadan)
[![License](https://img.shields.io/github/license/akmadan/shravann)](LICENSE)

**Open-source platform for building, orchestrating, and running multi-agent real-time voice AI systems.**

Shravann lets you design conversational voice agents through a visual dashboard, wire up multiple AI participants with handoff logic between them, and deploy the whole thing as a real-time voice session — all backed by [LiveKit](https://livekit.io/) for WebRTC transport and [OpenAI Realtime](https://platform.openai.com/docs/guides/realtime) or [Google Gemini Live](https://ai.google.dev/gemini-api/docs/live) for speech-to-speech inference.

---

## Why Shravann

Most voice AI demos are single-agent, single-turn scripts. Real use cases — intake calls, multi-department routing, specialist handoffs — need multiple agents cooperating in a single session with persistent context.

Shravann provides:

- **Multi-participant agents** — define several AI personas under one agent, each with its own system prompt, voice, and handoff triggers. The runtime generates tool calls (`to_billing`, `to_support`, etc.) automatically so participants can transfer the conversation.
- **Provider flexibility** — switch between OpenAI Realtime and Google Gemini Live per agent. API keys are configured per-project and encrypted at rest (AES-256-GCM), not baked into environment variables.
- **Pre-session data collection** — attach a custom form schema to any agent. The session app renders the form before connecting, and the collected data is injected into the agent's system prompt at runtime.
- **Visual agent builder** — a React Flow-based pipeline editor in the dashboard. Add participants, draw handoff connections, configure voices and prompts without touching code.
- **Session transcripts** — every session is recorded with full transcript history, viewable in the dashboard.
- **Self-hosted, no vendor lock-in** — runs on Docker with Postgres. No external auth providers. Built-in username/password authentication with JWT sessions.

---

## Quick Start

**Prerequisites:** [Docker Desktop](https://docs.docker.com/get-docker/) and a [LiveKit Cloud](https://livekit.io/) account (free tier works).

### One command

```bash
npx create-shravann
```

The CLI checks for Docker, prompts for your LiveKit credentials, auto-generates secrets, pulls images, starts all services, and prints:

```
  Dashboard       http://localhost:3000
  Session App     http://localhost:3001
  API             http://localhost:8080

  Default login
  Email:          admin@shravann.local
  Password:       admin
```

### Or manually with Docker Compose

```bash
git clone https://github.com/akshitmadan/shravann.git
cd shravann
cp .env.example .env        # fill in LiveKit credentials
docker compose up -d
```

### From source

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## How It Works

### Architecture

Shravann is four services plus a Postgres database:

| Service | Stack | Role |
|---------|-------|------|
| **api** | Go (Chi, GORM) | REST API — agent CRUD, session lifecycle, LiveKit room creation, auth, API key management |
| **web** | Next.js, React, Tailwind, React Flow | Dashboard — project management, agent builder, session history, settings |
| **session** | Next.js, LiveKit Client SDK | Voice UI — pre-session form, WebRTC connection, live transcript |
| **worker** | Python, LiveKit Agents SDK | Voice runtime — loads agent config from Postgres, constructs multi-participant agent sessions, handles handoffs |

```
┌─────────────────┐       ┌─────────────────┐       ┌──────────────┐
│   web            │──────▶│   api            │──────▶│   postgres   │
│   Dashboard      │ HTTP  │   Go REST        │ GORM  │              │
└─────────────────┘       └────────┬─────────┘       └──────▲───────┘
                                   │                        │
                                   │ LiveKit Server SDK      │ psycopg
                                   ▼                        │
┌─────────────────┐       ┌─────────────────┐       ┌──────┴───────┐
│   session        │──────▶│   LiveKit Cloud  │◀──────│   worker     │
│   Voice UI       │  WSS  │                 │  job   │   Python     │
└────────┬────────┘       └─────────────────┘       └──────────────┘
         │ HTTP
         └───────────────▶ api (get agent config, start/end session)
```

### Session Lifecycle

1. User opens a session link → **session app** fetches the agent definition from the **API**
2. If the agent has a pre-session form schema, the user fills it in
3. On submit, the **API** creates a LiveKit room, generates a participant token, and inserts a session record
4. The **session app** connects to **LiveKit** over WebRTC
5. LiveKit dispatches a job to the **worker**
6. The **worker** loads the agent config and project API keys from **Postgres**, decrypts the provider key, constructs participant agents with handoff tools, and starts an `AgentSession`
7. Bidirectional voice streams between the browser and the worker via LiveKit
8. When the user ends the call, the session transcript is saved

### The Agent Model

An **Agent** contains one or more **Participants** (sub-agents). Each participant has its own system prompt, voice, and role. Exactly one is the entry point — the first voice the user hears.

```
Agent
├── name, slug, language
├── system_prompt                    # shared context for all participants
├── model                            # "openai" or "google"
├── session_start_input_schema       # JSON form definition
│
├── Participant: "Receptionist"      ← entry point
│   ├── system_prompt, voice_id
│   └── handoff_description: "General intake and routing"
│
├── Participant: "Billing"
│   ├── system_prompt, voice_id
│   └── handoff_description: "When user asks about invoices or payments"
│
└── Participant: "Technical Support"
    ├── system_prompt, voice_id
    └── handoff_description: "When user has a technical issue"
```

The worker reads these definitions at runtime and generates `to_billing`, `to_technical_support` tool functions. When the LLM decides to hand off (based on the `handoff_description`), it calls the tool, and the worker swaps the active participant — new voice, new system prompt, same session context.

### Voice Providers

Configure per-project in the dashboard under **Settings → API Keys**:

| Provider | Models | Voices |
|----------|--------|--------|
| **OpenAI Realtime** | gpt-4o-realtime | alloy, ash, ballad, coral, echo, nova, sage, shimmer, verse |
| **Google Gemini Live** | gemini-2.0-flash | Puck, Charon, Kore, Fenrir, Aoede, Leda, Orus, Zephyr |

Keys are encrypted at rest. The worker decrypts them at session start. No provider credentials are stored in environment variables or config files.

### Authentication

Built-in username/password auth with bcrypt hashing and JWT tokens (httpOnly cookies). No external auth provider needed.

On first startup, the API seeds a default admin user:

- **Email:** `admin@shravann.local`
- **Password:** `admin`
- You are required to change the password on first login.

Additional users can be created through the API.

---

## Project Structure

```
shravann/
├── apps/
│   ├── api/                  # Go REST API
│   │   ├── cmd/server/       # Entrypoint, admin seed
│   │   └── internal/
│   │       ├── api/          # Handlers, router, auth middleware, CORS
│   │       ├── db/           # GORM models, SQL migrations
│   │       ├── store/        # Database access layer
│   │       ├── livekit/      # Room creation, token generation
│   │       ├── crypto/       # AES-256-GCM encryption
│   │       └── config/       # Environment config
│   │
│   ├── worker/               # Python voice agent runtime
│   │   ├── main.py           # LiveKit AgentServer entrypoint
│   │   └── agent/
│   │       ├── db.py         # Load agent config from Postgres
│   │       ├── factory.py    # Build multi-participant agents with handoff tools
│   │       ├── base.py       # BaseAgent, SessionData, handoff logic
│   │       └── crypto.py     # AES-256-GCM decryption for API keys
│   │
│   ├── web/                  # Dashboard (Next.js)
│   │   ├── app/              # App router — projects, agents, forms, sessions, settings
│   │   ├── components/       # Agent builder (React Flow), session list, settings UI
│   │   └── lib/              # API client, auth helpers
│   │
│   └── session/              # Voice session UI (Next.js)
│       ├── app/              # /[agentId] route
│       ├── components/       # Pre-session form, voice room, live transcript
│       └── lib/              # API client
│
├── site/                     # Landing page (Next.js)
├── packages/
│   └── create-shravann/      # npx create-shravann CLI
├── docker-compose.yaml       # Production: pulls pre-built images
├── docker-compose.dev.yaml   # Development: builds from source
└── .github/workflows/        # CI for each app + Docker/npm publish on tags
```

---

## Configuration

### Environment Variables

| Variable | Services | Description |
|----------|----------|-------------|
| `DATABASE_URL` | api, worker | Postgres connection string |
| `LIVEKIT_URL` | api, worker, session | LiveKit server URL (`wss://...`) |
| `LIVEKIT_API_KEY` | api, worker | LiveKit API key |
| `LIVEKIT_API_SECRET` | api, worker | LiveKit API secret |
| `ENCRYPTION_KEY` | api, worker | 32-byte hex key for encrypting API keys at rest |
| `JWT_SECRET` | api | Secret for signing authentication JWTs |
| `NEXT_PUBLIC_API_URL` | web, session | Go API base URL (default `http://localhost:8080`) |
| `NEXT_PUBLIC_SESSION_APP_URL` | web | Session app URL — used for "Copy session link" in the dashboard |
| `NEXT_PUBLIC_LIVEKIT_URL` | session | LiveKit WebSocket URL for browser connections |

Voice provider API keys (OpenAI, Google) are **not** environment variables — they are stored encrypted in the database and managed through the dashboard.

### Docker Images

Pre-built images are published to DockerHub on every tagged release:

```
akshitmadan/shravann-api
akshitmadan/shravann-worker
akshitmadan/shravann-web
akshitmadan/shravann-session
```

The Next.js images (`web`, `session`) support runtime environment variable injection via entrypoint scripts, so `NEXT_PUBLIC_*` values can be set at container start without rebuilding.

---

## CI/CD

| Workflow | Trigger | Checks |
|----------|---------|--------|
| API CI | `apps/api/**` changes | `go vet`, build, test |
| Worker CI | `apps/worker/**` changes | pip install, py_compile |
| Web CI | `apps/web/**` changes | lint, build |
| Session CI | `apps/session/**` changes | build |
| Site CI | `site/**` changes | build |
| Publish | `v*` tag push | Build + push Docker images to DockerHub, publish `create-shravann` to npm |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, project conventions, and PR guidelines.

## License

[Apache License 2.0](LICENSE)
