import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';

describe('DELETE /api/conversations/:id', () => {
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();
    process.env.JWT_SECRET = 'testsecret';
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  it('deletes conversation and its messages', async () => {
    const { default: dbConnect } = await import('@/lib/db');
    const { default: Conversation } = await import('@/models/Conversation');
    const { default: Message } = await import('@/models/Message');
    const { DELETE } = await import('@/app/api/conversations/[id]/route');

    await dbConnect();

    const userId = new mongoose.Types.ObjectId();
    const conv = await Conversation.create({ user: userId, title: '测试会话' });
    await Message.create({ conversation: conv._id, role: 'user', content: 'hello' });
    await Message.create({ conversation: conv._id, role: 'model', content: 'world' });

    const token = jwt.sign(
      { id: userId.toString(), name: 'Tester', email: 'tester@example.com' },
      process.env.JWT_SECRET as string
    );

    const headers = new Headers({ Authorization: `Bearer ${token}` });
    const req = { headers } as any; // minimal NextRequest shape for getUserFromRequest

    const params = Promise.resolve({ id: String(conv._id) });
    const res = (await DELETE(req, { params } as any)) as Response;

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true });

    const convFound = await Conversation.findById(conv._id);
    expect(convFound).toBeNull();
    const msgCount = await Message.countDocuments({ conversation: conv._id });
    expect(msgCount).toBe(0);
  });
});

