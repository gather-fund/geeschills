import { hasSession, sameOrigin } from '../../../../lib/admin-auth';
import { addDays, invoiceNumberPattern, invoiceTotals, lineAmount, money, parseOrder } from '../../../../lib/invoice';
import { sheetRequest } from '../../../../lib/sheets';

export const runtime = 'nodejs';

const fail = (error: string, status: number) => Response.json({ error }, { status });
const statuses = ['Quote', 'Confirmed', 'Paid'];
const text = (value: unknown, max = 200) => typeof value === 'string' ? value.slice(0, max) : String(value ?? '').slice(0, max);

// GET lists the register, or returns one invoice with ?number=GC-2026-0001.
export async function GET(request: Request) {
  // Checked here as well as in proxy.ts, so the register stays protected even if the matcher changes.
  if (!hasSession(request)) return fail('Your sign-in has expired. Please sign in again.', 401);
  const number = new URL(request.url).searchParams.get('number');
  if (number !== null) {
    if (!invoiceNumberPattern.test(number)) return fail('Please check the invoice number.', 400);
    const result = await sheetRequest({ action: 'get', number });
    if (!result.ok) return fail(result.error, result.status);
    // The sheet can be edited by hand, so its copy goes through the same checks as a new invoice.
    const parsed = parseOrder(result.data.invoice);
    if ('error' in parsed) return fail(`The saved copy of ${number} could not be read (${parsed.error})`, 502);
    const status = statuses.includes(String(result.data.status)) ? String(result.data.status) : 'Quote';
    return Response.json({ invoice: { ...parsed.invoice, number }, status });
  }
  const result = await sheetRequest({ action: 'list' });
  if (!result.ok) return fail(result.error, result.status);
  const rows = Array.isArray(result.data.invoices) ? result.data.invoices as Record<string, unknown>[] : [];
  const invoices = rows.filter(row => invoiceNumberPattern.test(text(row.number))).map(row => ({
    number: text(row.number), status: statuses.includes(text(row.status)) ? text(row.status) : 'Quote',
    invoiceDate: text(row.invoiceDate, 20), client: text(row.client), eventDate: text(row.eventDate, 20), total: text(row.total, 20), updatedAt: text(row.updatedAt, 40),
  }));
  return Response.json({ invoices });
}

// POST saves an invoice (issuing its number the first time), confirms it, or marks it paid.
export async function POST(request: Request) {
  if (!hasSession(request)) return fail('Your sign-in has expired. Please sign in again.', 401);
  // The session cookie is sent automatically, so refuse requests started by other sites.
  if (!sameOrigin(request)) return fail('Please use the invoice page.', 403);
  let body: { action?: unknown; invoice?: unknown; number?: unknown };
  try { body = await request.json(); } catch { return fail('Invalid request.', 400); }

  if (body.action === 'paid') {
    if (typeof body.number !== 'string' || !invoiceNumberPattern.test(body.number)) return fail('Save the invoice before marking it paid.', 400);
    const result = await sheetRequest({ action: 'paid', number: body.number });
    if (!result.ok) return fail(result.error, result.status);
    return Response.json({ success: true, number: body.number, status: 'Paid', row: result.data.row });
  }
  if (body.action !== 'save' && body.action !== 'confirm') return fail('Unknown action.', 400);

  const parsed = parseOrder(body.invoice);
  if ('error' in parsed) return fail(parsed.error, 400);
  const { invoice } = parsed;
  // Totals are recalculated here, whatever the browser sent.
  const totals = invoiceTotals(invoice);
  const order = {
    invoice, validUntil: addDays(invoice.date, Number(invoice.validDays) || 0), guests: invoice.guests ? Number(invoice.guests) : '',
    items: invoice.items.map(item => `${item.qty ? `${item.qty} × ` : ''}${item.description} @ ${money(Number(item.price))} = ${money(lineAmount(item))}`).join('\n'),
    subtotal: totals.subtotal, total: totals.total, depositPercent: totals.depositPercent, deposit: totals.deposit, balance: totals.balance,
  };
  const result = await sheetRequest({ action: body.action, order });
  if (!result.ok) return fail(result.error, result.status);
  const number = text(result.data.number);
  if (!invoiceNumberPattern.test(number)) return fail('The Google Sheet returned an unexpected invoice number. Check the script is up to date.', 502);
  return Response.json({ success: true, number, status: statuses.includes(text(result.data.status)) ? text(result.data.status) : 'Quote', row: result.data.row });
}
