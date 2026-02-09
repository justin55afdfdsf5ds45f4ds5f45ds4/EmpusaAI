/**
 * EmpusaAI - Client Integration Snippet
 *
 * Drop-in replacement for `fetch()` that routes all API calls through
 * the Empusa guardrail proxy and reports errors automatically.
 *
 * Usage:
 *   const response = await safeFetch('https://api.openai.com/v1/chat/completions', {
 *     method: 'POST',
 *     headers: { 'Authorization': 'Bearer sk-...' },
 *     body: JSON.stringify({ model: 'gpt-4', messages: [...] })
 *   });
 */

const EMPUSA_BASE = 'http://localhost:3000';
const SESSION_ID = process.env.EMPUSA_SESSION_ID || 'my-script-01';

async function safeFetch(url, options = {}) {
  try {
    // 1. Route through the Empusa proxy
    const proxyUrl = `${EMPUSA_BASE}/api/proxy?target=${encodeURIComponent(url)}&session_id=${encodeURIComponent(SESSION_ID)}`;

    const response = await fetch(proxyUrl, {
      ...options,
      headers: {
        ...options.headers,
        'x-session-id': SESSION_ID,
      },
    });

    // If Empusa blocked us, the session is in an error loop
    if (response.status === 429) {
      console.error('[Empusa] Session BLOCKED - error loop detected. Fix the error and unblock via the dashboard.');
      throw new Error('Empusa: Session blocked due to error loop');
    }

    return response;
  } catch (e) {
    // 2. Report the error to Empusa's error trap
    try {
      await fetch(`${EMPUSA_BASE}/api/error`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: SESSION_ID,
          error_message: e.message,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch {
      // If Empusa itself is down, don't crash the script further
      console.error('[Empusa] Could not report error - is Empusa running?');
    }

    throw e;
  }
}

// --- Example usage ---
// Replace your normal fetch calls with safeFetch:
//
//   // Before:
//   const res = await fetch('https://api.openai.com/v1/chat/completions', { ... });
//
//   // After:
//   const res = await safeFetch('https://api.openai.com/v1/chat/completions', { ... });

module.exports = { safeFetch };
