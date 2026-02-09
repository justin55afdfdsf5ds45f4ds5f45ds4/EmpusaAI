import { NextRequest, NextResponse } from 'next/server';
import { getWebhooks, insertWebhook, deleteWebhook, toggleWebhook } from '@/lib/db';

export async function GET() {
  try {
    return NextResponse.json({ webhooks: getWebhooks() });
  } catch (err: unknown) {
    console.error('Error in GET /api/webhooks:', err);
    return NextResponse.json({ error: 'Failed to fetch webhooks.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, type, action, id, enabled } = body;

    if (action === 'delete' && id) {
      deleteWebhook(id);
      return NextResponse.json({ success: true });
    }

    if (action === 'toggle' && id !== undefined) {
      toggleWebhook(id, !!enabled);
      return NextResponse.json({ success: true });
    }

    if (!url) {
      return NextResponse.json({ error: 'Missing url field.' }, { status: 400 });
    }

    insertWebhook(url, type || 'slack');
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err: unknown) {
    console.error('Error in POST /api/webhooks:', err);
    return NextResponse.json({ error: 'Failed to manage webhook.' }, { status: 500 });
  }
}
