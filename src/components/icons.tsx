// SVG marks replace the ✳ and ◎ characters, which some phones render as colour emoji.
// Sized in em so the existing font-size rules keep controlling them.
export function Asterisk({ className }: { className?: string }) {
  return <svg className={`mark${className ? ` ${className}` : ''}`} viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true" focusable="false"><path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93 4.93 19.07" /></svg>;
}

export function Ring({ className }: { className?: string }) {
  return <svg className={`mark${className ? ` ${className}` : ''}`} viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10.2" /><circle cx="12" cy="12" r="6.6" /></svg>;
}

export function InstagramIcon() {
  return <svg className="mark" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" focusable="false"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4.2" /><circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" /></svg>;
}

export function TikTokIcon() {
  return <svg className="mark" viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true" focusable="false"><path d="M16.6 2h-3.4v13.4a2.9 2.9 0 1 1-2.9-2.9c.3 0 .6 0 .9.1V9.1a6.4 6.4 0 1 0 5.4 6.3V8.6a8 8 0 0 0 4.4 1.4V6.6a4.5 4.5 0 0 1-4.4-4.6Z" /></svg>;
}
