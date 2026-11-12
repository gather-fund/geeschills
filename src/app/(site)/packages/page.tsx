import type { Metadata } from 'next';
import Faq from '../../../components/faq';
import NextStep from '../../../components/next-step';
import Occasions from '../../../components/occasions';
import PackageCards from '../../../components/package-cards';
import PageIntro from '../../../components/page-intro';
import { packageFaqs } from '../../../lib/faqs';
import { routes } from '../../../lib/routes';

export const metadata: Metadata = {
  title: 'Event Packages | GEES CHILLS',
  description: 'Drinks chilling packages for small get-togethers, big celebrations and everything in between in Ghana. Ice, coolers, delivery and setup quoted around your event.',
  alternates: { canonical: routes.packages },
};

const photo = { small: '/assets/iced-malt-480.webp', large: '/assets/iced-malt-720.webp', alt: 'Malt drinks with green caps chilling among clear ice cubes', position: 'center 40%' };

export default function PackagesPage() {
  return <>
    <PageIntro eyebrow="YOUR PEOPLE. YOUR OCCASION." title={<>Every event.<br /><em>The right package.</em></>} intro="Tell us what you have in mind. We’ll help you plan the chilling setup around your gathering, your drinks and your day." photo={photo}>
      <a className="text-link" href="#package-list">See the three packages <span aria-hidden="true">↓</span></a>
    </PageIntro>
    <Occasions />
    <section className="packages section" id="package-list" aria-labelledby="package-list-title">
      <div className="section-heading"><div><p className="eyebrow">THREE WAYS TO CHILL</p><h2 id="package-list-title">Pick your <em>kind of chill.</em></h2></div><p>Every package is quoted around your guest count, your drinks and the extras you’d like.</p></div>
      <PackageCards />
      <p className="package-note">Packages are quoted around your event. Ask about ice, delivery, setup and collection when you enquire.</p>
    </section>
    <Faq items={packageFaqs} />
    <NextStep title="See how it works" text="Three steps from your first message to ice-cold drinks at your event." href={routes.howItWorks} />
  </>;
}
