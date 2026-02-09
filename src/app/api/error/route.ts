import { NextRequest, NextResponse } from 'next/server';
import {
  ensureSession,
  insertError,
  getRecentErrors,
  getSessionStatus,
  blockSession,
  insertProxyLog,
} from '@/lib/db';
import { fireBlockedAlert } from '@/lib/webhooks';

const LOOP_THRESHOLD = 3;
const LOOP_WINDOW_MS = 60_000; // 1 minute

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      session_id: rawSessionId,
      sessionId: altSessionId,
      error_message: rawMessage,
      error: altMessage,
      timestamp: rawTimestamp,
    } = body;

    const sessionId = rawSessionId || altSessionId || 'default';
    const errorMessage = rawMessage || altMessage;
    const timestamp = rawTimestamp || new Date().toISOString();

    if (!errorMessage) {
      return NextResponse.json(
        { error: 'Missing error_message or error field.' },
        { status: 400 }
      );
    }

    ensureSession(sessionId);
    insertError(sessionId, errorMessage, timestamp);

    // Loop detection: check last 5 errors for this session
    const recentErrors = getRecentErrors(sessionId, 5);
    const now = new Date(timestamp).getTime();
    const windowStart = now - LOOP_WINDOW_MS;

    // Count identical errors within the time window
    const identicalInWindow = recentErrors.filter(
      (e) =>
        e.error_message === errorMessage &&
        new Date(e.timestamp).getTime() >= windowStart
    ).length;

    let loopDetected = false;

    if (identicalInWindow >= LOOP_THRESHOLD) {
      const currentStatus = getSessionStatus(sessionId);
      if (currentStatus !== 'BLOCKED') {
        const reason = `Loop detected: "${errorMessage}" repeated ${identicalInWindow}x in 1 min`;
        blockSession(sessionId, reason);
        insertProxyLog(sessionId, 'SYSTEM', 'INTERVENTION', 'BLOCKED', null, timestamp);
        fireBlockedAlert(sessionId, reason);
        loopDetected = true;
      }
    }

    return NextResponse.json(
      {
        success: true,
        session_id: sessionId,
        loop_detected: loopDetected,
        session_status: loopDetected ? 'BLOCKED' : getSessionStatus(sessionId),
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error('Error in /api/error:', err);
    return NextResponse.json(
      { error: 'Failed to process error report.' },
      { status: 500 }
    );
  }
}
