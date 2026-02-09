import { NextRequest, NextResponse } from 'next/server';
import { insertLog, getLogsBySession } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, step, action, status, error, timestamp, state, errorCode, remedyAttempted } = body;
    
    // Validate required fields
    if (!sessionId || step === undefined || !action || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, step, action, status' },
        { status: 400 }
      );
    }
    
    // Insert log entry with error classification and remedy tracking
    const id = insertLog(
      sessionId, 
      step, 
      action, 
      status, 
      error, 
      timestamp, 
      state,
      errorCode,
      remedyAttempted
    );
    
    return NextResponse.json(
      { success: true, id },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error inserting log:', error);
    return NextResponse.json(
      { error: 'Failed to insert log entry' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing sessionId parameter' },
        { status: 400 }
      );
    }
    
    const logs = getLogsBySession(sessionId);
    
    return NextResponse.json({ logs }, { status: 200 });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}
