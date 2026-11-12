import type { Metadata } from 'next';
import EnquiryForm from '../../../components/enquiry-form';
import Faq from '../../../components/faq';
import { enquiryFaqs } from '../../../lib/faqs';
import { routes } from '../../../lib/routes';
import { site } from '../../../lib/site';

export const metadata: Metadata = {
  title: 'Enquire About Your Event | GEES CHILLS',
  description: 'Tell GEES CHILLS your event date, location and guest count, and we’ll help you find the right drinks chilling package.',
  alternates: { canonical: routes.enquire },
};

export default function EnquirePage() {
  return <>
    <section className="enquiry section" id="enquire"><div><p className="eyebrow">GOT A DATE IN MIND?</p><h1 className="page-title">Let’s make<br />it <em>chilled.</em></h1><p>Tell us a little about your event and we’ll help you find the right package.</p><div className="contact-stub"><strong>Let’s talk about your event</strong><a className="contact-link" href="https://wa.me/233277946635" target="_blank" rel="noopener noreferrer"><span><small>WhatsApp</small>+233 27 794 6635</span><span aria-hidden="true">↗</span></a><a className="contact-link" href={`mailto:${site.email}`}><span><small>Email</small>{site.email}</span><span aria-hidden="true">↗</span></a></div></div><EnquiryForm /></section>
    <Faq items={enquiryFaqs} />
  </>;
}
