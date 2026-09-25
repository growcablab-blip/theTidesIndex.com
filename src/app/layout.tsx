import type { Metadata } from 'next';
import { Inter, Source_Serif_4 } from 'next/font/google';
import '@/styles/globals.css';
import { currentIndexingEnv, indexingAllowed } from '@/domain/publishing/indexing';

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

/*
 * Generated per request rather than exported as a constant.
 *
 * A module-level `metadata` object is evaluated once when the module loads, so
 * the indexing switch would be baked in at build time and an operator flipping
 * the environment variable would see no change until the next deploy. For a
 * switch whose failure mode is "the site is indexed when we thought it was
 * not", that is the wrong binding time.
 */
export function generateMetadata(): Metadata {
  const indexable = indexingAllowed(currentIndexingEnv());
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thetidesindex.com'),
    title: {
      default: 'The Tides Index',
      template: '%s · The Tides Index',
    },
    description: 'Independent peptide science & clinical reference.',
    applicationName: 'The Tides Index',
    authors: [{ name: 'The Tides Index' }],
    formatDetection: { telephone: false },
    // The favicon and touch icon are the logo's molecule mark (src/app/icon.png,
    // src/app/apple-icon.png), picked up by Next's file conventions.
    openGraph: {
      siteName: 'The Tides Index',
      images: [{ url: '/brand/tides-index-logo.png', width: 1200, height: 437, alt: 'The Tides Index' }],
    },
    robots: {
      /*
       * Nothing is indexable until the operator says so.
       *
       * Read from the same switch as robots.txt (src/domain/publishing/indexing.ts)
       * so the two cannot disagree. Lifting it is one deliberate act —
       * TIDES_ALLOW_INDEXING=1 in the deployment environment — and any other value,
       * including the variable being absent, keeps the site blocked.
       */
      index: indexable,
      follow: indexable,
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sourceSerif.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
