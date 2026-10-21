import { business } from '../lib/business';
import { addDays, displayDate, invoiceTotals, lineAmount, money, type Invoice } from '../lib/invoice';

// The printable invoice, laid out like a standard Ghanaian event invoice with the client,
// event, validity and payment details that quotes often leave out.
export default function InvoiceDocument({ invoice }: { invoice: Invoice }) {
  const totals = invoiceTotals(invoice);
  const lines = invoice.items.filter(item => item.price.trim() !== '');
  const validUntil = displayDate(addDays(invoice.date, Number(invoice.validDays) || 0));
  return <article className="inv-doc" aria-label="Invoice preview">
    {/* Plain divs: the site styles every <header> and <footer> as page chrome. */}
    <div className="inv-head">
      <div className="inv-brand">
        <img src="/assets/logo-mark.jpeg" alt="" width="345" height="411" />
        <div>
          <strong>{business.name}</strong>
          {business.address && <span>{business.address}</span>}
          <span>{business.email}</span>
          {business.vatNumber && <span>VAT No. {business.vatNumber}</span>}
        </div>
      </div>
      <div className="inv-meta">
        <h1>INVOICE</h1>
        <span>No. {invoice.number || 'DRAFT'}</span>
        <span>Date: {displayDate(invoice.date)}</span>
        {invoice.guests && <span>Number of Guests: {Number(invoice.guests).toLocaleString('en-GH')}</span>}
      </div>
    </div>

    <section className="inv-parties">
      <div><h2>Bill to</h2><p>{invoice.clientName || '—'}{invoice.clientPhone && <><br />{invoice.clientPhone}</>}{invoice.clientEmail && <><br />{invoice.clientEmail}</>}</p></div>
      <div><h2>Event</h2><p>{[invoice.eventType, invoice.eventDate && displayDate(invoice.eventDate)].filter(Boolean).join(' · ') || '—'}{invoice.venue && <><br />{invoice.venue}</>}</p></div>
    </section>

    <table className="inv-table">
      <thead><tr><th scope="col">QTY</th><th scope="col">ITEM / DESCRIPTION</th><th scope="col">UNIT PRICE (GH₵)</th><th scope="col">AMOUNT (GH₵)</th></tr></thead>
      <tbody>{lines.length ? lines.map((item, index) => <tr key={index}>
        <td>{item.qty}</td><td>{item.description}</td><td>{item.qty ? money(Number(item.price) || 0) : ''}</td><td>{money(lineAmount(item))}</td>
      </tr>) : <tr><td colSpan={4} className="inv-empty">Add prices to the lines you need.</td></tr>}</tbody>
    </table>

    <dl className="inv-totals">
      <div><dt>SUB TOTAL</dt><dd>{money(totals.subtotal)}</dd></div>
      <div className="inv-total"><dt>TOTAL (GH₵)</dt><dd>{money(totals.total)}</dd></div>
    </dl>
    <p className="inv-vat">Prices include VAT and levies.</p>
    {totals.depositPercent > 0 && <dl className="inv-totals">
      <div><dt>Deposit to confirm ({totals.depositPercent}%)</dt><dd>{money(totals.deposit)}</dd></div>
      {totals.balance > 0 && <div><dt>Balance due before the event</dt><dd>{money(totals.balance)}</dd></div>}
    </dl>}

    {invoice.notes && <section className="inv-notes"><h2>Notes</h2><p>{invoice.notes}</p></section>}

    <div className="inv-foot">
      <p><strong className="inv-warn">Prices valid until {validUntil}.</strong> {totals.depositPercent > 0 ? `Your booking is confirmed once the ${totals.depositPercent}% deposit is received.` : 'Your booking is confirmed once payment is received.'}</p>
      {business.paymentDetails && <p><strong>Payment:</strong> {business.paymentDetails}</p>}
      <p><strong>Direct all enquiries to:</strong> {[...business.phones, business.email].join(' / ')}</p>
    </div>
  </article>;
}
