# Live Agent Simulation

## Overview

The `simulation-agent.js` script demonstrates a **real-time agent execution** with dynamic state management and loop detection. Unlike static test data, this simulation actually runs, mutates state, and sends logs as events occur.

## What Makes It "Live"

### ❌ Static Test (test-ingest.js)
```javascript
// Hardcoded array - all data predetermined
const testLogs = [
  { step: 1, action: "...", status: "success" },
  { step: 2, action: "...", status: "success" },
  // ... etc
];

// Just loops through and sends
for (const log of testLogs) {
  await sendLog(log);
}
```

### ✅ Live Simulation (simulation-agent.js)
```javascript
// Mutable state that evolves
const state = {
  url: 'google.com',
  retries: 0,
  memory: {}
};

// Real execution flow
await navigate(); // state.url changes
await click();    // state.cookies added
await wait(1000); // Real delays

// Dynamic loop with real logic
while (true) {
  state.retries++;  // State mutates in real-time
  if (state.retries < 3) {
    await logFailure();
  } else {
    await logLoopDetected();
    break; // Agent makes decision
  }
}
```

## Key Features

### 1. Dynamic State Evolution

The state object mutates as the simulation runs:

```javascript
// Step 1: Initial state
{ url: 'google.com', retries: 0, memory: {} }

// Step 2: After navigation
{ url: 'https://example.com/login', retries: 0, memory: { lastAction: 'navigate' } }

// Step 4: First retry
{ url: '...', retries: 1, memory: { lastAction: 'click_attempt', error: '...' } }

// Step 6: Loop detected
{ url: '...', retries: 3, memory: { lastAction: 'loop_detected', loopCount: 3 } }
```

### 2. Real-Time Delays

```javascript
await wait(1000);  // 1 second between steps
await wait(1500);  // 1.5 seconds for retries
```

Open the dashboard while the script runs and watch logs appear in real-time!

### 3. Actual Loop Detection Logic

```javascript
while (true) {
  state.retries++;
  
  if (state.retries < 3) {
    // Still trying...
    await logToEmpusa('Click("Submit")', 'failure', 'Element not interactive');
  } else {
    // Agent realizes it's stuck!
    await logToEmpusa('Click("Submit")', 'loop_detected', 'SYSTEM INTERVENTION');
    break; // Intelligent halt
  }
}
```

The agent **actually detects** the loop condition and makes a decision to stop.

## Running the Simulation

### Basic Run

```bash
node scripts/simulation-agent.js
```

### Watch Live

1. Start the Next.js dev server: `npm run dev`
2. Open the dashboard: `http://localhost:3000`
3. Run the simulation: `node scripts/simulation-agent.js`
4. The script outputs a direct link to the session
5. Watch logs appear in real-time (2-second polling)

### Expected Output

```
🤖 Starting Live Agent Simulation...
📝 Session ID: live-sim-1770443370179
🔗 Watch live: http://localhost:3000/agent/live-sim-1770443370179

⏳ Step 1: Navigating...
✅ Step 1: GoToUrl("https://example.com/login") [success]

⏳ Step 2: Clicking login button...
✅ Step 2: Click("Login Button") [success]

⏳ Step 3: Typing username...
✅ Step 3: Type("username", "admin") [success]

⏳ Step 4+: Attempting to submit form...
   💥 Simulating flaky element...

   🔄 Retry 1/3: Element not interactive...
✅ Step 4: Click("Submit") [failure]
   ⚠️  Element not interactive

   🔄 Retry 2/3: Element not interactive...
✅ Step 5: Click("Submit") [failure]
   ⚠️  Element not interactive

   🚨 LOOP DETECTED! Agent is stuck after 3 retries
✅ Step 6: Click("Submit") [loop_detected]
   ⚠️  SYSTEM INTERVENTION: Loop Blocked

🛑 Agent halted. Intervention required.

✨ Simulation complete!
📊 View full trace: http://localhost:3000/agent/live-sim-1770443370179
💾 Final state retries: 3
```

## Viewing State Evolution

In the dashboard:

1. Click on any checkpoint
2. Click **"View State"** to see the state at that moment
3. Notice how `retries` increments: 0 → 1 → 2 → 3
4. See how `memory` evolves with each action
5. Click **"Copy Resume Config"** to get the exact state

### State at Step 1 (Navigate)
```json
{
  "url": "https://example.com/login",
  "retries": 0,
  "memory": {
    "lastAction": "navigate"
  },
  "cookies": [],
  "formData": {}
}
```

### State at Step 4 (First Retry)
```json
{
  "url": "https://example.com/login",
  "retries": 1,
  "memory": {
    "lastAction": "click_attempt",
    "element": "Submit",
    "retryCount": 1,
    "error": "Element not interactive"
  },
  "cookies": [{"name": "session", "value": "abc123"}],
  "formData": {"username": "admin"}
}
```

### State at Step 6 (Loop Detected)
```json
{
  "url": "https://example.com/login",
  "retries": 3,
  "memory": {
    "lastAction": "loop_detected",
    "element": "Submit",
    "retryCount": 3,
    "loopCount": 3,
    "suggestion": "Try alternative selector or wait for element to be interactive"
  },
  "cookies": [{"name": "session", "value": "abc123"}],
  "formData": {"username": "admin"}
}
```

## Use Cases

### 1. Demo for Stakeholders

Run the simulation during a demo to show:
- Real-time agent monitoring
- Loop detection in action
- State inspection capabilities
- Time travel resume feature

### 2. Testing Empusa Features

Use the simulation to test:
- API endpoint performance
- Dashboard real-time updates
- State snapshot accuracy
- UI responsiveness

### 3. Development Reference

Use as a template for integrating your own agents:
- Copy the `logToEmpusa()` helper
- Adapt the state structure
- Implement similar retry logic
- Add your own loop detection

## Customization

### Change Retry Threshold

```javascript
if (state.retries < 5) {  // Try 5 times instead of 3
  await logToEmpusa('Click("Submit")', 'failure', 'Element not interactive');
}
```

### Add More Steps

```javascript
// Step 7: Try alternative approach
console.log('⏳ Step 7: Trying alternative selector...');
state.memory.alternativeAttempt = true;
await logToEmpusa('Click("button[type=submit]")', 'success');
```

### Simulate Different Scenarios

```javascript
// Random failures
if (Math.random() < 0.3) {
  await logToEmpusa(action, 'failure', 'Random network error');
} else {
  await logToEmpusa(action, 'success');
}
```

## Technical Details

### State Deep Cloning

```javascript
state: JSON.parse(JSON.stringify(state))
```

Each log gets a **snapshot** of the state at that moment, not a reference. This ensures state evolution is captured correctly.

### Error Handling

```javascript
try {
  const response = await fetch(API_URL, { ... });
  if (response.ok) {
    console.log(`✅ Step ${currentStep}: ${action} [${status}]`);
  }
} catch (err) {
  console.error(`❌ Network error:`, err.message);
}
```

The simulation continues even if the API is unreachable.

### Session ID Generation

```javascript
const SESSION_ID = 'live-sim-' + Date.now();
```

Each run creates a unique session, making it easy to compare multiple simulation runs.

## Comparison: Static vs Live

| Feature | test-ingest.js | simulation-agent.js |
|---------|----------------|---------------------|
| **Data Source** | Hardcoded array | Runtime generation |
| **State** | Static snapshots | Dynamic mutation |
| **Timing** | Instant | Real delays (1-1.5s) |
| **Logic** | None | Actual loop detection |
| **Retries** | Predetermined | Counted in real-time |
| **Use Case** | Quick test | Demo/Development |
| **Realism** | Low | High |

## Next Steps

1. **Run it**: `node scripts/simulation-agent.js`
2. **Watch it**: Open the dashboard link while it runs
3. **Inspect it**: Click "View State" on each checkpoint
4. **Copy it**: Use as a template for your agent integration
5. **Extend it**: Add your own scenarios and logic

---

**This is what real agent monitoring looks like.** 🚀
