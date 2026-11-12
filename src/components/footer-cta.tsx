'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isCurrentPage, routes } from '../lib/routes';

/** The footer's call to action; on the enquiry page it points back up to the form instead of to itself. */
export default function FooterCta() {
  const onEnquiryPage = isCurrentPage(usePathname(), routes.enquire);
  return <div className="footer-cta">
    <p className="eyebrow"><span className="dot"></span> GOT AN EVENT COMING UP?</p>
    <h2>Let’s get <em>chilling.</em></h2>
    <p>Tell us the date, the place and the guest count. We’ll bring the coolers, the ice and the good times.</p>
    {onEnquiryPage
      ? <a className="button footer-button" href="#enquiry-form">Back to the form <span aria-hidden="true">↑</span></a>
      : <Link className="button footer-button" href={routes.enquire}>Plan your event <span aria-hidden="true">↗</span></Link>}
  </div>;
}
