# ping-icmp-api — concise

Minimal Flask service to run ICMP pings and return the ping output over HTTP.

Quick start (Docker Compose)

```bash
docker compose up --build -d
docker compose ps
```

Environment variables
- BASIC_AUTH_ENABLED: enable Basic Auth (1/true) or disable (0/false). Default is false.
- BASIC_AUTH_USER / BASIC_AUTH_PASS: credentials when auth is enabled.
- PING_COUNT / MIN_SUCCESS_PACKETS: control ping behavior in the code.

Configure via .env
1. Copy the example file to create a local `.env` that Docker Compose will read:

```bash
cp .env.example .env
# then edit .env to change credentials or enable auth
```

2. Alternatively export environment variables in your shell before starting the compose stack:

```bash
export BASIC_AUTH_ENABLED=true
export BASIC_AUTH_USER=admin
export BASIC_AUTH_PASS=verysecret
docker compose up --build -d
```

Endpoints
- GET /health — returns OK
- GET /ping?host=<IPv4> — returns ping output; 200 on success, 500 on failure

Example

```bash
# health
curl http://localhost:8888/health

# ping (no auth)
curl 'http://localhost:8888/ping?host=1.1.1.1'

# ping (with auth)
curl -u admin:Secr3t@123 'http://localhost:8888/ping?host=1.1.1.1'
```

Apps Script (manual browser deploy)

1. Open this [spreadsheet URL](https://docs.google.com/spreadsheets/d/1RXBmTKeAgYARA-A2ZbOd1up0i3mt8oUVXZr8Rt2Z7dk/edit?usp=sharing) and make a copy (File → Make a copy).
2. Open Extensions → Apps Script in your copy.
3. Create script files that match `app-scripts/` (e.g. `Code.gs`, `trigger.gs`, ...) and paste the code.
4. Save, run a setup function and authorize, then add a time-driven trigger for `monitorAllVPS`.

Troubleshooting
- The container requires NET_RAW/NET_ADMIN to send ICMP; if ping fails, exec into the container and run `ping` manually.

Security
- Don't expose with default credentials; use environment variables or a secrets manager.
