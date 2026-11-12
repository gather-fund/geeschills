import type { ReactNode } from 'react';

/** A photo at two widths; `position` sets which part of the photo stays in frame when cropped. */
export type IntroPhoto = { small: string; large: string; alt: string; position?: string };

type Props = { eyebrow: string; title: ReactNode; intro: string; photo: IntroPhoto; children?: ReactNode };

/** Opening band for a sub page: its main heading and intro beside a photo. */
export default function PageIntro({ eyebrow, title, intro, photo, children }: Props) {
  return <section className="page-intro section">
    <div className="page-intro-copy"><p className="eyebrow"><span className="dot"></span> {eyebrow}</p><h1 className="page-title">{title}</h1><p className="page-intro-text">{intro}</p>{children}</div>
    <figure className="page-intro-photo"><img src={photo.large} srcSet={`${photo.small} 480w, ${photo.large} 720w`} sizes="(max-width: 620px) 90vw, 45vw" alt={photo.alt} width="720" height="1280" fetchPriority="high" style={photo.position ? { objectPosition: photo.position } : undefined} /></figure>
  </section>;
}
