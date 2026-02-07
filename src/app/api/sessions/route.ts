import { NextResponse } from 'next/server';
import { getAllSessions } from '@/lib/db';

export async function GET() {
  try {
    const sessions = getAllSessions();
    
    return NextResponse.json({ sessions }, { status: 200 });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}
