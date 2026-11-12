'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isCurrentPage, navLinks, routes } from '../lib/routes';

/** Shared header for the public pages; marks the page the visitor is on. */
export default function SiteHeader() {
  const pathname = usePathname();
  const current = (href: string) => (isCurrentPage(pathname, href) ? 'page' : undefined);
  return <header>
    <Link className="brand" href={routes.home} aria-label="GEES CHILLS home"><span className="logo"><img src="/assets/logo-mark.jpeg" alt="GEES CHILLS" width="345" height="411" /></span><span>GEES CHILLS<small>GOOD TIMES. COLD DRINKS.</small></span></Link>
    <nav aria-label="Main navigation">
      {navLinks.map(link => <Link key={link.href} href={link.href} aria-current={current(link.href)}>{link.label}</Link>)}
      <Link className="button small" href={routes.enquire} aria-current={current(routes.enquire)}>Let’s plan your chill <span aria-hidden="true">↗</span></Link>
    </nav>
  </header>;
}
