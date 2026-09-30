import { JetBrains_Mono } from 'next/font/google';
import { ShowcaseFooter, ShowcaseHeader } from '@/components/showcase/showcase-chrome';
import { ShowcaseMotion } from '@/components/showcase/showcase-motion';
import './showcase.css';

/**
 * The public holding experience.
 *
 * A separate route group with its own chrome and stylesheet, so the research
 * application under `(public)` keeps its layout, reading modes and styles
 * exactly as they were. Indexing is still governed by the root layout's single
 * switch — nothing here changes it.
 */

const mono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sx-mono',
  weight: ['400', '500'],
});

/*
 * Marks the experience root before first paint, so below-the-fold sections can
 * start hidden and reveal on scroll without flashing. If script never runs,
 * nothing is hidden. The root suppresses the hydration warning for exactly this
 * one attribute, which the server cannot know about.
 */
const MOTION_FLAG = `document.currentScript.parentElement.setAttribute('data-motion','')`;

export default function ShowcaseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`sx ${mono.variable}`} suppressHydrationWarning>
      <script dangerouslySetInnerHTML={{ __html: MOTION_FLAG }} />
      <ShowcaseHeader />
      <main id="main">{children}</main>
      <ShowcaseFooter />
      <ShowcaseMotion />
    </div>
  );
}
