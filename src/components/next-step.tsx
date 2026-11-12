import Link from 'next/link';

type Props = { title: string; text: string; href: string };

/** Closing link to the page a visitor most likely wants next, so no page ends in a dead end. */
export default function NextStep({ title, text, href }: Props) {
  return <section className="next-step section" aria-label="Up next"><p className="eyebrow">UP NEXT</p><Link className="next-step-link" href={href}>{title}<span aria-hidden="true">↗</span></Link><p>{text}</p></section>;
}
