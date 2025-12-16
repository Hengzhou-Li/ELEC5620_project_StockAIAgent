import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeAuthedJsonRequest } from '../test-helpers';

describe('POST /api/chat basic', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.GOOGLE_API_KEY = 'x';
    process.env.JWT_SECRET = 's';
  });

  it('requires auth', async () => {
    const { POST } = await import('@/app/api/chat/route');
    const res = await POST(new Request('http://local/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'hi' }) }) as any);
    expect(res.status).toBe(401);
  });

  it('returns reply text, history, conversationId without function calls', async () => {
    vi.mock('@/lib/auth', () => ({ getUserFromRequest: () => ({ id: 'u', name: 'n', email: 'e' }) }));
    vi.mock('@/lib/db', () => ({ default: vi.fn() }));
    vi.mock('@/models/Conversation', () => ({ default: { create: vi.fn().mockResolvedValue({ _id: 'c1' }), findOne: vi.fn().mockResolvedValue(null), updateOne: vi.fn() } }));
    vi.mock('@/models/Message', () => ({ default: { create: vi.fn() } }));

    const chat = { sendMessage: vi.fn().mockResolvedValue({ response: { functionCalls: () => null, text: () => 'hello' } }) };
    vi.mock('@google/generative-ai', () => ({ GoogleGenerativeAI: vi.fn().mockImplementation(() => ({ getGenerativeModel: () => ({ startChat: () => chat }) })) }));

    const { POST } = await import('@/app/api/chat/route');
    const req = makeAuthedJsonRequest('http://local/api/chat', { message: 'hi', history: [] }, 'token');
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.reply).toBe('hello');
    expect(Array.isArray(json.history)).toBe(true);
    expect(typeof json.conversationId).toBe('string');
    expect(json.functionCallCount).toBe(0);
  });
});
