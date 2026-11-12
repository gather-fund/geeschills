import Link from 'next/link';
import type { Metadata } from 'next';
import NextStep from '../../../components/next-step';
import PageIntro from '../../../components/page-intro';
import { routes } from '../../../lib/routes';

export const metadata: Metadata = {
  title: 'How It Works | GEES CHILLS',
  description: 'Booking ice-cold drinks for your event in Ghana takes three steps: tell us the plan, find your package and enjoy the good times.',
  alternates: { canonical: routes.howItWorks },
};

const photo = { small: '/assets/iced-beer-480.webp', large: '/assets/iced-beer-720.webp', alt: 'Green beer bottles nestled in chunky, glistening ice', position: 'center 70%' };

const steps = [
  { title: 'Tell us the plan', text: 'Your event date, location and expected guest count. A rough idea is a good start.' },
  { title: 'Find your package', text: 'We’ll discuss your drinks, the chilling you need and the extras you’d like, then agree the details and quote.' },
  { title: 'Bring on the good times', text: 'Confirm your booking and agreed arrangements. You focus on your guests.' },
];

export default function HowItWorksPage() {
  return <>
    <PageIntro eyebrow="LESS FUSS. MORE GOOD TIMES." title={<>Your event.<br /><em>Let’s chill.</em></>} intro="A few details are all it takes to start planning. Here’s how we go from your first message to ice-cold drinks." photo={photo}>
      <Link className="button" href={routes.enquire}>Start your enquiry <span aria-hidden="true">↗</span></Link>
    </PageIntro>
    <section className="steps-section section" aria-labelledby="steps-title">
      <div className="section-heading"><div><p className="eyebrow">THREE SIMPLE STEPS</p><h2 id="steps-title">From plan<br /><em>to pour.</em></h2></div><p>Tell us the basics. We’ll agree the details and your quote with you before the day.</p></div>
      <ol className="steps">{steps.map((step, index) => <li key={step.title}><span className="step-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><h3>{step.title}</h3><p>{step.text}</p></li>)}</ol>
    </section>
    <NextStep title="Browse the packages" text="Small get-togethers, big celebrations and everything in between." href={routes.packages} />
  </>;
}
