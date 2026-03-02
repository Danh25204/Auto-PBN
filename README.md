# Auto PBN Poster

Automates publishing posts to multiple WordPress sites via the WP REST API. Paste or upload your site list, write your post once, and fire it to all sites simultaneously — with a live progress log and a downloadable `posts.txt` record.

---

## Prerequisites

- **Node.js 20+**
- WordPress sites with **Application Passwords** enabled (WP 5.6+, enabled by default)
  - WP Admin → Users → Profile → Application Passwords → Generate

---

## Quick Start

### 1. Clone / open the project
```
cd "auto PBN"
```

### 2. Start the backend
```bash
cd server
cp .env.example .env      # edit if needed (PORT, CONCURRENCY, etc.)
npm install
npm start
# → http://127.0.0.1:3001
```

### 3. Start the frontend (separate terminal)
```bash
cd client
npm install
npm run dev
# → http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

## Usage

1. **Sites panel** — add sites manually (URL + username + Application Password), or upload a `sites.csv`:
   ```csv
   url,username,app_password
   https://site1.com,admin,xxxx xxxx xxxx xxxx xxxx xxxx
   https://site2.com,editor,yyyy yyyy yyyy yyyy yyyy yyyy
   ```
2. **Content panel** — enter title, body (HTML allowed), choose Publish or Draft.
3. Click **▶ Post to All Sites** — watch the live log on the right.
4. Click **⬇ Download posts.txt** when done to grab the results file.

---

## Configuration (`server/.env`)

| Variable              | Default | Description                              |
|-----------------------|---------|------------------------------------------|
| `PORT`                | `3001`  | Backend port                             |
| `CONCURRENCY`         | `5`     | Max simultaneous WP API calls            |
| `REQUEST_TIMEOUT_MS`  | `15000` | Per-request timeout (ms)                 |
| `REQUEST_RETRIES`     | `2`     | Retry count on 5xx / network errors      |

---

## Output — `server/data/posts.txt`
```
Site: https://site1.com | Post: https://site1.com/hello-world | Status: publish | Date: 2026-03-02T10:30:00Z
Site: https://site2.com | Post: ERROR: 401 Unauthorized | Status: failed | Date: 2026-03-02T10:30:05Z
```

---

## Security Notes

- Credentials are **never saved to disk** — held in server memory only for the duration of the job.
- The backend binds to `127.0.0.1` only (not exposed to the network).
- Never share `server/.env` or `server/data/posts.txt` (gitignored).

---

## Project Structure

```
auto PBN/
├── server/              # Express backend
│   ├── src/
│   │   ├── index.js
│   │   ├── routes/      jobs.js, download.js
│   │   ├── services/    wpApi.js, queue.js, logger.js
│   │   └── validation/  schemas.js
│   ├── data/posts.txt   (auto-created, gitignored)
│   └── .env.example
├── client/              # React 18 + Vite + Tailwind frontend
│   └── src/
│       ├── App.jsx
│       ├── components/  SitesPanel, ContentPanel, LogPanel
│       ├── hooks/       useJobStream.js
│       └── utils/       parseCsv.js
└── docs/PRD.md
```
