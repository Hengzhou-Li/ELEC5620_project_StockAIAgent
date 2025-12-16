import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Conversation from '@/models/Conversation';
import { stopMonitor } from '@/lib/monitor';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const body = await req.json();
    const { conversationId, taskId } = body || {};
    if (!conversationId) return NextResponse.json({ error: 'missing conversationId' }, { status: 400 });

    await dbConnect();
    const conv = await Conversation.findOne({ _id: conversationId, user: user.id });
    if (!conv) return NextResponse.json({ error: 'conversation not found' }, { status: 404 });

    const res = stopMonitor(conversationId, taskId);
    return NextResponse.json(res);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Monitor Stop] Error:', msg);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
