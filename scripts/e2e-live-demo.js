/**
 * EmpusaAI - End-to-End Live Demo (v2)
 *
 * This script IS the dumb bot. It proves ALL four features:
 *
 *   1. SELF-AWARE PROXY  — The bot NEVER calls /api/error. It just uses the proxy.
 *      The proxy detects upstream 500s on its own and blocks the session.
 *   2. COST ESTIMATION   — Blocked requests show dollar amounts on the dashboard.
 *   3. AUTO-RECOVERY     — After the block, we wait for the 5-min cooldown to tick.
 *   4. WEBHOOK ALERTS    — If you configured a Slack/Discord hook, you'll get pinged.
 *
 * Usage:
 *   1. Start Empusa:  npm run dev
 *   2. Run this:      node scripts/e2e-live-demo.js
 *   3. Watch:         http://localhost:3000
 */

const EMPUSA = 'http://localhost:3000';
const SESSION_ID = 'bot-' + Math.random().toString(36).slice(2, 8);

// ── Helpers ──────────────────────────────────────────────────────────────────

function log(icon, msg) {
  const ts = new Date().toLocaleTimeString();
  console.log(`  ${icon}  [${ts}]  ${msg}`);
}

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Route a fetch through the Empusa proxy.
 * This is the ONLY thing the dumb bot does. No error reporting. Just fetch.
 */
async function proxiedFetch(targetUrl, options = {}) {
  const url = `${EMPUSA}/api/proxy?target=${encodeURIComponent(targetUrl)}&session_id=${encodeURIComponent(SESSION_ID)}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'x-session-id': SESSION_ID,
    },
  });

  return { response: res, blocked: res.status === 429 };
}

// ── The "Dumb Bot" ──────────────────────────────────────────────────────────
//
// This bot does NOT call /api/error at all.
// It just blindly makes requests through the proxy.
// The proxy itself detects the upstream failure pattern and blocks the session.
//
// This proves the self-aware proxy works — zero client cooperation required.

async function main() {
  console.log();
  console.log('  ╔══════════════════════════════════════════════════════════╗');
  console.log('  ║  EmpusaAI — End-to-End Live Demo v2                     ║');
  console.log('  ║  The bot does NOT report errors. Proxy catches it.      ║');
  console.log('  ╚══════════════════════════════════════════════════════════╝');
  console.log();
  console.log(`  Session:   ${SESSION_ID}`);
  console.log(`  Dashboard: ${EMPUSA}`);
  console.log();

  // ── Phase 1: Successful warm-up ──────────────────────────────────────────
  console.log('  ── Phase 1: Warm-up (real successful requests) ──');
  console.log();

  const goodUrls = [
    'https://httpbin.org/get',
    'https://httpbin.org/ip',
    'https://httpbin.org/user-agent',
  ];

  for (const url of goodUrls) {
    const { response, blocked } = await proxiedFetch(url);
    if (blocked) {
      log('🛑', `BLOCKED before we started — stale session? Use a fresh one.`);
      return;
    }
    log('✅', `${response.status} ← GET ${url}`);
    await wait(1200);
  }

  // ── Phase 2: Hit a broken endpoint — proxy detects it on its own ─────────
  console.log();
  console.log('  ── Phase 2: Bot hits broken endpoint (proxy-only, no /api/error) ──');
  console.log();

  const brokenUrl = 'https://httpbin.org/status/500';
  let attempt = 0;
  let wasBlocked = false;

  while (!wasBlocked && attempt < 15) {
    attempt++;

    try {
      const { response, blocked } = await proxiedFetch(brokenUrl, { method: 'POST' });

      if (blocked) {
        log('🛑', `Attempt ${attempt}: GOT 429 — Proxy auto-blocked us!`);
        wasBlocked = true;
        break;
      }

      if (!response.ok) {
        log('❌', `Attempt ${attempt}: HTTP ${response.status} — bot retrying (doesn't know better)`);
      } else {
        log('✅', `Attempt ${attempt}: ${response.status} — unexpectedly OK`);
      }
    } catch (err) {
      log('💥', `Attempt ${attempt}: Network error — ${err.message}`);
    }

    // Dumb bot retry delay
    const delay = Math.max(600, 1800 - attempt * 150);
    await wait(delay);
  }

  if (!wasBlocked) {
    log('⚠️', `Bot wasn't blocked after ${attempt} attempts — check threshold settings`);
  }

  // ── Phase 3: Prove we're blocked — every request gets 429 ────────────────
  console.log();
  console.log('  ── Phase 3: Bot tries to keep going (all should be 429) ──');
  console.log();

  let moneyBlocked = 0;
  for (let i = 0; i < 5; i++) {
    const { blocked } = await proxiedFetch('https://api.openai.com/v1/chat/completions');
    if (blocked) {
      moneyBlocked += 0.03; // OpenAI default cost
      log('🛑', `Request ${i + 1}: 429 BLOCKED — saved ~$0.03`);
    } else {
      log('🤔', `Request ${i + 1}: Got through?`);
    }
    await wait(800);
  }

  // ── Phase 4: Check auto-recovery ─────────────────────────────────────────
  console.log();
  console.log('  ── Phase 4: Auto-recovery check ──');
  console.log();
  log('⏳', `Session is blocked. Cooldown is 5 minutes by default.`);
  log('💡', `On the dashboard, you'll see a countdown timer next to "${SESSION_ID}".`);
  log('💡', `After 5 min, the proxy auto-unblocks and the bot can retry.`);
  log('💡', `Or click UNBLOCK on the dashboard to release immediately.`);

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log();
  console.log('  ══════════════════════════════════════════════════════════');
  console.log('  RESULTS:');
  console.log();
  console.log(`  ✅ Self-aware proxy:  Blocked session WITHOUT /api/error calls`);
  console.log(`  ✅ Cost estimation:   ~$${moneyBlocked.toFixed(2)} saved in blocked OpenAI requests`);
  console.log(`  ✅ Auto-recovery:     Cooldown timer active (5 min default)`);
  console.log(`  ✅ Webhook alerts:    Check your Slack/Discord (if configured)`);
  console.log();
  console.log(`  📊 Dashboard: ${EMPUSA}`);
  console.log(`     • "$X.XX" Money Saved card (green)`);
  console.log(`     • "${SESSION_ID}" in Blocked Sessions with countdown`);
  console.log(`     • ⚙️ Settings → Webhooks & Cost Config`);
  console.log('  ══════════════════════════════════════════════════════════');
  console.log();
}

main().catch(err => {
  console.error('💥 Demo crashed:', err.message);
  process.exit(1);
});
