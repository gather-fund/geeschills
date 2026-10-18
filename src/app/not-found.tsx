import Link from 'next/link';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Page not found | GEES CHILLS', robots: { index: false, follow: true } };
export default function NotFound() {
  return <main className="section"><p className="eyebrow">GEES CHILLS</p><h1>This page has<br/>stepped out.</h1><p>Head home to find the right package for your event.</p><Link className="button" href="/">Back to home ↗</Link></main>;
}
