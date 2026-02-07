// Test script to send fake log entries to the Empusa API
const API_URL = 'http://localhost:3000/api/logs';
const SESSION_ID = 'test-session-' + Date.now();

const testLogs = [
  {
    sessionId: SESSION_ID,
    step: 1,
    action: 'GoToUrl("https://example.com/login")',
    status: 'success',
    timestamp: new Date().toISOString(),
    state: {
      currentUrl: 'https://example.com/login',
      cookies: [],
      retries: 0,
      memory: { lastAction: 'navigate' }
    }
  },
  {
    sessionId: SESSION_ID,
    step: 2,
    action: 'Click("Login Button")',
    status: 'success',
    timestamp: new Date(Date.now() + 1000).toISOString(),
    state: {
      currentUrl: 'https://example.com/login',
      cookies: ['session=abc123'],
      retries: 0,
      memory: { lastAction: 'click', element: 'Login Button' }
    }
  },
  {
    sessionId: SESSION_ID,
    step: 3,
    action: 'Type("username", "admin")',
    status: 'success',
    timestamp: new Date(Date.now() + 2000).toISOString(),
    state: {
      currentUrl: 'https://example.com/login',
      cookies: ['session=abc123'],
      retries: 0,
      formData: { username: 'admin' },
      memory: { lastAction: 'type', field: 'username' }
    }
  },
  {
    sessionId: SESSION_ID,
    step: 4,
    action: 'Click("Submit")',
    status: 'failure',
    error: 'Element not interactive',
    timestamp: new Date(Date.now() + 3000).toISOString(),
    state: {
      currentUrl: 'https://example.com/login',
      cookies: ['session=abc123'],
      retries: 1,
      formData: { username: 'admin' },
      memory: { lastAction: 'click_failed', element: 'Submit', error: 'Element not interactive' }
    }
  },
  {
    sessionId: SESSION_ID,
    step: 5,
    action: 'Click("Submit")',
    status: 'loop_detected',
    error: 'SYSTEM INTERVENTION: Loop Blocked',
    timestamp: new Date(Date.now() + 4000).toISOString(),
    state: {
      currentUrl: 'https://example.com/login',
      cookies: ['session=abc123'],
      retries: 2,
      formData: { username: 'admin' },
      memory: { 
        lastAction: 'loop_detected', 
        element: 'Submit', 
        loopCount: 3,
        suggestion: 'Try alternative selector or wait for element to be interactive'
      }
    }
  }
];

async function sendLog(log) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(log)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ Step ${log.step}: ${log.action} - ${log.status}`);
    } else {
      console.error(`❌ Failed to send log:`, data);
    }
  } catch (error) {
    console.error(`❌ Error sending log:`, error.message);
  }
}

async function runTest() {
  console.log('🚀 Starting Empusa Log Ingest Test...\n');
  console.log(`📝 Session ID: ${SESSION_ID}\n`);
  
  for (const log of testLogs) {
    await sendLog(log);
    // Small delay between logs to simulate real agent execution
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`\n✨ Test complete! View logs at: http://localhost:3000/agent/${SESSION_ID}`);
}

runTest();
