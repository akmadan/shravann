# Shravann Agent Worker

Python LiveKit agent server that runs the voice agent for sessions. It loads agent config from Postgres and uses **automatic dispatch**: you do not start the worker per session from the API.

## How it works

1. **Run the worker** once (e.g. in a container or process):
   ```bash
   python main.py start
   ```
   The worker connects to LiveKit and registers as an agent. It stays running and waits for jobs.

2. **When a user starts a session** (from the session app):
   - The API creates a LiveKit room (with `agent_id` in room metadata) and returns a token to the frontend.
   - The user joins the room with that token (browser connects to LiveKit).
   - LiveKit **automatically dispatches** a job to this worker (one agent per new room by default).
   - The worker’s `entrypoint` runs: it reads `agent_id` from room metadata, loads the agent from the DB, builds participants, and joins the room to run the voice session.

So you only need to **run the worker process**; LiveKit handles dispatching it when users join rooms. Use the same LiveKit URL, API key, and secret as the API and session app.

## Environment

See `.env.example`. Required:

- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` — same as the API.
- `DATABASE_URL` — Postgres (agent/participant data).
- `OPENAI_API_KEY` — used for OpenAI Realtime API (speech-to-speech); no separate STT/TTS keys needed.

## Run locally

```bash
pip install -r requirements.txt
python main.py start
```

With Docker: build the image and run the container; the default command is `python main.py start`.
