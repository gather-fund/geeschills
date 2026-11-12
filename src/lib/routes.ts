// The public pages, in navigation order. Paths end in "/" to match `trailingSlash: true` in next.config.ts.
export const routes = {
  home: '/',
  packages: '/packages/',
  howItWorks: '/how-it-works/',
  enquire: '/enquire/',
} as const;

/** Pages listed in the header and footer navigation. */
export const navLinks = [
  { label: 'Packages', href: routes.packages },
  { label: 'How it works', href: routes.howItWorks },
] as const;

/** Every public page, for the sitemap. */
export const publicPages: readonly string[] = Object.values(routes);

/** Whether `href` is the page at `pathname`; usePathname may or may not include the trailing slash. */
export function isCurrentPage(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  return pathname === href || `${pathname}/` === href;
}
