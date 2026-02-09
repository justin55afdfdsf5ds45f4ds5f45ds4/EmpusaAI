import { NextRequest, NextResponse } from 'next/server';
import { getCostConfigs, upsertCostConfig } from '@/lib/db';

export async function GET() {
  try {
    return NextResponse.json({ configs: getCostConfigs() });
  } catch (err: unknown) {
    console.error('Error in GET /api/cost-config:', err);
    return NextResponse.json({ error: 'Failed to fetch cost config.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain_pattern, cost_per_request, label } = body;

    if (!domain_pattern || cost_per_request === undefined) {
      return NextResponse.json({ error: 'Missing domain_pattern or cost_per_request.' }, { status: 400 });
    }

    upsertCostConfig(domain_pattern, cost_per_request, label);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err: unknown) {
    console.error('Error in POST /api/cost-config:', err);
    return NextResponse.json({ error: 'Failed to update cost config.' }, { status: 500 });
  }
}
