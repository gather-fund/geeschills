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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-GH"><body>{children}<WhatsAppBanner /></body></html>;
}
