import type { Metadata } from 'next';
import InvoiceBuilder from '../../../components/invoice-builder';

// Password protected by src/proxy.ts and never indexed.
export const metadata: Metadata = { title: 'Invoice | GEES CHILLS admin', robots: { index: false, follow: false } };

export default function InvoicePage() {
  return <main id="main" className="admin"><InvoiceBuilder /></main>;
}
