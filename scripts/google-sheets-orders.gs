/**
 * GEES CHILLS invoice register: receives invoices from the website's admin page.
 * Paste into the Google Sheet via Extensions → Apps Script, then follow ADMIN_SETUP.md.
 * Set the Script Property WEBHOOK_SECRET to the same value as SHEETS_WEBHOOK_SECRET on Vercel.
 *
 * "Invoices" lists every saved invoice (Quote → Confirmed → Paid) and is where invoice numbers
 * are issued, strictly in sequence. "Confirmed orders" lists confirmed and paid orders with their items.
 */
const INVOICES = 'Invoices';
const ORDERS = 'Confirmed orders';
const INVOICE_HEADERS = [
  'Invoice no.', 'Status', 'Issued at', 'Updated at', 'Invoice date', 'Valid until', 'Client', 'Phone', 'Email',
  'Event type', 'Event date', 'Venue', 'Guests', 'Total (GH₵)', 'Deposit (GH₵)', 'Balance (GH₵)', 'Confirmed at', 'Paid at', 'Data',
];
const ORDER_HEADERS = [
  'Confirmed at', 'Invoice no.', 'Status', 'Invoice date', 'Client', 'Phone', 'Email', 'Event type', 'Event date',
  'Venue', 'Guests', 'Items', 'Subtotal (GH₵)', 'Total (GH₵)', 'Deposit %', 'Deposit (GH₵)', 'Balance (GH₵)', 'Notes',
];
// Kept as plain text so Sheets does not reformat numbers, dates and phone numbers.
const INVOICE_TEXT_COLUMNS = ['Invoice no.', 'Invoice date', 'Valid until', 'Phone', 'Event date'];
const ORDER_TEXT_COLUMNS = ['Invoice no.', 'Invoice date', 'Phone', 'Event date'];
const col = (headers, name) => headers.indexOf(name);

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000); // one request at a time, so numbers are never issued twice
  try {
    const body = JSON.parse(e.postData.contents);
    const secret = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');
    if (!secret || body.secret !== secret) return reply({ ok: false, error: 'unauthorized' });
    switch (body.action) {
      case 'save': return reply(save(body.order, false));
      case 'confirm': return reply(save(body.order, true));
      case 'paid': return reply(markPaid(String(body.number)));
      case 'list': return reply(list());
      case 'get': return reply(getOne(String(body.number)));
      default: return reply({ ok: false, error: 'unknown action' });
    }
  } catch (error) {
    return reply({ ok: false, error: 'invalid request' });
  } finally {
    lock.releaseLock();
  }
}

function save(o, confirming) {
  const sheet = tab(INVOICES, INVOICE_HEADERS, INVOICE_TEXT_COLUMNS);
  const now = new Date();
  let number = o.invoice.number;
  let rowIndex = -1;
  if (number) {
    rowIndex = findRow(sheet, number);
    if (rowIndex < 0) return { ok: false, error: 'unknown invoice' }; // numbers only ever come from this register
  } else {
    number = nextNumber(now);
  }
  const existing = rowIndex > 0 ? sheet.getRange(rowIndex, 1, 1, INVOICE_HEADERS.length).getValues()[0] : null;
  const was = existing ? existing[col(INVOICE_HEADERS, 'Status')] : 'Quote';
  const status = was === 'Paid' ? 'Paid' : confirming || was === 'Confirmed' ? 'Confirmed' : 'Quote';
  const confirmedAt = existing && existing[col(INVOICE_HEADERS, 'Confirmed at')] || (status !== 'Quote' ? now : '');
  const invoice = Object.assign({}, o.invoice, { number: number });
  const row = [
    number, status, existing ? existing[col(INVOICE_HEADERS, 'Issued at')] : now, now, o.invoice.date, o.validUntil,
    o.invoice.clientName, o.invoice.clientPhone, o.invoice.clientEmail, o.invoice.eventType, o.invoice.eventDate, o.invoice.venue,
    o.guests, o.total, o.deposit, o.balance, confirmedAt, existing ? existing[col(INVOICE_HEADERS, 'Paid at')] : '', JSON.stringify(invoice),
  ].map(safe);
  if (rowIndex > 0) sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
  else { sheet.appendRow(row); rowIndex = sheet.getLastRow(); }
  if (status !== 'Quote') syncOrder(o, number, status, confirmedAt);
  return { ok: true, number: number, status: status, row: rowIndex };
}

function markPaid(number) {
  const sheet = tab(INVOICES, INVOICE_HEADERS, INVOICE_TEXT_COLUMNS);
  const rowIndex = findRow(sheet, number);
  if (rowIndex < 0) return { ok: false, error: 'unknown invoice' };
  const now = new Date();
  const statusCell = sheet.getRange(rowIndex, col(INVOICE_HEADERS, 'Status') + 1);
  if (statusCell.getValue() === 'Quote') return { ok: false, error: 'not confirmed' };
  statusCell.setValue('Paid');
  sheet.getRange(rowIndex, col(INVOICE_HEADERS, 'Updated at') + 1).setValue(now);
  sheet.getRange(rowIndex, col(INVOICE_HEADERS, 'Paid at') + 1).setValue(now);
  const orders = tab(ORDERS, ORDER_HEADERS, ORDER_TEXT_COLUMNS);
  const orderRow = findRow(orders, number, col(ORDER_HEADERS, 'Invoice no.') + 1);
  if (orderRow > 0) orders.getRange(orderRow, col(ORDER_HEADERS, 'Status') + 1).setValue('Paid');
  return { ok: true, number: number, status: 'Paid', row: rowIndex };
}

function list() {
  const sheet = tab(INVOICES, INVOICE_HEADERS, INVOICE_TEXT_COLUMNS);
  const last = sheet.getLastRow();
  if (last < 2) return { ok: true, invoices: [] };
  const rows = sheet.getRange(2, 1, last - 1, INVOICE_HEADERS.length).getDisplayValues();
  const pick = (r, name) => r[col(INVOICE_HEADERS, name)];
  const invoices = rows.reverse().slice(0, 300).map(r => ({
    number: pick(r, 'Invoice no.'), status: pick(r, 'Status'), invoiceDate: pick(r, 'Invoice date'), client: pick(r, 'Client'),
    eventDate: pick(r, 'Event date'), total: pick(r, 'Total (GH₵)'), updatedAt: pick(r, 'Updated at'),
  }));
  return { ok: true, invoices: invoices };
}

function getOne(number) {
  const sheet = tab(INVOICES, INVOICE_HEADERS, INVOICE_TEXT_COLUMNS);
  const rowIndex = findRow(sheet, number);
  if (rowIndex < 0) return { ok: false, error: 'unknown invoice' };
  const r = sheet.getRange(rowIndex, 1, 1, INVOICE_HEADERS.length).getValues()[0];
  return { ok: true, status: r[col(INVOICE_HEADERS, 'Status')], invoice: JSON.parse(r[col(INVOICE_HEADERS, 'Data')]) };
}

function syncOrder(o, number, status, confirmedAt) {
  const sheet = tab(ORDERS, ORDER_HEADERS, ORDER_TEXT_COLUMNS);
  const i = o.invoice;
  const row = [
    confirmedAt, number, status, i.date, i.clientName, i.clientPhone, i.clientEmail, i.eventType, i.eventDate,
    i.venue, o.guests, o.items, o.subtotal, o.total, o.depositPercent, o.deposit, o.balance, i.notes,
  ].map(safe);
  const rowIndex = findRow(sheet, number, col(ORDER_HEADERS, 'Invoice no.') + 1);
  if (rowIndex > 0) sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
  else sheet.appendRow(row);
}

// Sequential per year: GC-2026-0001, GC-2026-0002, … The counter lives in Script Properties.
function nextNumber(now) {
  const year = now.getFullYear();
  const props = PropertiesService.getScriptProperties();
  const key = 'NEXT_INVOICE_' + year;
  const next = Number(props.getProperty(key) || '1');
  props.setProperty(key, String(next + 1));
  return 'GC-' + year + '-' + String(next).padStart(4, '0');
}

function findRow(sheet, number, column) {
  const last = sheet.getLastRow();
  if (last < 2) return -1;
  const values = sheet.getRange(2, column || 1, last - 1, 1).getDisplayValues().map(r => r[0]);
  const index = values.indexOf(number);
  return index < 0 ? -1 : index + 2;
}

function tab(name, headers, textColumns) {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = book.getSheetByName(name);
  if (!sheet) {
    sheet = book.insertSheet(name);
    textColumns.forEach(h => sheet.getRange(1, headers.indexOf(h) + 1, sheet.getMaxRows(), 1).setNumberFormat('@'));
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sheet;
}

// Text starting with = + - @ would otherwise run as a formula; a leading apostrophe keeps it as text.
function safe(value) {
  return typeof value === 'string' && /^[=+\-@]/.test(value) ? "'" + value : value;
}

function reply(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
