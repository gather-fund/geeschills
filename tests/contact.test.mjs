import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const envKeys = ['NEXT_PUBLIC_WHATSAPP_NUMBER', 'NEXT_PUBLIC_CALL_NUMBER'];

// contact.ts reads the environment when it loads, so each scenario imports a fresh copy.
let loads = 0;
async function loadContact(env = {}) {
  const saved = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
  for (const key of envKeys) env[key] === undefined ? delete process.env[key] : process.env[key] = env[key];
  try {
    return await import(`../src/lib/contact.ts?load=${++loads}`);
  } finally {
    for (const key of envKeys) saved[key] === undefined ? delete process.env[key] : process.env[key] = saved[key];
  }
}

test('numbers fall back to the GEES CHILLS defaults when the variables are unset or blank', async () => {
  for (const env of [{}, { NEXT_PUBLIC_WHATSAPP_NUMBER: '  ', NEXT_PUBLIC_CALL_NUMBER: '' }]) {
    const { contactNumbers } = await loadContact(env);
    assert.deepEqual(contactNumbers.whatsapp, { digits: '233277946635', e164: '+233277946635', display: '+233 27 794 6635' });
    assert.deepEqual(contactNumbers.call, { digits: '233202262120', e164: '+233202262120', display: '+233 20 226 2120' });
  }
});

test('numbers come from the environment, ignoring spaces, dashes, brackets and +', async () => {
  const { contactNumbers, whatsappUrl } = await loadContact({ NEXT_PUBLIC_WHATSAPP_NUMBER: '+233 (24) 000-1111', NEXT_PUBLIC_CALL_NUMBER: '447700900123' });
  assert.equal(contactNumbers.whatsapp.display, '+233 24 000 1111');
  assert.equal(contactNumbers.call.e164, '+447700900123');
  assert.equal(contactNumbers.call.display, '+447700900123', 'non-Ghana numbers are not regrouped');
  assert.equal(whatsappUrl(), 'https://wa.me/233240001111');
  assert.equal(whatsappUrl('Hi & hello?'), 'https://wa.me/233240001111?text=Hi%20%26%20hello%3F');
});

test('an invalid number fails loudly and names the variable', async () => {
  for (const bad of ['0277946635', 'call me', '233-27-794', '1234567890123456']) {
    await assert.rejects(loadContact({ NEXT_PUBLIC_CALL_NUMBER: bad }), { message: /NEXT_PUBLIC_CALL_NUMBER must be an international phone number/ });
  }
  await assert.rejects(loadContact({ NEXT_PUBLIC_WHATSAPP_NUMBER: '0277946635' }), { message: /NEXT_PUBLIC_WHATSAPP_NUMBER.*"0277946635"/ });
});

test('formatPhoneNumber only groups complete Ghana numbers', async () => {
  const { formatPhoneNumber } = await loadContact();
  assert.equal(formatPhoneNumber('233202262120'), '+233 20 226 2120');
  assert.equal(formatPhoneNumber('23320226212'), '+23320226212');
});

function sourceFiles(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : /\.(tsx?|css)$/.test(path) ? [path] : [];
  });
}

test('phone numbers are only hardcoded in src/lib/contact.ts', () => {
  for (const path of sourceFiles('src').filter(path => path !== join('src', 'lib', 'contact.ts'))) {
    const source = readFileSync(path, 'utf8');
    // International forms only: the Vodafone Cash line in business.ts is a payment detail, not a contact number.
    assert.doesNotMatch(source, /\+233[\d ]{9,}|233277946635|233202262120|wa\.me\//, `${path} hardcodes a contact number`);
  }
});
