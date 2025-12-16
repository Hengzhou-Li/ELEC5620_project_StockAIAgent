import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Conversation from '@/models/Conversation';
import { getTasks } from '@/lib/monitor';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId');
    if (!conversationId) return NextResponse.json({ error: 'missing conversationId' }, { status: 400 });

    await dbConnect();
    const conv = await Conversation.findOne({ _id: conversationId, user: user.id });
    if (!conv) return NextResponse.json({ error: 'conversetion not found' }, { status: 404 });

    const tasks = getTasks(conversationId);
    return NextResponse.json({ success: true, tasks });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Monitor Status] Error:', msg);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
