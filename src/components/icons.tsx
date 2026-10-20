// SVG marks replace the ✳ and ◎ characters, which some phones render as colour emoji.
// Sized in em so the existing font-size rules keep controlling them.
export function Asterisk({ className }: { className?: string }) {
  return <svg className={`mark${className ? ` ${className}` : ''}`} viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true" focusable="false"><path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93 4.93 19.07" /></svg>;
}

export function Ring({ className }: { className?: string }) {
  return <svg className={`mark${className ? ` ${className}` : ''}`} viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10.2" /><circle cx="12" cy="12" r="6.6" /></svg>;
}
