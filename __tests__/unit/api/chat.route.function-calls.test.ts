import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeAuthedJsonRequest } from '../test-helpers';

describe('POST /api/chat with function calls', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.GOOGLE_API_KEY = 'x';
    process.env.JWT_SECRET = 's';
  });

  it('handles a single function call (get_stock_history)', async () => {
    vi.mock('@/lib/auth', () => ({ getUserFromRequest: () => ({ id: 'u', name: 'n', email: 'e' }) }));
    vi.mock('@/lib/db', () => ({ default: vi.fn() }));
    vi.mock('@/models/Conversation', () => ({ default: { create: vi.fn().mockResolvedValue({ _id: 'c1' }), findOne: vi.fn().mockResolvedValue(null), updateOne: vi.fn() } }));
    vi.mock('@/models/Message', () => ({ default: { create: vi.fn() } }));

    vi.mock('yahoo-finance2', () => ({ default: vi.fn().mockImplementation(() => ({
      historical: vi.fn().mockResolvedValue([
        { date: new Date(), open: 1, high: 2, low: 1, close: 1.5, volume: 100 },
        { date: new Date(), open: 1.5, high: 2, low: 1, close: 1.6, volume: 120 },
      ])
    })) }));

    const firstResp = { functionCalls: () => ([{ name: 'get_stock_history', args: { ticker: 'AAPL', days: 7 } }]), text: () => '' };
    const secondResp = { functionCalls: () => null, text: () => 'done' };
    const chat = { sendMessage: vi.fn().mockResolvedValueOnce({ response: firstResp }).mockResolvedValueOnce({ response: secondResp }) };
    vi.mock('@google/generative-ai', () => ({ GoogleGenerativeAI: vi.fn().mockImplementation(() => ({ getGenerativeModel: () => ({ startChat: () => chat }) })) }));

    const { POST } = await import('@/app/api/chat/route');
    const req = makeAuthedJsonRequest('http://local/api/chat', { message: 'chart AAPL', history: [] }, 'token');
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.functionCallCount).toBeGreaterThan(0);
    expect(json.functionCallResult.name).toBe('get_stock_history');
  });
});
