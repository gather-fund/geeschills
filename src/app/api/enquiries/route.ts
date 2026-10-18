import { packages } from '../../../components/package-cards';

export const runtime = 'nodejs';

const fail = (error: string, status: number) => Response.json({ error }, { status });

export async function POST(request: Request) {
  // Cross-site browser submissions are never needed for this same-origin form.
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return fail('Please submit the form from our website.', 403);
  if (!request.headers.get('content-type')?.includes('application/json')) return fail('Invalid request format.', 415);
  let data: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 12000) return fail('Your enquiry is too long.', 413);
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return fail('Invalid enquiry.', 400);
    data = parsed as Record<string, unknown>;
  } catch { return fail('Invalid enquiry.', 400); }

  if (data.website) return fail('Unable to send this enquiry. Please contact us on WhatsApp.', 400);
  const field = (name: string) => typeof data[name] === 'string' ? data[name].trim() : '';
  const name = field('name'), email = field('email'), date = field('date');
  const location = field('location'), eventPackage = field('package'), notes = field('notes');
  const guests = field('guests');
  if (!name || name.length > 100 || !location || location.length > 200 || notes.length > 1000) return fail('Please check your name, event location and notes.', 400);
  if (email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) return fail('Please enter a valid email address.', 400);
  if (!/^\d+$/.test(guests) || Number(guests) < 1 || Number(guests) > 100000) return fail('Please enter a valid guest count.', 400);
  if (!packages.some(item => item.id === eventPackage)) return fail('Please choose an event package.', 400);
  const eventDate = new Date(`${date}T00:00:00Z`);
  const today = new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(eventDate.getTime()) || eventDate.toISOString().slice(0, 10) !== date || date < today) return fail('Please choose today or a future event date.', 400);

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ENQUIRY_FROM_EMAIL;
  const to = process.env.ENQUIRY_TO_EMAIL || 'gloriaamankrahyeboah97@gmail.com';
  if (!apiKey || !from) return fail('Email enquiries are not available yet. Please contact us on WhatsApp.', 503);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from, to: [to], reply_to: email,
        subject: `GEES CHILLS enquiry — ${eventPackage} — ${date}`,
        text: `New website enquiry\n\nName: ${name}\nEmail: ${email}\nPackage: ${eventPackage}\nEvent date: ${date}\nExpected guests: ${guests}\nLocation: ${location}\n\nNotes: ${notes || 'None'}\n\nReply to this email to contact the customer.`,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return fail('We couldn’t send your enquiry. Please try again or contact us on WhatsApp.', 502);
    const result = await response.json();
    if (!result.id) return fail('We couldn’t confirm your enquiry. Please contact us on WhatsApp.', 502);
    return Response.json({ success: true });
  } catch { return fail('We couldn’t send your enquiry. Please try again or contact us on WhatsApp.', 502); }
}
