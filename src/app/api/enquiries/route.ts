import { emailPattern, eventTypes, hiddenCharacters, hiddenCharactersInNotes, limits, waiterOptions, wholeNumberPattern } from '../../../lib/enquiry-options';
import { checkRateLimit, clientIp } from '../../../lib/rate-limit';
import { turnstileField, verifyTurnstile } from '../../../lib/turnstile';

export const runtime = 'nodejs';

const maxBodyBytes = 12000;
const fail = (error: string, status: number, headers?: HeadersInit) => Response.json({ error }, { status, headers });

export async function POST(request: Request) {
  // Cross-site browser submissions are never needed for this same-origin form. Compare with the
  // Host the browser used: request.url can name a different host behind proxies or `next start`.
  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host')?.split(',')[0].trim() || request.headers.get('host') || new URL(request.url).host;
  if (origin && URL.parse(origin)?.host !== host) return fail('Please submit the form from our website.', 403);
  if (!request.headers.get('content-type')?.includes('application/json')) return fail('Invalid request format.', 415);
  if (Number(request.headers.get('content-length')) > maxBodyBytes) return fail('Your enquiry is too long.', 413);

  // Counted before any other work so floods of junk are throttled too.
  const ip = clientIp(request);
  const rate = await checkRateLimit(ip);
  if (!rate.allowed) return fail('You’ve sent several enquiries in a short time. Please try again later or contact us on WhatsApp.', 429, { 'Retry-After': String(rate.retryAfter) });

  let data: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > maxBodyBytes) return fail('Your enquiry is too long.', 413);
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return fail('Invalid enquiry.', 400);
    data = parsed as Record<string, unknown>;
  } catch { return fail('Invalid enquiry.', 400); }

  if (data.website) return fail('Unable to send this enquiry. Please contact us on WhatsApp.', 400);
  const field = (name: string) => typeof data[name] === 'string' ? data[name].trim() : '';
  const name = field('name'), email = field('email'), date = field('date');
  const location = field('location'), eventType = field('eventType'), notes = field('notes');
  const guests = field('guests'), waiters = field('waiters');
  if ([name, email, date, location, guests].some(value => hiddenCharacters.test(value)) || hiddenCharactersInNotes.test(notes)) return fail('Please remove line breaks or hidden characters from your details.', 400);
  if (!name || name.length > limits.name || !location || location.length > limits.location || notes.length > limits.notes) return fail('Please check your name, event location and notes.', 400);
  if (email.length > limits.email || !emailPattern.test(email)) return fail('Please enter a valid email address.', 400);
  if (!wholeNumberPattern.test(guests) || Number(guests) < 1 || Number(guests) > limits.guests) return fail('Please enter a valid guest count.', 400);
  if (!eventTypes.some(option => option === eventType)) return fail('Please choose your type of event.', 400);
  if (!waiterOptions.some(option => option === waiters)) return fail('Please let us know if you’ll need waiters.', 400);
  const eventDate = new Date(`${date}T00:00:00Z`);
  const today = new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(eventDate.getTime()) || eventDate.toISOString().slice(0, 10) !== date || date < today) return fail('Please choose today or a future event date.', 400);

  // Bot check runs only when Turnstile is configured, so the form keeps working before setup.
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  if (turnstileSecret) {
    const verdict = await verifyTurnstile(turnstileSecret, field(turnstileField), ip);
    if (verdict === 'unavailable') return fail('We couldn’t run our security check. Please try again or contact us on WhatsApp.', 503);
    if (verdict === 'failed') return fail('Please complete the security check and try again.', 403);
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ENQUIRY_FROM_EMAIL;
  const to = process.env.ENQUIRY_TO_EMAIL || 'geeschills@gmail.com';
  if (!apiKey || !from) return fail('Email enquiries are not available yet. Please contact us on WhatsApp.', 503);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from, to: [to], reply_to: email,
        subject: `GEES CHILLS enquiry — ${eventType} — ${date}`,
        text: `New website enquiry\n\nName: ${name}\nEmail: ${email}\nEvent type: ${eventType}\nEvent date: ${date}\nExpected guests: ${guests}\nLocation: ${location}\nWaiters needed: ${waiters}${waiters === 'No' ? '' : ' (additional cost)'}\n\nNotes: ${notes || 'None'}\n\nReply to this email to contact the customer.`,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return fail('We couldn’t send your enquiry. Please try again or contact us on WhatsApp.', 503);
    const result = await response.json();
    if (!result.id) return fail('We couldn’t confirm your enquiry. Please contact us on WhatsApp.', 503);
    return Response.json({ success: true });
  } catch { return fail('We couldn’t send your enquiry. Please try again or contact us on WhatsApp.', 503); }
}
