# Empusa API Documentation

## Overview

Empusa provides a simple HTTP API for ingesting agent execution logs in real-time. The dashboard automatically polls for updates every 2 seconds to display live agent activity.

## Endpoints

### POST `/api/logs`

Ingest a single log entry from your agent.

**Request:**
```bash
curl -X POST http://localhost:3000/api/logs \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "my-agent-session",
    "step": 1,
    "action": "Click(LoginButton)",
    "status": "success"
  }'
```

**Request Body Schema:**
```typescript
{
  sessionId: string;    // Unique identifier for the agent session
  step: number;         // Sequential step number
  action: string;       // Description of the action taken
  status: string;       // "success" | "failure" | "loop_detected"
  error?: string;       // Optional error message (for failures)
  timestamp?: string;   // Optional ISO timestamp (defaults to now)
}
```

**Response:**
```json
{
  "success": true,
  "id": 1
}
```

### GET `/api/logs?sessionId={id}`

Retrieve all logs for a specific session.

**Request:**
```bash
curl http://localhost:3000/api/logs?sessionId=my-agent-session
```

**Response:**
```json
{
  "logs": [
    {
      "id": 1,
      "session_id": "my-agent-session",
      "step": 1,
      "action": "Click(LoginButton)",
      "status": "success",
      "error": null,
      "timestamp": "2026-02-06T10:42:01.000Z",
      "created_at": "2026-02-06T10:42:01.000Z"
    }
  ]
}
```

### GET `/api/sessions`

Get a list of all agent sessions with summary statistics.

**Request:**
```bash
curl http://localhost:3000/api/sessions
```

**Response:**
```json
{
  "sessions": [
    {
      "session_id": "my-agent-session",
      "total_steps": 5,
      "loops": 1,
      "last_activity": "2026-02-06T10:42:15.000Z"
    }
  ]
}
```

## Integration Examples

### Python Agent

```python
import requests
import time

SESSION_ID = f"agent-{int(time.time())}"
API_URL = "http://localhost:3000/api/logs"

def log_step(step, action, status, error=None):
    payload = {
        "sessionId": SESSION_ID,
        "step": step,
        "action": action,
        "status": status,
        "error": error
    }
    requests.post(API_URL, json=payload)

# Example usage
log_step(1, "Navigate to login page", "success")
log_step(2, "Click login button", "success")
log_step(3, "Submit form", "failure", "Element not found")
```

### JavaScript/Node.js Agent

```javascript
const SESSION_ID = `agent-${Date.now()}`;
const API_URL = 'http://localhost:3000/api/logs';

async function logStep(step, action, status, error = null) {
  await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: SESSION_ID,
      step,
      action,
      status,
      error
    })
  });
}

// Example usage
await logStep(1, 'Navigate to login page', 'success');
await logStep(2, 'Click login button', 'success');
await logStep(3, 'Submit form', 'failure', 'Element not found');
```

## Status Codes

- `success` - Action completed successfully
- `failure` - Action failed with an error
- `loop_detected` - System detected an infinite loop (triggers visual alert)

## Testing

Use the included test script to verify your setup:

```bash
node scripts/test-ingest.js
```

This creates a test session with sample data including a loop detection scenario.

## Database

Empusa uses SQLite for local storage. The database file (`empusa.db`) is created automatically in the project root. All data is stored locally - no external services required.

## Real-Time Updates

The dashboard polls the API every 2 seconds for new logs. For production use, consider implementing WebSocket connections for true real-time updates.
