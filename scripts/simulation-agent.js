// Live Agent Simulation - Demonstrates real-time loop detection
const API_URL = 'http://localhost:3000/api/logs';
const SESSION_ID = 'live-sim-' + Date.now();

// Agent state (mutates as the simulation runs)
const state = {
  url: 'google.com',
  retries: 0,
  memory: {},
  cookies: [],
  formData: {}
};

let currentStep = 0;

// Helper: Log to Empusa with current state
async function logToEmpusa(action, status, error = null) {
  currentStep++;
  
  const payload = {
    sessionId: SESSION_ID,
    step: currentStep,
    action,
    status,
    error,
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

// Helper: Wait for specified milliseconds
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main simulation
async function main() {
  console.log('🤖 Starting Live Agent Simulation...');
  console.log(`📝 Session ID: ${SESSION_ID}`);
  console.log(`🔗 Watch live: http://localhost:3000/agent/${SESSION_ID}\n`);
  
  // Step 1: Navigate to login page
  console.log('⏳ Step 1: Navigating...');
  state.url = 'https://example.com/login';
  state.memory.lastAction = 'navigate';
  await logToEmpusa('GoToUrl("https://example.com/login")', 'success');
  await wait(1000);
  
  // Step 2: Click login button
  console.log('⏳ Step 2: Clicking login button...');
  state.cookies.push({ name: 'session', value: 'abc123' });
  state.memory.lastAction = 'click';
  state.memory.element = 'Login Button';
  await logToEmpusa('Click("Login Button")', 'success');
  await wait(1000);
  
  // Step 3: Fill username
  console.log('⏳ Step 3: Typing username...');
  state.formData.username = 'admin';
  state.memory.lastAction = 'type';
  state.memory.field = 'username';
  await logToEmpusa('Type("username", "admin")', 'success');
  await wait(1000);
  
  // Step 4-6: THE TRAP - Flaky submit button (will retry and fail)
  console.log('⏳ Step 4+: Attempting to submit form...');
  console.log('   💥 Simulating flaky element...\n');
  
  // Enter the retry loop
  while (true) {
    state.retries++;
    state.memory.lastAction = 'click_attempt';
    state.memory.element = 'Submit';
    state.memory.retryCount = state.retries;
    
    // Simulate failure for first 3 attempts
    if (state.retries < 3) {
      console.log(`   🔄 Retry ${state.retries}/3: Element not interactive...`);
      state.memory.error = 'Element not interactive';
      await logToEmpusa(
        'Click("Submit")',
        'failure',
        'Element not interactive'
      );
      await wait(1500); // Slightly longer wait to show retry delay
    } else {
      // Loop detected! Agent realizes it's stuck
      console.log(`   🚨 LOOP DETECTED! Agent is stuck after ${state.retries} retries`);
      state.memory.lastAction = 'loop_detected';
      state.memory.loopCount = state.retries;
      state.memory.suggestion = 'Try alternative selector or wait for element to be interactive';
      
      await logToEmpusa(
        'Click("Submit")',
        'loop_detected',
        'SYSTEM INTERVENTION: Loop Blocked - Element repeatedly not interactive'
      );
      
      console.log('\n🛑 Agent halted. Intervention required.');
      break; // Exit the loop
    }
  }
  
  console.log('\n✨ Simulation complete!');
  console.log(`📊 View full trace: http://localhost:3000/agent/${SESSION_ID}`);
  console.log(`💾 Final state retries: ${state.retries}`);
  console.log(`\n💡 Try clicking "View State" on any step to see the live state evolution!`);
}

// Run the simulation
main().catch(err => {
  console.error('💥 Simulation crashed:', err);
  process.exit(1);
});
