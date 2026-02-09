import { NextRequest, NextResponse } from 'next/server';
import { unblockSession } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sessionId = body.session_id || body.sessionId;

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session_id.' }, { status: 400 });
    }

    unblockSession(sessionId);

    return NextResponse.json({ success: true, session_id: sessionId, status: 'ACTIVE' });
  } catch (err: unknown) {
    console.error('Error in /api/sessions/unblock:', err);
    return NextResponse.json({ error: 'Failed to unblock session.' }, { status: 500 });
  }
}
