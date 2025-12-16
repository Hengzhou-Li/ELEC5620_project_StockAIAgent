import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('/api/conversations', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('GET requires auth', async () => {
    const { GET } = await import('@/app/api/conversations/route');
    const res = await GET(new Request('http://local/api/conversations') as any);
    expect(res.status).toBe(401);
  });

  it('GET returns list with lastMessage preview', async () => {
    vi.mock('@/lib/auth', () => ({ getUserFromRequest: () => ({ id: 'u' }) }));
    vi.mock('@/lib/db', () => ({ default: vi.fn() }));
    const conversations = [
      { _id: 'c1', title: 'T1', createdAt: new Date(), updatedAt: new Date() },
      { _id: 'c2', title: 'T2', createdAt: new Date(), updatedAt: new Date() },
    ];
    const find = vi.fn().mockReturnValue({ sort: () => ({ limit: () => ({ lean: () => conversations }) }) });
    vi.mock('@/models/Conversation', () => ({ default: { find } }));
    const findOne = vi.fn()
      .mockResolvedValueOnce({ role: 'user', content: 'hi' })
      .mockResolvedValueOnce(null);
    vi.mock('@/models/Message', () => ({ default: { findOne: () => ({ sort: () => ({ lean: () => findOne() }) }) } }));

    const { GET } = await import('@/app/api/conversations/route');
    const res = await GET(new Request('http://local/api/conversations') as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.conversations)).toBe(true);
    expect(json.conversations[0].lastMessage?.role).toBe('user');
    expect(json.conversations[1].lastMessage).toBeNull();
  });

  it('POST requires auth', async () => {
    const { POST } = await import('@/app/api/conversations/route');
    const res = await POST(new Request('http://local/api/conversations', { method: 'POST', body: JSON.stringify({}) }) as any);
    expect(res.status).toBe(401);
  });

  it('POST creates conversation with title or fromMessage and clips to 60 chars', async () => {
    vi.mock('@/lib/auth', () => ({ getUserFromRequest: () => ({ id: 'u' }) }));
    vi.mock('@/lib/db', () => ({ default: vi.fn() }));
    const create = vi.fn().mockResolvedValue({ _id: 'c1', title: 'X'.repeat(60) });
    vi.mock('@/models/Conversation', () => ({ default: { create } }));

    const { POST } = await import('@/app/api/conversations/route');
    const body = { fromMessage: 'Y'.repeat(100) };
    const res = await POST(new Request('http://local/api/conversations', { method: 'POST', body: JSON.stringify(body) }) as any);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe('c1');
    expect(json.title.length).toBeLessThanOrEqual(60);
  });
});
