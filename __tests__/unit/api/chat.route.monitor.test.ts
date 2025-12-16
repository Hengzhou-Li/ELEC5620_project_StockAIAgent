import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeAuthedJsonRequest } from '../test-helpers';

describe('POST /api/chat monitor tool fallback text', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.GOOGLE_API_KEY = 'x';
    process.env.JWT_SECRET = 's';
  });

  it('returns fallback reply when monitor tool produces no natural text', async () => {
    vi.mock('@/lib/auth', () => ({ getUserFromRequest: () => ({ id: 'u', name: 'n', email: 'e' }) }));
    vi.mock('@/lib/db', () => ({ default: vi.fn() }));
    vi.mock('@/models/Conversation', () => ({ default: { create: vi.fn().mockResolvedValue({ _id: 'c1' }), findOne: vi.fn().mockResolvedValue(null), updateOne: vi.fn() } }));
    vi.mock('@/models/Message', () => ({ default: { create: vi.fn() } }));
    vi.mock('@/lib/monitor', () => ({ startMonitor: vi.fn().mockResolvedValue({ success: true, task: { id: 't1', ticker: 'AAPL', rule: { type: 'above', value: 200 }, expiresAt: Date.now() + 1000 } }) }));

    const firstResp = { functionCalls: () => ([{ name: 'monitor_stock_price', args: { ticker: 'AAPL', thresholdType: 'above', thresholdValue: 200 } }]), text: () => '' };
    const secondResp = { functionCalls: () => null, text: () => '' };
    const chat = { sendMessage: vi.fn().mockResolvedValueOnce({ response: firstResp }).mockResolvedValueOnce({ response: secondResp }) };
    vi.mock('@google/generative-ai', () => ({ GoogleGenerativeAI: vi.fn().mockImplementation(() => ({ getGenerativeModel: () => ({ startChat: () => chat }) })) }));

    const { POST } = await import('@/app/api/chat/route');
    const req = makeAuthedJsonRequest('http://local/api/chat', { message: 'monitor AAPL above 200', history: [] }, 'token');
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(String(json.reply)).toContain('监控已启动');
    expect(typeof json.conversationId).toBe('string');
  });
});
