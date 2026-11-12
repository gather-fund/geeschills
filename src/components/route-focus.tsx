'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * After a client-side page change, moves focus to the new page's main heading so keyboard and
 * screen-reader users start at the new content instead of wherever the old page left them.
 */
export default function RouteFocus() {
  const pathname = usePathname();
  const lastPath = useRef(pathname);
  useEffect(() => {
    // Comparing paths (not a first-render flag) keeps the initial load untouched, even when effects run twice in development.
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    const heading = document.querySelector<HTMLElement>('main h1');
    if (!heading) return;
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }, [pathname]);
  return null;
}
