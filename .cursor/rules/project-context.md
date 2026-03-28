# Project Context: Sheets Server Monitor

## 1. Project Overview
- **Objective**: Monitor VPS **online/offline** from Google Sheets (per `CONFIG.VPS_ACCOUNTS`) and optionally warn about **upcoming or past expiry** via **Slack** (Apps Script only; no Python involvement for Slack).
- **Mechanism (ping)**: GAS reads IPs, calls **HTTP GET + Basic Auth** to `{PING_SERVER.URL}?host={IP}`. The Python service runs **ICMP ping** (`subprocess` + `ping`), returns **plain text** (stdout) and an **HTTP status**. GAS maps **200 → ONLINE**, anything else → **OFFLINE** (no JSON parsing).
- **Mechanism (expiry)**: GAS reads expiry dates from a configured column (default **I**, `DD/MM/YYYY` or Sheets `Date`). On configured **weekdays** (script timezone, `EXPIRY.SLACK_NOTIFY_WEEKDAYS` using Utilities format **`u`**: 1=Mon … 7=Sun), if any row is within **`EXPIRY.WARNING_DAYS`** days of expiry **or already expired**, it sends **one aggregated Slack message** per calendar day (dedup via **Script Properties** `LAST_EXPIRY_SLACK_DATE`) when `SLACK.WEBHOOK_URL` is set.

## 2. Tech Stack & Responsibilities
- **Google Spreadsheet**: IPs, status column, expiry column, and **`J1`** for ping job metadata (`Updated at: … ICT` or short errors).
- **Google Apps Script** (`app-scripts/`): Time-driven triggers (e.g. hourly in `trigger.gs`). **Single entry** `monitorAllVPS()` runs a **registry** `MONITOR_JOBS` (ping then expiry/Slack, extensible). Ping path uses `UrlFetchApp.fetchAll()` in batches with delays between batches.
- **Python** (`python-api/main.py`): **Flask** — `GET /ping?host=…` (Basic Auth via ENV), `GET /health`. IPv4 regex validation; 2 ping packets, ≥1 reply = success; 5s timeout.
- **Docker**: `python:3.12-slim`, `iputils-ping`, root `requirements.txt` + `python-api/*`, `CMD python main.py` (default port **8888** in code).

## 3. Data Flow
### 3.1 Entry
1. **Trigger**: e.g. `createTrigger()` → `monitorAllVPS()` on an interval.
2. **Orchestration**: `monitorAllVPS()` loads the active spreadsheet and runs each job in `MONITOR_JOBS` with per-job `try/catch` (failures do not stop other jobs).

### 3.2 Job: ping (`runPingMonitoring`)
3. **Read**: For each `VPS_ACCOUNTS` entry, read `ipColumn` from `startRow`…`lastRow`, filter `isValidIPv4`.
4. **Execute**: Chunk IPs (`BATCH_SIZE`), `UrlFetchApp.fetchAll` with Basic Auth, `muteHttpExceptions: true`.
5. **Server**: Missing/invalid `host` → **400**; success → **200** + text; failure/timeout → **500**; auth failure (if enabled) → **401**.
6. **Write**: Merge `ONLINE`/`OFFLINE` into `statusColumn`; set **`J1`** timestamp or short error per sheet.

### 3.3 Job: expiry → Slack (`runExpirySlackNotificationIfDue`)
7. Skip if webhook empty; skip if `SLACK_NOTIFY_WEEKDAYS` resolves to no valid `u` values; skip if today (script TZ) is not in that set; skip if already sent today (Script Properties).
8. Scan each sheet’s expiry column (`expiryColumn` per account or `EXPIRY.DATE_COLUMN`); build one Slack `text` payload; **POST JSON** to webhook; on **2xx**, record today’s date key to avoid duplicate sends the same day.

## 4. Cursor / LLM Directives
- **No boilerplate**: Prefer clear names over obvious comments.
- **Typing**: Python type hints on core logic; JSDoc on GAS where it helps.
- **Error boundaries**: Flask returns controlled HTTP codes; GAS isolates errors per sheet (ping) and per job (orchestrator).
- **GAS layout**:
  - `Config.gs` — `PING_SERVER`, `VPS_ACCOUNTS`, batch tuning, `EXPIRY` (dates, warning window, **SLACK_NOTIFY_WEEKDAYS**), `SLACK.WEBHOOK_URL`.
  - `Code.gs` — `monitorAllVPS`, `MONITOR_JOBS` registry.
  - `PingMonitoring.gs` — `runPingMonitoring(ss)`.
  - `ExpirySlackNotifier.gs` — `runExpirySlackNotificationIfDue(ss)` and expiry/date helpers.
  - `Utils.gs` — IP validation, ping `fetchAll`, chunk, sleep, ICT time string.
  - `trigger.gs` — manual run / trigger setup.
  - `appscripts.json` — timezone `Asia/Ho_Chi_Minh`, scopes, V8.
- **Edits**: Prefer minimal diffs; do not paste entire files unless necessary.

## 5. Folder Structure
```text
/
├── app-scripts/
│   ├── appscripts.json      # timeZone, oauthScopes, runtime V8
│   ├── Config.gs            # ping + sheet map + EXPIRY + SLACK
│   ├── Code.gs              # monitorAllVPS, MONITOR_JOBS
│   ├── PingMonitoring.gs    # runPingMonitoring
│   ├── ExpirySlackNotifier.gs
│   ├── Utils.gs
│   └── trigger.gs
├── python-api/
│   └── main.py
├── requirements.txt
├── Dockerfile
├── .env.example             # optional reference for Flask Basic Auth / flags
└── .cursor/rules/
    └── project-context.md
```

**Note**: Repo filename is **`appscripts.json`** (not the default `appsscript.json` name sometimes used by `clasp`).
