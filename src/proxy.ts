import { NextResponse, type NextRequest } from 'next/server';
import { hasSession } from './lib/admin-auth';

// Admin pages need a signed-in session; without one, pages go to the sign-in form and the API
// answers 401. The orders API checks the session again itself, so a matcher mistake cannot expose it.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/admin/login') || pathname.startsWith('/api/admin/login')) return;
  if (hasSession(request)) return;
  if (pathname.startsWith('/api/')) return Response.json({ error: 'Please sign in again.' }, { status: 401 });
  const login = request.nextUrl.clone();
  login.pathname = '/admin/login/';
  login.search = `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
