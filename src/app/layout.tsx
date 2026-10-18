import type { Metadata } from 'next';
import './globals.css';
import WhatsAppBanner from '../components/whatsapp-banner';

export const metadata: Metadata = {
  title: 'GEES CHILLS — Good times. Cold drinks.',
  description: 'Small get-togethers, big celebrations and everything in between. Find the right GEES CHILLS cooler hire package for your event in Ghana.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<WhatsAppBanner /></body></html>;
}
