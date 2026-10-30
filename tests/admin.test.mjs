import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
const require = createRequire(import.meta.url);
const ts = require('typescript');
function load(path) {
  const source = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', source)(name => name.startsWith('.') ? load(['.ts', '.tsx'].map(ext => resolve(dirname(path), name + ext)).find(existsSync)) : require(name), module, module.exports);
  return module.exports;
}
const invoicesApi = load(resolve('src/app/api/admin/invoices/route.ts'));
const login = load(resolve('src/app/api/admin/login/route.ts'));
const { hasSession, safeNext, sessionCookieHeader } = load(resolve('src/lib/admin-auth.ts'));
const { invoiceTotals, parseOrder } = load(resolve('src/lib/invoice.ts'));

const password = 'correct-horse-battery';
let nextIp = 0;
const site = 'https://www.geeschills.com';
const headers = (extra = {}) => ({ 'Content-Type': 'application/json', origin: site, host: 'www.geeschills.com', 'x-forwarded-for': `198.18.0.${++nextIp % 250}`, ...extra });
const signIn = (body, extra) => login.POST(new Request(`${site}/api/admin/login/`, { method: 'POST', headers: headers(extra), body: JSON.stringify(body) }));
const sessionFrom = response => response.headers.get('set-cookie').split(';')[0];
const withCookie = cookie => new Request(`${site}/admin/invoice/`, { headers: { cookie } });
const invoice = {
  number: '', date: '2026-11-07', clientName: '=HYPERLINK("http://evil")', clientPhone: '+233 24 000 0000', clientEmail: 'patricia@example.com',
  eventType: 'Weddings', eventDate: '2026-12-12', venue: 'Accra', guests: '600', depositPercent: '70', validDays: '14', notes: '',
  items: [
    { qty: '120', description: 'Water bottles (pack of 15)', price: '28' },
    { qty: '14', description: 'Waiters', price: '350' },
    { qty: '', description: 'Transport', price: '2400' },
    { qty: '', description: 'Malt (carton of 24)', price: '' },
  ],
};
let session;
const post = (body, { cookie = session, origin = site } = {}) => invoicesApi.POST(new Request(`${site}/api/admin/invoices/`, { method: 'POST', headers: headers({ origin, cookie }), body: JSON.stringify(body) }));
const get = (query = '', cookie = session) => invoicesApi.GET(new Request(`${site}/api/admin/invoices/${query}`, { headers: headers({ cookie }) }));

const envKeys = ['ADMIN_PASSWORD', 'SHEETS_WEBHOOK_URL', 'SHEETS_WEBHOOK_SECRET', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'];
async function withEnv(values, run) {
  const saved = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  for (const key of envKeys) delete process.env[key];
  Object.assign(process.env, values);
  try { await run(); } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
}

test('admin sign-in and sessions', () => withEnv({}, async () => {
  assert.equal((await signIn({ password })).status, 503, 'no password configured');
  process.env.ADMIN_PASSWORD = 'short';
  assert.equal((await signIn({ password: 'short' })).status, 503, 'weak password refused');
  process.env.ADMIN_PASSWORD = password;
  assert.equal((await signIn({ password }, { origin: 'https://evil.example' })).status, 403, 'cross-site sign-in');
  assert.equal((await signIn({ password: 'wrong-password' })).status, 401);
  const ok = await signIn({ password, next: '/admin/invoice/' });
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { success: true, next: '/admin/invoice/' });
  const cookie = ok.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /; Secure/, 'secure over https');
  assert.equal(hasSession(withCookie(sessionFrom(ok))), true);
  assert.equal(hasSession(withCookie('gc_admin=9999999999999.forged')), false, 'forged signature');
  const expired = sessionCookieHeader(new Request(`${site}/`), Date.now() - 13 * 60 * 60 * 1000).split(';')[0];
  assert.equal(hasSession(withCookie(expired)), false, 'expired after 12 hours');
  process.env.ADMIN_PASSWORD = 'a-different-password';
  assert.equal(hasSession(withCookie(sessionFrom(ok))), false, 'changing the password signs everyone out');
  process.env.ADMIN_PASSWORD = password;
  // Only admin paths are allowed as the post-sign-in destination.
  for (const next of ['https://evil.example', '//evil.example', '/admin/login/', '/../x', undefined]) assert.equal(safeNext(next), '/admin/invoice/', String(next));
  // 20 failures from one IP lock it out, even for the right password, until the hour resets.
  for (let i = 0; i < 20; i++) assert.equal((await signIn({ password: `guess-${i}` }, { 'x-forwarded-for': '198.18.9.9' })).status, 401);
  assert.equal((await signIn({ password }, { 'x-forwarded-for': '198.18.9.9' })).status, 429);
  assert.equal((await signIn({ password }, { 'x-forwarded-for': '198.18.9.10' })).status, 200, 'other IPs unaffected');
  const out = await login.DELETE(new Request(`${site}/api/admin/login/`, { method: 'DELETE', headers: headers() }));
  assert.match(out.headers.get('set-cookie'), /^gc_admin=; .*Max-Age=0/);
}));

test('order validation and totals', () => {
  const parsed = parseOrder(invoice);
  assert.ok('invoice' in parsed, 'a new invoice has no number yet');
  assert.ok('invoice' in parseOrder({ ...invoice, number: 'GC-2026-0042' }), 'register numbers are accepted');
  assert.equal(parsed.invoice.items.length, 3, 'unpriced lines are dropped');
  assert.deepEqual(invoiceTotals(parsed.invoice), { subtotal: 10660, total: 10660, depositPercent: 70, deposit: 7462, balance: 3198 });
  for (const changes of [{ clientName: '' }, { eventDate: '' }, { eventDate: '2026-11-06' }, { number: 'bad number!' }, { number: 'GC-261107-042' }, { eventType: 'Picnic' }, { depositPercent: '120' }, { items: [] },
    { items: [{ qty: 'x', description: 'Chillers', price: '200' }] }, { items: [{ qty: '1', description: '', price: '200' }] }, { items: [{ qty: '1', description: 'Chillers', price: '-5' }] }]) {
    assert.ok('error' in parseOrder({ ...invoice, ...changes }), JSON.stringify(changes));
  }
});

test('invoice register in the Google Sheet', () => withEnv({ ADMIN_PASSWORD: password }, async () => {
  let sent = 0;
  session = sessionFrom(await signIn({ password }));
  globalThis.fetch = async () => { sent++; throw new Error('Unexpected request'); };
  assert.equal((await post({ action: 'save', invoice }, { cookie: '' })).status, 401, 'route checks the session itself');
  assert.equal((await get('', '')).status, 401);
  assert.equal((await post({ action: 'save', invoice }, { origin: 'https://evil.example' })).status, 403, 'cross-site request');
  assert.equal((await post({ action: 'archive', invoice })).status, 400, 'unknown action');
  assert.equal((await post({ action: 'delete', number: '../x' })).status, 400, 'deleting needs a valid number');
  assert.equal((await post({ action: 'delete', number: 'GC-2026-0001' }, { origin: 'https://evil.example' })).status, 403, 'cross-site delete');
  assert.equal((await post({ action: 'save', invoice: { ...invoice, clientName: '' } })).status, 400);
  assert.equal((await post({ action: 'paid', number: '' })).status, 400, 'unsaved invoices cannot be paid');
  assert.equal((await get('?number=../x')).status, 400);
  assert.equal((await post({ action: 'save', invoice })).status, 503, 'sheet not connected');
  process.env.SHEETS_WEBHOOK_SECRET = 'sheet-secret';
  process.env.SHEETS_WEBHOOK_URL = 'https://example.com/collect';
  assert.equal((await post({ action: 'save', invoice })).status, 503, 'only Apps Script URLs are used');
  assert.equal(sent, 0);

  process.env.SHEETS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfy-test_123/exec';
  let payload, reply;
  globalThis.fetch = async (url, init) => { assert.equal(url, process.env.SHEETS_WEBHOOK_URL); payload = JSON.parse(init.body); return Response.json(reply); };

  // First save: the sheet issues the number.
  reply = { ok: true, number: 'GC-2026-0001', status: 'Quote', row: 2 };
  assert.deepEqual(await (await post({ action: 'save', invoice: { ...invoice, total: 1 } })).json(), { success: true, number: 'GC-2026-0001', status: 'Quote', row: 2 });
  assert.equal(payload.secret, 'sheet-secret');
  assert.equal(payload.action, 'save');
  assert.equal(payload.order.invoice.number, '');
  // Totals are recalculated on the server, whatever the browser claims.
  assert.equal(payload.order.total, 10660);
  assert.equal(payload.order.deposit, 7462);
  assert.equal(payload.order.validUntil, '2026-11-21');
  assert.match(payload.order.items, /^120 × Water bottles \(pack of 15\) @ 28 = 3,360\n14 × Waiters @ 350 = 4,900\nTransport @ 2,400 = 2,400$/);

  reply = { ok: true, number: 'GC-2026-0001', status: 'Confirmed', row: 2 };
  assert.equal((await (await post({ action: 'confirm', invoice: { ...invoice, number: 'GC-2026-0001' } })).json()).status, 'Confirmed');
  assert.equal(payload.action, 'confirm');
  assert.equal(payload.order.invoice.number, 'GC-2026-0001');

  reply = { ok: true, number: 'GC-2026-0001', status: 'Paid', row: 2 };
  assert.equal((await (await post({ action: 'paid', number: 'GC-2026-0001' })).json()).status, 'Paid');
  assert.deepEqual({ action: payload.action, number: payload.number }, { action: 'paid', number: 'GC-2026-0001' });

  reply = { ok: false, error: 'not confirmed' };
  assert.equal((await post({ action: 'paid', number: 'GC-2026-0002' })).status, 409);
  reply = { ok: true, number: 'INV-1', status: 'Quote' };
  const old = await post({ action: 'save', invoice });
  assert.equal(old.status, 424, 'unexpected numbers from the sheet are refused');
  assert.match((await old.json()).error, /older version of the script/);

  reply = { ok: true, number: 'GC-2026-0001' };
  assert.deepEqual(await (await post({ action: 'delete', number: 'GC-2026-0001' })).json(), { success: true, number: 'GC-2026-0001' });
  assert.deepEqual({ action: payload.action, number: payload.number }, { action: 'delete', number: 'GC-2026-0001' });
  reply = { ok: false, error: 'unknown invoice' };
  assert.equal((await post({ action: 'delete', number: 'GC-2026-0999' })).status, 404);

  // Listing and reopening.
  reply = { ok: true, invoices: [{ number: 'GC-2026-0001', status: 'Paid', client: 'Patricia', total: '10,660' }, { number: 'junk', status: 'Quote' }] };
  const listed = await (await get()).json();
  assert.equal(payload.action, 'list');
  assert.deepEqual(listed.invoices.map(row => [row.number, row.status]), [['GC-2026-0001', 'Paid']]);
  reply = { ok: true, status: 'Confirmed', invoice: { ...invoice, number: 'GC-2026-0001' } };
  const opened = await (await get('?number=GC-2026-0001')).json();
  assert.deepEqual({ action: payload.action, number: payload.number }, { action: 'get', number: 'GC-2026-0001' });
  assert.equal(opened.invoice.number, 'GC-2026-0001');
  assert.equal(opened.status, 'Confirmed');
  assert.equal(opened.invoice.items.length, 3);
  // A hand-edited sheet row that no longer passes validation is reported, not loaded.
  reply = { ok: true, status: 'Quote', invoice: { ...invoice, items: 'broken' } };
  assert.equal((await get('?number=GC-2026-0001')).status, 424);
  reply = { ok: false, error: 'unknown invoice' };
  assert.equal((await get('?number=GC-2026-0999')).status, 404);

  reply = { ok: false, error: 'unauthorized' };
  const rejected = await post({ action: 'save', invoice });
  assert.equal(rejected.status, 424);
  assert.match((await rejected.json()).error, /SHEETS_WEBHOOK_SECRET/);
  // Each way the Apps Script deployment can be misconfigured gets its own explanation.
  const message = async () => { const response = await post({ action: 'save', invoice }); assert.equal(response.status, 424); return (await response.json()).error; };
  globalThis.fetch = async () => new Response('<!DOCTYPE html><title>Sign in</title>', { status: 200, headers: { 'Content-Type': 'text/html' } });
  assert.match(await message(), /sign-in page.*“Anyone” \(not “Anyone with Google account”/);
  globalThis.fetch = async () => new Response('<html>Unauthorized</html>', { status: 401 });
  assert.match(await message(), /HTTP 401\). .*“Anyone”/);
  globalThis.fetch = async () => new Response('<html>Not found</html>', { status: 404 });
  assert.match(await message(), /HTTP 404/);
  globalThis.fetch = async () => Response.json({ ok: false, error: 'unknown action' });
  assert.match(await message(), /older version of the script/);
  globalThis.fetch = async () => Response.json({ ok: false, error: 'invalid request' });
  assert.match(await message(), /Executions/);
  globalThis.fetch = async () => { throw new Error('offline'); };
  assert.match(await message(), /Could not reach/);
}));

test('validity line and payment details are saved per invoice', () => {
  const { business } = load(resolve('src/lib/business.ts'));
  const { standardTerms } = load(resolve('src/lib/invoice.ts'));
  // Invoices saved before these fields existed keep printing the standard payment details.
  assert.equal(parseOrder(invoice).invoice.paymentDetails, business.paymentDetails);
  assert.equal(parseOrder(invoice).invoice.terms, '');
  const edited = parseOrder({ ...invoice, terms: '  Prices valid for 7 days.\nNo refunds after the event.  ', paymentDetails: 'MTN MoMo 024 000 0000' }).invoice;
  assert.equal(edited.terms, 'Prices valid for 7 days.\nNo refunds after the event.');
  assert.equal(edited.paymentDetails, 'MTN MoMo 024 000 0000');
  assert.equal(parseOrder({ ...invoice, paymentDetails: '' }).invoice.paymentDetails, '', 'payment line can be left off');
  assert.equal(parseOrder({ ...invoice, terms: 'x'.repeat(900) }).invoice.terms.length, 500);
  assert.deepEqual(standardTerms({ date: '2026-11-07', validDays: '14', depositPercent: '70' }),
    { valid: 'Prices valid until 21/11/2026.', booking: 'Your booking is confirmed once the 70% deposit is received.' });
  assert.equal(standardTerms({ date: '2026-11-07', validDays: '14', depositPercent: '0' }).booking, 'Your booking is confirmed once payment is received.');
});
