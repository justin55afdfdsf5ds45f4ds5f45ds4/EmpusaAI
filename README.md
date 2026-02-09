<div align="center">

# Empusa

**Stop your scripts from burning money while you sleep.**

A local proxy that sits between your automation scripts and paid APIs,<br>
automatically detecting error loops and killing the requests before they cost you.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)

</div>

---

## The Problem

You have a script that calls OpenAI, Replicate, Anthropic, or any paid API. It works great — until it doesn't.

1. The script hits a runtime error (`Element not found`, `Network Timeout`, `500 Internal Server Error`)
2. Instead of stopping, it retries. And retries. And retries.
3. Every retry is a paid API call.
4. **You wake up to a $200 bill because a bot was looping on a broken endpoint all night.**

There's no kill switch. No circuit breaker. Nothing between your dumb script and your credit card.

**Empusa is that kill switch.**

---

## How It Works

```
Your Script  ──>  Empusa Proxy (localhost:3000)  ──>  OpenAI / Replicate / Any API
                         │
                         ├── Tracks every request per session
                         ├── Detects repeated failures (3+ in 1 min)
                         ├── BLOCKS the session automatically
                         └── Returns 429 instead of forwarding
                              (your script stops spending money)
```

**Zero client cooperation required.** The proxy watches upstream responses on its own. Your script doesn't need to report errors — if the API keeps returning 500s, Empusa catches it and cuts the line.

---

## Quick Start

```bash
git clone https://github.com/justin55afdfdsf5ds45f4ds5f45ds4/EmpusaAI.git
cd EmpusaAI
npm install
npm run dev
```

Dashboard is at [http://localhost:3000](http://localhost:3000).

### Integration (2 lines of code)

Replace your `fetch` calls to route through Empusa:

```javascript
// Before — unprotected
const res = await fetch('https://api.openai.com/v1/chat/completions', options);

// After — protected by Empusa
const res = await fetch('http://localhost:3000/api/proxy?target=https://api.openai.com/v1/chat/completions&session_id=my-bot', options);
```

That's it. Your headers, body, and method are forwarded as-is. If the session gets blocked, you get a `429` back instead of the API burning your money.

### See It In Action

```bash
# Start the server
npm run dev

# In another terminal — run the demo bot
node scripts/e2e-live-demo.js
```

Watch the bot make real requests, hit real 500 errors, and get automatically blocked by the proxy — without ever calling `/api/error`. Open the dashboard to see the kill switch fire in real time.

---

## What You Get

### Self-Aware Proxy
The proxy doesn't just forward requests. It **watches upstream responses**. If a session gets 3+ HTTP errors within 1 minute, it auto-blocks — no client cooperation needed. Your dumb bot doesn't need to be smart enough to report its own errors.

### Money Saved Dashboard
Configure cost per API domain (OpenAI = $0.03/req, Replicate = $0.05/req, etc). The dashboard shows exactly how much money Empusa saved you in the last 24 hours in dollars, not just request counts.

### Auto-Recovery
Blocked sessions auto-unblock after a configurable cooldown (default: 5 minutes). The dashboard shows a live countdown. If the underlying issue is fixed, the bot resumes automatically. No manual intervention needed at 2 AM.

### Webhook Alerts
Get a Slack or Discord message the instant a session gets blocked. Configure webhooks in the dashboard settings. Never find out about a broken bot hours after the fact.

### Live Event Log
Real-time feed of every error (red) and every blocked request (yellow). See exactly what went wrong, which session, and when.

---

## API Reference

### `GET/POST/PUT/DELETE /api/proxy`

The universal proxy. Forwards any request to the target API.

| Parameter | Location | Description |
|-----------|----------|-------------|
| `target` | Query param or `x-target-url` header | The actual API URL to call |
| `session_id` | Query param or `x-session-id` header | Groups requests for loop detection |

**If the session is ACTIVE:** Forwards the request, returns the upstream response.
**If the session is BLOCKED:** Returns `429 Too Many Requests`. No external call is made.

### `POST /api/error`

Optional error ingestion endpoint. Use this if your script can report its own errors (in addition to the proxy's auto-detection).

```json
{
  "session_id": "my-bot",
  "error_message": "Element not found: #login-button",
  "timestamp": "2026-02-09T10:00:00.000Z"
}
```

### `POST /api/sessions/unblock`

Manually unblock a session.

```json
{ "session_id": "my-bot" }
```

### `GET /api/dashboard`

Returns all dashboard data: blocked counts, money saved, active loops, recent events.

### `GET/POST /api/webhooks`

Manage Slack/Discord webhook URLs for block notifications.

### `GET/POST /api/cost-config`

Configure per-domain cost estimation (e.g., `api.openai.com` = $0.03/request).

---

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| **Next.js 16** | App Router + API routes |
| **SQLite** | Zero-config local database (better-sqlite3) |
| **TypeScript** | Type safety |
| **Tailwind CSS** | Dashboard styling |

No external databases. No Docker. No cloud dependencies. One `npm install` and you're running.

---

## Roadmap

**Shipped:**
- [x] Universal API proxy with session-based blocking
- [x] Self-aware failure detection (no client cooperation needed)
- [x] Loop detection (3+ identical errors in 1 minute)
- [x] Auto-recovery with configurable cooldown
- [x] Cost estimation per API domain
- [x] Money Saved dashboard metric
- [x] Webhook alerts (Slack + Discord)
- [x] Live event log with error + block feed
- [x] Manual unblock from dashboard
- [x] Settings panel for webhooks + cost config

**Next:**
- [ ] Auto-fix: LLM analyzes the error and suggests/applies a fix before resuming
- [ ] Save points: checkpoint script state and resume from last good step
- [ ] Semantic log analysis: cluster similar errors across sessions
- [ ] Multi-node: proxy multiple machines from one dashboard
- [ ] Budget caps: hard limit per session/day, not just loop detection
- [ ] npm package: `npx empusa` to start, no clone needed

---

## License

MIT. See [LICENSE](LICENSE).

---

<div align="center">

**If your bots have ever burned money while you slept, star this repo.**

[Report Bug](https://github.com/justin55afdfdsf5ds45f4ds5f45ds4/EmpusaAI/issues) · [Request Feature](https://github.com/justin55afdfdsf5ds45f4ds5f45ds4/EmpusaAI/issues)

</div>
