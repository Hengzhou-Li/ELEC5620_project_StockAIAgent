// lib/monitor.ts
// In-memory stock price monitor manager with mock email notifications.

import YahooFinance from 'yahoo-finance2';
import { sendEmailMock } from '@/lib/notify';

export type ThresholdRule =
  | { type: 'above'; value: number }
  | { type: 'below'; value: number }
  | { type: 'percentChange'; value: number }; // absolute percent, e.g. 2 = 2%

export type MonitorStatus = 'running' | 'stopped' | 'triggered' | 'expired';

export interface MonitorTask {
  id: string;
  conversationId: string;
  userId: string;
  email: string;
  ticker: string;
  rule: ThresholdRule;
  intervalMs: number;
  startedAt: Date;
  expiresAt: Date;
  status: MonitorStatus;
  lastPrice?: number;
  baselinePrice?: number; // for percentChange rule; captured at start
  hits: Array<{ time: Date; price: number; reason: string }>;
}

type TaskInternal = MonitorTask & {
  _interval?: ReturnType<typeof setInterval>;
  _timeout?: ReturnType<typeof setTimeout>;
};

type TasksMap = Map<string, TaskInternal[]>; // conversationId -> tasks

declare global {
  var __monitorTasks: TasksMap | undefined;
  var __yahooInstance: YF | undefined;
}

type YFQuote = { regularMarketPrice?: number } | null;
type YF = { quote: (symbol: string) => Promise<YFQuote> };

function getTasksMap(): TasksMap {
  if (!global.__monitorTasks) {
    global.__monitorTasks = new Map();
  }
  return global.__monitorTasks;
}

function getYahoo(): YF {
  if (!global.__yahooInstance) {
    // YahooFinance doesn't export a typed class; cast to our minimal interface
    const Ctor = YahooFinance as unknown as { new (): YF };
    global.__yahooInstance = new Ctor();
  }
  return global.__yahooInstance;
}

function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function fetchPrice(ticker: string): Promise<number | null> {
  try {
    const yf = getYahoo();
    const q = await yf.quote(ticker.toUpperCase());
    if (!q || typeof q.regularMarketPrice !== 'number') return null;
    return q.regularMarketPrice as number;
  } catch (err) {
    console.error('[Monitor] fetchPrice error:', err);
    return null;
  }
}

function reasonForHit(rule: ThresholdRule, price: number, baseline?: number): string {
  if (rule.type === 'above') return `price  ${price} ≥ threshold ${rule.value}`;
  if (rule.type === 'below') return `price  ${price} ≤ threshold ${rule.value}`;
  const base = baseline ?? price;
  const pct = base ? Math.abs(((price - base) / base) * 100) : 0;
  return `The fluctuation reaches ${pct.toFixed(2)}% ≥ threshold ${rule.value}%`;
}

function testRule(rule: ThresholdRule, price: number, baseline?: number): boolean {
  switch (rule.type) {
    case 'above':
      return price >= rule.value;
    case 'below':
      return price <= rule.value;
    case 'percentChange': {
      if (!baseline || baseline <= 0) return false;
      const pct = Math.abs(((price - baseline) / baseline) * 100);
      return pct >= rule.value;
    }
    default:
      return false;
  }
}

export async function startMonitor(opts: {
  conversationId: string;
  userId: string;
  email: string;
  ticker: string;
  rule: ThresholdRule;
  intervalSeconds?: number; // default 30s
  durationMinutes?: number; // default 30m (max 30)
}): Promise<{ success: true; task: MonitorTask } | { success: false; error: string }> {
  const tasksMap = getTasksMap();
  const list = tasksMap.get(opts.conversationId) || [];
  const runningCount = list.filter((t) => t.status === 'running').length;
  if (runningCount >= 3) {
    return { success: false, error: 'This session has reached the limit of up to three monitoring tasks' };
  }

  const intervalMs = Math.max(5, Math.floor(opts.intervalSeconds ?? 30)) * 1000;
  const durationMin = Math.min(30, Math.max(1, Math.floor(opts.durationMinutes ?? 30)));
  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + durationMin * 60 * 1000);

  const id = genId();
  const baselinePrice = opts.rule.type === 'percentChange' ? (await fetchPrice(opts.ticker)) ?? undefined : undefined;
  const task: TaskInternal = {
    id,
    conversationId: opts.conversationId,
    userId: opts.userId,
    email: opts.email,
    ticker: opts.ticker.toUpperCase(),
    rule: opts.rule,
    intervalMs,
    startedAt,
    expiresAt,
    status: 'running',
    baselinePrice,
    hits: []
  };

  async function poll() {
    if (task.status !== 'running') return;
    const price = await fetchPrice(task.ticker);
    if (price == null) return;
    task.lastPrice = price;
    if (testRule(task.rule, price, task.baselinePrice)) {
      task.status = 'triggered';
      const reason = reasonForHit(task.rule, price, task.baselinePrice);
      task.hits.push({ time: new Date(), price, reason });
      await sendEmailMock(
        task.email,
        `[Monitoring Trigger]${task.ticker}`,
        `session ${task.conversationId} | stock ${task.ticker} trigger rules: ${reason}`
      );
      // stop after first trigger to avoid spam
      stopMonitor(task.conversationId, task.id);
    }
  }

  const i = setInterval(poll, task.intervalMs);
  const to = setTimeout(() => {
    if (task.status === 'running') {
      task.status = 'expired';
    }
    stopMonitor(task.conversationId, task.id);
  }, durationMin * 60 * 1000 + 100); // grace 100ms

  task._interval = i;
  task._timeout = to;

  tasksMap.set(opts.conversationId, [...list, task]);

  return { success: true, task };
}

export function stopMonitor(conversationId: string, taskId?: string): { success: true; stopped: number } {
  const tasksMap = getTasksMap();
  const list = tasksMap.get(conversationId) || [];
  let stopped = 0;
  for (const t of list) {
    if (taskId && t.id !== taskId) continue;
    if (t._interval) clearInterval(t._interval);
    if (t._timeout) clearTimeout(t._timeout);
    if (t.status === 'running') t.status = 'stopped';
    t._interval = undefined;
    t._timeout = undefined;
    stopped++;
  }
  if (!taskId) {
    // remove all tasks for conversation
    tasksMap.delete(conversationId);
  } else {
    // keep remaining tasks (including stopped one) for inspection for now
    tasksMap.set(conversationId, list.filter((t) => t.id !== taskId));
  }
  return { success: true, stopped };
}

export function stopAllForConversation(conversationId: string) {
  return stopMonitor(conversationId);
}

function toPublicTask(t: TaskInternal): MonitorTask {
  return {
    id: t.id,
    conversationId: t.conversationId,
    userId: t.userId,
    email: t.email,
    ticker: t.ticker,
    rule: t.rule,
    intervalMs: t.intervalMs,
    startedAt: t.startedAt,
    expiresAt: t.expiresAt,
    status: t.status,
    lastPrice: t.lastPrice,
    baselinePrice: t.baselinePrice,
    hits: t.hits,
  };
}

export function getTasks(conversationId: string): MonitorTask[] {
  const tasksMap = getTasksMap();
  const list = tasksMap.get(conversationId) || [];
  return list.map((t) => toPublicTask(t));
}

export function getAllTasks(): MonitorTask[] {
  const tasksMap = getTasksMap();
  const res: MonitorTask[] = [];
  for (const [, list] of tasksMap.entries()) {
    for (const t of list) res.push(toPublicTask(t));
  }
  return res;
}
