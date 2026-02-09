import { NextResponse } from 'next/server';
import {
  getBlockedCount24h,
  getActiveLoopCount,
  getRecentEvents,
  getBlockedSessions,
  getMoneySaved24h,
  getSessionCooldownRemaining,
} from '@/lib/db';

export async function GET() {
  try {
    const blockedRequests24h = getBlockedCount24h();
    const activeLoops = getActiveLoopCount();
    const moneySaved24h = getMoneySaved24h();
    const events = getRecentEvents(50);
    const blockedSessions = getBlockedSessions().map((s) => ({
      ...s,
      cooldown_remaining: getSessionCooldownRemaining(s.session_id),
    }));

    return NextResponse.json({
      blockedRequests24h,
      activeLoops,
      moneySaved24h,
      events,
      blockedSessions,
    });
  } catch (err: unknown) {
    console.error('Error in /api/dashboard:', err);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data.' },
      { status: 500 }
    );
  }
}
