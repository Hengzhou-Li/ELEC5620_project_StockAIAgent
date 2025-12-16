import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('lib/db', () => {
  const fakeMongoose = { connection: {} } as any;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    // reset global cache used by lib/db
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (global as any).mongoose;
    process.env.MONGODB_URI = 'mongodb://example.test/db';
  });

  it('caches successful connection and calls connect only once', async () => {
    vi.mock('mongoose', () => {
      const connect = vi.fn().mockResolvedValue(fakeMongoose);
      return { default: { connect } };
    });

    const db = await import('@/lib/db');
    const first = await db.default();
    const second = await db.default();

    expect(first).toBe(fakeMongoose);
    expect(second).toBe(fakeMongoose);
    // Access mocked module to assert call count safely
    const mocked = await import('mongoose');
    expect((mocked as any).default.connect).toHaveBeenCalledTimes(1);
  });

  it('resets promise on connect failure and allows retry', async () => {
    const err = new Error('boom');
    vi.mock('mongoose', () => ({ default: { connect: vi.fn().mockRejectedValueOnce(err) } }));

    const db1 = await import('@/lib/db');
    await expect(db1.default()).rejects.toThrow('boom');

    // Now simulate success after failure
    vi.doMock('mongoose', () => ({ default: { connect: vi.fn().mockResolvedValue(fakeMongoose) } }));
    vi.resetModules();
    // reset global cache again
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (global as any).mongoose;
    process.env.MONGODB_URI = 'mongodb://example.test/db';
    const db2 = await import('@/lib/db');
    const conn = await db2.default();
    expect(conn).toBe(fakeMongoose);
  });
});
