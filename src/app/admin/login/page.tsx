import type { Metadata } from 'next';
import AdminLogin from '../../../components/admin-login';

export const metadata: Metadata = { title: 'Sign in | GEES CHILLS admin', robots: { index: false, follow: false } };

export default function LoginPage() {
  return <main id="main" className="admin admin-login-page"><AdminLogin /></main>;
}
