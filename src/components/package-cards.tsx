import Link from 'next/link';
import { Asterisk, Ring } from './icons';
import { routes } from '../lib/routes';

export const packages = [
  { id: 'Small get-together', number: '01 / THE CLOSE-KNIT CREW', icon: 'single', title: 'Small get-togethers', description: 'A birthday at home, a garden hangout or a catch-up with your favourite people. Keep the drinks cold and the hosting simple.', action: 'Enquire about small get-togethers' },
  { id: 'Big celebration', number: '02 / THE BIG MOMENTS', icon: 'double', title: 'Big celebrations', description: 'Weddings, milestone birthdays and celebrations that bring everyone together. Let’s find a package for your guest list.', action: 'Enquire about big celebrations' },
  { id: 'Something in between', number: '03 / SOMETHING ALL YOUR OWN', icon: 'ring', title: 'Everything in between', description: 'Office events, community occasions or a plan that doesn’t fit a box. Share the details and we’ll take it from there.', action: 'Enquire about your occasion' },
] as const;

const icons = { single: <Asterisk />, double: <><Asterisk /><Asterisk /></>, ring: <Ring /> };

// Each card sits in a flat .t-tilt wrapper so it can lean toward the mouse (see motion-effects.tsx).
export default function PackageCards() {
  return <div className="package-grid">{packages.map((item, index) => <div className="t-tilt" key={item.id}><article className={`t-tilt-card${index === 1 ? ' blue' : ''}`}>
    <span className="number">{item.number}</span><div aria-hidden="true" className={`event-icon${item.icon === 'double' ? ' double' : ''}`}>{icons[item.icon]}</div>
    <h3>{item.title}</h3><p>{item.description}</p>
    <Link className="package-link" href={routes.enquire}>{item.action}<span aria-hidden="true">↗</span></Link>
    <span className="t-tilt-glare" aria-hidden="true" />
  </article></div>)}</div>;
}
