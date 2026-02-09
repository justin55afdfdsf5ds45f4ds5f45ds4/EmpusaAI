import { NextRequest, NextResponse } from 'next/server';
import {
  getSessionStatus,
  ensureSession,
  insertProxyLog,
  getRecentProxyFailures,
  blockSession,
  insertError,
} from '@/lib/db';
import { fireBlockedAlert } from '@/lib/webhooks';

const FAILURE_THRESHOLD = 3;    // 3 upstream failures
const FAILURE_WINDOW_MS = 60_000; // within 1 minute

async function handleProxy(request: NextRequest) {
  const now = new Date().toISOString();

  // Resolve target URL from header or query param
  const targetUrl =
    request.headers.get('x-target-url') ||
    request.nextUrl.searchParams.get('target');

  if (!targetUrl) {
    return NextResponse.json(
      { error: 'Missing target URL. Provide x-target-url header or ?target= query param.' },
      { status: 400 }
    );
  }

  // Validate the URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return NextResponse.json(
      { error: 'Invalid target URL.' },
      { status: 400 }
    );
  }

  // Resolve session ID
  const sessionId =
    request.headers.get('x-session-id') ||
    request.nextUrl.searchParams.get('session_id') ||
    'default';

  ensureSession(sessionId);

  // Check if this session is BLOCKED (includes auto-recovery check)
  const status = getSessionStatus(sessionId);

  if (status === 'BLOCKED') {
    insertProxyLog(sessionId, targetUrl, request.method, 'BLOCKED', 429, now);
    return NextResponse.json(
      { error: 'Session is BLOCKED due to error loop. Resolve errors or wait for cooldown.', session_id: sessionId },
      { status: 429 }
    );
  }

  // Forward the request to the target
  try {
    const headers = new Headers();
    const skipHeaders = new Set(['host', 'x-target-url', 'x-session-id', 'connection', 'transfer-encoding']);
    request.headers.forEach((value, key) => {
      if (!skipHeaders.has(key.toLowerCase())) {
        headers.set(key, value);
      }
    });

    const body = request.method !== 'GET' && request.method !== 'HEAD'
      ? await request.arrayBuffer()
      : undefined;

    const upstream = await fetch(parsedUrl.toString(), {
      method: request.method,
      headers,
      body,
    });

    const responseBody = await upstream.arrayBuffer();

    insertProxyLog(sessionId, targetUrl, request.method, 'FORWARDED', upstream.status, now);

    // ── SELF-AWARE: detect upstream failure patterns ──
    if (upstream.status >= 400) {
      // Auto-log this as an error (no client cooperation needed)
      const errorMsg = `Upstream HTTP ${upstream.status} from ${parsedUrl.hostname}${parsedUrl.pathname}`;
      insertError(sessionId, errorMsg, now);

      // Check recent failures for this session
      const recentFailures = getRecentProxyFailures(sessionId, FAILURE_WINDOW_MS);
      if (recentFailures.length >= FAILURE_THRESHOLD) {
        const currentStatus = getSessionStatus(sessionId);
        if (currentStatus !== 'BLOCKED') {
          const reason = `Proxy auto-block: ${recentFailures.length} upstream failures in 1 min (last: HTTP ${upstream.status})`;
          blockSession(sessionId, reason);
          insertProxyLog(sessionId, 'SYSTEM', 'AUTO_BLOCK', 'BLOCKED', null, now);
          fireBlockedAlert(sessionId, reason);
        }
      }
    }

    // Return the upstream response
    const responseHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'transfer-encoding') {
        responseHeaders.set(key, value);
      }
    });
    responseHeaders.set('x-empusa-session', sessionId);
    responseHeaders.set('x-empusa-status', 'FORWARDED');

    return new NextResponse(responseBody, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown proxy error';

    insertProxyLog(sessionId, targetUrl, request.method, 'ERROR', 502, now);
    insertError(sessionId, `Proxy network error: ${message}`, now);

    // Also check failures on network errors
    const recentFailures = getRecentProxyFailures(sessionId, FAILURE_WINDOW_MS);
    if (recentFailures.length >= FAILURE_THRESHOLD) {
      const currentStatus = getSessionStatus(sessionId);
      if (currentStatus !== 'BLOCKED') {
        const reason = `Proxy auto-block: ${recentFailures.length} failures in 1 min (network error)`;
        blockSession(sessionId, reason);
        fireBlockedAlert(sessionId, reason);
      }
    }

    return NextResponse.json(
      { error: 'Proxy failed to reach target.', details: message },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleProxy(request);
}

export async function POST(request: NextRequest) {
  return handleProxy(request);
}

export async function PUT(request: NextRequest) {
  return handleProxy(request);
}

export async function DELETE(request: NextRequest) {
  return handleProxy(request);
}

export async function PATCH(request: NextRequest) {
  return handleProxy(request);
}
