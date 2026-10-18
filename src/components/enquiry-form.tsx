'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { packages, type PackageName } from './package-cards';

export default function EnquiryForm({ selectedPackage, onPackageChange }: { selectedPackage: PackageName; onPackageChange: (name: PackageName) => void }) {
  const [minimumDate, setMinimumDate] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState('');
  useEffect(() => { setSent(false); setStatus(''); }, [selectedPackage]);
  useEffect(() => {
    const today = new Date();
    setMinimumDate([today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-'));
  }, []);
  async function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    for (const field of ['name', 'location']) {
      if (!String(data.get(field)).trim()) {
        const input = form.elements.namedItem(field) as HTMLInputElement;
        input.setCustomValidity('Please enter a value, not just spaces.');
        input.reportValidity(); return;
      }
    }
    if (!form.reportValidity()) return;
    if (sending) return;
    setSending(true); setSent(false); setStatus('Sending your enquiry…');
    try {
      const response = await fetch('/api/enquiries/', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(data.entries())),
        signal: AbortSignal.timeout(20000),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to send your enquiry. Please try again.');
      setSent(true);
      setStatus('Your enquiry has been submitted. We’ll reply to the email address you provided. Your booking is confirmed only after we agree the details.');
    } catch (error) {
      setStatus(error instanceof Error && error.name !== 'TimeoutError' ? error.message : 'We couldn’t confirm your enquiry. Please try again or contact us on WhatsApp.');
    } finally { setSending(false); }
  }
  return <form id="enquiry-form" onSubmit={prepare} onInput={(event) => {
    if (event.target instanceof HTMLInputElement) event.target.setCustomValidity('');
    if (!sending) { setSent(false); setStatus(''); }
  }}>
    <div className="form-title"><h3>Your event starts here</h3><span>EVENT ENQUIRY</span></div>
    <fieldset disabled={sending} aria-busy={sending}>
    <legend className="visually-hidden">Your event details</legend>
    <div className="enquiry-honeypot" aria-hidden="true"><label>Leave this field empty<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <label>Your name<input id="enquiry-name" name="name" required maxLength={100} autoComplete="name" placeholder="How should we call you?" /></label>
    <label>Your email<input type="email" name="email" required maxLength={254} autoComplete="email" placeholder="Where can we reply?" /></label>
    <div className="form-row"><label>Event date<input type="date" name="date" required min={minimumDate} /></label><label>Expected guests<input type="number" name="guests" min={1} max={100000} required placeholder="e.g. 80" /></label></div>
    <label>Where’s the event?<input name="location" required maxLength={200} placeholder="Town, area or venue" /></label>
    <label>What are you planning?<select name="package" value={selectedPackage} onChange={(event) => { onPackageChange(event.target.value as PackageName); setSent(false); setStatus(''); }}>{packages.map(item => <option key={item.id}>{item.id}</option>)}</select></label>
    <label>Anything else? <span className="optional">(optional)</span><textarea name="notes" rows={3} maxLength={1000} placeholder="Tell us about the occasion and any extras you’d like." /></label>
    <button className="button" type="submit" disabled={sending || sent}>{sending ? 'Sending…' : sent ? 'Enquiry submitted' : 'Send my enquiry'} <span aria-hidden="true">↗</span></button>
    </fieldset>
    <p className="form-note">We’ll use your details to respond to your event enquiry.</p>
    <p id="enquiry-status" role="status" aria-live="polite">{status}</p>
  </form>;
}
