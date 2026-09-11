import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thetidesindex.com'),
  title: {
    default: 'The Tides Index',
    template: '%s · The Tides Index',
  },
  description: 'Independent peptide science & clinical reference.',
  robots: {
    // Nothing is indexable until reviewed content exists.
    index: false,
    follow: false,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
