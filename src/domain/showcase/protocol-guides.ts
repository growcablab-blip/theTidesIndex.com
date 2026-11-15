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
  /**
   * Register slugs for the compounds above that have a published record.
   *
   * Slugs, never display names. The register holds "Thymosin beta-4" as an
   * alias of `tb-500` and vice versa, so matching a guide's printed name
   * against the register resolves TB-500 to the wrong compound — the exact
   * conflation the combination page exists to refuse. A slug cannot do that.
   *
   * Shorter than `compounds` wherever the guide names something the register
   * does not yet carry. A name without a slug simply does not become a link;
   * nothing is invented to make one.
   */
  readonly compoundSlugs: readonly string[];
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
    title: 'Recovery & Tissue Repair',
    focus: 'Repair · recover · move forward',
    compounds: ['BPC-157', 'TB-500', 'GHK-Cu', 'KPV'],
    compoundSlugs: ['bpc-157', 'tb-500', 'ghk-cu', 'kpv'],
    description:
      'A research-focused protocol designed to support tissue repair, modulate inflammatory signaling and promote recovery.',
    state: 'ready',
    artwork: { src: '/guides/recovery-protocol.webp', width: 3200, height: 4141, alt: 'The Tides Index Recovery & Tissue Repair protocol card: compound panels, preparation steps, protocol options and research context.' },
    accent: 'cyan',
  },
  {
    slug: 'appetite-weight-protocol',
    title: 'Appetite & Weight Management',
    focus: 'Appetite control · metabolic support',
    compounds: ['Tirzepatide', 'Retatrutide'],
    compoundSlugs: ['retatrutide'],
    description:
      'A research-focused protocol framework exploring alternative GLP-pathway approaches for appetite control and weight management support.',
    state: 'ready',
    artwork: { src: '/guides/appetite-weight-protocol.webp', width: 3200, height: 4141, alt: 'The Tides Index Appetite & Weight Management protocol card: compound panels, preparation steps, protocol options and research context.' },
    accent: 'blue',
  },
  {
    slug: 'cellular-energy-protocol',
    title: 'Cellular Energy & Vitality',
    focus: 'Energize · support · restore',
    compounds: ['SS-31', 'MOTS-c', 'NAD+', '5-Amino-1MQ'],
    compoundSlugs: ['mots-c'],
    description:
      'A research-focused protocol framework exploring mitochondrial function, cellular energy, metabolic support and vitality.',
    state: 'ready',
    artwork: { src: '/guides/cellular-energy-protocol.webp', width: 3200, height: 4141, alt: 'The Tides Index Cellular Energy & Vitality protocol card: compound panels, preparation steps, protocol options and research context.' },
    accent: 'indigo',
  },
  {
    slug: 'gh-axis-protocol',
    title: 'GH-Axis & Body Recomposition',
    focus: 'Body recomposition · immune support',
    compounds: ['Tesamorelin', 'Sermorelin', 'CJC-1295 (no DAC)', 'Ipamorelin', 'Thymosin Alpha-1'],
    compoundSlugs: ['tesamorelin', 'sermorelin', 'cjc-1295', 'ipamorelin', 'thymosin-alpha-1'],
    description:
      'A research-focused protocol framework exploring GH-axis support, body recomposition pathways and immune support.',
    state: 'ready',
    artwork: { src: '/guides/gh-axis-protocol.webp', width: 3200, height: 4141, alt: 'The Tides Index GH-Axis & Body Recomposition protocol card: compound panels, preparation steps, protocol options and research context.' },
    accent: 'blue',
  },
  {
    slug: 'sleep-circadian-protocol',
    title: 'Sleep / Circadian / Recovery',
    focus: 'Restore · reset · recover',
    compounds: ['DSIP', 'Epitalon'],
    compoundSlugs: ['dsip', 'epitalon'],
    description:
      'A research-focused protocol framework exploring sleep support, circadian regulation and recovery pathways.',
    state: 'ready',
    artwork: { src: '/guides/sleep-circadian-protocol.webp', width: 3200, height: 4141, alt: 'The Tides Index Sleep / Circadian / Recovery protocol card: compound panels, preparation steps, protocol options and research context.' },
    accent: 'violet',
  },
  {
    slug: 'brain-stress-energy-protocol',
    title: 'Brain / Stress / Energy',
    focus: 'Focus · calm · cellular energy',
    compounds: ['Semax', 'Selank', 'NAD+ (nasal)'],
    compoundSlugs: ['semax', 'selank'],
    description:
      'A research-focused protocol framework exploring intranasal support for cognitive pathways, stress modulation and cellular energy.',
    state: 'ready',
    artwork: { src: '/guides/brain-stress-energy-protocol.webp', width: 3200, height: 4141, alt: 'The Tides Index Brain / Stress / Energy protocol card: compound panels, preparation steps, protocol options and research context.' },
    accent: 'indigo',
  },
  {
    slug: 'sexual-reproductive-protocol',
    title: 'Sexual / Reproductive',
    focus: 'Reproductive signaling · libido support',
    compounds: ['PT-141', 'Kisspeptin-10'],
    compoundSlugs: ['pt-141'],
    description:
      'A research-focused protocol framework exploring investigational peptides for sexual and reproductive health support. Two separate protocols, not automatically combined.',
    state: 'ready',
    artwork: { src: '/guides/sexual-reproductive-protocol.webp', width: 3200, height: 4141, alt: 'The Tides Index Sexual / Reproductive protocol card: compound panels, preparation steps, protocol options and research context.' },
    accent: 'violet',
  },
];

/** The cover of the full compendium, shown with the library. */
export const COMPENDIUM_COVER: GuideArtwork = {
  src: '/guides/compendium-cover.webp',
  width: 3200,
  height: 4141,
  alt: 'Cover of The Tides Index Peptide Protocols, a research-focused visual compendium.',
};

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
