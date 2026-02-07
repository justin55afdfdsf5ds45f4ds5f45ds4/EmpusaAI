# Time Travel Resume Guide

## Overview

The simulation agent demonstrates how to implement Time Travel Resume - the ability to restore an agent's state from a checkpoint and skip already-completed steps.

## How It Works

### 1. Normal Execution (No Resume File)

```bash
node scripts/simulation-agent.js
```

**Behavior:**
- Starts with fresh state
- Executes all steps: 1 → 2 → 3 → 4 → 5 → 6
- Logs each step to Empusa
- Takes ~8 seconds total

### 2. Resume Execution (With Resume File)

```bash
# Create resume file
cp resume.example.json resume.json

# Run simulation
node scripts/simulation-agent.js
```

**Behavior:**
- Detects `resume.json` exists
- Loads saved state (lastStep: 2)
- **Skips** Steps 1 & 2
- Executes Steps 3 → 4 → 5 → 6
- Takes ~5 seconds (3 steps skipped!)

## Creating a Resume File

### From Dashboard

1. Run the simulation normally
2. Open the session in dashboard
3. Find a checkpoint where you want to resume
4. Click **"Copy Resume Config"**
5. Save to `resume.json` in project root

### Manual Creation

Create `resume.json`:

```json
{
  "url": "https://example.com/login",
  "retries": 0,
  "lastStep": 2,
  "memory": {
    "lastAction": "click",
    "element": "Login Button"
  },
  "cookies": [
    {
      "name": "session",
      "value": "abc123"
    }
  ],
  "formData": {}
}
```

**Key Field: `lastStep`**
- `lastStep: 0` - Start from beginning
- `lastStep: 1` - Skip step 1, start from step 2
- `lastStep: 2` - Skip steps 1-2, start from step 3
- `lastStep: 3` - Skip steps 1-3, start from step 4

## Use Cases

### 1. Debug Failed Steps

**Scenario:** Agent fails at Step 5

```bash
# Run normally, fails at step 5
node scripts/simulation-agent.js

# Copy state from step 4 (last good state)
# Save to resume.json with lastStep: 4

# Fix the bug in your code

# Resume from step 4
node scripts/simulation-agent.js
```

### 2. Skip Expensive Operations

**Scenario:** Steps 1-3 are slow (API calls, page loads)

```bash
# Run once to complete steps 1-3
node scripts/simulation-agent.js

# Copy state from step 3
# Save to resume.json

# Now you can test steps 4+ repeatedly without waiting
node scripts/simulation-agent.js  # Skips 1-3, starts at 4
```

### 3. Test Loop Recovery

**Scenario:** Agent gets stuck in loop at step 6

```bash
# Run normally, loop detected at step 6
node scripts/simulation-agent.js

# Copy state from step 5 (before loop)
# Save to resume.json with lastStep: 5

# Implement loop prevention logic

# Resume and verify fix
node scripts/simulation-agent.js  # Starts at step 6 with fix
```

## Implementation Details

### State Structure

```javascript
const state = {
  url: 'https://example.com/login',      // Current page
  retries: 0,                             // Retry counter
  lastStep: 2,                            // Last completed step
  memory: {                               // Agent memory
    lastAction: 'click',
    element: 'Login Button'
  },
  cookies: [...],                         // Browser cookies
  formData: {...}                         // Form state
};
```

### Skip Logic

```javascript
// Check if step already completed
if (state.lastStep >= 1) {
  console.log('⏩ Skipping Step 1 (Already Done)');
} else {
  // Execute step
  console.log('⏳ Step 1: Navigating...');
  state.url = 'https://example.com/login';
  state.lastStep = 1;
  await logToEmpusa('GoToUrl(...)', 'success');
}
```

### Resume Detection

```javascript
function loadResumeState() {
  if (fs.existsSync('resume.json')) {
    const data = fs.readFileSync('resume.json', 'utf8');
    return JSON.parse(data);
  }
  return null;
}

// In main()
const resumeState = loadResumeState();
if (resumeState) {
  state = { ...state, ...resumeState };
  currentStep = state.lastStep;
}
```

## Testing Resume Feature

### Test 1: Skip First 2 Steps

```bash
# Create resume file
echo '{
  "url": "https://example.com/login",
  "retries": 0,
  "lastStep": 2,
  "memory": {},
  "cookies": [],
  "formData": {}
}' > resume.json

# Run simulation
node scripts/simulation-agent.js
```

**Expected Output:**
```
♻️  RESUME FOUND! Hydrating agent memory...
⏭️  Last completed step: 2
⏩ Skipping Step 1: Navigate (Already Done)
⏩ Skipping Step 2: Click Login (Already Done)
⏳ Step 3: Typing username...
```

### Test 2: Resume from Loop

```bash
# Create resume file with retry state
echo '{
  "url": "https://example.com/login",
  "retries": 1,
  "lastStep": 4,
  "memory": {
    "lastAction": "click_attempt",
    "retryCount": 1
  },
  "cookies": [{"name": "session", "value": "abc123"}],
  "formData": {"username": "admin"}
}' > resume.json

# Run simulation
node scripts/simulation-agent.js
```

**Expected Output:**
```
♻️  RESUME FOUND! Hydrating agent memory...
💾 Current retry count: 1
⏩ Skipping Step 1-4 (Already Done)
🔄 Resuming from Step 5...
   🔄 Retry 2/3: Element not interactive...
```

### Test 3: Normal Mode (No Resume)

```bash
# Remove resume file
rm resume.json

# Run simulation
node scripts/simulation-agent.js
```

**Expected Output:**
```
⏳ Step 1: Navigating...
⏳ Step 2: Clicking login button...
⏳ Step 3: Typing username...
```

## Best Practices

### 1. Always Include `lastStep`

```json
{
  "lastStep": 2,  // Required!
  "url": "...",
  "retries": 0
}
```

Without `lastStep`, the agent won't know which steps to skip.

### 2. Match State Structure

Ensure your resume state matches the agent's expected structure:

```javascript
// Agent expects these fields
state = {
  url: string,
  retries: number,
  lastStep: number,
  memory: object,
  cookies: array,
  formData: object
};
```

### 3. Clean Up Resume Files

```bash
# Remove resume file after testing
rm resume.json

# Or use .gitignore (already configured)
# resume.json is ignored by default
```

### 4. Validate Resume State

Before resuming, verify the state is valid:

```javascript
function validateResumeState(state) {
  if (!state.lastStep || state.lastStep < 0) {
    throw new Error('Invalid lastStep');
  }
  if (!state.url) {
    throw new Error('Missing URL');
  }
  return true;
}
```

## Troubleshooting

### Issue: Steps Not Skipping

**Problem:** Agent executes all steps even with resume.json

**Solution:**
- Check file location (must be in project root)
- Verify JSON is valid: `cat resume.json | jq`
- Check `lastStep` value is set correctly

### Issue: State Mismatch

**Problem:** Agent crashes after resume

**Solution:**
- Ensure state structure matches agent expectations
- Check all required fields are present
- Verify data types (numbers, strings, arrays)

### Issue: Resume File Not Found

**Problem:** `resume.json` exists but not detected

**Solution:**
- Check file path: `ls -la resume.json`
- Verify file permissions
- Try absolute path in code

## Advanced: Dynamic Resume Points

Create resume files programmatically:

```javascript
// Save state at any point
function saveResumePoint(state, filename = 'resume.json') {
  fs.writeFileSync(filename, JSON.stringify(state, null, 2));
  console.log(`💾 Saved resume point: ${filename}`);
}

// Usage
if (state.lastStep === 3) {
  saveResumePoint(state, 'checkpoint-step3.json');
}
```

## Comparison: Before vs After

### Without Resume (8 seconds)
```
Step 1: Navigate     [1s]
Step 2: Click        [1s]
Step 3: Type         [1s]
Step 4: Retry 1      [1.5s]
Step 5: Retry 2      [1.5s]
Step 6: Loop Detect  [1.5s]
Total: ~8 seconds
```

### With Resume from Step 2 (5 seconds)
```
Step 1: SKIPPED      [0s]
Step 2: SKIPPED      [0s]
Step 3: Type         [1s]
Step 4: Retry 1      [1.5s]
Step 5: Retry 2      [1.5s]
Step 6: Loop Detect  [1.5s]
Total: ~5 seconds (3s saved!)
```

---

**Time Travel Resume lets you debug faster by skipping completed steps!** 🚀⏰
