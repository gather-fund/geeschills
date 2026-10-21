'use client';
import { useState, type FormEvent } from 'react';

export default function AdminLogin() {
  const [error, setError] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get('password') ?? '');
    if (!password) { setError('Please enter the admin password.'); return; }
    setSigningIn(true); setError('');
    try {
      const response = await fetch('/api/admin/login/', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, next: new URLSearchParams(location.search).get('next') }),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not sign in. Please try again.');
      location.assign(result.next);
    } catch (problem) {
      setError(problem instanceof Error && problem.name !== 'TimeoutError' ? problem.message : 'Could not sign in. Please try again.');
      setSigningIn(false);
    }
  }
  return <form className="admin-login" onSubmit={signIn} noValidate>
    <img src="/assets/logo-mark.jpeg" alt="" width="345" height="411" />
    <p className="eyebrow">GEES CHILLS ADMIN</p>
    <h1>Sign in</h1>
    <label>Password<input type="password" name="password" autoComplete="current-password" required autoFocus aria-invalid={error ? true : undefined} aria-describedby={error ? 'login-error' : undefined} /></label>
    {error && <p className="field-error" id="login-error" role="alert">{error}</p>}
    <button className="button" type="submit" disabled={signingIn}>{signingIn ? 'Signing in…' : 'Sign in'} <span aria-hidden="true">↗</span></button>
  </form>;
}
