// Talks to the Google Sheet's Apps Script web app (scripts/google-sheets-orders.gs).
export type SheetResult = { ok: true; data: Record<string, unknown> } | { ok: false; status: number; error: string };

export async function sheetRequest(payload: Record<string, unknown>): Promise<SheetResult> {
  const url = process.env.SHEETS_WEBHOOK_URL, secret = process.env.SHEETS_WEBHOOK_SECRET;
  if (!url || !secret) return { ok: false, status: 503, error: 'The Google Sheet is not connected yet. See ADMIN_SETUP.md.' };
  // Only ever post to Google Apps Script, so a mistyped variable cannot send invoices elsewhere.
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url)) return { ok: false, status: 503, error: 'SHEETS_WEBHOOK_URL must be the Apps Script web app URL ending in /exec.' };
  try {
    // Apps Script answers through a redirect; fetch follows it and returns the script's JSON.
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ secret, ...payload }), signal: AbortSignal.timeout(20000) });
    const result = await response.json().catch(() => undefined) as Record<string, unknown> | undefined;
    if (response.ok && result?.ok === true) return { ok: true, data: result };
    console.error('Google Sheet request failed:', payload.action, response.status, result?.error);
    if (result?.error === 'unauthorized') return { ok: false, status: 502, error: 'The Google Sheet rejected the connection secret. Check SHEETS_WEBHOOK_SECRET.' };
    if (result?.error === 'unknown invoice') return { ok: false, status: 404, error: 'That invoice number is not in the register.' };
    if (result?.error === 'not confirmed') return { ok: false, status: 409, error: 'Mark the invoice as confirmed before marking it paid.' };
    return { ok: false, status: 502, error: 'The Google Sheet could not complete this. Please try again.' };
  } catch { return { ok: false, status: 502, error: 'Could not reach the Google Sheet. Please try again.' }; }
}
