import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Conversation from '@/models/Conversation';
import Message from '@/models/Message';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    await dbConnect();
    const conversations = await Conversation.find({ user: user.id })
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    // Optionally include last message preview
    const results = await Promise.all(
      conversations.map(async (c) => {
        const lastMsg = await Message.findOne({ conversation: c._id })
          .sort({ createdAt: -1 })
          .lean();
        return {
          id: String(c._id),
          title: c.title,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          lastMessage: lastMsg ? { role: lastMsg.role, content: lastMsg.content } : null,
        };
      })
    );

    return NextResponse.json({ conversations: results });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Conversations GET] Error:', msg);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const rawTitle: string | undefined = body?.title;
    const fromMessage: string | undefined = body?.fromMessage;

    const titleSource = (rawTitle || fromMessage || 'new session').trim();
    const title = titleSource.slice(0, 60);

    await dbConnect();
    const conversation = await Conversation.create({ user: user.id, title });

    return NextResponse.json({ id: String(conversation._id), title: conversation.title }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Conversations POST] Error:', msg);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
