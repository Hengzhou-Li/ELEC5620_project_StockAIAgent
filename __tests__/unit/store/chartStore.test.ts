import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('store/chartStore', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('initial state and actions', async () => {
    const { useAppStore } = await import('@/store/chartStore');

    // initial
    let state = useAppStore.getState();
    expect(state.ticker).toBeNull();
    expect(Array.isArray(state.chartData)).toBe(true);
    expect(state.history[0]?.role).toBe('model');

    // setChartData
    state.setChartData({ ticker: 'AAPL', data: [{ date: '2024-01-01', price: 100 }] });
    state = useAppStore.getState();
    expect(state.ticker).toBe('AAPL');
    expect(state.chartData).toEqual([{ date: '2024-01-01', price: 100 }]);

    // setHistory
    state.setHistory([{ role: 'user', parts: [{ text: 'hi' }] }]);
    state = useAppStore.getState();
    expect(state.history).toEqual([{ role: 'user', parts: [{ text: 'hi' }] }]);
  });
});
