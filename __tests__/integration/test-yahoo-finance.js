#!/usr/bin/env node
// Quick Yahoo Finance smoke test
// Usage: node __tests__/test-yahoo-finance.js [TICKER]

(async () => {
  const ticker = (process.argv[2] || 'NVDA').toUpperCase();
  try {
    const mod = await import('yahoo-finance2');
    const YahooFinance = mod.default;
    const yf = new YahooFinance();

    console.log(`[Test] Fetching quote for ${ticker}...`);
    const q = await yf.quote(ticker);
    if (!q || typeof q.regularMarketPrice !== 'number') {
      console.error('[Test] Quote result invalid:', q);
      process.exit(2);
    }
    console.log('[OK] Quote:', {
      symbol: q.symbol,
      name: q.longName || q.shortName || ticker,
      price: q.regularMarketPrice,
      change: q.regularMarketChange,
      changePercent: q.regularMarketChangePercent,
      currency: q.currency || 'USD'
    });

    console.log(`[Test] Fetching recent history for ${ticker} (last 10 days)...`);
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 10);
    const hist = await yf.historical(ticker, { period1: start, period2: end, interval: '1d' });
    console.log('[OK] History points:', hist.length);

    console.log(`[Test] Searching news for ${ticker}...`);
    const s = await yf.search(ticker);
    const newsCount = (s && Array.isArray(s.news)) ? s.news.length : 0;
    console.log('[OK] News items:', newsCount);

    console.log('\n[Test] All checks passed.');
  } catch (err) {
    console.error('[Test] Error:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();

