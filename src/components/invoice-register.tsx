'use client';
import { useEffect, useRef, useState } from 'react';
import { displayDate, money } from '../lib/invoice';

export type InvoiceStatus = 'Quote' | 'Confirmed' | 'Paid';
export type Listed = { number: string; status: InvoiceStatus; invoiceDate: string; client: string; eventDate: string; total: string; updatedAt: string };
type Filter = 'All' | InvoiceStatus;

const tiles: { filter: Filter; label: string; hint?: string }[] = [
  { filter: 'All', label: 'All invoices' },
  { filter: 'Quote', label: 'Quotes', hint: 'Sent, not yet confirmed' },
  { filter: 'Confirmed', label: 'Confirmed', hint: 'Awaiting payment' },
  { filter: 'Paid', label: 'Paid' },
];

// The sheet may format numbers with or without separators; amounts are always shown the same way.
export const amount = (total: string) => { const value = Number(String(total).replace(/[^\d.]/g, '')); return Number.isFinite(value) ? value : 0; };
const when = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) return value;
  const date = new Date(value);
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay ? `Today, ${date.toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' })}` : date.toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function InvoiceRegister({ rows, loading, error, loadedAt, openNumber, opening, onRefresh, onOpen, onNew }: {
  rows: Listed[] | null; loading: boolean; error: string; loadedAt: number | null; openNumber: string; opening: string;
  onRefresh: () => void; onOpen: (number: string) => void; onNew: () => void;
}) {
  const [filter, setFilter] = useState<Filter>('All');
  const [search, setSearch] = useState('');
  const searchBox = useRef<HTMLInputElement>(null);
  useEffect(() => { searchBox.current?.focus(); }, []);

  const all = rows ?? [];
  const query = search.trim().toLowerCase();
  const shown = all.filter(row => (filter === 'All' || row.status === filter) && (!query || `${row.number} ${row.client}`.toLowerCase().includes(query)));
  const stats = (wanted: Filter) => {
    const matching = all.filter(row => wanted === 'All' || row.status === wanted);
    return { count: matching.length, value: matching.reduce((sum, row) => sum + amount(row.total), 0) };
  };

  return <section className="admin-register-view no-print" aria-labelledby="register-title" aria-busy={loading}>
    <div className="register-head">
      <div><h1 id="register-title">Saved invoices</h1>
        <p className="field-note">{loading ? 'Loading from the Google Sheet…' : loadedAt ? `From the Google Sheet · updated ${new Date(loadedAt).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' })}` : 'From the Google Sheet'}</p></div>
      <button type="button" className="admin-secondary" onClick={onRefresh} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>
    </div>

    {error && <div className="register-error" role="alert"><p>{error}</p><button type="button" className="admin-secondary" onClick={onRefresh} disabled={loading}>Try again</button></div>}

    <div className="register-tiles" role="group" aria-label="Filter by status">
      {tiles.map(tile => { const { count, value } = stats(tile.filter); return <button type="button" key={tile.filter} className={`register-tile ${tile.filter.toLowerCase()}`} aria-pressed={filter === tile.filter} onClick={() => setFilter(tile.filter)}>
        <span className="register-tile-label">{tile.label}</span>
        <strong>{rows ? count : '–'}</strong>
        <span>{rows ? `GH₵ ${money(value)}` : ' '}</span>
        {tile.hint && <small>{tile.hint}</small>}
      </button>; })}
    </div>

    <label className="register-search">Search<input ref={searchBox} type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Invoice number or client name" /></label>

    {!rows && loading && <ul className="register-list register-skeleton" aria-hidden="true">{[0, 1, 2].map(i => <li key={i}><span /></li>)}</ul>}

    {rows && (shown.length ? <>
      <p className="register-count">{shown.length === all.length ? `${all.length} invoice${all.length === 1 ? '' : 's'}` : `Showing ${shown.length} of ${all.length}`} · GH₵ {money(shown.reduce((sum, row) => sum + amount(row.total), 0))}</p>
      <div className="register-list" role="list">
        <div className="register-row register-header" aria-hidden="true"><span>Invoice</span><span>Client</span><span>Event date</span><span>Total (GH₵)</span><span>Status</span><span>Updated</span></div>
        {shown.map(row => <div role="listitem" key={row.number}>
          <button type="button" className={`register-row${row.number === openNumber ? ' is-open' : ''}`} onClick={() => onOpen(row.number)} disabled={Boolean(opening)}
            aria-label={`${row.number}, ${row.client}, ${row.status}, GH₵ ${money(amount(row.total))}${row.number === openNumber ? ', open in the editor' : ''}`}>
            <span className="register-number">{row.number}{row.number === openNumber && <em>Open now</em>}</span>
            <span className="register-client">{row.client || '—'}</span>
            <span className="register-event"><span className="register-label">Event </span>{row.eventDate ? displayDate(row.eventDate) : '—'}</span>
            <span className="register-total">{money(amount(row.total))}</span>
            <span><span className={`admin-chip ${row.status.toLowerCase()}`}>{opening === row.number ? 'Opening…' : row.status}</span></span>
            <span className="register-updated">{when(row.updatedAt)}</span>
          </button>
        </div>)}
      </div>
    </> : <div className="register-empty">
      {all.length
        ? <><p>No invoices match{query ? ` “${search.trim()}”` : ''}{filter !== 'All' ? ` in ${tiles.find(tile => tile.filter === filter)!.label.toLowerCase()}` : ''}.</p><button type="button" className="admin-secondary" onClick={() => { setSearch(''); setFilter('All'); }}>Show all invoices</button></>
        : <><p>No saved invoices yet. Invoices appear here once you save or print them.</p><button type="button" className="admin-secondary" onClick={onNew}>Create an invoice</button></>}
    </div>)}
  </section>;
}
