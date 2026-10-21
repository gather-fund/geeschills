import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { checkRateLimit, clientIp } from './rate-limit';

// Admin sign-in: a password form sets a signed, HttpOnly session cookie. No session store is
// needed: the cookie carries its expiry and an HMAC keyed by ADMIN_PASSWORD, so changing the
// password signs everyone out.
export const sessionCookie = 'gc_admin';
const sessionSeconds = 12 * 60 * 60;
const failedSignInLimit = 20;

export const adminConfigured = () => (process.env.ADMIN_PASSWORD ?? '').length >= 12;
const digest = (value: string) => createHash('sha256').update(value).digest();
const same = (a: string, b: string) => timingSafeEqual(digest(a), digest(b));
const sign = (value: string) => createHmac('sha256', digest(`gees-chills-admin-session:${process.env.ADMIN_PASSWORD}`)).update(value).digest('base64url');

// Secure only over HTTPS, so the cookie also works on a local http:// dev server.
const secure = (request: Request) => request.headers.get('x-forwarded-proto') === 'https' || new URL(request.url).protocol === 'https:';
const attributes = (request: Request, maxAge: number) => `Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure(request) ? '; Secure' : ''}`;

export function sessionCookieHeader(request: Request, now = Date.now()) {
  const expires = String(now + sessionSeconds * 1000);
  return `${sessionCookie}=${expires}.${sign(expires)}; ${attributes(request, sessionSeconds)}`;
}
export const clearedSessionCookieHeader = (request: Request) => `${sessionCookie}=; ${attributes(request, 0)}`;

export function hasSession(request: Request, now = Date.now()) {
  if (!adminConfigured()) return false;
  const pair = (request.headers.get('cookie') ?? '').split(/;\s*/).find(part => part.startsWith(`${sessionCookie}=`));
  const [expires, signature] = (pair?.slice(sessionCookie.length + 1) ?? '').split('.');
  if (!expires || !signature || !/^\d+$/.test(expires) || Number(expires) <= now) return false;
  return same(signature, sign(expires));
}

export async function checkPassword(request: Request, password: string): Promise<{ ok: true } | { ok: false; status: number; error: string; retryAfter?: number }> {
  if (!adminConfigured()) return { ok: false, status: 503, error: 'Admin sign-in is not set up yet. Set ADMIN_PASSWORD (at least 12 characters).' };
  const ip = clientIp(request);
  const attempts = { scope: 'admin-fail', limit: failedSignInLimit };
  // Checked before the password so a locked-out IP learns nothing from further guesses.
  const before = await checkRateLimit(ip, { ...attempts, consume: false });
  if (!before.allowed) return { ok: false, status: 429, error: 'Too many incorrect attempts. Please try again in an hour.', retryAfter: before.retryAfter };
  if (same(password, process.env.ADMIN_PASSWORD!)) return { ok: true };
  await checkRateLimit(ip, attempts);
  return { ok: false, status: 401, error: 'That password isn’t right.' };
}

// Only ever return to an admin page after signing in, never to another site.
export const safeNext = (next: unknown) => typeof next === 'string' && /^\/admin\/[\w\-/]*$/.test(next) && !next.startsWith('/admin/login') ? next : '/admin/invoice/';

// Browsers send the session cookie automatically, so state-changing admin requests must come from this site.
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host')?.split(',')[0].trim() || request.headers.get('host') || new URL(request.url).host;
  return Boolean(origin) && URL.parse(origin!)?.host === host;
}
