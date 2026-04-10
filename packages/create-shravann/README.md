# create-shravann

Spin up the [Shravann](https://github.com/akshitmadan/shravann) multi-agent voice AI platform with one command.

## Usage

```bash
npx create-shravann
```

### What it does

1. Checks that Docker is installed
2. Creates `~/.shravann/` to store configuration and compose files
3. Auto-generates encryption and JWT secrets
4. Pulls and starts core services (Postgres, API, Dashboard)
5. Waits for the API health check
6. Prints URLs, default login, and next steps

Re-running `npx create-shravann` is safe — it detects an existing configuration and starts services without overwriting your secrets.

### Prerequisites

- [Docker Desktop](https://docs.docker.com/get-docker/) with Compose plugin
- A free [LiveKit Cloud](https://livekit.io/) account (or self-hosted LiveKit) — configured later through the dashboard

### Services started

| Service   | URL                    |
| --------- | ---------------------- |
| Dashboard | http://localhost:3700  |
| API       | http://localhost:8484  |

Voice services (worker + session app on `:3701`) start separately after you configure LiveKit in the dashboard:

```bash
cd ~/.shravann && docker compose --profile voice up -d
```

### Default login

| Field    | Value                |
| -------- | -------------------- |
| Email    | admin@shravann.local |
| Password | admin                |

You will be prompted to change the password on first login.

### Configuration

All config lives in `~/.shravann/`:

```
~/.shravann/
├── .env                 # secrets and LiveKit credentials
└── docker-compose.yml   # service definitions
```

Override the install directory with the `SHRAVANN_HOME` environment variable:

```bash
SHRAVANN_HOME=/opt/shravann npx create-shravann
```

## License

Apache-2.0
