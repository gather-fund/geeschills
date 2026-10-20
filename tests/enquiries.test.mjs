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
const { POST } = load(resolve('src/app/api/enquiries/route.ts'));
const date = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const valid = { name: 'Test visitor', email: 'visitor@example.com', date, guests: '80', location: 'Accra', eventType: 'Weddings', waiters: 'Yes', notes: 'Outdoor event\nNear the beach', website: '' };
let nextIp = 0;
// Each request gets its own client IP unless one is given, so the rate limiter only trips where a test intends it.
function request(data = valid, origin = 'https://geeschills.com', ip = `203.0.113.${++nextIp % 250}, 10.0.0.${nextIp}`) {
  return new Request('https://geeschills.com/api/enquiries/', { method: 'POST', headers: { 'Content-Type': 'application/json', origin, 'x-forwarded-for': ip }, body: JSON.stringify(data) });
}
test('enquiry validation and mocked email delivery', async () => {
  const originalFetch = globalThis.fetch;
  const saved = Object.fromEntries(['RESEND_API_KEY','ENQUIRY_FROM_EMAIL','ENQUIRY_TO_EMAIL','TURNSTILE_SECRET_KEY','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN'].map(key => [key, process.env[key]]));
  let sends = 0;
  globalThis.fetch = async () => { sends++; throw new Error('Unexpected send'); };
  try {
    for (const key of ['TURNSTILE_SECRET_KEY','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN']) delete process.env[key];
    delete process.env.RESEND_API_KEY;
    delete process.env.ENQUIRY_FROM_EMAIL;
    assert.equal((await POST(request())).status, 503);
    process.env.RESEND_API_KEY = 'fake-test-key';
    process.env.ENQUIRY_FROM_EMAIL = 'GEES CHILLS <enquiries@geeschills.com>';
    delete process.env.ENQUIRY_TO_EMAIL;
    assert.equal((await POST(request(valid, 'https://unrelated.example'))).status, 403);
    assert.equal((await POST(request(valid, 'null'))).status, 403, 'opaque origin');
    // Behind a proxy the request URL can name another host; the browser's Host header is what counts.
    const proxied = (origin, host) => new Request('http://localhost:3000/api/enquiries/', { method: 'POST', headers: { 'Content-Type': 'application/json', origin, host, 'x-forwarded-for': `192.0.2.${++nextIp % 250}` }, body: JSON.stringify({...valid, website:'bot'}) });
    // The honeypot answers 400, which shows the request got past the origin check without sending email.
    assert.equal((await POST(proxied('https://www.geeschills.com', 'www.geeschills.com'))).status, 400, 'same host passes the origin check');
    assert.equal((await POST(proxied('https://evil.example', 'www.geeschills.com'))).status, 403);
    for (const changes of [{email:'bad'}, {email:'bad\r\n@example.com'}, {guests:'0'}, {guests:'1.5'}, {guests:'1e3'}, {guests:'100001'}, {email:'ama@gmail'}, {eventType:''}, {eventType:'Big celebration'}, {waiters:''}, {waiters:'Maybe'}, {date:'2020-01-01'}, {date:'2099-02-30'}, {name:'  '}, {notes:'x'.repeat(1001)}, {website:'bot'}, {name:'Ama\nEmail: fake@example.com'}, {location:'Accra\u202e'}, {email:'ama\u200b@example.com'}, {notes:'ok\u0000'}]) {
      assert.equal((await POST(request({...valid,...changes}))).status, 400, JSON.stringify(changes));
    }
    assert.equal((await POST(new Request('https://geeschills.com/api/enquiries/', { method:'POST',headers:{'Content-Type':'application/json'},body:'{' }))).status, 400);
    assert.equal((await POST(request({...valid, notes:'x'.repeat(12001)}))).status, 413);
    assert.equal(sends, 0);
    globalThis.fetch = async (url, init) => {
      assert.equal(url, 'https://api.resend.com/emails');
      const payload = JSON.parse(init.body);
      assert.deepEqual(payload.to, ['gloriaamankrahyeboah97@gmail.com']);
      assert.equal(payload.reply_to, valid.email);
      assert.equal(payload.from, process.env.ENQUIRY_FROM_EMAIL);
      assert.match(payload.text, /Expected guests: 80/);
      assert.match(payload.text, /Event type: Weddings/);
      assert.equal(payload.subject, `GEES CHILLS enquiry — Weddings — ${date}`);
      assert.match(payload.text, /Waiters needed: Yes \(additional cost\)/);
      assert.match(payload.text, /Notes: Outdoor event\nNear the beach/);
      return Response.json({ id:'mock-delivery-id' });
    };
    assert.deepEqual(await (await POST(request({...valid,to:'attacker@example.com'}))).json(), {success:true});
    globalThis.fetch = async () => Response.json({message:'Private provider detail'}, {status:403});
    const failure = await POST(request());
    assert.equal(failure.status, 502);
    assert.doesNotMatch(JSON.stringify(await failure.json()), /Private provider detail/);
    globalThis.fetch = async () => { throw new Error('Network error'); };
    assert.equal((await POST(request())).status, 502);

    // Rate limit: the 11th request from one IP within the hour is refused before any other work.
    globalThis.fetch = async () => { sends++; throw new Error('Unexpected send'); };
    sends = 0;
    for (let i = 0; i < 10; i++) assert.equal((await POST(request({...valid, website:'bot'}, undefined, '198.51.100.7'))).status, 400);
    const limited = await POST(request(valid, undefined, '198.51.100.7'));
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get('retry-after')) > 0);
    assert.equal((await POST(request(valid, undefined, '198.51.100.8'))).status, 502, 'other IPs are unaffected');
    assert.equal(sends, 1);

    // Turnstile: once configured, a missing, rejected or unverifiable token never reaches the email provider.
    process.env.TURNSTILE_SECRET_KEY = 'fake-turnstile-secret';
    let verdict = { success: false };
    let verified;
    globalThis.fetch = async (url, init) => {
      if (url === 'https://challenges.cloudflare.com/turnstile/v0/siteverify') { verified = Object.fromEntries(init.body); return Response.json(verdict); }
      return Response.json({ id: 'mock-delivery-id' });
    };
    assert.equal((await POST(request())).status, 403, 'missing token');
    assert.equal((await POST(request({...valid, 'cf-turnstile-response':'bad-token'}))).status, 403, 'rejected token');
    assert.equal(verified.secret, 'fake-turnstile-secret');
    assert.equal(verified.response, 'bad-token');
    verdict = { success: true };
    assert.equal((await POST(request({...valid, 'cf-turnstile-response':'good-token'}, undefined, '198.51.100.9'))).status, 200);
    assert.equal(verified.remoteip, '198.51.100.9');
    globalThis.fetch = async () => { throw new Error('Cloudflare down'); };
    assert.equal((await POST(request({...valid, 'cf-turnstile-response':'good-token'}))).status, 503);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key,value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});
