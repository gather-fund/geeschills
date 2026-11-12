import type { Metadata } from 'next';
import './globals.css';
import WhatsAppBanner from '../components/whatsapp-banner';
import { isPreview, site } from '../lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: site.title,
  description: site.description,
  applicationName: site.name,
  robots: {
    index: !isPreview,
    follow: true,
    googleBot: { index: !isPreview, follow: true, 'max-image-preview': 'large' },
  },
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
  openGraph: {
    type: 'website',
    locale: 'en_GH',
    url: '/',
    siteName: 'GEES CHILLS',
    title: 'GEES CHILLS — You bring the people. We bring the chill.',
    description: 'Drinks chilling service for get-togethers, weddings and celebrations in Ghana. Every event. The right package.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GEES CHILLS — You bring the people. We bring the chill.',
    description: 'Drinks chilling service for get-togethers, weddings and celebrations in Ghana.',
    images: [{ url: '/opengraph-image.jpg', alt: 'GEES CHILLS — You bring the people. We bring the chill. Drinks chilling service in Ghana.' }],
  },
};

// data-scroll-behavior lets Next.js jump straight to the top on page changes instead of smooth-scrolling.
// Runs before paint so revealed sections start hidden instead of flashing.
// If the page's motion script never starts (e.g. JavaScript fails), show everything after 2.5s.
const motionScript = `document.documentElement.classList.add('motion');setTimeout(function(){if(!window.__motionReady)document.documentElement.classList.remove('motion')},2500);`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-GH" data-scroll-behavior="smooth" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: motionScript }} /></head><body>{children}<WhatsAppBanner /></body></html>;
}
