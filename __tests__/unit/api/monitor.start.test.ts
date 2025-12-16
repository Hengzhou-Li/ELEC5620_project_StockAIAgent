import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeAuthedJsonRequest } from '../test-helpers';

describe('POST /api/monitor/start', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('requires auth', async () => {
    const { POST } = await import('@/app/api/monitor/start/route');
    const res = await POST(new Request('http://local', { method: 'POST', body: JSON.stringify({}) }) as any);
    expect(res.status).toBe(401);
  });

  it('validates params', async () => {
    vi.mock('@/lib/auth', () => ({ getUserFromRequest: () => ({ id: 'u', name: 'n', email: 'e' }) }));
    const { POST } = await import('@/app/api/monitor/start/route');
    const res = await POST(makeAuthedJsonRequest('http://local', { }) as any);
    expect(res.status).toBe(400);
  });

  it('404 when conversation not found', async () => {
    vi.mock('@/lib/auth', () => ({ getUserFromRequest: () => ({ id: 'u', name: 'n', email: 'e' }) }));
    vi.mock('@/lib/db', () => ({ default: vi.fn() }));
    vi.mock('@/models/Conversation', () => ({ default: { findOne: vi.fn().mockResolvedValue(null) } }));
    const { POST } = await import('@/app/api/monitor/start/route');
    const res = await POST(makeAuthedJsonRequest('http://local', { conversationId: 'c1', ticker: 'AAPL', rule: { type: 'above', value: 100 } }) as any);
    expect(res.status).toBe(404);
  });

  it('returns 400 when startMonitor fails', async () => {
    vi.mock('@/lib/auth', () => ({ getUserFromRequest: () => ({ id: 'u', name: 'n', email: 'e' }) }));
    vi.mock('@/lib/db', () => ({ default: vi.fn() }));
    vi.mock('@/models/Conversation', () => ({ default: { findOne: vi.fn().mockResolvedValue({ _id: 'c1' }) } }));
    vi.mock('@/lib/monitor', () => ({ startMonitor: vi.fn().mockResolvedValue({ success: false, error: 'cap' }) }));
    const { POST } = await import('@/app/api/monitor/start/route');
    const res = await POST(makeAuthedJsonRequest('http://local', { conversationId: 'c1', ticker: 'AAPL', rule: { type: 'above', value: 100 } }) as any);
    expect(res.status).toBe(400);
  });

  it('starts monitor and returns task', async () => {
    vi.mock('@/lib/auth', () => ({ getUserFromRequest: () => ({ id: 'u', name: 'n', email: 'e' }) }));
    vi.mock('@/lib/db', () => ({ default: vi.fn() }));
    vi.mock('@/models/Conversation', () => ({ default: { findOne: vi.fn().mockResolvedValue({ _id: 'c1' }) } }));
    vi.mock('@/lib/monitor', () => ({ startMonitor: vi.fn().mockResolvedValue({ success: true, task: { id: 't1' } }) }));
    const { POST } = await import('@/app/api/monitor/start/route');
    const res = await POST(makeAuthedJsonRequest('http://local', { conversationId: 'c1', ticker: 'AAPL', rule: { type: 'above', value: 100 } }) as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.task.id).toBe('t1');
  });
});
