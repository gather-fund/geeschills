// Cloudflare Turnstile server-side check. The widget only runs when both keys are configured.
export const turnstileField = 'cf-turnstile-response';

export async function verifyTurnstile(secret: string, token: string, ip: string): Promise<'passed' | 'failed' | 'unavailable'> {
  // Cloudflare tokens are at most 2048 characters.
  if (!token || token.length > 2048) return 'failed';
  const body = new URLSearchParams({ secret, response: token });
  if (ip !== 'unknown') body.set('remoteip', ip);
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body, signal: AbortSignal.timeout(10000) });
    if (!response.ok) return 'unavailable';
    const result = await response.json() as { success?: unknown };
    return result.success === true ? 'passed' : 'failed';
  } catch { return 'unavailable'; }
}
