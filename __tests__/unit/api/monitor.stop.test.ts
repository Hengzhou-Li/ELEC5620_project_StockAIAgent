import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeAuthedJsonRequest } from '../test-helpers';

describe('POST /api/monitor/stop', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('requires auth', async () => {
    const { POST } = await import('@/app/api/monitor/stop/route');
    const res = await POST(new Request('http://local', { method: 'POST', body: JSON.stringify({}) }) as any);
    expect(res.status).toBe(401);
  });

  it('validates conversationId', async () => {
    vi.mock('@/lib/auth', () => ({ getUserFromRequest: () => ({ id: 'u' }) }));
    const { POST } = await import('@/app/api/monitor/stop/route');
    const res = await POST(makeAuthedJsonRequest('http://local', { }) as any);
    expect(res.status).toBe(400);
  });

  it('404 when conversation not found', async () => {
    vi.mock('@/lib/auth', () => ({ getUserFromRequest: () => ({ id: 'u' }) }));
    vi.mock('@/lib/db', () => ({ default: vi.fn() }));
    vi.mock('@/models/Conversation', () => ({ default: { findOne: vi.fn().mockResolvedValue(null) } }));
    const { POST } = await import('@/app/api/monitor/stop/route');
    const res = await POST(makeAuthedJsonRequest('http://local', { conversationId: 'c1' }) as any);
    expect(res.status).toBe(404);
  });

  it('stops tasks and returns result', async () => {
    vi.mock('@/lib/auth', () => ({ getUserFromRequest: () => ({ id: 'u' }) }));
    vi.mock('@/lib/db', () => ({ default: vi.fn() }));
    vi.mock('@/models/Conversation', () => ({ default: { findOne: vi.fn().mockResolvedValue({ _id: 'c1' }) } }));
    vi.mock('@/lib/monitor', () => ({ stopMonitor: vi.fn().mockReturnValue({ success: true, stopped: 1 }) }));
    const { POST } = await import('@/app/api/monitor/stop/route');
    const res = await POST(makeAuthedJsonRequest('http://local', { conversationId: 'c1' }) as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.stopped).toBe(1);
  });
});
