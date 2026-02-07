# Time Travel Resume Feature

## Overview

Empusa's Time Travel Resume feature allows you to capture complete agent state snapshots at each execution step, enabling you to:

- **Debug with full context**: See exactly what the agent's memory looked like when it failed
- **Resume from any point**: Copy the state and restart your agent from that exact checkpoint
- **Understand loops**: View the state progression that led to infinite loops

## How It Works

### 1. Capture State

When logging each step, include a `state` object with your agent's complete memory:

```javascript
await fetch('http://localhost:3000/api/logs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: 'my-session',
    step: 5,
    action: 'Click(Submit)',
    status: 'failure',
    error: 'Element not interactive',
    state: {
      currentUrl: browser.current_url,
      cookies: browser.cookies,
      retries: 2,
      formData: { username: 'admin' },
      memory: {
        lastAction: 'click_failed',
        element: 'Submit',
        error: 'Element not interactive'
      }
    }
  })
});
```

### 2. View State in Dashboard

In the Empusa dashboard:

1. Navigate to your agent session
2. Find the checkpoint where you want to inspect state
3. Click **"🔍 View State"** to expand the state snapshot
4. Review the JSON to understand what went wrong

### 3. Copy Resume Config

To resume your agent from a specific checkpoint:

1. Click **"📋 Copy Resume Config"** on the desired checkpoint
2. The complete state JSON is copied to your clipboard
3. Paste it into your agent's resume function

### 4. Resume Agent

Implement a resume function in your agent:

```python
def resume_from_state(state_json):
    """Resume agent execution from a saved state"""
    state = json.loads(state_json)
    
    # Restore browser state
    browser.get(state['currentUrl'])
    for cookie in state['cookies']:
        browser.add_cookie(cookie)
    
    # Restore agent memory
    agent.retry_count = state['retries']
    agent.memory = state['memory']
    agent.form_data = state.get('formData', {})
    
    # Continue execution from next step
    return agent.continue_execution()
```

## State Structure Best Practices

### Minimal State (Recommended)

```json
{
  "currentUrl": "https://example.com/page",
  "retries": 2,
  "lastAction": "click_failed"
}
```

### Comprehensive State

```json
{
  "currentUrl": "https://example.com/login",
  "cookies": [
    {"name": "session", "value": "abc123"}
  ],
  "retries": 2,
  "formData": {
    "username": "admin",
    "password": "***"
  },
  "memory": {
    "lastAction": "click_failed",
    "element": "Submit",
    "error": "Element not interactive",
    "attemptedSelectors": [
      "#submit-btn",
      "button[type='submit']"
    ],
    "suggestion": "Try waiting for element to be interactive"
  },
  "context": {
    "taskId": "login-flow",
    "startTime": "2026-02-06T10:42:00Z",
    "totalSteps": 5
  }
}
```

## Use Cases

### 1. Loop Detection Recovery

When Empusa detects a loop:
1. View the state at the loop detection point
2. Identify what's causing the retry (e.g., element selector, timing)
3. Fix the issue in your agent code
4. Resume from the last good state before the loop

### 2. Debugging Failures

When an action fails:
1. View the state to see what the agent "knew" at that moment
2. Check if the agent had correct context (URL, cookies, etc.)
3. Verify the agent's memory matches expectations
4. Resume with corrected logic

### 3. Testing & Validation

1. Capture state at key checkpoints
2. Use saved states to replay scenarios
3. Validate agent behavior from specific states
4. Create test fixtures from real execution states

## Security Considerations

⚠️ **Important**: State snapshots may contain sensitive data:

- Cookies and session tokens
- Form data (passwords, API keys)
- User information

**Recommendations:**
- Sanitize sensitive data before logging
- Use environment-specific state capture (disable in production)
- Implement state encryption for sensitive agents
- Regularly clean up old state snapshots

## Example: Full Integration

```python
import requests
import json

class EmpusaAgent:
    def __init__(self, session_id):
        self.session_id = session_id
        self.api_url = "http://localhost:3000/api/logs"
        self.step = 0
        self.state = {
            "currentUrl": None,
            "cookies": [],
            "retries": 0,
            "memory": {}
        }
    
    def log_step(self, action, status, error=None):
        self.step += 1
        payload = {
            "sessionId": self.session_id,
            "step": self.step,
            "action": action,
            "status": status,
            "error": error,
            "state": self.state
        }
        requests.post(self.api_url, json=payload)
    
    def update_state(self, **kwargs):
        self.state.update(kwargs)
    
    def resume_from_state(self, state_json):
        self.state = json.loads(state_json)
        self.step = self.state.get('lastStep', 0)
        # Restore browser, cookies, etc.
        return self.continue_execution()

# Usage
agent = EmpusaAgent("my-session-123")

agent.update_state(currentUrl="https://example.com")
agent.log_step("Navigate to page", "success")

agent.update_state(retries=1)
agent.log_step("Click button", "failure", "Element not found")

# Later, resume from saved state
saved_state = '{"currentUrl": "https://example.com", "retries": 1}'
agent.resume_from_state(saved_state)
```

## Limitations

- State snapshots are stored in SQLite (local only)
- Large state objects may impact performance
- No automatic state compression (implement if needed)
- State is stored as JSON (no binary data support)

## Future Enhancements

- [ ] State diff visualization (show what changed between steps)
- [ ] Automatic state sanitization (remove sensitive data)
- [ ] State compression for large objects
- [ ] Export/import state snapshots
- [ ] State-based replay (automatically resume from state)
- [ ] State validation (ensure state is valid before resume)
