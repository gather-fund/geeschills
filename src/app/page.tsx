import LandingPage from '@/components/landing-page';
import type { Metadata } from 'next';
import { site } from '../lib/site';

export const metadata: Metadata = { alternates: { canonical: '/' } };

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization', '@id': `${site.url}/#organization`,
      name: site.name, url: `${site.url}/`,
      logo: `${site.url}/apple-icon.png`,
      email: site.email, telephone: site.telephone,
      contactPoint: {
        '@type': 'ContactPoint', telephone: site.telephone,
        email: site.email, contactType: 'customer service',
        areaServed: 'GH', availableLanguage: 'English',
      },
    },
    {
      '@type': 'WebSite', '@id': `${site.url}/#website`,
      name: site.name, url: `${site.url}/`, inLanguage: 'en-GH',
      publisher: { '@id': `${site.url}/#organization` },
    },
    {
      '@type': 'Service', '@id': `${site.url}/#chilling-service`,
      name: 'Drinks chilling service for events in Ghana', serviceType: 'Drinks chilling service',
      description: site.description, url: `${site.url}/#packages`,
      provider: { '@id': `${site.url}/#organization` },
      areaServed: { '@type': 'Country', name: 'Ghana' },
    },
  ],
};

export default function Home() {
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} /><LandingPage /></>;
}
