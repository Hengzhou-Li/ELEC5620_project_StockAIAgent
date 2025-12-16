import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('lib/monitor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    vi.clearAllMocks();
    // reset global task store
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).__monitorTasks = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('startMonitor creates task, respects cap=3, and stopMonitor stops tasks', async () => {
    // Mock Yahoo quote and email
    vi.mock('yahoo-finance2', () => ({ default: vi.fn().mockImplementation(() => ({ quote: vi.fn().mockResolvedValue({ regularMarketPrice: 150 }) })) }));
    vi.mock('@/lib/notify', () => ({ sendEmailMock: vi.fn().mockResolvedValue({ success: true }) }));

    const mod = await import('@/lib/monitor');

    const base = { conversationId: 'c1', userId: 'u1', email: 'e@x', ticker: 'AAPL' };

    // Add three running tasks
    const t1 = await mod.startMonitor({ ...base, rule: { type: 'above', value: 100 }, intervalSeconds: 60, durationMinutes: 1 });
    const t2 = await mod.startMonitor({ ...base, rule: { type: 'below', value: 200 }, intervalSeconds: 60, durationMinutes: 1 });
    const t3 = await mod.startMonitor({ ...base, rule: { type: 'percentChange', value: 2 }, intervalSeconds: 60, durationMinutes: 1 });
    expect(t1.success).toBe(true);
    expect(t2.success).toBe(true);
    expect(t3.success).toBe(true);

    // Fourth should be rejected by cap
    const t4 = await mod.startMonitor({ ...base, rule: { type: 'above', value: 1 } });
    expect(t4.success).toBe(false);

    // Stop all for conversation
    const stopped = mod.stopAllForConversation('c1');
    expect(stopped.success).toBe(true);
  });

  it('percentChange captures baseline and triggers email on hit, then stops', async () => {
    const quote = vi.fn()
      .mockResolvedValueOnce({ regularMarketPrice: 100 }) // baseline capture
      .mockResolvedValueOnce({ regularMarketPrice: 103 }); // +3%
    vi.mock('yahoo-finance2', () => ({ default: vi.fn().mockImplementation(() => ({ quote })) }));
    const email = vi.fn().mockResolvedValue({ success: true });
    vi.mock('@/lib/notify', () => ({ sendEmailMock: email }));

    const mod = await import('@/lib/monitor');
    const res = await mod.startMonitor({ conversationId: 'c1', userId: 'u', email: 'e', ticker: 'AAPL', rule: { type: 'percentChange', value: 2 }, intervalSeconds: 5, durationMinutes: 1 });
    expect(res.success).toBe(true);

    // advance time to run one poll
    await vi.advanceTimersByTimeAsync(5000);
    const tasks = mod.getTasks('c1');
    expect(tasks[0].status === 'triggered' || tasks[0].status === 'stopped').toBe(true);
    expect(email).toHaveBeenCalled();
  });

  it('getAllTasks aggregates tasks across conversations', async () => {
    vi.mock('yahoo-finance2', () => ({ default: vi.fn().mockImplementation(() => ({ quote: vi.fn().mockResolvedValue({ regularMarketPrice: 150 }) })) }));
    vi.mock('@/lib/notify', () => ({ sendEmailMock: vi.fn() }));
    const mod = await import('@/lib/monitor');
    await mod.startMonitor({ conversationId: 'c1', userId: 'u1', email: 'e', ticker: 'AAPL', rule: { type: 'above', value: 1 }, intervalSeconds: 60, durationMinutes: 1 });
    await mod.startMonitor({ conversationId: 'c2', userId: 'u2', email: 'e', ticker: 'TSLA', rule: { type: 'below', value: 9999 }, intervalSeconds: 60, durationMinutes: 1 });
    const all = mod.getAllTasks();
    expect(all.length).toBeGreaterThanOrEqual(2);
  });
});
