# Ping ICMP API Server

Lightweight Flask API server that runs ICMP ping(s) against an IPv4 address.

This README explains how to start the service using Docker Compose and how to call it from a client using curl.

## Files you should have
- `app.py` — the Flask application
- `Dockerfile` and `docker-compose.yml` — containerization and compose configuration
- `requirements.txt` — Python dependencies

## Start the server with Docker Compose

1. Build and start, Override Basic Auth credentials before starting, for example:

```bash
export BASIC_AUTH_ENABLE=true
export BASIC_AUTH_USER=admin
export BASIC_AUTH_PASS=Secr3t@123
docker-compose up --build -d
```

Alternatively edit `docker-compose.yml` to set env vars permanently.

2. Follow logs:

```bash
docker-compose logs -f
```

3. Stop and remove the containers:

```bash
docker-compose down
```

## HTTP endpoints
- GET /health — simple health check (no auth required)
- GET /ping?host=<IPv4> — run ping against the given IPv4 address (Basic Auth required)

Notes:
- The service validates IPv4 addresses in dotted-quad form (e.g. `8.8.8.8`).
- The container must have the system `ping` binary available and the host/container network must allow ICMP.

## Usage examples (curl)
Replace the username/password and host as needed.

- Health check (no auth):

```bash
curl "http://localhost:5001/health"
```

- Ping an IP (example with default credentials `admin:Secr3t@123`):

```bash
curl -u admin:Secr3t@123 "http://localhost:5001/ping?host=8.8.8.8"
```

Behavior:
- If the ping attempt(s) succeed (per the app's configured policy), you will receive HTTP 200 and the body will contain the ping output.
- If the ping fails per the app's policy, you will receive HTTP 500 and the body will include the ping output or error details.

## Troubleshooting
- Permission/ICMP: Some environments require elevated privileges to send ICMP packets. This app calls the OS `ping` binary, so behavior follows the OS/container policy.
- If you see `Unauthorized` in HTTP response, verify `BASIC_AUTH_USER`/`BASIC_AUTH_PASS` in the container environment.

## Quick local run (optional)
If you prefer not to use Docker:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Then use the same `curl` commands above against `http://localhost:5001`.

## Security note
Do not commit real credentials into the repository. Use environment variables or a secrets manager for production deployments.
