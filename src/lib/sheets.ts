// Talks to the Google Sheet's Apps Script web app (scripts/google-sheets-orders.gs).
export type SheetResult = { ok: true; data: Record<string, unknown> } | { ok: false; status: number; error: string };

// 424 (failed dependency) rather than 502: Cloudflare replaces 502 responses with its own error
// page, which would hide these messages from the admin page.
const failed = (error: string): SheetResult => ({ ok: false, status: 424, error });
export const outdatedScript = 'The Google Sheet is running an older version of the script. In Apps Script choose Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy, then try again.';

export async function sheetRequest(payload: Record<string, unknown>): Promise<SheetResult> {
  const url = process.env.SHEETS_WEBHOOK_URL, secret = process.env.SHEETS_WEBHOOK_SECRET;
  if (!url || !secret) return { ok: false, status: 503, error: 'The Google Sheet is not connected yet. See ADMIN_SETUP.md.' };
  // Only ever post to Google Apps Script, so a mistyped variable cannot send invoices elsewhere.
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url)) return { ok: false, status: 503, error: 'SHEETS_WEBHOOK_URL must be the Apps Script web app URL ending in /exec.' };
  let response: Response;
  try {
    // Apps Script answers through a redirect; fetch follows it and returns the script's JSON.
    response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ secret, ...payload }), signal: AbortSignal.timeout(20000) });
  } catch (error) {
    console.error('Google Sheet unreachable:', payload.action, error);
    return failed(error instanceof Error && error.name === 'TimeoutError' ? 'The Google Sheet took too long to answer. Check the register before trying again.' : 'Could not reach the Google Sheet. Please try again.');
  }
  const body = await response.text();
  let result: Record<string, unknown> | undefined;
  try { result = JSON.parse(body); } catch {}
  if (response.ok && result?.ok === true) return { ok: true, data: result };
  console.error('Google Sheet request failed:', payload.action, response.status, result?.error ?? body.slice(0, 200));
  if (!result) {
    // A web page instead of JSON is Google's sign-in or error page: the deployment is not public.
    if (!response.ok) return failed(`Google answered with an error (HTTP ${response.status}). Check SHEETS_WEBHOOK_URL is the current web app URL and the deployment still exists.`);
    return failed('Google returned a sign-in page instead of the script’s reply. In Apps Script open Deploy → Manage deployments, and set “Who has access” to “Anyone” (not “Anyone with Google account”).');
  }
  if (result.error === 'unauthorized') return failed('The Google Sheet rejected the connection secret. Make sure the script property WEBHOOK_SECRET exactly matches SHEETS_WEBHOOK_SECRET on Vercel.');
  if (result.error === 'unknown invoice') return { ok: false, status: 404, error: 'That invoice number is not in the register.' };
  if (result.error === 'not confirmed') return { ok: false, status: 409, error: 'Mark the invoice as confirmed before marking it paid.' };
  if (result.error === 'unknown action') return failed(outdatedScript);
  return failed('The Google Sheet script hit an error. In Apps Script open Executions (the list icon on the left) to see what went wrong.');
}
