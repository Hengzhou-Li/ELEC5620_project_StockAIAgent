import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Conversation from '@/models/Conversation';
import { startMonitor, ThresholdRule } from '@/lib/monitor';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const body = await req.json();
    const { conversationId, ticker, rule, intervalSeconds, durationMinutes } = body || {};

    if (!conversationId || !ticker || !rule || typeof rule.type !== 'string' || typeof rule.value !== 'number') {
      return NextResponse.json({ error: 'Invalid parameters: conversationId, ticker, rule{type,value} are required' }, { status: 400 });
    }

    const validTypes = ['above', 'below', 'percentChange'];
    if (!validTypes.includes(rule.type)) {
      return NextResponse.json({ error: 'rule.type only support above/below/percentChange' }, { status: 400 });
    }

    await dbConnect();
    const conv = await Conversation.findOne({ _id: conversationId, user: user.id });
    if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

    const startRes = await startMonitor({
      conversationId,
      userId: user.id,
      email: user.email,
      ticker,
      rule: rule as ThresholdRule,
      intervalSeconds,
      durationMinutes
    });

    if (!startRes.success) return NextResponse.json(startRes, { status: 400 });

    return NextResponse.json({ success: true, task: startRes.task });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Monitor Start] Error:', msg);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
