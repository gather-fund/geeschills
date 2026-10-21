import { eventTypes } from './enquiry-options';

// Shared by the invoice page and /api/admin/orders: the server recalculates every amount itself.
export type InvoiceItem = { qty: string; description: string; price: string };
export type Invoice = {
  number: string; date: string;
  clientName: string; clientPhone: string; clientEmail: string;
  eventType: string; eventDate: string; venue: string; guests: string;
  items: InvoiceItem[];
  depositPercent: string; validDays: string; notes: string;
};

// Lines from a typical event quote. Pack sizes live in the description, so QTY always means
// "how many of this line" (cartons, packs, people) and the price is per one of them.
export const standardItems: InvoiceItem[] = [
  'Water bottles (pack of 15)', 'Malt (carton of 24)', 'Soft drinks (carton of 24)', 'Fruit juice (carton of 24)',
  'Soda / tonic water (pack of 12)', 'Chillers', 'Ice blocks for chilling', 'Waiters', 'Disposable cups (pack of 50)',
  'Transport', 'Service fee',
].map(description => ({ qty: '', description, price: '' }));

const round = (value: number) => Math.round(value * 100) / 100;
const number = (value: string) => { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; };

// A line with no quantity is a flat charge (transport, fees): its price is the amount.
export const lineAmount = (item: InvoiceItem) => round(number(item.price) * (item.qty.trim() === '' ? 1 : number(item.qty)));

export function invoiceTotals(invoice: Pick<Invoice, 'items' | 'depositPercent'>) {
  const subtotal = round(invoice.items.reduce((sum, item) => sum + lineAmount(item), 0));
  const depositPercent = Math.min(100, Math.max(0, number(invoice.depositPercent)));
  const deposit = round(subtotal * depositPercent / 100);
  return { subtotal, total: subtotal, depositPercent, deposit, balance: round(subtotal - deposit) };
}

export const money = (value: number) => value.toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export const addDays = (isoDate: string, days: number) => {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

// Displays YYYY-MM-DD as DD/MM/YYYY, the format Ghanaian invoices use.
export const displayDate = (isoDate: string) => /^\d{4}-\d{2}-\d{2}$/.test(isoDate) ? isoDate.split('-').reverse().join('/') : isoDate;

// Numbers are issued by the Google Sheet register, in sequence; a new invoice has none until saved.
export const invoiceNumberPattern = /^GC-\d{4}-\d{4,6}$/;

export function blankInvoice(now = new Date()): Invoice {
  return {
    number: '', date: now.toISOString().slice(0, 10),
    clientName: '', clientPhone: '', clientEmail: '', eventType: '', eventDate: '', venue: '', guests: '',
    items: standardItems.map(item => ({ ...item })), depositPercent: '70', validDays: '14', notes: '',
  };
}

const isoDate = /^\d{4}-\d{2}-\d{2}$/;
const decimal = /^\d+(\.\d{1,2})?$/;

// Checks an order before it is written to the Google Sheet. Returns a message or the cleaned order.
export function parseOrder(input: unknown): { error: string } | { invoice: Invoice } {
  if (!input || typeof input !== 'object') return { error: 'Invalid order.' };
  const raw = input as Record<string, unknown>;
  const text = (name: keyof Invoice, max = 200) => typeof raw[name] === 'string' ? (raw[name] as string).trim().slice(0, max) : '';
  const invoice: Invoice = {
    number: text('number', 40), date: text('date', 10),
    clientName: text('clientName'), clientPhone: text('clientPhone', 40), clientEmail: text('clientEmail', 254),
    eventType: text('eventType', 40), eventDate: text('eventDate', 10), venue: text('venue'), guests: text('guests', 7),
    items: [], depositPercent: text('depositPercent', 3), validDays: text('validDays', 3), notes: text('notes', 1000),
  };
  if (invoice.number && !invoiceNumberPattern.test(invoice.number)) return { error: 'Please check the invoice number.' };
  if (!isoDate.test(invoice.date)) return { error: 'Please check the invoice date.' };
  if (!invoice.clientName) return { error: 'Please add the client’s name before confirming.' };
  if (!isoDate.test(invoice.eventDate)) return { error: 'Please add the event date before confirming.' };
  if (invoice.eventType && !eventTypes.some(type => type === invoice.eventType)) return { error: 'Please choose a listed event type.' };
  if (invoice.guests && !/^\d{1,6}$/.test(invoice.guests)) return { error: 'Please check the number of guests.' };
  if (!/^\d{1,3}$/.test(invoice.depositPercent) || Number(invoice.depositPercent) > 100) return { error: 'Please check the deposit percentage.' };
  if (!Array.isArray(raw.items) || raw.items.length > 40) return { error: 'Please check the invoice lines.' };
  for (const entry of raw.items as unknown[]) {
    const line = (entry ?? {}) as Record<string, unknown>;
    const item = {
      qty: typeof line.qty === 'string' ? line.qty.trim() : '',
      description: typeof line.description === 'string' ? line.description.trim().slice(0, 120) : '',
      price: typeof line.price === 'string' ? line.price.trim() : '',
    };
    if (!item.price) continue; // unpriced lines (e.g. unused standard items) are left off the invoice
    if (!item.description) return { error: 'Every priced line needs a description.' };
    if ((item.qty && !decimal.test(item.qty)) || Number(item.qty) > 1e6) return { error: `Please check the quantity for “${item.description}”.` };
    if (!decimal.test(item.price) || Number(item.price) > 1e8) return { error: `Please check the price for “${item.description}”.` };
    invoice.items.push(item);
  }
  if (!invoice.items.length) return { error: 'Add at least one priced line before confirming.' };
  return { invoice };
}
