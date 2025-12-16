import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeJsonRequest } from '../test-helpers';

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'secret';
  });

  it('returns 200 with token on success and omits password', async () => {
    vi.mock('@/lib/db', () => ({ default: vi.fn().mockResolvedValue(undefined) }));
    const fakeUser = {
      _id: 'u1', name: 'A', email: 'a@a.com', password: 'hash',
      toObject: () => ({ _id: 'u1', name: 'A', email: 'a@a.com', password: 'hash' }),
    } as any;
    const findOne = vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue(fakeUser) });
    vi.mock('@/models/User', () => ({ default: { findOne } }));
    vi.mock('bcryptjs', () => ({ default: { compare: vi.fn().mockResolvedValue(true) } }));
    vi.mock('jsonwebtoken', () => ({ default: { sign: vi.fn().mockReturnValue('jwt-token') } }));

    const { POST } = await import('@/app/api/auth/login/route');
    const res = await POST(makeJsonRequest('http://local/api/auth/login', { email: 'a@a.com', password: 'p' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.token).toBe('jwt-token');
    expect(json.user.password).toBeUndefined();
  });

  it('returns 400 when missing fields', async () => {
    vi.mock('@/lib/db', () => ({ default: vi.fn() }));
    vi.mock('@/models/User', () => ({ default: { findOne: vi.fn() } }));

    const { POST } = await import('@/app/api/auth/login/route');
    const res = await POST(makeJsonRequest('http://local/api/auth/login', { email: '', password: '' }));
    expect(res.status).toBe(400);
  });

  it('returns 401 on wrong password', async () => {
    vi.mock('@/lib/db', () => ({ default: vi.fn() }));
    const fakeUser = {
      _id: 'u1', name: 'A', email: 'a@a.com', password: 'hash',
      toObject: () => ({ _id: 'u1', name: 'A', email: 'a@a.com', password: 'hash' }),
    } as any;
    const findOne = vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue(fakeUser) });
    vi.mock('@/models/User', () => ({ default: { findOne } }));
    vi.mock('bcryptjs', () => ({ default: { compare: vi.fn().mockResolvedValue(false) } }));

    const { POST } = await import('@/app/api/auth/login/route');
    const res = await POST(makeJsonRequest('http://local/api/auth/login', { email: 'a@a.com', password: 'bad' }));
    expect(res.status).toBe(401);
  });

  it('returns 500 on internal error', async () => {
    vi.mock('@/lib/db', () => ({ default: vi.fn() }));
    vi.mock('@/models/User', () => ({ default: { findOne: vi.fn().mockImplementation(() => { throw new Error('db'); }) } }));

    const { POST } = await import('@/app/api/auth/login/route');
    const res = await POST(makeJsonRequest('http://local/api/auth/login', { email: 'a@a.com', password: 'p' }));
    expect(res.status).toBe(500);
  });
});
