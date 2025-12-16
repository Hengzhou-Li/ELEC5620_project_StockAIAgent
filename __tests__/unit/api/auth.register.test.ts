import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeJsonRequest } from '../test-helpers';

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'secret';
  });

  it('registers and returns 201 with token', async () => {
    vi.mock('@/lib/db', () => ({ default: vi.fn() }));
    const save = vi.fn().mockResolvedValue(undefined);
    const Ctor = vi.fn().mockImplementation((doc) => ({ ...doc, _id: 'u1', toObject: () => ({ ...doc, _id: 'u1', password: 'hash' }), save }));
    vi.mock('@/models/User', () => ({ default: Object.assign(Ctor, { findOne: vi.fn().mockResolvedValue(null) }) }));
    vi.mock('bcryptjs', () => ({ default: { hash: vi.fn().mockResolvedValue('hash') } }));
    vi.mock('jsonwebtoken', () => ({ default: { sign: vi.fn().mockReturnValue('jwt-token') } }));

    const { POST } = await import('@/app/api/auth/register/route');
    const res = await POST(makeJsonRequest('http://local/api/auth/register', { name: 'A', email: 'a@a.com', password: 'secret12' }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.token).toBe('jwt-token');
    expect(json.user.password).toBeUndefined();
  });

  it('returns 500 on internal error', async () => {
    vi.mock('@/lib/db', () => ({ default: vi.fn() }));
    vi.mock('@/models/User', () => ({ default: { findOne: vi.fn().mockResolvedValue(null) } }));
    vi.mock('bcryptjs', () => ({ default: { hash: vi.fn().mockRejectedValue(new Error('boom')) } }));

    const { POST } = await import('@/app/api/auth/register/route');
    const res = await POST(makeJsonRequest('http://local/api/auth/register', { name: 'A', email: 'a@a.com', password: 'secret12' }));
    expect(res.status).toBe(500);
  });
});
