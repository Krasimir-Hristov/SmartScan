import type { Metadata } from 'next';
import { Space_Grotesk, Manrope, JetBrains_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { QueryProvider } from '@/components/providers/QueryProvider';
import './globals.css';

// ─── Design System Fonts ──────────────────────────────────────────────────────
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

// ─── SEO Metadata ─────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: 'SmartScan Stay | 24/7 Polyglot AI Concierge for Luxury Vacation Rentals',
  description:
    'Turn your property manual into a 24/7 polyglot AI concierge in 60 seconds. Instant camera QR scan, zero app installs, and sub-second streaming answers in 50+ languages.',
  keywords: [
    'SmartScan Stay',
    'AI Concierge',
    'Airbnb manual',
    'vacation rental guest guide',
    'QR code property manual',
    'luxury villa guide',
  ],
  openGraph: {
    title: 'SmartScan Stay | 24/7 Polyglot AI Concierge in 60 Seconds',
    description:
      'Guests scan an instant QR. Fast AI answers guest queries 24/7 in their native language with Zero App installs.',
    type: 'website',
  },
};

// ─── Root Layout ──────────────────────────────────────────────────────────────
interface RootLayoutProps {
  children: React.ReactNode;
}

const RootLayout = async ({ children }: RootLayoutProps) => {
  const locale = await getLocale();
  const messages = await getMessages();

  const fontClasses = [
    spaceGrotesk.variable,
    manrope.variable,
    jetBrainsMono.variable,
  ].join(' ');

  return (
    <html lang={locale} className={`${fontClasses} dark h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-[#09090b] text-zinc-100">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <QueryProvider>
            {children}
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
};

export default RootLayout;
