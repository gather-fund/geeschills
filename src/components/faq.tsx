import type { FaqItem } from '../lib/faqs';

/** A list of questions for one page; the open and close animation lives in motion-effects.tsx. */
export default function Faq({ items }: { items: readonly FaqItem[] }) {
  return <section className="faq section"><p className="eyebrow">A FEW THINGS TO KNOW</p><h2>Before the good times.</h2>{items.map(item => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</section>;
}
