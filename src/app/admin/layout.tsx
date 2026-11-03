import type { Metadata, Viewport } from 'next';

// Lets the admin be added to a tablet or phone home screen and open full screen like an app.
// The manifest and icons live outside /admin so the sign-in guard in src/proxy.ts doesn't block them.
export const metadata: Metadata = {
  manifest: '/admin.webmanifest',
  appleWebApp: { capable: true, title: 'GC Invoices', statusBarStyle: 'default' },
  icons: { apple: '/app-icons/apple-icon-180.png' },
};

export const viewport: Viewport = { themeColor: '#071e2b' };

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
