import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('lib/auth.getUserFromRequest', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'secret';
  });

  it('returns user for valid Bearer token', async () => {
    vi.mock('jsonwebtoken', () => ({
      default: {
        verify: vi.fn().mockReturnValue({ id: '1', name: 'n', email: 'e@example.com' }),
      },
    }));

    const mod = await import('@/lib/auth');
    const req = new Request('http://local', { headers: { Authorization: 'Bearer token' } });
    const u = mod.getUserFromRequest(req as any);
    expect(u).toEqual({ id: '1', name: 'n', email: 'e@example.com' });
  });

  it('returns null for missing header or wrong scheme', async () => {
    const mod = await import('@/lib/auth');
    const r1 = new Request('http://local');
    expect(mod.getUserFromRequest(r1 as any)).toBeNull();

    const r2 = new Request('http://local', { headers: { Authorization: 'Basic xxx' } });
    expect(mod.getUserFromRequest(r2 as any)).toBeNull();
  });

  it('returns null for invalid token', async () => {
    vi.mock('jsonwebtoken', () => ({
      default: {
        verify: vi.fn(() => { throw new Error('bad'); }),
      },
    }));

    const mod = await import('@/lib/auth');
    const req = new Request('http://local', { headers: { Authorization: 'Bearer token' } });
    expect(mod.getUserFromRequest(req as any)).toBeNull();
  });
});
