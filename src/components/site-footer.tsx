import Link from 'next/link';
import FooterCta from './footer-cta';
import { Fragment, type ReactNode } from 'react';
import { Asterisk, InstagramIcon, TikTokIcon } from './icons';
import { site } from '../lib/site';
import { navLinks, routes } from '../lib/routes';

// The page id the floating WhatsApp button watches, so it steps aside here as it does for the form.
export const FOOTER_ID = 'site-footer';

const MARQUEE_PHRASES = ['Ice cold', 'Guest ready', 'Good times', 'Served chilled', 'Every event'];

const socialIcons: Record<(typeof site.socials)[number]['name'], ReactNode> = { Instagram: <InstagramIcon />, TikTok: <TikTokIcon /> };

const contacts = [
  { label: 'WhatsApp', value: '+233 27 794 6635', href: 'https://wa.me/233277946635', external: true },
  { label: 'Call', value: '+233 20 226 2120', href: `tel:${site.telephone}`, external: false },
  { label: 'Email', value: site.email, href: `mailto:${site.email}`, external: false },
];

const explore = [
  { label: 'Home', href: routes.home },
  ...navLinks,
  { label: 'Enquire', href: routes.enquire },
];

/** Site footer: closing call to action, and contact and social links. */
export default function SiteFooter() {
  // The phrases run twice so the strip can loop without a gap; the copy is decorative.
  const marqueeRun = MARQUEE_PHRASES.map(phrase => <Fragment key={phrase}><span>{phrase}</span><Asterisk /></Fragment>);
  return <footer className="site-footer" id={FOOTER_ID}>
    <div className="footer-marquee" aria-hidden="true"><div className="footer-marquee-track"><span>{marqueeRun}</span><span>{marqueeRun}</span></div></div>
    <div className="footer-inner">
      <FooterCta />
      <div className="footer-columns">
        <div>
          <h3 className="footer-label">Talk to us</h3>
          <ul className="footer-list">{contacts.map(contact => <li key={contact.label}><a href={contact.href} {...(contact.external && { target: '_blank', rel: 'noopener noreferrer' })}><small>{contact.label}</small>{contact.value}</a></li>)}</ul>
        </div>
        <div>
          <h3 className="footer-label">Follow the chill</h3>
          <ul className="footer-socials">{site.socials.map(social => <li key={social.name}><a href={social.url} target="_blank" rel="noopener noreferrer" aria-label={`${social.name} ${social.handle} (opens in a new tab)`}><span className="footer-social-icon">{socialIcons[social.name]}</span><span><small>{social.name}</small>{social.handle}</span><span className="footer-social-arrow" aria-hidden="true">↗</span></a></li>)}</ul>
        </div>
        <div>
          <h3 className="footer-label">Explore</h3>
          <ul className="footer-list footer-explore">{explore.map(link => <li key={link.href}><Link href={link.href}>{link.label}</Link></li>)}</ul>
        </div>
      </div>
    </div>
    <div className="footer-base"><span>© GEES CHILLS · Drinks chilling service in Ghana</span><span>Good times. Cold drinks.</span><a href="#">Back to top <span aria-hidden="true">↑</span></a></div>
  </footer>;
}
