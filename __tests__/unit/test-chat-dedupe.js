#!/usr/bin/env node
// Simulate Chatbox history deduplication logic to verify no duplicate messages

function dedupeAdjacent(arr) {
  const out = [];
  for (const m of arr) {
    const prev = out[out.length - 1];
    const prevText = prev && prev.parts && prev.parts[0] ? prev.parts[0].text : undefined;
    const curText = m && m.parts && m.parts[0] ? m.parts[0].text : undefined;
    if (prev && prev.role === m.role && prevText === curText) continue;
    out.push(m);
  }
  return out;
}

function dedupeTailPairs(arr) {
  const out = [...arr];
  while (out.length >= 4) {
    const n = out.length;
    const a = out[n - 4];
    const b = out[n - 3];
    const c = out[n - 2];
    const d = out[n - 1];
    const aText = a?.parts?.[0]?.text;
    const bText = b?.parts?.[0]?.text;
    const cText = c?.parts?.[0]?.text;
    const dText = d?.parts?.[0]?.text;
    const samePair = a && b && c && d && a.role === c.role && b.role === d.role && aText === cText && bText === dText;
    if (samePair) {
      out.splice(n - 2, 2);
    } else {
      break;
    }
  }
  return out;
}

function sanitizeHistory(arr) {
  return dedupeTailPairs(dedupeAdjacent(arr));
}

function msg(role, text) {
  return { role, parts: [{ text }] };
}

const welcome = msg('model', '您好！我是您的金融助手，请问有什么可以帮助您的吗？');
const u1 = msg('user', '你好');
const m1 = msg('model', '你好！有什么可以帮你？');
const u2 = msg('user', '给出 AAPL 近30天股价图表');
const m2 = msg('model', '好的，图表已生成。您可以 [点击这里查看图表](/visualization)。');

const tests = [
  { name: 'No duplicates', input: [welcome, u1, m1, u2, m2] },
  { name: 'Adjacent duplicate model', input: [welcome, u1, m1, m1] },
  { name: 'Tail pair duplicate', input: [u2, m2, u2, m2] },
  { name: 'Welcome then duplicated pair', input: [welcome, u2, m2, u2, m2] },
  { name: 'Complex mixed', input: [welcome, u1, m1, u2, m2, u2, m2, m2] },
];

for (const t of tests) {
  const out = sanitizeHistory(t.input);
  console.log(`\n[Test] ${t.name}`);
  console.log('Input length:', t.input.length);
  console.log('Output length:', out.length);
  console.log('Output last 4:', out.slice(-4).map(m => `${m.role}:${m.parts[0].text}`));
}

console.log('\nAll dedupe simulations done.');

