'use client';
import { useEffect, useState, type ChangeEvent } from 'react';
import { eventTypes } from '../lib/enquiry-options';
import { missingBusinessDetails } from '../lib/business';
import { blankInvoice, displayDate, invoiceNumberPattern, invoiceTotals, money, type Invoice, type InvoiceItem } from '../lib/invoice';
import InvoiceDocument from './invoice-document';

type InvoiceStatus = 'Quote' | 'Confirmed' | 'Paid';
type Draft = Invoice & { status?: InvoiceStatus };
type Notice = { tone: 'ok' | 'error' | 'info'; text: string };
type Listed = { number: string; status: InvoiceStatus; invoiceDate: string; client: string; eventDate: string; total: string; updatedAt: string };
type Busy = '' | 'save' | 'print' | 'confirm' | 'paid' | 'list' | 'open';
const draftKey = 'gees-chills-invoice-draft';

class SignedOut extends Error {}

// Every request to the register goes through here, so an expired sign-in is reported the same way.
async function api(path: string, init?: RequestInit) {
  const response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(30000) });
  const result = await response.json().catch(() => ({}));
  if (response.status === 401) throw new SignedOut();
  if (!response.ok) throw new Error(result.error || `The server answered with an error (HTTP ${response.status}). Please try again.`);
  return result;
}

export default function InvoiceBuilder() {
  // Starts empty and loads after mount: drafts and today's date only exist in the browser.
  const [invoice, setInvoice] = useState<Draft | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState<Busy>('');
  const [pending, setPending] = useState<{ kind: 'new' } | { kind: 'open'; number: string } | null>(null);
  const [register, setRegister] = useState<Listed[] | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [search, setSearch] = useState('');
  useEffect(() => {
    let saved: Draft | null = null;
    try { saved = JSON.parse(localStorage.getItem(draftKey) ?? 'null'); } catch {}
    // Drafts from before the register used locally invented numbers; those are dropped.
    if (saved && Array.isArray(saved.items)) setInvoice(invoiceNumberPattern.test(saved.number) ? saved : { ...saved, number: '', status: undefined });
    else setInvoice(blankInvoice());
  }, []);
  useEffect(() => { if (invoice) try { localStorage.setItem(draftKey, JSON.stringify(invoice)); } catch {} }, [invoice]);
  if (!invoice) return <p className="admin-loading">Loading invoice…</p>;
  const draft = invoice;

  const missing = missingBusinessDetails();
  const totals = invoiceTotals(invoice);
  const status = invoice.number ? invoice.status ?? 'Quote' : undefined;
  const update = (changes: Partial<Draft>) => { setInvoice({ ...invoice, ...changes }); setNotice(null); };
  const field = (name: keyof Invoice) => ({
    name, value: invoice[name] as string,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => update({ [name]: event.target.value }),
  });
  const setItem = (index: number, changes: Partial<InvoiceItem>) => update({ items: invoice.items.map((item, i) => i === index ? { ...item, ...changes } : item) });

  async function run(kind: Busy, waiting: string, task: () => Promise<void>) {
    if (busy) return;
    setBusy(kind); setNotice({ tone: 'info', text: waiting });
    try { await task(); } catch (error) {
      const text = error instanceof SignedOut ? 'Your sign-in has expired. Reload the page to sign in again; this invoice is kept.'
        : error instanceof Error && error.name !== 'TimeoutError' ? error.message : 'The Google Sheet took too long to answer. Check the register before trying again.';
      setNotice({ tone: 'error', text });
    } finally { setBusy(''); }
  }

  // Saving records the invoice in the register; the first save issues its number.
  async function saveToRegister(action: 'save' | 'confirm') {
    const result = await api('/api/admin/invoices/', { method: 'POST', body: JSON.stringify({ action, invoice: draft }) });
    const saved = { ...draft, number: result.number, status: result.status };
    setInvoice(saved);
    return saved;
  }

  function print(saved: Draft) {
    // The browser suggests the page title as the PDF file name.
    const previous = document.title;
    document.title = [saved.number, saved.clientName].filter(Boolean).join(' ');
    window.print();
    document.title = previous;
  }

  const save = () => run('save', 'Saving to the register…', async () => {
    const saved = await saveToRegister('save');
    setNotice({ tone: 'ok', text: draft.number ? `${saved.number} updated in the register.` : `Saved as ${saved.number}.` });
  });
  const saveAndPrint = () => run('print', 'Saving before printing…', async () => {
    const saved = await saveToRegister('save');
    setNotice({ tone: 'ok', text: `Saved as ${saved.number}. Choose “Save as PDF” in the print window to send it.` });
    // Let React render the issued number into the invoice before the print window opens.
    await new Promise(resolve => setTimeout(resolve, 50));
    print(saved);
  });
  const confirm = () => run('confirm', 'Confirming…', async () => {
    const saved = await saveToRegister('confirm');
    setNotice({ tone: 'ok', text: `${saved.number} is confirmed and listed in Confirmed orders.` });
  });
  const markPaid = () => run('paid', 'Marking as paid…', async () => {
    await api('/api/admin/invoices/', { method: 'POST', body: JSON.stringify({ action: 'paid', number: draft.number }) });
    setInvoice({ ...draft, status: 'Paid' });
    setNotice({ tone: 'ok', text: `${draft.number} is marked as paid.` });
  });
  const loadRegister = () => run('list', 'Loading saved invoices…', async () => {
    const result = await api('/api/admin/invoices/');
    setRegister(result.invoices); setShowRegister(true); setNotice(null);
  });
  const open = (number: string) => run('open', `Opening ${number}…`, async () => {
    const result = await api(`/api/admin/invoices/?number=${encodeURIComponent(number)}`);
    setInvoice({ ...result.invoice, status: result.status }); setPending(null); setShowRegister(false);
    setNotice({ tone: 'ok', text: `Opened ${number}. Save after editing to update the register.` });
  });

  async function signOut() {
    // Clear the draft too, so client details do not stay on a shared or borrowed device.
    try { localStorage.removeItem(draftKey); } catch {}
    await fetch('/api/admin/login/', { method: 'DELETE' }).catch(() => {});
    location.assign('/admin/login/');
  }

  const query = search.trim().toLowerCase();
  const shown = (register ?? []).filter(row => !query || `${row.number} ${row.client}`.toLowerCase().includes(query));

  return <div className="admin-layout">
    <section className="admin-panel no-print" aria-label="Invoice details">
      <div className="admin-title"><div><p className="eyebrow">GEES CHILLS ADMIN</p><h1>Invoice</h1></div><button type="button" className="admin-secondary admin-signout" onClick={signOut}>Sign out</button></div>
      {missing.length > 0 && <p className="admin-warning" role="note">Add your {missing.join(', ')} in <code>src/lib/business.ts</code> before sending invoices.</p>}

      <div className="admin-register">
        {showRegister && register
          ? <>
            <div className="admin-register-head"><strong>Saved invoices</strong><button type="button" className="admin-secondary admin-signout" onClick={() => setShowRegister(false)}>Close</button></div>
            <label>Search<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Invoice no. or client" /></label>
            {shown.length ? <ul className="admin-register-list">{shown.map(row => <li key={row.number}>
              <button type="button" onClick={() => setPending({ kind: 'open', number: row.number })} disabled={row.number === invoice.number}>
                <span><strong>{row.number}</strong> {row.client}</span>
                <span>{row.eventDate && `Event ${displayDate(row.eventDate)} · `}GH₵ {row.total}</span>
                <span className={`admin-chip ${row.status.toLowerCase()}`}>{row.status}</span>
              </button>
            </li>)}</ul> : <p className="field-note">{register.length ? 'No invoices match.' : 'No saved invoices yet.'}</p>}
          </>
          : <button type="button" className="admin-secondary" onClick={loadRegister} disabled={Boolean(busy)}>{busy === 'list' ? 'Loading…' : 'Saved invoices'}</button>}
      </div>

      <fieldset><legend>Invoice</legend>
        <p className="admin-number">{invoice.number ? <><strong>{invoice.number}</strong> <span className={`admin-chip ${status!.toLowerCase()}`}>{status}</span></> : <>Not saved yet. The next number is issued when you save.</>}</p>
        <div className="form-row"><label>Date<input type="date" {...field('date')} /></label><label>Valid for (days)<input type="number" min={0} max={365} {...field('validDays')} /></label></div>
        <label>Deposit %<input type="number" min={0} max={100} {...field('depositPercent')} /></label>
      </fieldset>

      <fieldset><legend>Client</legend>
        <label>Name<input {...field('clientName')} maxLength={200} autoComplete="off" /></label>
        <div className="form-row"><label>Phone<input type="tel" {...field('clientPhone')} maxLength={40} autoComplete="off" /></label><label>Email<input type="email" {...field('clientEmail')} maxLength={254} autoComplete="off" /></label></div>
      </fieldset>

      <fieldset><legend>Event</legend>
        <div className="form-row"><label>Type<select {...field('eventType')}><option value="">Choose…</option>{eventTypes.map(type => <option key={type}>{type}</option>)}</select></label><label>Date<input type="date" {...field('eventDate')} /></label></div>
        <div className="form-row"><label>Venue<input {...field('venue')} maxLength={200} /></label><label>Guests<input type="number" min={1} {...field('guests')} /></label></div>
      </fieldset>

      <fieldset><legend>Lines</legend>
        <p className="field-note">Leave a line’s price empty to keep it off the invoice. Leave QTY empty for flat charges like transport.</p>
        <div className="inv-items" role="table" aria-label="Invoice lines">
          <div className="inv-items-head" role="row"><span role="columnheader">QTY</span><span role="columnheader">Description</span><span role="columnheader">Unit price</span><span role="columnheader"><span className="visually-hidden">Remove</span></span></div>
          {invoice.items.map((item, index) => <div className="inv-item" role="row" key={index}>
            <input aria-label={`Quantity, line ${index + 1}`} inputMode="decimal" value={item.qty} onChange={event => setItem(index, { qty: event.target.value })} />
            <input aria-label={`Description, line ${index + 1}`} value={item.description} maxLength={120} onChange={event => setItem(index, { description: event.target.value })} />
            <input aria-label={`Unit price in cedis, line ${index + 1}`} inputMode="decimal" value={item.price} onChange={event => setItem(index, { price: event.target.value })} />
            <button type="button" className="inv-remove" aria-label={`Remove line ${index + 1}`} onClick={() => update({ items: invoice.items.filter((_, i) => i !== index) })}>×</button>
          </div>)}
        </div>
        <button type="button" className="admin-secondary" onClick={() => update({ items: [...invoice.items, { qty: '', description: '', price: '' }] })}>Add line</button>
      </fieldset>

      <label>Notes <span className="optional">(optional, printed)</span><textarea {...field('notes')} rows={3} maxLength={1000} /></label>

      <div className="admin-summary"><span>Total</span><strong>GH₵ {money(totals.total)}</strong>{totals.depositPercent > 0 && <span>Deposit {totals.depositPercent}%: GH₵ {money(totals.deposit)}</span>}</div>

      <div className="admin-actions">
        <button type="button" className="button" onClick={saveAndPrint} disabled={Boolean(busy)}>{busy === 'print' ? 'Saving…' : 'Save & print / PDF'} <span aria-hidden="true">↗</span></button>
        <button type="button" className="admin-secondary" onClick={save} disabled={Boolean(busy)}>{busy === 'save' ? 'Saving…' : invoice.number ? 'Save changes' : 'Save as quote'}</button>
        {status !== 'Paid' && <button type="button" className="admin-confirm" onClick={confirm} disabled={Boolean(busy)}>{busy === 'confirm' ? 'Confirming…' : status === 'Confirmed' ? 'Save confirmed order' : 'Mark as confirmed'}</button>}
        {status === 'Confirmed' && <button type="button" className="admin-secondary" onClick={markPaid} disabled={Boolean(busy)}>{busy === 'paid' ? 'Saving…' : 'Mark as paid'}</button>}
        <p id="admin-status" role="status" aria-live="polite" className={notice ? `admin-status ${notice.tone}` : 'admin-status'}>{notice?.text}</p>
        {pending
          ? <div className="admin-discard">
            <span>{pending.kind === 'new' ? 'Start a new invoice?' : `Open ${pending.number}?`} Unsaved changes to this one will be lost.</span>
            <button type="button" className="admin-secondary" onClick={() => pending.kind === 'new' ? (setInvoice(blankInvoice()), setPending(null), setNotice(null)) : open(pending.number)}>{pending.kind === 'new' ? 'Start new' : 'Open'}</button>
            <button type="button" className="admin-secondary" onClick={() => setPending(null)}>Cancel</button>
          </div>
          : <button type="button" className="admin-secondary" onClick={() => setPending({ kind: 'new' })}>New invoice</button>}
      </div>
    </section>
    <div className="admin-preview"><InvoiceDocument invoice={invoice} /></div>
  </div>;
}
