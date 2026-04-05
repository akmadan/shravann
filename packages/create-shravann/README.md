# create-shravann

Spin up the [Shravann](https://github.com/akshitmadan/shravann) multi-agent voice AI platform with one command.

## Usage

```bash
npx create-shravann
```

### What it does

1. Checks that Docker is installed
2. Prompts for your LiveKit credentials
3. Auto-generates encryption and JWT secrets
4. Creates a `.env` and `docker-compose.yml`
5. Pulls and starts all services (Postgres, API, Worker, Web, Session)
6. Waits for the API health check
7. Prints URLs and default login credentials

### Prerequisites

- [Docker Desktop](https://docs.docker.com/get-docker/) with Compose plugin
- A free [LiveKit Cloud](https://livekit.io/) account (or self-hosted LiveKit)

### Services started

| Service   | URL                    |
| --------- | ---------------------- |
| Dashboard | http://localhost:3000  |
| Session   | http://localhost:3001  |
| API       | http://localhost:8080  |

### Default login

| Field    | Value                |
| -------- | -------------------- |
| Email    | admin@shravann.local |
| Password | admin                |

You will be prompted to change the password on first login.

## License

Apache-2.0
