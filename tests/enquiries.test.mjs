import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { test } from 'node:test';
const require = createRequire(import.meta.url);
const ts = require('typescript');
function load(path) {
  const source = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', source)(name => name === '../../../components/package-cards' ? load(resolve('src/components/package-cards.tsx')) : require(name), module, module.exports);
  return module.exports;
}
const { POST } = load(resolve('src/app/api/enquiries/route.ts'));
const date = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const valid = { name: 'Test visitor', email: 'visitor@example.com', date, guests: '80', location: 'Accra', package: 'Big celebration', notes: 'Outdoor event', website: '' };
function request(data = valid, origin = 'https://geeschills.com') {
  return new Request('https://geeschills.com/api/enquiries/', { method: 'POST', headers: { 'Content-Type': 'application/json', origin }, body: JSON.stringify(data) });
}
test('enquiry validation and mocked email delivery', async () => {
  const originalFetch = globalThis.fetch;
  const saved = Object.fromEntries(['RESEND_API_KEY','ENQUIRY_FROM_EMAIL','ENQUIRY_TO_EMAIL'].map(key => [key, process.env[key]]));
  let sends = 0;
  globalThis.fetch = async () => { sends++; throw new Error('Unexpected send'); };
  try {
    delete process.env.RESEND_API_KEY;
    delete process.env.ENQUIRY_FROM_EMAIL;
    assert.equal((await POST(request())).status, 503);
    process.env.RESEND_API_KEY = 'fake-test-key';
    process.env.ENQUIRY_FROM_EMAIL = 'GEES CHILLS <enquiries@geeschills.com>';
    delete process.env.ENQUIRY_TO_EMAIL;
    assert.equal((await POST(request(valid, 'https://unrelated.example'))).status, 403);
    for (const changes of [{email:'bad'}, {email:'bad\r\n@example.com'}, {guests:'0'}, {guests:'1.5'}, {package:'Unknown'}, {date:'2020-01-01'}, {date:'2099-02-30'}, {name:'  '}, {notes:'x'.repeat(1001)}, {website:'bot'}]) {
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
      return Response.json({ id:'mock-delivery-id' });
    };
    assert.deepEqual(await (await POST(request({...valid,to:'attacker@example.com'}))).json(), {success:true});
    globalThis.fetch = async () => Response.json({message:'Private provider detail'}, {status:403});
    const failure = await POST(request());
    assert.equal(failure.status, 502);
    assert.doesNotMatch(JSON.stringify(await failure.json()), /Private provider detail/);
    globalThis.fetch = async () => { throw new Error('Network error'); };
    assert.equal((await POST(request())).status, 502);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key,value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});
