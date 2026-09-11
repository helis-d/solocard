import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'SoloCard — Digital Identity Card',
  description: 'Create and customize your personal digital identity card with dynamic visual themes, badges, skills, and links.',
  openGraph: {
    title: 'SoloCard — Digital Identity Card',
    description: 'Create and customize your personal digital identity card with dynamic visual themes, badges, skills, and links.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SoloCard — Digital Identity Card',
    description: 'Create and customize your personal digital identity card with dynamic visual themes, badges, skills, and links.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
