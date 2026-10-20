import { Asterisk, Ring } from './icons';

export const packages = [
  { id: 'Small get-together', number: '01 / THE CLOSE-KNIT CREW', icon: 'single', title: 'Small get-togethers', description: 'A birthday at home, a garden hangout or a catch-up with your favourite people. Keep the drinks cold and the hosting simple.', action: 'Plan a little gathering' },
  { id: 'Big celebration', number: '02 / THE BIG MOMENTS', icon: 'double', title: 'Big celebrations', description: 'Weddings, milestone birthdays and celebrations that bring everyone together. Let’s find a package for your guest list.', action: 'Plan a big occasion' },
  { id: 'Something in between', number: '03 / SOMETHING ALL YOUR OWN', icon: 'ring', title: 'Everything in between', description: 'Office events, community occasions or a plan that doesn’t fit a box. Share the details and we’ll take it from there.', action: 'Make it your own' },
] as const;

const icons = { single: <Asterisk />, double: <><Asterisk /><Asterisk /></>, ring: <Ring /> };

export default function PackageCards({ onSelect }: { onSelect: () => void }) {
  return <div className="package-grid">{packages.map((item, index) => <article className={index === 1 ? 'blue' : undefined} key={item.id}>
    <span className="number">{item.number}</span><div aria-hidden="true" className={`event-icon${item.icon === 'double' ? ' double' : ''}`}>{icons[item.icon]}</div>
    <h3>{item.title}</h3><p>{item.description}</p>
    <button type="button" className="package-link" onClick={onSelect}>{item.action}<span aria-hidden="true">↗</span></button>
  </article>)}</div>;
}
