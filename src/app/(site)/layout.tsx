import SiteHeader from '../../components/site-header';
import SiteFooter from '../../components/site-footer';
import MotionEffects from '../../components/motion-effects';
import RouteFocus from '../../components/route-focus';

/** Header, footer and scroll effects shared by every public page. */
export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>
    <a className="skip" href="#main">Skip to content</a>
    <SiteHeader />
    <main id="main">{children}</main>
    <SiteFooter />
    <MotionEffects />
    <RouteFocus />
  </>;
}
