'use client';
import { useEffect, useRef, useState } from 'react';

/** The promo video, which loads nothing until the visitor presses play. */
export default function PromoFilm() {
  const [started, setStarted] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  function play() {
    setStarted(true);
    // Autoplay can be refused; the controls are shown either way so the visitor can retry.
    video.current?.play().catch(() => {});
  }
  // The video only becomes focusable once React has added its controls.
  useEffect(() => { if (started) video.current?.focus(); }, [started]);
  return <div className="video-frame"><video ref={video} controls={started} playsInline preload="none" poster="/assets/promo-v10-poster.jpg" aria-label="GEES CHILLS 24-second promotional video" onPlay={() => setStarted(true)} onClick={started ? undefined : play}><source src="/assets/promo-v10.mp4" type="video/mp4" />Your browser does not support video.</video>{!started && <button type="button" className="play-button" onClick={play}><span className="play-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M8 5.5v13l10.5-6.5L8 5.5Z" /></svg></span><span>Play the film <small>0:24</small></span></button>}</div>;
}
