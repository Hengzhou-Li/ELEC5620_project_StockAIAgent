import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Conversation from '@/models/Conversation';
import Message from '@/models/Message';
import { getUserFromRequest } from '@/lib/auth';
import { stopAllForConversation } from '@/lib/monitor';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const { id: conversationId } = await params;
    await dbConnect();

    const conv = await Conversation.findOne({ _id: conversationId, user: user.id }).lean();
    if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

    const messages = await Message.find({ conversation: conversationId }).sort({ createdAt: 1 }).lean();
    const history = messages.map((m) => ({ role: m.role, parts: [{ text: m.content }] }));

    return NextResponse.json({ id: String(conv._id), title: conv.title, history });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Conversation GET] Error:', msg);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const { id: conversationId } = await params;
    await dbConnect();

    const conv = await Conversation.findOne({ _id: conversationId, user: user.id });
    if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

    // stop any running monitors for this conversation (design: 6.1)
    try { stopAllForConversation(conversationId); } catch {}

    await Message.deleteMany({ conversation: conversationId });
    await conv.deleteOne();
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Conversation DELETE] Error:', msg);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
