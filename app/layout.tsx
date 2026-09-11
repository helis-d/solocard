import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  metadataBase: new URL('https://solocard.app'),
  title: { default: 'SoloCard — Your identity, in one sharp card.', template: '%s — SoloCard' },
  description: 'Build a personal identity card that feels unmistakably yours. Design, share, and export your profile in minutes.',
  applicationName: 'SoloCard',
  keywords: ['digital identity card', 'personal profile', 'creator portfolio', 'digital business card'],
  openGraph: {
    title: 'SoloCard — Your identity, in one sharp card.',
    description: 'Build a personal identity card that feels unmistakably yours.',
    type: 'website',
    siteName: 'SoloCard',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SoloCard — Your identity, in one sharp card.',
    description: 'Build a personal identity card that feels unmistakably yours.',
  },
};

export const viewport = { themeColor: '#090b0d', colorScheme: 'dark' };

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="tr">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
