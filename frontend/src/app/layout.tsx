import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

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

interface RootLayoutProps {
  children: React.ReactNode;
}

const RootLayout: React.FC<RootLayoutProps> = ({ children }) => {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} dark h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-[#080b0a] text-zinc-100">
        {children}
      </body>
    </html>
  );
};

export default RootLayout;
