"use client";
import { useEffect } from 'react';

// Visible transitions for the landing page (transitions-dev: texts reveal,
// accordion expand, card hover tilt). Works on the page's existing markup;
// the matching styles are at the end of globals.css.

const REVEAL_GROUPS = [
  '.hero-copy', '.hero-art', '.occasions', '.section-heading', '.package-grid',
  '.chill-photo', '.chill-story-copy', '.how > div:first-child', '.how ol',
  '.video-frame', '.film > div:last-child', '.enquiry > div:first-child', '.enquiry form', '.faq', '.footer-cta',
].join(',');

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const TILT_MAX = 14; // degrees at the card edges

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function MotionEffects() {
  useEffect(() => {
    (window as Window & { __motionReady?: boolean }).__motionReady = true;
    const cleanups: Array<() => void> = [];

    // 1. Reveal each group the first time it scrolls into view.
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-shown');
        io.unobserve(entry.target);
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    document.querySelectorAll(REVEAL_GROUPS).forEach((el) => io.observe(el));
    cleanups.push(() => io.disconnect());

    // 2. FAQ answers grow open and fade in, then shrink closed.
    document.querySelectorAll<HTMLDetailsElement>('.faq details').forEach((details) => {
      const summary = details.querySelector('summary');
      const answer = details.querySelector<HTMLElement>(':scope > p');
      if (!summary || !answer) return;
      let running: Animation | null = null;
      const onClick = (e: MouseEvent) => {
        if (reduceMotion()) return; // native instant toggle
        e.preventDefault();
        running?.cancel();
        const margin = getComputedStyle(answer).marginBottom;
        if (!details.open) {
          details.open = true;
          running = answer.animate(
            [
              { height: '0px', marginBottom: '0px', opacity: 0, filter: 'blur(4px)' },
              { height: `${answer.scrollHeight}px`, marginBottom: margin, opacity: 1, filter: 'blur(0px)' },
            ],
            { duration: 450, easing: EASE },
          );
        } else {
          details.classList.add('is-closing');
          running = answer.animate(
            [
              { height: `${answer.offsetHeight}px`, marginBottom: margin, opacity: 1, filter: 'blur(0px)' },
              { height: '0px', marginBottom: '0px', opacity: 0, filter: 'blur(4px)' },
            ],
            { duration: 300, easing: EASE },
          );
          running.onfinish = () => {
            details.open = false;
            details.classList.remove('is-closing');
          };
        }
      };
      summary.addEventListener('click', onClick);
      cleanups.push(() => summary.removeEventListener('click', onClick));
    });

    // 3. Package cards lean toward the mouse with a light glare.
    document.querySelectorAll<HTMLElement>('.t-tilt').forEach((tilt) => {
      const card = tilt.querySelector<HTMLElement>('.t-tilt-card');
      if (!card) return;
      const reset = () => {
        tilt.classList.remove('is-hover');
        card.classList.remove('is-tilting');
        card.style.setProperty('--tilt-rx', '0deg');
        card.style.setProperty('--tilt-ry', '0deg');
      };
      const track = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse' || reduceMotion()) return;
        const r = tilt.getBoundingClientRect();
        const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
        const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
        tilt.classList.add('is-hover');
        card.classList.add('is-tilting');
        card.style.setProperty('--tilt-ry', `${((px - 0.5) * TILT_MAX).toFixed(2)}deg`);
        card.style.setProperty('--tilt-rx', `${((0.5 - py) * TILT_MAX).toFixed(2)}deg`);
        card.style.setProperty('--tilt-gx', `${(px * 100).toFixed(1)}%`);
        card.style.setProperty('--tilt-gy', `${(py * 100).toFixed(1)}%`);
      };
      const leave = (e: PointerEvent) => { if (e.pointerType === 'mouse') reset(); };
      tilt.addEventListener('pointermove', track);
      tilt.addEventListener('pointerleave', leave);
      cleanups.push(() => {
        tilt.removeEventListener('pointermove', track);
        tilt.removeEventListener('pointerleave', leave);
      });
    });

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return null;
}
