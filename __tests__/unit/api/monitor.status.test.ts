import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('GET /api/monitor/status', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('requires auth', async () => {
    const { GET } = await import('@/app/api/monitor/status/route');
    const res = await GET(new Request('http://local/api/monitor/status') as any);
    expect(res.status).toBe(401);
  });

  it('validates conversationId', async () => {
    vi.mock('@/lib/auth', () => ({ getUserFromRequest: () => ({ id: 'u' }) }));
    const { GET } = await import('@/app/api/monitor/status/route');
    const res = await GET(new Request('http://local/api/monitor/status') as any);
    expect(res.status).toBe(400);
  });

  it('404 when conversation not found', async () => {
    vi.mock('@/lib/auth', () => ({ getUserFromRequest: () => ({ id: 'u' }) }));
    vi.mock('@/lib/db', () => ({ default: vi.fn() }));
    vi.mock('@/models/Conversation', () => ({ default: { findOne: vi.fn().mockResolvedValue(null) } }));
    const { GET } = await import('@/app/api/monitor/status/route');
    const res = await GET(new Request('http://local/api/monitor/status?conversationId=c1') as any);
    expect(res.status).toBe(404);
  });

  it('returns tasks when found', async () => {
    vi.mock('@/lib/auth', () => ({ getUserFromRequest: () => ({ id: 'u' }) }));
    vi.mock('@/lib/db', () => ({ default: vi.fn() }));
    vi.mock('@/models/Conversation', () => ({ default: { findOne: vi.fn().mockResolvedValue({ _id: 'c1' }) } }));
    vi.mock('@/lib/monitor', () => ({ getTasks: vi.fn().mockReturnValue([{ id: 't1' }]) }));
    const { GET } = await import('@/app/api/monitor/status/route');
    const res = await GET(new Request('http://local/api/monitor/status?conversationId=c1') as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.tasks.length).toBe(1);
  });
});
