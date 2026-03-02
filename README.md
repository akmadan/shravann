# Shravann

A platform for building and deploying multi-agent voice AI systems. Design conversational agents with configurable participants, handoff logic, and voice personas — then run them as real-time voice sessions powered by LiveKit and OpenAI Realtime.

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
| **web** | Next.js, React, Tailwind, Clerk | Dashboard — create projects, design agents, view sessions |
| **api** | Go, Chi, GORM, Postgres | REST API — agent CRUD, session management, LiveKit room creation |
| **session** | Next.js, LiveKit Client SDK | Voice UI — users join here to talk to agents |
| **worker** | Python, LiveKit Agents SDK, OpenAI Realtime | Voice agent runtime — loads agent config from DB, runs real-time voice sessions |

## The Agent Model

An **Agent** is a conversational AI definition. Each agent contains one or more **Participants** (sub-agents) that can hand off to each other during a session.

```
Agent
├── name, slug
├── system_prompt          ← shared context across all participants
├── model                  ← default model
├── language
├── session_start_input_schema  ← form fields shown before session starts
│
├── Participant (entry point)
│   ├── name, role
│   ├── system_prompt      ← participant-specific instructions
│   ├── model              ← gpt-4o, gpt-4o-mini, gpt-4.1, etc.
│   ├── voice_provider     ← OpenAI, Cartesia, Deepgram, or None
│   ├── voice_id           ← voice identifier (e.g. "alloy", "shimmer")
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

This is the end-to-end sequence from a user clicking "Start session" to having a live voice conversation with an AI agent.

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
      │                 │     { identity, channel, session_start_data }  │
      │                 │──────────────>│                │               │
      │                 │               │                │               │
      │                 │               │  6. Create LiveKit room        │
      │                 │               │     name: session-{agentId}__{ts}__{identity}
      │                 │               │     metadata: { agent_id }     │
      │                 │               │───────────────>│               │
      │                 │               │  <── room created ─────────────│
      │                 │               │                │               │
      │                 │               │  7. Generate participant JWT   │
      │                 │               │  8. Insert session in Postgres │
      │                 │               │                │               │
      │                 │  <── { room_name, token, session } ───────────│
      │                 │               │                │               │
      │                 │  9. Connect to LiveKit via WebSocket + token   │
      │                 │──────────────────────────────>│               │
      │                 │               │                │               │
      │  10. Voice room UI (mic, speaker, end call)     │               │
      │<────────────────│               │                │               │
      │                 │               │                │               │
      │                 │               │  11. LiveKit dispatches job    │
      │                 │               │                │──────────────>│
      │                 │               │                │               │
      │                 │               │                │  12. Worker reads agent_id
      │                 │               │                │      from room metadata
      │                 │               │                │               │
      │                 │               │                │  13. load_agent(agent_id)
      │                 │               │                │      from Postgres
      │                 │               │                │               │
      │                 │               │                │  14. Build participant agents
      │                 │               │                │      with handoff tools
      │                 │               │                │               │
      │                 │               │                │  15. Start AgentSession
      │                 │               │                │      (OpenAI Realtime)
      │                 │               │                │               │
      │  16. Bidirectional voice (WebRTC) ◀────────────────────────────>│
      │                 │               │                │               │
      │  17. End call   │               │                │               │
      │────────────────>│               │                │               │
      │                 │  18. POST /sessions/{id}/end   │               │
      │                 │──────────────>│                │               │
      │                 │  19. Disconnect LiveKit         │               │
      │                 │──────────────────────────────>│               │
```

### Step-by-step

**Page load (steps 1–3)**

1. User opens the session link (`/{agentId}`) in the Session App.
2. Session App fetches agent config from the Go API, including `session_start_input_schema`.
3. A pre-session form is rendered (e.g. name, email, or any custom fields defined in the schema).

**Session creation (steps 4–9)**

4. User fills the form and clicks "Start session".
5. Session App sends `POST /agents/{id}/sessions/start` with identity, channel (`"voice"`), and form data.
6. Go API creates a LiveKit room with `agent_id` embedded in the room metadata.
7. Go API generates a JWT participant token with a `RoomJoin` grant scoped to that room.
8. Go API creates a `Session` record in Postgres with status `active` and the form data as metadata.
9. Session App connects to LiveKit Cloud using the token over WebSocket.

**Worker dispatch (steps 10–15)**

10. The voice room UI appears with mic/speaker controls.
11. LiveKit detects a participant joined and dispatches a job to the registered Python worker.
12. Worker's `entrypoint` extracts `agent_id` from the room's metadata JSON (falls back to parsing the room name).
13. Worker loads the full agent config (agent + all participants) from Postgres.
14. Worker builds `BaseAgent` instances for each participant, wiring up `to_{role}` handoff tools between them.
15. Worker starts an `AgentSession` with the entry-point agent and `openai.realtime.RealtimeModel`.

**Live conversation (step 16)**

16. Bidirectional WebRTC audio flows between the browser and the worker through LiveKit. The agent listens, thinks, and speaks in real time. If the LLM decides to hand off (e.g. from a greeter to a specialist), it calls the `to_{role}` tool and the next participant takes over seamlessly.

**Session end (steps 17–19)**

17. User clicks "End call".
18. Session App calls `POST /sessions/{id}/end` to mark the session as ended in the database.
19. LiveKit connection is disconnected; the worker's session terminates.

## Project Structure

```
shravann/
├── apps/
│   ├── web/              # Dashboard (Next.js)
│   │   ├── app/          # App router pages
│   │   ├── components/   # Agent builder, session list, etc.
│   │   └── lib/          # API client, utils
│   │
│   ├── session/          # Voice session UI (Next.js)
│   │   ├── app/          # /[agentId] route
│   │   ├── components/   # SessionStart, VoiceRoomUI
│   │   └── lib/          # API client
│   │
│   ├── api/              # REST API (Go)
│   │   ├── cmd/server/   # Entrypoint
│   │   └── internal/
│   │       ├── api/      # Handlers, router
│   │       ├── db/       # Models, migrations
│   │       ├── store/    # Database access layer
│   │       ├── livekit/  # Room creation, token generation
│   │       └── config/   # Environment config
│   │
│   └── worker/           # Voice agent runtime (Python)
│       ├── main.py       # AgentServer entrypoint
│       └── agent/
│           ├── db.py     # Load agent config from Postgres
│           ├── factory.py # Build Agent instances with handoff tools
│           └── base.py   # BaseAgent, SessionData, handoff logic
│
├── packages/             # Shared configs (eslint, tsconfig)
└── infra/                # Docker, Kubernetes, Terraform
```

## Running Locally

### Prerequisites

- Node.js 20+
- Go 1.24+
- Python 3.12+
- PostgreSQL
- A [LiveKit Cloud](https://livekit.io/) account (or self-hosted LiveKit server)
- An [OpenAI API](https://platform.openai.com/) key
- A [Clerk](https://clerk.com/) account (for web app auth)

### 1. Database

Create a Postgres database:

```bash
createdb db_shravann
```

The Go API auto-migrates tables on startup via GORM.

### 2. Go API (`apps/api`)

```bash
cd apps/api
cp .env.example .env  # fill in DATABASE_URL, LIVEKIT_*, etc.
go run cmd/server/main.go
```

Runs on `http://localhost:8080`.

### 3. Web Dashboard (`apps/web`)

```bash
cd apps/web
pnpm install
cp .env.example .env.local  # fill in NEXT_PUBLIC_API_URL, CLERK keys
pnpm dev
```

Runs on `http://localhost:3000`.

### 4. Session App (`apps/session`)

```bash
cd apps/session
pnpm install
cp .env.example .env.local  # fill in NEXT_PUBLIC_API_URL, NEXT_PUBLIC_LIVEKIT_WS_URL
pnpm dev
```

Runs on `http://localhost:3001`.

### 5. Worker (`apps/worker`)

```bash
cd apps/worker
pip install -r requirements.txt
cp .env.example .env  # fill in LIVEKIT_*, OPENAI_API_KEY, DATABASE_URL
python main.py start
```

### Environment Variables

| Variable | Used by | Description |
|----------|---------|-------------|
| `DATABASE_URL` | api, worker | Postgres connection string |
| `LIVEKIT_URL` | api, worker | LiveKit server URL (`wss://...`) |
| `LIVEKIT_API_KEY` | api, worker | LiveKit API key |
| `LIVEKIT_API_SECRET` | api, worker | LiveKit API secret |
| `OPENAI_API_KEY` | worker | OpenAI API key (for Realtime model) |
| `NEXT_PUBLIC_API_URL` | web, session | Go API base URL |
| `NEXT_PUBLIC_LIVEKIT_WS_URL` | session | LiveKit WebSocket URL |
| `NEXT_PUBLIC_CLERK_*` | web | Clerk auth keys |
