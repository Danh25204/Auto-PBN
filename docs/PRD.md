# PRD — Auto PBN Poster
**Version:** 1.0  
**Date:** 2026-03-02  
**Status:** Draft — Pending Review

---

## 1. Overview

A local web application that automates publishing posts to multiple WordPress sites (PBN) simultaneously. Users supply site credentials and post content via a browser UI; the app uses the WordPress REST API to create posts across all target sites in a controlled queue, collecting published URLs into a persistent log file.

---

## 2. Goals & Non-Goals

### Goals
- Automate post creation on 50+ WordPress sites per session
- Accept site credentials and content via form input **and** CSV file upload
- Use WP REST API (Application Password auth) — no browser automation (Puppeteer)
- Never persist credentials to disk; hold only in server-side memory for the duration of the job
- Log every published post link + metadata to `data/posts.txt`
- Provide real-time progress feedback in the UI

### Non-Goals
- Scheduling / cron (out of scope v1)
- Media/image uploads (out of scope v1)
- Multi-user authentication for the app itself (local tool, single-user)
- Database storage (file system is sufficient)

---

## 3. Feature List

| ID  | Feature                          | Priority |
|-----|----------------------------------|----------|
| F01 | Single-post form input           | P0       |
| F02 | CSV bulk upload for sites/creds  | P0       |
| F03 | Post title + content editor      | P0       |
| F04 | Post status selector (publish/draft) | P0   |
| F05 | Queue-based WP REST API posting  | P0       |
| F06 | Real-time job log (SSE stream)   | P0       |
| F07 | Append results to posts.txt      | P0       |
| F08 | Downloadable posts.txt from UI   | P1       |
| F09 | Concurrency limit config (env)   | P1       |
| F10 | Per-site error reporting         | P0       |

---

## 4. User Flow

```
┌─────────────────────────────────────────────────────────┐
│  BROWSER (React 18 SPA)                                  │
│                                                          │
│  ① Sites Panel                                           │
│     • Manual form: URL | Username | App Password [+Add]  │
│     • OR upload sites.csv                                │
│                                                          │
│  ② Content Panel                                         │
│     • Title (text input)                                 │
│     • Content (textarea / rich text)                     │
│     • Status: [Publish ▾] | [Draft]                      │
│                                                          │
│  ③ [▶ Post to All Sites] button                          │
│                                                          │
│  ④ Live Log Panel (SSE stream)                           │
│     • [✓] https://site1.com → https://site1.com/post-x  │
│     • [✗] https://site2.com → 401 Unauthorized           │
│     • Progress bar: 12 / 50 done                         │
│                                                          │
│  ⑤ [⬇ Download posts.txt]                                │
└─────────────────────────────────────────────────────────┘
              │  POST /api/jobs                ▲
              │  {sites[], title, content,    │ SSE GET /api/jobs/:id/stream
              │   status}                     │
              ▼                               │
┌─────────────────────────────────────────────────────────┐
│  EXPRESS SERVER (Node.js)                                │
│                                                          │
│  JobQueue  ──► Worker pool (CONCURRENCY=5 default)       │
│                  │                                       │
│                  ▼                                       │
│            WP REST API                                   │
│            POST /wp-json/wp/v2/posts                    │
│            Auth: Basic base64(user:app_password)         │
│                  │                                       │
│                  ├─ success → append to data/posts.txt  │
│                  └─ failure → log error, continue        │
└─────────────────────────────────────────────────────────┘
```

### CSV Format (sites.csv)
```csv
url,username,app_password
https://site1.com,admin,xxxx xxxx xxxx xxxx xxxx xxxx
https://site2.com,editor,yyyy yyyy yyyy yyyy yyyy yyyy
```

### posts.txt Append Format
```
Site: https://site1.com | Post: https://site1.com/hello-world | Status: publish | Date: 2026-03-02T10:30:00Z
Site: https://site2.com | Post: ERROR: 401 Unauthorized | Status: failed | Date: 2026-03-02T10:30:05Z
```

---

## 5. Tech Stack & Architecture

### Backend — `server/`
| Concern              | Choice                              | Reason                                  |
|----------------------|-------------------------------------|-----------------------------------------|
| Runtime              | Node.js 20 LTS                      | Async I/O, great for HTTP fan-out       |
| Framework            | Express 5                           | Minimal, well-known                     |
| HTTP client          | `axios` (with `axios-retry`)        | Clean API, retry support                |
| Queue                | `p-queue` (in-process)              | Simple, no Redis needed for local use   |
| CSV parsing          | `csv-parse`                         | Streaming, battle-tested                |
| Real-time updates    | Server-Sent Events (SSE)            | No WS overhead, unidirectional is fine  |
| File logging         | Node `fs/promises` append           | Simple, no DB needed                    |
| Env config           | `dotenv`                            | Standard                                |
| Validation           | `zod`                               | Input schema validation                 |

### Frontend — `client/`
| Concern        | Choice                  |
|----------------|-------------------------|
| Framework      | React 18 (Vite)         |
| HTTP           | `fetch` / `EventSource` |
| UI             | Tailwind CSS            |
| State          | `useState` / `useReducer` (no Redux needed) |

### Security Model
- Credentials passed from client → server in a single `POST /api/jobs` request body (HTTPS on VPS, localhost on local)
- Server stores credentials **only in-memory** within the job object for the duration of execution
- Credentials are **never** written to disk, logs, or env files
- After job completes/fails, the job object (including creds) is garbage-collected (no persistent job store)
- No authentication on the app itself (local-only tool — bind to `127.0.0.1`)
- Input validation with `zod` to prevent injection

---

## 6. API Spec

### `POST /api/jobs`
Create and immediately start a posting job.

**Request body (JSON):**
```json
{
  "sites": [
    { "url": "https://site1.com", "username": "admin", "appPassword": "xxxx xxxx xxxx" }
  ],
  "post": {
    "title": "Hello PBN",
    "content": "<p>Body text here.</p>",
    "status": "publish"
  }
}
```
**Response `202`:**
```json
{ "jobId": "uuid-v4" }
```

### `GET /api/jobs/:id/stream` (SSE)
Real-time event stream for a running job.

**Events:**
```
event: progress
data: {"siteUrl":"https://s1.com","status":"ok","postUrl":"https://s1.com/post","index":1,"total":50}

event: progress
data: {"siteUrl":"https://s2.com","status":"error","error":"401 Unauthorized","index":2,"total":50}

event: done
data: {"completed":49,"failed":1,"total":50}
```

### `GET /api/posts.txt`
Download the current posts.txt log file.

---

## 7. Edge Cases & Error Handling

| Scenario                          | Handling                                                |
|-----------------------------------|--------------------------------------------------------|
| WP REST API disabled on site      | HTTP 404 on `/wp-json` → log as error, skip site       |
| Wrong credentials (401)           | Log error, mark site failed, continue queue            |
| Network timeout                   | `axios` timeout 15s + 2 retries with backoff           |
| Site URL has no trailing protocol | Normalize URL with `new URL()` before calling          |
| Empty title or content            | `zod` validation rejects on server before job starts   |
| CSV malformed / missing columns   | Return 400 with field-level error message              |
| posts.txt write fail              | Log to stderr, don't crash job — post still succeeded  |
| 50+ sites → memory               | Sites array held in job object then released; no leak  |
| Duplicate site entries in CSV     | Deduplicate by URL before enqueuing                    |
| CORS (local dev)                  | Express CORS middleware allows `localhost:5173`         |

---

## 8. Directory Structure

```
auto-pbn/
├── server/
│   ├── src/
│   │   ├── index.js          # Express app bootstrap
│   │   ├── routes/
│   │   │   └── jobs.js       # POST /api/jobs, GET /api/jobs/:id/stream
│   │   │   └── download.js   # GET /api/posts.txt
│   │   ├── services/
│   │   │   ├── queue.js      # p-queue worker setup
│   │   │   ├── wpApi.js      # WP REST API post creation
│   │   │   └── logger.js     # Append to data/posts.txt
│   │   └── validation/
│   │       └── schemas.js    # zod schemas
│   ├── data/
│   │   └── posts.txt         # Append-only log (gitignored)
│   ├── .env.example
│   └── package.json
├── client/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── SitesPanel.jsx    # Manual form + CSV upload
│   │   │   ├── ContentPanel.jsx  # Title, content, status
│   │   │   └── LogPanel.jsx      # SSE live log + progress bar
│   │   └── hooks/
│   │       └── useJobStream.js   # EventSource hook
│   └── package.json
├── docs/
│   └── PRD.md                # This file
└── README.md
```

---

## 9. Environment Variables (`server/.env`)

```env
PORT=3001
CONCURRENCY=5          # Max simultaneous WP API calls
REQUEST_TIMEOUT_MS=15000
REQUEST_RETRIES=2
```
No credentials stored here — all runtime only.

---

## 10. Roadmap

| Phase | Scope                                                                 | Status     |
|-------|-----------------------------------------------------------------------|------------|
| 1     | Spec & PRD                                                           | ✅ Done     |
| 2a    | Backend scaffold: Express server, `/api/jobs`, queue, WP REST call   | ✅ Done     |
| 2b    | SSE stream endpoint, `posts.txt` logger                              | ✅ Done     |
| 2c    | Frontend: SitesPanel + ContentPanel + LogPanel                       | ✅ Done     |
| 2d    | CSV upload parsing                                                    | ✅ Done     |
| 2e    | Integration + end-to-end test                                         | ✅ Done     |
| 3     | Error hardening, input validation, download endpoint, README          | ✅ Done     |

---

## 11. WP Application Password Setup (User Prerequisite)

For each target WordPress site:
1. WP Admin → **Users → Profile → Application Passwords**
2. Enter name (e.g. "AutoPBN") → Click **Add New Application Password**
3. Copy the generated password (format: `xxxx xxxx xxxx xxxx xxxx xxxx`)
4. Use this as `appPassword` in the form or CSV — **not** the WP login password

> Requires WordPress 5.6+ with REST API enabled (default on most hosts).
