// Live Agent Simulation - Demonstrates real-time loop detection with Time Travel Resume
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3000/api/logs';
const SESSION_ID = 'live-sim-' + Date.now();
const RESUME_FILE = path.join(__dirname, '..', 'resume.json');

// Agent state (mutates as the simulation runs)
let state = {
  url: 'google.com',
  retries: 0,
  lastStep: 0,
  memory: {},
  cookies: [],
  formData: {}
};

let currentStep = 0;
let resumeMode = false;

// Helper: Log to Empusa with current state
async function logToEmpusa(action, status, error = null, errorCode = null, remedyAttempted = null) {
  currentStep++;
  
  const payload = {
    sessionId: SESSION_ID,
    step: currentStep,
    action,
    status,
    error,
    errorCode,
    remedyAttempted,
    timestamp: new Date().toISOString(),
    state: JSON.parse(JSON.stringify(state)) // Deep clone current state
  };
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      console.log(`✅ Step ${currentStep}: ${action} [${status}]`);
      if (error) console.log(`   ⚠️  ${error}`);
    } else {
      console.error(`❌ Failed to log step ${currentStep}`);
    }
  } catch (err) {
    console.error(`❌ Network error:`, err.message);
  }
}

// Helper: Load resume state if available
function loadResumeState() {
  if (fs.existsSync(RESUME_FILE)) {
    try {
      const resumeData = fs.readFileSync(RESUME_FILE, 'utf8');
      const loadedState = JSON.parse(resumeData);
      
      console.log('♻️  RESUME FOUND! Hydrating agent memory...');
      console.log(`📦 Loaded state:`, JSON.stringify(loadedState, null, 2));
      console.log(`⏭️  Last completed step: ${loadedState.lastStep}\n`);
      
      resumeMode = true;
      return loadedState;
    } catch (err) {
      console.error('❌ Failed to load resume.json:', err.message);
      console.log('🔄 Starting fresh...\n');
      return null;
    }
  }
  return null;
}

// Helper: Wait for specified milliseconds
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main simulation
async function main() {
  console.log('🤖 Starting Live Agent Simulation...');
  console.log(`📝 Session ID: ${SESSION_ID}`);
  console.log(`🔗 Watch live: http://localhost:3000/agent/${SESSION_ID}\n`);
  
  // Check for resume state
  const resumeState = loadResumeState();
  if (resumeState) {
    state = { ...state, ...resumeState };
    currentStep = state.lastStep;
  }
  
  // Step 1: Navigate to login page
  if (state.lastStep >= 1) {
    console.log('⏩ Skipping Step 1: Navigate (Already Done)');
  } else {
    console.log('⏳ Step 1: Navigating...');
    state.url = 'https://example.com/login';
    state.memory.lastAction = 'navigate';
    state.lastStep = 1;
    await logToEmpusa('GoToUrl("https://example.com/login")', 'success');
    await wait(1000);
  }
  
  // Step 2: Click login button
  if (state.lastStep >= 2) {
    console.log('⏩ Skipping Step 2: Click Login (Already Done)');
  } else {
    console.log('⏳ Step 2: Clicking login button...');
    state.cookies.push({ name: 'session', value: 'abc123' });
    state.memory.lastAction = 'click';
    state.memory.element = 'Login Button';
    state.lastStep = 2;
    await logToEmpusa('Click("Login Button")', 'success');
    await wait(1000);
  }
  
  // Step 3: Fill username
  if (state.lastStep >= 3) {
    console.log('⏩ Skipping Step 3: Type Username (Already Done)');
  } else {
    console.log('⏳ Step 3: Typing username...');
    state.formData.username = 'admin';
    state.memory.lastAction = 'type';
    state.memory.field = 'username';
    state.lastStep = 3;
    await logToEmpusa('Type("username", "admin")', 'success');
    await wait(1000);
  }
  
  // Step 4-6: THE TRAP - Flaky submit button (will retry and fail)
  if (resumeMode) {
    console.log(`\n🔄 Resuming from Step ${state.lastStep + 1}...`);
    console.log(`💾 Current retry count: ${state.retries}\n`);
  }
  
  console.log('⏳ Step 4+: Attempting to submit form...');
  console.log('   💥 Simulating flaky element...\n');
  
  // Define remedy sequence
  const remedies = [
    { name: 'standard_retry', errorCode: '500' },
    { name: 'retry_with_backoff', errorCode: '500' },
    { name: 'change_selector', errorCode: '404' }
  ];
  
  // Enter the retry loop
  while (true) {
    state.retries++;
    state.lastStep = 3 + state.retries; // Track step progression
    state.memory.lastAction = 'click_attempt';
    state.memory.element = 'Submit';
    state.memory.retryCount = state.retries;
    
    // Get current remedy
    const remedyIndex = Math.min(state.retries - 1, remedies.length - 1);
    const currentRemedy = remedies[remedyIndex];
    
    // Simulate failure for first 3 attempts
    if (state.retries < 3) {
      console.log(`   🔄 Retry ${state.retries}/3: Element not interactive (${currentRemedy.errorCode})...`);
      console.log(`   🔧 Attempting remedy: ${currentRemedy.name}`);
      state.memory.error = 'Element not interactive';
      state.memory.errorCode = currentRemedy.errorCode;
      await logToEmpusa(
        'Click("Submit")',
        'failure',
        'Element not interactive',
        currentRemedy.errorCode,
        currentRemedy.name
      );
      await wait(1500); // Slightly longer wait to show retry delay
    } else {
      // Loop detected! Agent realizes it's stuck
      console.log(`   🚨 LOOP DETECTED! Agent is stuck after ${state.retries} retries`);
      console.log(`   📊 Remedy chain exhausted: ${remedies.map(r => r.name).join(' → ')}`);
      state.memory.lastAction = 'loop_detected';
      state.memory.loopCount = state.retries;
      state.memory.suggestion = 'All remedies failed - manual intervention required';
      
      await logToEmpusa(
        'Click("Submit")',
        'loop_detected',
        'SYSTEM INTERVENTION: Loop Blocked - All remedies exhausted',
        '500',
        'manual_intervention_required'
      );
      
      console.log('\n🛑 Agent halted. Intervention required.');
      break; // Exit the loop
    }
  }
  
  console.log('\n✨ Simulation complete!');
  console.log(`📊 View full trace: http://localhost:3000/agent/${SESSION_ID}`);
  console.log(`💾 Final state retries: ${state.retries}`);
  console.log(`\n💡 Try clicking "View State" on any step to see the live state evolution!`);
  
  if (resumeMode) {
    console.log(`\n♻️  This run used Time Travel Resume from step ${resumeState.lastStep}`);
  }
}

// Run the simulation
main().catch(err => {
  console.error('💥 Simulation crashed:', err);
  process.exit(1);
});
