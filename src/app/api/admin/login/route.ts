import { checkPassword, clearedSessionCookieHeader, safeNext, sameOrigin, sessionCookieHeader } from '../../../../lib/admin-auth';

export const runtime = 'nodejs';

const fail = (error: string, status: number, headers?: HeadersInit) => Response.json({ error }, { status, headers });

export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail('Please sign in from the admin page.', 403);
  let body: { password?: unknown; next?: unknown };
  try { body = await request.json(); } catch { return fail('Invalid request.', 400); }
  const password = typeof body.password === 'string' ? body.password : '';
  if (!password || password.length > 200) return fail('Please enter the admin password.', 400);
  const result = await checkPassword(request, password);
  if (!result.ok) return fail(result.error, result.status, result.retryAfter ? { 'Retry-After': String(result.retryAfter) } : undefined);
  return Response.json({ success: true, next: safeNext(body.next) }, { headers: { 'Set-Cookie': sessionCookieHeader(request) } });
}

// Signing out clears the cookie.
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return fail('Please sign out from the admin page.', 403);
  return Response.json({ success: true }, { headers: { 'Set-Cookie': clearedSessionCookieHeader(request) } });
}
