/**
 * The protocol guide library — the finished visual guides shown on the public
 * holding experience.
 *
 * A guide is owner-supplied artwork. This register carries only what is needed
 * to *present* that artwork: a name, the research area, which compounds the
 * guide covers, and one navigational sentence. It deliberately has no fields for
 * amounts, frequency, duration or route. Those live in the artwork itself, as
 * the owner prepared it, and are never retyped, regenerated or summarised here.
 *
 * To publish a guide:
 *   1. put the image in `public/guides/` (WebP or AVIF preferred, PNG accepted),
 *   2. set `artwork` below with its path and pixel dimensions,
 *   3. set `state` to 'ready'.
 *
 * Until then the guide shows a neutral placeholder and is not linked, so a
 * visitor never lands on an empty guide page.
 */

export type GuideState = 'ready' | 'in_preparation';

export interface GuideArtwork {
  /** Path under `public/`, e.g. `/guides/recovery-protocol.webp`. */
  readonly src: string;
  readonly width: number;
  readonly height: number;
  /**
   * What the image shows, for screen readers. Describe the layout of the guide,
   * not its medical content — the page around it says what it is.
   */
  readonly alt: string;
}

export interface ProtocolGuide {
  readonly slug: string;
  readonly title: string;
  /** The research area, in two to five words. */
  readonly focus: string;
  /** Compounds the guide covers, in the order the artwork presents them. */
  readonly compounds: readonly string[];
  /** One plain sentence about what the guide lets a reader do. Never a claim. */
  readonly description: string;
  readonly state: GuideState;
  readonly artwork: GuideArtwork | null;
  /** Accent used by the placeholder and card glow. Presentation only. */
  readonly accent: 'cyan' | 'indigo' | 'violet' | 'blue';
}

export const PROTOCOL_GUIDES: readonly ProtocolGuide[] = [
  {
    slug: 'recovery-protocol',
    title: 'Recovery Research Protocol',
    focus: 'Recovery & tissue repair',
    compounds: ['BPC-157', 'TB-500', 'GHK-Cu', 'KPV'],
    description:
      'A recovery-focused research protocol bringing four compounds together in one visual guide.',
    state: 'in_preparation',
    artwork: null,
    accent: 'cyan',
  },
];

/** A guide can be opened only when its artwork exists and it is marked ready. */
export function isGuideReady(
  guide: ProtocolGuide,
): guide is ProtocolGuide & { state: 'ready'; artwork: GuideArtwork } {
  return guide.state === 'ready' && guide.artwork !== null;
}

export function guideBySlug(slug: string): ProtocolGuide | null {
  return PROTOCOL_GUIDES.find((g) => g.slug === slug) ?? null;
}

export function guideHref(guide: ProtocolGuide): `/guides/${string}` {
  return `/guides/${guide.slug}`;
}

/**
 * Upcoming slots shown after the registered guides so the library reads as a
 * growing shelf rather than a single item. They name no protocol and no
 * compound — nothing is announced before the owner has made it.
 */
export const UPCOMING_GUIDE_SLOTS = 3;
