import Link from 'next/link';
import type { Metadata } from 'next';
import { Asterisk } from '../../components/icons';
import Occasions from '../../components/occasions';
import PromoFilm from '../../components/promo-film';
import { routes } from '../../lib/routes';
import { site } from '../../lib/site';

export const metadata: Metadata = { alternates: { canonical: routes.home } };

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization', '@id': `${site.url}/#organization`,
      name: site.name, url: `${site.url}/`,
      logo: `${site.url}/apple-icon.png`,
      email: site.email, telephone: site.telephone,
      sameAs: site.socials.map(social => social.url),
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
      description: site.description, url: `${site.url}${routes.packages}`,
      provider: { '@id': `${site.url}/#organization` },
      areaServed: { '@type': 'Country', name: 'Ghana' },
    },
  ],
};

const explore = [
  { label: 'THE PACKAGES', title: 'Find your package', text: 'Small get-togethers, big celebrations and everything in between.', href: routes.packages },
  { label: 'HOW IT WORKS', title: 'Three simple steps', text: 'From your first message to ice-cold drinks at your event.', href: routes.howItWorks },
  { label: 'ENQUIRE', title: 'Tell us your date', text: 'Share the date, place and guest count and we’ll take it from there.', href: routes.enquire },
];

export default function Home() {
  return <>
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
<section className="hero"><div className="hero-copy"><p className="eyebrow"><span className="dot"></span> DRINKS CHILLING SERVICE IN GHANA</p><h1>You bring<br />the people.<br /><em>We bring<br />the chill.</em></h1><p className="intro">Small get-togethers. Big celebrations. Whatever you’re planning, we’ll keep your drinks ice cold.</p><Link className="button" href={routes.packages}>Find your event package <span aria-hidden="true">↗</span></Link><a className="text-link" href="#film">Meet GEES CHILLS <span aria-hidden="true">▷</span></a></div><div className="hero-art"><picture><source media="(max-width: 620px)" srcSet="/assets/iced-beer-480.webp 480w, /assets/iced-beer-720.webp 720w" sizes="90vw" /><img src="/assets/iced-beer-720.webp" alt="Green beer bottles nestled in chunky, glistening ice" width="720" height="1280" fetchPriority="high" /></picture><span className="vertical-note">THE CHILL YOUR EVENT DESERVES</span><div className="hero-photo-caption"><span className="photo-kicker"><span className="dot"></span> THE GEES CHILLS FEELING</span><span className="image-tag">A little ice.<br />A lot of good times.</span><span className="photo-note">Your favourite drinks. A proper chill.</span></div></div></section>
<Occasions />
<section className="chill-story section" aria-labelledby="chill-story-title"><figure className="chill-photo"><img src="/assets/iced-malt-720.webp" srcSet="/assets/iced-malt-480.webp 480w, /assets/iced-malt-720.webp 720w" sizes="(max-width: 620px) 90vw, (max-width: 1440px) 45vw, 648px" alt="Malt drinks with green caps chilling among clear ice cubes" width="720" height="1280" loading="lazy" decoding="async" /><figcaption><span>ON ICE. READY FOR GOOD TIMES.</span><span aria-hidden="true"><Asterisk /></span></figcaption></figure><div className="chill-story-copy"><p className="eyebrow">THE LITTLE DETAILS. THE BIG DIFFERENCE.</p><h2 id="chill-story-title">Ice cold.<br />Guest ready.<br /><em>That’s the feeling.</em></h2><p>That first cold drink. The familiar faces. The moment everyone settles in. Make room for the little things that make a gathering feel good.</p><p>From malts to your favourite bottles, tell us what’s on the drinks list. We’ll help you find the right cooler setup for your occasion.</p><Link className="text-link" href={routes.packages}>Find your kind of chill <span aria-hidden="true">↗</span></Link><div className="chill-story-signoff"><span aria-hidden="true"><Asterisk /></span><span>GOOD TIMES.<br />SERVED CHILLED.</span></div></div></section>
<section className="explore section" aria-labelledby="explore-title"><div className="section-heading"><div><p className="eyebrow">PLAN IT YOUR WAY</p><h2 id="explore-title">Start with<br /><em>what you need.</em></h2></div><p>Browse the packages, see how booking works or tell us about your event straight away.</p></div><ul className="explore-grid">{explore.map((item, index) => <li key={item.href}><Link className="explore-card" href={item.href}><span className="number">{String(index + 1).padStart(2, '0')} / {item.label}</span><h3>{item.title}</h3><p>{item.text}</p><span className="explore-arrow" aria-hidden="true">↗</span></Link></li>)}</ul></section>
<section className="film section" id="film"><PromoFilm /><div><p className="eyebrow">MEET GEES CHILLS</p><h2>Cold drinks.<br />Warm company.<br /><em>Great memories.</em></h2><p>From the first guest to the last toast, cold drinks belong at the heart of a good gathering.</p><Link className="text-link" href={routes.howItWorks}>See how it works <span aria-hidden="true">↗</span></Link></div></section>
</>;
}
