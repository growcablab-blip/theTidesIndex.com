import type { Metadata } from 'next';
import { Inter, Source_Serif_4 } from 'next/font/google';
import '@/styles/globals.css';

/**
 * Typography.
 *
 * A humanist serif for headings and a neutral sans for interface and body, both
 * open-licensed and self-hosted by next/font. The serif does the work of making
 * the product read as a reference rather than an application; the sans keeps
 * dense evidence tables legible. Tabular numerals are enabled where numbers are
 * compared.
 */
const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-source-serif',
  axes: ['opsz'],
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thetidesindex.com'),
  title: {
    default: 'The Tides Index',
    template: '%s · The Tides Index',
  },
  description: 'Independent peptide science & clinical reference.',
  applicationName: 'The Tides Index',
  authors: [{ name: 'The Tides Index' }],
  formatDetection: { telephone: false },
  robots: {
    // Nothing is indexable while the reference is still being built. Lifted at
    // launch, once reviewed content exists to index.
    index: false,
    follow: false,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sourceSerif.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
