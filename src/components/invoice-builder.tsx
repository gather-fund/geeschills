'use client';
import { useEffect, useState, type ChangeEvent } from 'react';
import { eventTypes } from '../lib/enquiry-options';
import { missingBusinessDetails } from '../lib/business';
import { business } from '../lib/business';
import { blankInvoice, displayDate, invoiceNumberPattern, invoiceTotals, money, standardTerms, type Invoice, type InvoiceItem } from '../lib/invoice';
import InvoiceDocument from './invoice-document';
import InvoiceRegister, { type InvoiceStatus, type Listed } from './invoice-register';

type Draft = Invoice & { status?: InvoiceStatus };
type Notice = { tone: 'ok' | 'error' | 'info'; text: string };
type Busy = '' | 'save' | 'print' | 'confirm' | 'paid' | 'delete';
type Pending = { kind: 'new' } | { kind: 'open'; number: string } | { kind: 'delete' };
const draftKey = 'gees-chills-invoice-draft';
// The draft as last saved or opened, to tell whether there are unsaved changes.
const baselineKey = 'gees-chills-invoice-baseline';
const snapshot = (draft: Draft) => JSON.stringify({ ...draft, status: undefined });

class SignedOut extends Error {}
const describe = (error: unknown) => error instanceof SignedOut ? 'Your sign-in has expired. Reload the page to sign in again; this invoice is kept.'
  : error instanceof Error && error.name !== 'TimeoutError' ? error.message : 'The Google Sheet took too long to answer. Check Saved invoices before trying again.';
const networkError = (error: unknown) => error instanceof Error && error.name === 'TimeoutError' ? error
  : new Error('The connection dropped before the server answered. Check your internet connection and try again; if you were saving, open Saved invoices first to see whether it went through.');

// Every request to the register goes through here, so an expired sign-in is reported the same way.
async function api(path: string, init?: RequestInit) {
  const request = () => fetch(path, { ...init, headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(30000) });
  let response: Response;
  try { response = await request(); } catch (error) {
    // Reading the register is safe to repeat, so retry once if a flaky connection drops; saves are not
    // retried automatically, because the first attempt may already have reached the sheet.
    if (init?.method && init.method !== 'GET') throw networkError(error);
    try { response = await request(); } catch (retryError) { throw networkError(retryError); }
  }
  const result = await response.json().catch(() => ({}));
  if (response.status === 401) throw new SignedOut();
  if (!response.ok) throw new Error(result.error || `The server answered with an error (HTTP ${response.status}). Please try again.`);
  return result;
}

export default function InvoiceBuilder() {
  // Starts empty and loads after mount: drafts and today's date only exist in the browser.
  const [invoice, setInvoice] = useState<Draft | null>(null);
  const [baseline, setBaseline] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState<Busy>('');
  const [pending, setPending] = useState<Pending | null>(null);
  const [view, setView] = useState<'edit' | 'list'>('edit');
  const [register, setRegister] = useState<Listed[] | null>(null);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [loadedAt, setLoadedAt] = useState<number | null>(null);
  const [opening, setOpening] = useState('');
  useEffect(() => {
    let saved: Draft | null = null, savedBaseline: string | null = null;
    try { saved = JSON.parse(localStorage.getItem(draftKey) ?? 'null'); savedBaseline = localStorage.getItem(baselineKey); } catch {}
    if (saved && Array.isArray(saved.items)) {
      // Drafts from before the footer was editable.
      saved = { ...saved, terms: saved.terms ?? '', paymentDetails: saved.paymentDetails ?? business.paymentDetails };
      // Drafts from before the register used locally invented numbers; those are dropped.
      setInvoice(invoiceNumberPattern.test(saved.number) ? saved : { ...saved, number: '', status: undefined });
      setBaseline(savedBaseline ?? '');
    } else {
      const blank = blankInvoice();
      setInvoice(blank); setBaseline(snapshot(blank));
    }
  }, []);
  useEffect(() => { if (invoice) try { localStorage.setItem(draftKey, JSON.stringify(invoice)); localStorage.setItem(baselineKey, baseline); } catch {} }, [invoice, baseline]);
  if (!invoice) return <p className="admin-loading">Loading invoice…</p>;
  const draft = invoice;

  const missing = missingBusinessDetails();
  const totals = invoiceTotals(invoice);
  const standard = standardTerms(invoice);
  const status = invoice.number ? invoice.status ?? 'Quote' : undefined;
  const dirty = snapshot(invoice) !== baseline;
  // Keeps the cached register in step with saves, so the list is current without reloading it.
  const remember = (saved: Draft) => setRegister(current => current && [
    { number: saved.number, status: saved.status ?? 'Quote', invoiceDate: saved.date, client: saved.clientName, eventDate: saved.eventDate, total: String(invoiceTotals(saved).total), updatedAt: new Date().toISOString() },
    ...current.filter(row => row.number !== saved.number),
  ]);
  const update = (changes: Partial<Draft>) => { setInvoice({ ...invoice, ...changes }); setNotice(null); };
  // Events can't be booked in the past; an older saved date still shows as it was.
  const today = new Date().toISOString().slice(0, 10);
  const field = (name: keyof Invoice) => ({
    name, value: invoice[name] as string,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => update({ [name]: event.target.value }),
  });
  const setItem = (index: number, changes: Partial<InvoiceItem>) => update({ items: invoice.items.map((item, i) => i === index ? { ...item, ...changes } : item) });

  async function run(kind: Busy, waiting: string, task: () => Promise<void>) {
    if (busy) return;
    setBusy(kind); setNotice({ tone: 'info', text: waiting });
    try { await task(); } catch (error) { setNotice({ tone: 'error', text: describe(error) }); } finally { setBusy(''); }
  }

  // Saving records the invoice in the register; the first save issues its number.
  async function saveToRegister(action: 'save' | 'confirm') {
    const result = await api('/api/admin/invoices/', { method: 'POST', body: JSON.stringify({ action, invoice: draft }) });
    const saved = { ...draft, number: result.number, status: result.status };
    setInvoice(saved); setBaseline(snapshot(saved)); remember(saved);
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
    const paid = { ...draft, status: 'Paid' as const };
    setInvoice(paid); remember(paid);
    setNotice({ tone: 'ok', text: `${draft.number} is marked as paid.` });
  });
  const deleteInvoice = () => run('delete', 'Deleting…', async () => {
    const number = draft.number;
    setPending(null);
    await api('/api/admin/invoices/', { method: 'POST', body: JSON.stringify({ action: 'delete', number }) });
    setRegister(current => current && current.filter(row => row.number !== number));
    startNew();
    setNotice({ tone: 'ok', text: `${number} was deleted from the register.` });
  });
  async function loadRegister() {
    setRegisterLoading(true); setRegisterError('');
    try { const result = await api('/api/admin/invoices/'); setRegister(result.invoices); setLoadedAt(Date.now()); }
    catch (error) { setRegisterError(describe(error)); }
    finally { setRegisterLoading(false); }
  }
  function showRegister() {
    setView('list');
    // Reload when first opened or after a couple of minutes; saves on this device update it anyway.
    if (!registerLoading && (!loadedAt || Date.now() - loadedAt > 120000)) loadRegister();
  }
  function startNew() {
    // Payment details rarely change, so a new invoice keeps the ones last used.
    const blank = { ...blankInvoice(), paymentDetails: invoice!.paymentDetails };
    setInvoice(blank); setBaseline(snapshot(blank)); setPending(null); setNotice(null); setView('edit');
  }
  async function openInvoice(number: string) {
    setPending(null); setOpening(number); setRegisterError(''); setView('list');
    try {
      const result = await api(`/api/admin/invoices/?number=${encodeURIComponent(number)}`);
      const opened = { ...result.invoice, status: result.status };
      setInvoice(opened); setBaseline(snapshot(opened)); setView('edit');
      setNotice({ tone: 'ok', text: `Opened ${number}. Save after editing to update the register.` });
    } catch (error) { setRegisterError(describe(error)); }
    finally { setOpening(''); }
  }
  // Only ask before discarding when there is something to lose.
  const requestNew = () => dirty ? setPending({ kind: 'new' }) : startNew();
  const requestOpen = (number: string) => {
    if (number === invoice.number && !dirty) setView('edit');
    else if (dirty) setPending({ kind: 'open', number });
    else openInvoice(number);
  };

  async function signOut() {
    // Clear the draft too, so client details do not stay on a shared or borrowed device.
    try { localStorage.removeItem(draftKey); localStorage.removeItem(baselineKey); } catch {}
    await fetch('/api/admin/login/', { method: 'DELETE' }).catch(() => {});
    location.assign('/admin/login/');
  }

  const current = invoice.number || 'this draft';
  return <>
    <div className="admin-bar no-print">
      <span className="admin-bar-brand"><img src="/assets/logo-mark.jpeg" alt="" width="345" height="411" />GEES CHILLS ADMIN</span>
      <nav className="admin-tabs" aria-label="Admin sections">
        <button type="button" aria-current={view === 'edit' ? 'page' : undefined} onClick={() => setView('edit')}>Invoice{dirty && <span className="admin-dot" title="Unsaved changes" aria-label="(unsaved changes)" />}</button>
        <button type="button" aria-current={view === 'list' ? 'page' : undefined} onClick={showRegister}>Saved invoices{register && <span className="admin-count">{register.length}</span>}</button>
      </nav>
      <div className="admin-bar-actions">
        <button type="button" className="admin-secondary" onClick={requestNew}>New invoice</button>
        <button type="button" className="admin-secondary" onClick={signOut}>Sign out</button>
      </div>
    </div>
    {pending && pending.kind !== 'delete' && <div className="admin-pending no-print" role="alertdialog" aria-labelledby="pending-text">
      <p id="pending-text"><strong>{current === 'this draft' ? 'This draft has unsaved changes.' : `${current} has unsaved changes.`}</strong> {pending.kind === 'new' ? 'Start a new invoice and discard them?' : `Open ${pending.number} and discard them?`}</p>
      <div>
        <button type="button" className="admin-secondary" onClick={() => setPending(null)} autoFocus>Keep editing</button>
        <button type="button" className="admin-danger" onClick={() => pending.kind === 'new' ? startNew() : openInvoice(pending.number)}>Discard changes</button>
      </div>
    </div>}
    {view === 'list' ? <InvoiceRegister rows={register} loading={registerLoading} error={registerError} loadedAt={loadedAt} openNumber={invoice.number} opening={opening} onRefresh={loadRegister} onOpen={requestOpen} onNew={requestNew} /> :
  <div className="admin-layout">
    <section className="admin-panel no-print" aria-labelledby="invoice-heading">
      <div className="admin-heading">
        <h1 id="invoice-heading">{invoice.number || 'New invoice'}</h1>
        <p>{status && <span className={`admin-chip ${status.toLowerCase()}`}>{status}</span>}{dirty && <span className="admin-chip unsaved">Unsaved changes</span>}{!invoice.number && <span className="field-note">The next number is issued when you save.</span>}</p>
      </div>
      {missing.length > 0 && <p className="admin-warning" role="note">Add your {missing.join(', ')} in <code>src/lib/business.ts</code> before sending invoices.</p>}

      <fieldset><legend>Invoice</legend>
        <div className="form-row"><label>Date<input type="date" {...field('date')} /></label><label>Valid for (days)<input type="number" min={0} max={365} {...field('validDays')} /></label></div>
        <label>Deposit %<input type="number" min={0} max={100} {...field('depositPercent')} /></label>
      </fieldset>

      <fieldset><legend>Client</legend>
        <label>Name<input {...field('clientName')} maxLength={200} autoComplete="off" /></label>
        <div className="form-row"><label>Phone<input type="tel" {...field('clientPhone')} maxLength={40} autoComplete="off" /></label><label>Email<input type="email" {...field('clientEmail')} maxLength={254} autoComplete="off" /></label></div>
      </fieldset>

      <fieldset><legend>Event</legend>
        <div className="form-row"><label>Type<select {...field('eventType')}><option value="">Choose…</option>{eventTypes.map(type => <option key={type}>{type}</option>)}</select></label><label>Date<input type="date" min={today} {...field('eventDate')} /></label></div>
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

      <fieldset><legend>Validity &amp; payment</legend>
        <label>Validity line<textarea {...field('terms')} rows={2} maxLength={500} placeholder={`${standard.valid} ${standard.booking}`} /></label>
        <p className="field-note">{invoice.terms.trim() ? <button type="button" className="admin-link" onClick={() => update({ terms: '' })}>Use the standard wording</button> : <>Empty uses the standard wording shown, which follows the date, “Valid for” and deposit. <button type="button" className="admin-link" onClick={() => update({ terms: `${standard.valid} ${standard.booking}` })}>Edit this wording</button></>}</p>
        <label>Payment details<textarea {...field('paymentDetails')} rows={2} maxLength={300} placeholder="e.g. MTN MoMo 024 000 0000 (GEES CHILLS) · Bank: …, Acc. no. …" /></label>
        <p className="field-note">Printed after “Payment:”. Leave empty to leave the payment line off. New invoices start with the details last used here.</p>
      </fieldset>

      <label>Notes <span className="optional">(optional, printed)</span><textarea {...field('notes')} rows={3} maxLength={1000} /></label>

      <div className="admin-summary"><span>Total</span><strong>GH₵ {money(totals.total)}</strong>{totals.depositPercent > 0 && <span>Deposit {totals.depositPercent}%: GH₵ {money(totals.deposit)}</span>}</div>

      <div className="admin-actions">
        <button type="button" className="button" onClick={saveAndPrint} disabled={Boolean(busy)}>{busy === 'print' ? 'Saving…' : 'Save & print / PDF'} <span aria-hidden="true">↗</span></button>
        <button type="button" className="admin-secondary" onClick={save} disabled={Boolean(busy)}>{busy === 'save' ? 'Saving…' : invoice.number ? 'Save changes' : 'Save as quote'}</button>
        {status !== 'Paid' && <button type="button" className="admin-confirm" onClick={confirm} disabled={Boolean(busy)}>{busy === 'confirm' ? 'Confirming…' : status === 'Confirmed' ? 'Save confirmed order' : 'Mark as confirmed'}</button>}
        {status === 'Confirmed' && <button type="button" className="admin-secondary" onClick={markPaid} disabled={Boolean(busy)}>{busy === 'paid' ? 'Saving…' : 'Mark as paid'}</button>}
        {invoice.number && pending?.kind !== 'delete' && <button type="button" className="admin-delete" onClick={() => setPending({ kind: 'delete' })} disabled={Boolean(busy)}>{busy === 'delete' ? 'Deleting…' : 'Delete invoice'}</button>}
        {pending?.kind === 'delete' && <div className="admin-pending admin-delete-confirm" role="alertdialog" aria-labelledby="delete-text">
          <p id="delete-text"><strong>Delete {invoice.number}{invoice.clientName ? ` for ${invoice.clientName}` : ''}?</strong> It is removed from the Google Sheet{status !== 'Quote' ? ', including Confirmed orders' : ''}, and this can’t be undone. Its number won’t be reused.</p>
          <div>
            <button type="button" className="admin-secondary" onClick={() => setPending(null)} autoFocus>Keep invoice</button>
            <button type="button" className="admin-danger" onClick={deleteInvoice} disabled={Boolean(busy)}>Delete invoice</button>
          </div>
    </div>}
        <p id="admin-status" role="status" aria-live="polite" className={notice ? `admin-status ${notice.tone}` : 'admin-status'}>{notice?.text}</p>
      </div>
    </section>
    <div className="admin-preview"><InvoiceDocument invoice={invoice} /></div>
  </div>}
  </>;
}
