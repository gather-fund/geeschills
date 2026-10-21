'use client';
import Script from 'next/script';
import { useEffect, useState, type FormEvent } from 'react';
import { emailPattern, eventTypes, hiddenCharacters, hiddenCharactersInNotes, limits, waiterCostNote, waiterOptions, wholeNumberPattern } from '../lib/enquiry-options';
import { turnstileField } from '../lib/turnstile';

declare global { interface Window { turnstile?: { reset: (widget?: string) => void } } }
const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const hiddenMessage = 'Please remove line breaks or hidden characters.';

const fields = ['name', 'email', 'date', 'guests', 'location', 'eventType', 'waiters', 'notes'] as const;
type Field = typeof fields[number];
type Errors = Partial<Record<Field, string>>;
const isField = (name: string): name is Field => (fields as readonly string[]).includes(name);
// Choices are complete as soon as they change, so they are checked immediately rather than on leaving.
const choiceFields: readonly Field[] = ['date', 'eventType', 'waiters'];

const localToday = () => {
  const today = new Date();
  return [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
};

// Mirrors the checks in /api/enquiries so visitors see a specific message instead of a server rejection.
function check(form: HTMLFormElement, name: Field): string | undefined {
  const control = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | RadioNodeList;
  const value = control.value, text = value.trim();
  const badInput = control instanceof HTMLInputElement && control.validity.badInput;
  switch (name) {
    case 'name':
      if (!text) return value ? 'Please enter your name, not just spaces.' : 'Please enter your name.';
      if (hiddenCharacters.test(text)) return hiddenMessage;
      if (text.length > limits.name) return `Please keep your name under ${limits.name} characters.`;
      return;
    case 'email':
      if (!text) return 'Please enter your email address.';
      if (hiddenCharacters.test(text)) return hiddenMessage;
      if (text.length > limits.email || !emailPattern.test(text)) return 'Please enter a valid email address, like name@example.com.';
      return;
    case 'date':
      if (badInput) return 'Please enter a complete date.';
      if (!text) return 'Please choose your event date.';
      if (text < localToday()) return 'Please choose today or a future date.';
      return;
    case 'guests':
      if (badInput || (text && !wholeNumberPattern.test(text))) return 'Please enter a whole number of guests, like 80.';
      if (!text) return 'Please enter your expected number of guests.';
      if (Number(text) < 1) return 'Please enter at least 1 guest.';
      if (Number(text) > limits.guests) return `For more than ${limits.guests.toLocaleString('en-GH')} guests, please contact us on WhatsApp.`;
      return;
    case 'location':
      if (!text) return value ? 'Please tell us where the event is, not just spaces.' : 'Please tell us where the event is.';
      if (hiddenCharacters.test(text)) return hiddenMessage;
      if (text.length > limits.location) return `Please keep the location under ${limits.location} characters.`;
      return;
    case 'eventType':
      if (!eventTypes.some(option => option === value)) return 'Please choose your type of event.';
      return;
    case 'waiters':
      if (!waiterOptions.some(option => option === value)) return 'Please let us know if you’ll need waiters.';
      return;
    case 'notes':
      if (hiddenCharactersInNotes.test(text)) return 'Please remove hidden characters from your notes.';
      if (text.length > limits.notes) return `Please keep your notes under ${limits.notes} characters.`;
      return;
  }
}

export default function EnquiryForm() {
  const [minimumDate, setMinimumDate] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [attempted, setAttempted] = useState(false);
  useEffect(() => { setMinimumDate(localToday()); }, []);
  const setError = (name: Field, message: string | undefined) => setErrors(current => current[name] === message ? current : { ...current, [name]: message });
  async function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const found: Errors = {};
    for (const name of fields) { const message = check(form, name); if (message) found[name] = message; }
    setErrors(found); setAttempted(true);
    const invalidFields = fields.filter(name => found[name]);
    if (invalidFields.length) {
      const first = form.elements.namedItem(invalidFields[0]);
      (first instanceof RadioNodeList ? first[0] as HTMLInputElement : first as HTMLElement).focus();
      setSent(false);
      setStatus(invalidFields.length === 1 ? 'Please check the highlighted field.' : `Please check the ${invalidFields.length} highlighted fields.`);
      return;
    }
    if (sending) return;
    const data = new FormData(form);
    if (turnstileSiteKey && !data.get(turnstileField)) { setStatus('Please wait for the security check to finish, then send again.'); return; }
    setSending(true); setSent(false); setStatus('Sending your enquiry…');
    try {
      const response = await fetch('/api/enquiries/', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(data.entries())),
        signal: AbortSignal.timeout(20000),
      });
      // A proxy error page is not JSON; fall back to the generic message below.
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to send your enquiry. Please try again.');
      setSent(true);
      setStatus('Your enquiry has been submitted. We’ll reply to the email address you provided. Your booking is confirmed only after we agree the details.');
    } catch (error) {
      setStatus(error instanceof Error && error.name !== 'TimeoutError' ? error.message : 'We couldn’t confirm your enquiry. Please try again or contact us on WhatsApp.');
    } finally {
      setSending(false);
      // Turnstile tokens are single-use, so get a fresh one for any further attempt.
      if (turnstileSiteKey) window.turnstile?.reset();
    }
  }
  // Error text sits inside the label for layout but is hidden from the label's name; aria-describedby announces it.
  const error = (name: keyof Errors) => errors[name] && <span className="field-error" id={`${name}-error`} aria-hidden="true">{errors[name]}</span>;
  const invalid = (name: keyof Errors) => errors[name] ? { 'aria-invalid': true, 'aria-describedby': `${name}-error` } : {};
  return <form id="enquiry-form" noValidate onSubmit={prepare} onInput={(event) => {
    const { name } = event.nativeEvent.target as HTMLInputElement;
    // Re-check while typing only once a field shows an error, so it clears the moment it is fixed.
    if (isField(name) && (errors[name] || choiceFields.includes(name))) setError(name, check(event.currentTarget, name));
    if (!sending) { setSent(false); setStatus(''); }
  }} onBlur={(event) => {
    const { name, value } = event.nativeEvent.target as HTMLInputElement;
    // Leaving an untouched empty field is not an error until the visitor tries to send.
    if (isField(name) && name !== 'waiters' && (value || attempted)) setError(name, check(event.currentTarget, name));
  }}>
    <div className="form-title"><h3>Your event starts here</h3><span>EVENT ENQUIRY</span></div>
    <fieldset disabled={sending} aria-busy={sending}>
    <legend className="visually-hidden">Your event details</legend>
    <div className="enquiry-honeypot" aria-hidden="true"><label>Leave this field empty<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <label>Your name<input id="enquiry-name" name="name" required maxLength={limits.name} autoComplete="name" placeholder="How should we call you?" {...invalid('name')} />{error('name')}</label>
    <label>Your email<input type="email" name="email" required maxLength={limits.email} autoComplete="email" inputMode="email" spellCheck={false} placeholder="Where can we reply?" {...invalid('email')} />{error('email')}</label>
    <div className="form-row"><label>Event date<input type="date" name="date" required min={minimumDate} {...invalid('date')} />{error('date')}</label><label>Expected guests<input type="number" name="guests" min={1} max={limits.guests} step={1} inputMode="numeric" required placeholder="e.g. 80" {...invalid('guests')} />{error('guests')}</label></div>
    <label>Where’s the event?<input name="location" required maxLength={limits.location} placeholder="Town, area or venue" {...invalid('location')} />{error('location')}</label>
    <label>Type of event<select name="eventType" required defaultValue="" {...invalid('eventType')}><option value="" disabled>Choose your type of event</option>{eventTypes.map(option => <option key={option}>{option}</option>)}</select>{error('eventType')}</label>
    <fieldset className={`choice-group${errors.waiters ? ' invalid' : ''}`}>
      <legend>Will you need waiters?</legend>
      <div className="choices">{waiterOptions.map(option => <label className="choice" key={option}><input type="radio" name="waiters" value={option} required aria-describedby={errors.waiters ? 'waiters-note waiters-error' : 'waiters-note'} />{option}</label>)}</div>
      <p className="field-note" id="waiters-note">{waiterCostNote}</p>
      {error('waiters')}
    </fieldset>
    <label>Anything else? <span className="optional">(optional)</span><textarea name="notes" rows={3} maxLength={limits.notes} placeholder="Tell us about the occasion and any extras you’d like." {...invalid('notes')} />{error('notes')}</label>
    {turnstileSiteKey && <><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" /><div className="cf-turnstile turnstile" data-sitekey={turnstileSiteKey} data-theme="light" data-size="flexible" /></>}
    <button className="button" type="submit" disabled={sending || sent}>{sending ? 'Sending…' : sent ? 'Enquiry submitted' : 'Send my enquiry'} <span aria-hidden="true">↗</span></button>
    </fieldset>
    <p className="form-note">We’ll use your details to respond to your event enquiry.</p>
    <p id="enquiry-status" role="status" aria-live="polite">{status}</p>
  </form>;
}
