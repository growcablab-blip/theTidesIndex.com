import { Image, Page, Text, View, StyleSheet, Svg, Path } from '@react-pdf/renderer';
import type { ReactNode } from 'react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { colour, columns, contentWidth, leading, page, RHYTHM, sans, serif, type } from './theme';

/**
 * Reusable publication primitives.
 *
 * Five flagship publications are planned — *Understanding Peptides*, *Peptide
 * Science & Applications*, *Peptide Quality*, the *Reference Guide*, and
 * *Protocols & Clinical Quick Reference*. Nothing here is specific to any of
 * them, and that is deliberate: a bespoke PDF is a one-off cost paid five
 * times.
 *
 * The pieces that carry the most weight are the ones about evidence, not the
 * ones about layout. `EvidenceNote`, `SourceNote` and `InPreparation` exist so
 * that a designer cannot accidentally produce a page which reads as settled
 * when the record behind it is not. In a publication about what tests do and do
 * not establish, that is the whole job.
 */

/**
 * The logo, reversed for the dark cover: the supplied artwork with its dark teal
 * wordmark set in near-white, and the molecule and gold ring unchanged
 * (public/brand/tides-index-logo-reversed.png, derived from the file in the
 * project root). Aspect ratio of the trimmed artwork: 1981 × 721.
 */
// Passed as bytes: react-pdf reads a Windows path such as C:\… as a URL scheme and draws nothing.
const COVER_LOGO = {
  data: readFileSync(fileURLToPath(new URL('../../public/brand/tides-index-logo-reversed.png', import.meta.url))),
  format: 'png' as const,
};
const COVER_LOGO_WIDTH = 216;
const COVER_LOGO_HEIGHT = (COVER_LOGO_WIDTH * 721) / 1981;

const styles = StyleSheet.create({
  page: {
    backgroundColor: colour.warmWhite,
    paddingTop: page.margin.top,
    paddingBottom: page.margin.bottom,
    paddingLeft: page.margin.inner,
    paddingRight: page.margin.outer,
    fontFamily: serif,
    fontSize: type.body,
    lineHeight: leading.body,
    color: colour.ink,
  },
  runningHead: {
    position: 'absolute',
    top: 28,
    left: page.margin.inner,
    right: page.margin.outer,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontFamily: sans,
    fontSize: type.micro,
    letterSpacing: 0.8,
    color: colour.slate,
    textTransform: 'uppercase',
  },
  footer: {
    // Anchored from the top, like the running head. Measured from the bottom, the
    // renderer occasionally placed it off the sheet on a page that began with an
    // element carried over from the page before.
    position: 'absolute',
    top: page.height - 36,
    left: page.margin.inner,
    right: page.margin.outer,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    fontFamily: sans,
    fontSize: type.micro,
    color: colour.slate,
  },
});

// ---------------------------------------------------------------------------
// Page shell
// ---------------------------------------------------------------------------

export interface PageChromeProps {
  /** Publication title, in the running head. */
  readonly publication: string;
  /** Where the reader is, in the running head. */
  readonly section?: string;
  readonly children: ReactNode;
  /** Cover and dividers carry no chrome. */
  readonly bare?: boolean;
  readonly background?: string;
}

export function PublicationPage({
  publication,
  section,
  children,
  bare = false,
  background,
}: PageChromeProps) {
  return (
    <Page
      size="A4"
      style={[styles.page, background === undefined ? {} : { backgroundColor: background }]}
      wrap
    >
      {bare ? null : (
        <>
          <View style={styles.runningHead} fixed>
            <Text>{publication}</Text>
            <Text>{section ?? ''}</Text>
          </View>
          <View style={styles.footer} fixed>
            <Text>thetidesindex.com</Text>
            <Text
              render={({ pageNumber }) => String(pageNumber)}
            />
          </View>
        </>
      )}
      {children}
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Cover
// ---------------------------------------------------------------------------

export interface CoverProps {
  readonly imprint: string;
  /** e.g. "Reference series · Volume three". Ties the five books together. */
  readonly series?: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly descriptor: string;
  readonly editionLine: string;
  readonly statusLine?: string;
  /** The one illustration on the cover. */
  readonly mark?: ReactNode;
}

/**
 * The cover.
 *
 * One curved rule, one mark, and a great deal of air. The temptation on a cover
 * for a subject like this is a photograph of a vial, which would say "product"
 * to every reader who saw it. A drawn mark says "reference".
 */
export function Cover({
  series,
  title,
  subtitle,
  descriptor,
  editionLine,
  statusLine,
  mark,
}: CoverProps) {
  return (
    <Page size="A4" style={{ backgroundColor: colour.ink, color: colour.warmWhite }}>
      {/* The spine. A row of these on a shelf should read as one series. */}
      <View
        fixed
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 16,
          height: page.height,
          backgroundColor: colour.tideTeal,
        }}
      />
      {/*
        The tide: a single curve, low and slow, behind everything.

        Wrapped in a `fixed` absolute View rather than positioned directly. An
        SVG the height of the page still occupies the flow box even when it is
        absolutely positioned, so on its own it pushed everything else onto a
        second sheet and produced a blank cover — which is what the renderer's
        "can't wrap between pages" warning was actually about.
      */}
      <View fixed style={{ position: 'absolute', top: 0, left: 0 }}>
        <Svg
          width={page.width}
          height={page.height}
          viewBox={`0 0 ${String(page.width)} ${String(page.height)}`}
        >
          <Path
            d={`M0 ${String(page.height * 0.62)} C ${String(page.width * 0.3)} ${String(page.height * 0.55)}, ${String(page.width * 0.62)} ${String(page.height * 0.72)}, ${String(page.width)} ${String(page.height * 0.63)} L ${String(page.width)} ${String(page.height)} L 0 ${String(page.height)} Z`}
            fill={colour.deepTide}
          />
          <Path
            d={`M0 ${String(page.height * 0.70)} C ${String(page.width * 0.34)} ${String(page.height * 0.63)}, ${String(page.width * 0.66)} ${String(page.height * 0.80)}, ${String(page.width)} ${String(page.height * 0.71)} L ${String(page.width)} ${String(page.height)} L 0 ${String(page.height)} Z`}
            fill={colour.tideTeal}
            fillOpacity={0.55}
          />
        </Svg>
      </View>

      <View
        style={{
          position: 'absolute',
          top: page.margin.top,
          left: page.margin.inner,
          right: page.margin.outer,
        }}
      >
        {/* The logo stands for the imprint; the document's metadata carries the name as text. */}
        <Image src={COVER_LOGO} style={{ width: COVER_LOGO_WIDTH, height: COVER_LOGO_HEIGHT }} />
        {series === undefined ? null : (
          <Text
            style={{
              fontFamily: sans,
              fontSize: type.caption,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              color: colour.tideTeal,
              marginTop: 12,
            }}
          >
            {series}
          </Text>
        )}

        <View style={{ height: 2, width: 54, backgroundColor: colour.tideTeal, marginTop: 14 }} />

        <Text
          style={{
            fontFamily: serif,
            fontSize: type.display + 8,
            lineHeight: leading.display,
            marginTop: 40,
            color: colour.white,
          }}
        >
          {title}
        </Text>
        {subtitle === undefined ? null : (
          <Text
            style={{
              fontFamily: serif,
              fontSize: type.title - 4,
              lineHeight: leading.title,
              marginTop: 14,
              color: colour.seaGlass,
              fontStyle: 'italic',
            }}
          >
            {subtitle}
          </Text>
        )}
      </View>

      {mark === undefined ? null : (
        <View
          style={{
            position: 'absolute',
            top: page.height * 0.40,
            left: page.margin.inner,
            right: page.margin.outer,
            alignItems: 'center',
          }}
        >
          {mark}
        </View>
      )}

      <View
        style={{
          position: 'absolute',
          bottom: page.margin.bottom,
          left: page.margin.inner,
          right: page.margin.outer,
        }}
      >
        <Text
          style={{
            fontFamily: sans,
            fontSize: type.small,
            letterSpacing: 0.6,
            color: colour.seaGlass,
          }}
        >
          {descriptor}
        </Text>
        <View
          style={{ height: 0.75, backgroundColor: colour.tideTeal, marginTop: 12, marginBottom: 10 }}
        />
        <Text style={{ fontFamily: sans, fontSize: type.caption, color: colour.seaGlass }}>
          {editionLine}
        </Text>
        {statusLine === undefined ? null : (
          <Text
            style={{
              fontFamily: sans,
              fontSize: type.caption,
              color: colour.seaGlass,
              marginTop: 4,
            }}
          >
            {statusLine}
          </Text>
        )}
      </View>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Openers and headings
// ---------------------------------------------------------------------------

export function ChapterOpener({
  eyebrow,
  title,
  standfirst,
}: {
  eyebrow: string;
  title: string;
  standfirst?: string;
}) {
  return (
    <View style={{ marginBottom: RHYTHM }}>
      <Text
        style={{
          fontFamily: sans,
          fontSize: type.micro,
          letterSpacing: 1.6,
          textTransform: 'uppercase',
          color: colour.tideTeal,
        }}
      >
        {eyebrow}
      </Text>
      <Text
        style={{
          fontFamily: serif,
          fontSize: type.chapter,
          lineHeight: leading.chapter,
          marginTop: 8,
          color: colour.ink,
        }}
      >
        {title}
      </Text>
      {/* The curved rule. One per opener, never decorative elsewhere. */}
      <Svg width={contentWidth} height={10} viewBox={`0 0 ${String(contentWidth)} 10`}>
        <Path
          d={`M0 7 C ${String(contentWidth * 0.26)} 1, ${String(contentWidth * 0.52)} 9, ${String(contentWidth)} 3`}
          stroke={colour.tideTeal}
          strokeWidth={1.1}
          fill="none"
        />
      </Svg>
      {standfirst === undefined ? null : (
        <Text
          style={{
            fontFamily: serif,
            fontSize: type.section - 2,
            lineHeight: leading.section,
            marginTop: 10,
            color: colour.inkSoft,
            maxWidth: columns(10),
          }}
        >
          {standfirst}
        </Text>
      )}
    </View>
  );
}

export function SectionHeading({ children }: { children: ReactNode }) {
  return (
    // The rule lives on a container, where the renderer honours it: a heading is
    // never the last thing on a page, and carries a few lines of its section.
    <View minPresenceAhead={72}>
      <Text
        style={{
          fontFamily: serif,
          fontSize: type.section,
          lineHeight: leading.section,
          marginTop: RHYTHM,
          marginBottom: 5,
          color: colour.deepTide,
        }}
      >
        {children}
      </Text>
    </View>
  );
}

export function SubHeading({ children }: { children: ReactNode }) {
  return (
    <View minPresenceAhead={48}>
      <Text
        style={{
          fontFamily: sans,
          fontSize: type.micro,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: colour.slate,
          marginTop: RHYTHM,
          marginBottom: 4,
        }}
      >
        {children}
      </Text>
    </View>
  );
}

export function Body({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        fontFamily: serif,
        fontSize: type.body,
        lineHeight: leading.body,
        color: colour.ink,
        marginBottom: 8,
      }}
    >
      {children}
    </Text>
  );
}

export function Lede({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        fontFamily: serif,
        fontSize: type.body + 1.5,
        lineHeight: leading.body,
        color: colour.inkSoft,
        marginBottom: 10,
      }}
    >
      {children}
    </Text>
  );
}

export function Bullets({ items }: { items: readonly string[] }) {
  return (
    <View style={{ marginBottom: 8 }}>
      {items.map((item) => (
        <View key={item} style={{ flexDirection: 'row', marginBottom: 4 }} wrap={false}>
          <Text style={{ width: 14, color: colour.tideTeal, fontSize: type.body }}>—</Text>
          <Text
            style={{
              flex: 1,
              fontFamily: serif,
              fontSize: type.body,
              lineHeight: leading.body,
            }}
          >
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Figures
// ---------------------------------------------------------------------------

export function Figure({
  number,
  caption,
  children,
  span = 12,
  note,
}: {
  number: string;
  caption: string;
  children: ReactNode;
  span?: number;
  note?: string;
}) {
  return (
    <View style={{ marginTop: 8, marginBottom: 10, width: columns(span) }} wrap={false}>
      <View
        style={{
          backgroundColor: colour.mist,
          borderRadius: 3,
          paddingVertical: 12,
          paddingHorizontal: 14,
          alignItems: 'center',
        }}
      >
        {children}
      </View>
      <View style={{ flexDirection: 'row', marginTop: 7 }}>
        <Text
          style={{
            fontFamily: sans,
            fontSize: type.caption,
            color: colour.tideTeal,
            marginRight: 6,
          }}
        >
          {number}
        </Text>
        <Text
          style={{
            flex: 1,
            fontFamily: sans,
            fontSize: type.caption,
            lineHeight: leading.tight,
            color: colour.slate,
          }}
        >
          {caption}
        </Text>
      </View>
      {note === undefined ? null : (
        <Text
          style={{
            fontFamily: sans,
            fontSize: type.micro,
            color: colour.slate,
            marginTop: 3,
            fontStyle: 'italic',
          }}
        >
          {note}
        </Text>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Callouts, evidence and sources
// ---------------------------------------------------------------------------

export function Callout({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View
      style={{
        borderLeftWidth: 2,
        borderLeftColor: colour.tideTeal,
        backgroundColor: colour.mist,
        paddingVertical: 9,
        paddingHorizontal: 13,
        marginVertical: 9,
      }}
      wrap={false}
    >
      {title === undefined ? null : (
        <Text
          style={{
            fontFamily: sans,
            fontSize: type.micro,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            color: colour.deepTide,
            marginBottom: 5,
          }}
        >
          {title}
        </Text>
      )}
      <Text style={{ fontFamily: serif, fontSize: type.small, lineHeight: leading.body }}>
        {children}
      </Text>
    </View>
  );
}

/**
 * What a statement rests on, and what it does not settle.
 *
 * The most important primitive in the set. Every substantive statement in a
 * Tides Index publication is either supported by a located source or is
 * explicitly an absence, and this is what makes the difference visible on the
 * page rather than in a footnote nobody reads.
 */
export function EvidenceNote({
  supports,
  doesNotSettle,
  status,
}: {
  supports?: string;
  doesNotSettle?: string;
  status?: string;
}) {
  return (
    <View
      style={{
        borderWidth: 0.75,
        borderColor: colour.rule,
        borderRadius: 3,
        paddingVertical: 9,
        paddingHorizontal: 12,
        marginVertical: 9,
        backgroundColor: colour.white,
      }}
      wrap={false}
    >
      {supports === undefined ? null : (
        <View style={{ flexDirection: 'row', marginBottom: doesNotSettle ? 7 : 0 }}>
          <Text
            style={{
              width: 96,
              fontFamily: sans,
              fontSize: type.micro,
              letterSpacing: 0.9,
              textTransform: 'uppercase',
              color: colour.evidenceHuman,
            }}
          >
            Evidence for
          </Text>
          <Text
            style={{ flex: 1, fontFamily: serif, fontSize: type.small, lineHeight: leading.tight }}
          >
            {supports}
          </Text>
        </View>
      )}
      {doesNotSettle === undefined ? null : (
        <View style={{ flexDirection: 'row' }}>
          <Text
            style={{
              width: 96,
              fontFamily: sans,
              fontSize: type.micro,
              letterSpacing: 0.9,
              textTransform: 'uppercase',
              color: colour.caution,
            }}
          >
            Not settled
          </Text>
          <Text
            style={{ flex: 1, fontFamily: serif, fontSize: type.small, lineHeight: leading.tight }}
          >
            {doesNotSettle}
          </Text>
        </View>
      )}
      {status === undefined ? null : (
        <Text
          style={{
            fontFamily: sans,
            fontSize: type.micro,
            color: colour.slate,
            marginTop: 8,
            paddingTop: 6,
            borderTopWidth: 0.5,
            borderTopColor: colour.ruleSoft,
          }}
        >
          {status}
        </Text>
      )}
    </View>
  );
}

export function SourceNote({ items }: { items: readonly string[] }) {
  return (
    <View style={{ marginTop: 10 }} wrap={items.length > 6}>
      <View style={{ height: 0.75, backgroundColor: colour.rule, width: columns(4) }} />
      <Text
        minPresenceAhead={40}
        style={{
          fontFamily: sans,
          fontSize: type.micro,
          letterSpacing: 1.1,
          textTransform: 'uppercase',
          color: colour.slate,
          marginTop: 7,
          marginBottom: 4,
        }}
      >
        Sources
      </Text>
      {items.map((item) => (
        <Text
          key={item}
          wrap={false}
          style={{
            fontFamily: sans,
            fontSize: type.micro + 0.4,
            lineHeight: leading.tight,
            color: colour.inkSoft,
            marginBottom: 3,
          }}
        >
          {item}
        </Text>
      ))}
    </View>
  );
}

/** A subject the index recognises and has not written. Never a blank space. */
export function InPreparation({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        borderWidth: 0.75,
        borderStyle: 'dashed',
        borderColor: colour.cautionRule,
        backgroundColor: colour.cautionBg,
        paddingVertical: 9,
        paddingHorizontal: 12,
        marginVertical: 8,
      }}
      wrap={false}
    >
      <Text
        style={{
          fontFamily: sans,
          fontSize: type.micro,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: colour.caution,
          marginBottom: 4,
        }}
      >
        Reference development in progress
      </Text>
      <Text style={{ fontFamily: serif, fontSize: type.small, lineHeight: leading.tight }}>
        {children}
      </Text>
    </View>
  );
}

/** A stamp for anything fictional, so it cannot be mistaken for a real document. */
export function DemonstrationStamp({ width = 150 }: { width?: number }) {
  return (
    <View
      style={{
        borderWidth: 1.2,
        borderColor: colour.caution,
        paddingVertical: 4,
        paddingHorizontal: 10,
        width,
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          fontFamily: sans,
          fontSize: type.micro,
          letterSpacing: 1.8,
          textTransform: 'uppercase',
          color: colour.caution,
        }}
      >
        Demonstration only
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Comparison and table
// ---------------------------------------------------------------------------

export function Comparison({
  left,
  right,
}: {
  left: { title: string; items: readonly string[] };
  right: { title: string; items: readonly string[] };
}) {
  const column = (
    side: { title: string; items: readonly string[] },
    accent: string,
    background: string,
  ) => (
    <View
      style={{
        flex: 1,
        borderTopWidth: 2,
        borderTopColor: accent,
        backgroundColor: background,
        paddingTop: 9,
        paddingHorizontal: 12,
        paddingBottom: 11,
      }}
    >
      <Text
        style={{
          fontFamily: sans,
          fontSize: type.micro,
          letterSpacing: 1.1,
          textTransform: 'uppercase',
          color: accent,
          marginBottom: 6,
        }}
      >
        {side.title}
      </Text>
      {side.items.map((item) => (
        <Text
          key={item}
          style={{
            fontFamily: serif,
            fontSize: type.small,
            lineHeight: leading.tight,
            marginBottom: 4,
          }}
        >
          {item}
        </Text>
      ))}
    </View>
  );

  return (
    <View style={{ flexDirection: 'row', gap: GUTTER_PT, marginVertical: 9 }} wrap={false}>
      {column(left, colour.evidenceHuman, colour.evidenceHumanBg)}
      {column(right, colour.caution, colour.cautionBg)}
    </View>
  );
}

const GUTTER_PT = 12;

export function Table({
  head,
  rows,
  widths,
}: {
  head: readonly string[];
  rows: readonly (readonly string[])[];
  widths?: readonly number[];
}) {
  const flex = (index: number): number => widths?.[index] ?? 1;
  // A short table is read as one object and never split. A long one may run
  // across pages, repeating its header on each, with no row cut in half.
  const long = rows.length > 12;

  return (
    <View style={{ marginVertical: 9 }} wrap={long}>
      <View
        fixed={long}
        style={{
          flexDirection: 'row',
          borderBottomWidth: 1,
          borderBottomColor: colour.ink,
          paddingBottom: 5,
          backgroundColor: colour.warmWhite,
        }}
      >
        {head.map((cell, index) => (
          <Text
            key={cell}
            style={{
              flex: flex(index),
              fontFamily: sans,
              fontSize: type.micro,
              letterSpacing: 0.9,
              textTransform: 'uppercase',
              color: colour.deepTide,
              paddingRight: 8,
            }}
          >
            {cell}
          </Text>
        ))}
      </View>
      {rows.map((row) => (
        <View
          key={row.join('|')}
          wrap={false}
          style={{
            flexDirection: 'row',
            borderBottomWidth: 0.5,
            borderBottomColor: colour.ruleSoft,
            paddingVertical: 6,
          }}
        >
          {row.map((cell, index) => (
            <Text
              key={`${cell}-${String(index)}`}
              style={{
                flex: flex(index),
                fontFamily: serif,
                fontSize: type.small,
                lineHeight: leading.tight,
                paddingRight: 8,
                color: index === 0 ? colour.ink : colour.inkSoft,
              }}
            >
              {cell}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Back matter
// ---------------------------------------------------------------------------

/**
 * Where to find the current version.
 *
 * A printed reference goes out of date the moment a record is revised, and the
 * honest response is to say so on the page and point at the live record rather
 * than to pretend a PDF is permanent.
 *
 * It carries no code yet: the real code points at a per-publication URL that
 * does not exist until the site is public.
 */
export function CurrentVersionBlock({
  url,
  version,
  note,
}: {
  url: string;
  version: string;
  note?: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: colour.rule,
        paddingTop: 14,
        marginTop: RHYTHM * 2,
        maxWidth: columns(9),
      }}
      wrap={false}
    >
      {/*
        No QR code, no drawing of one, and no empty box where one will go. A
        square that cannot be scanned is worse than nothing, and a labelled hole
        reads as unfinished. The real code needs a public URL, which does not
        exist yet; until it does, the block says where to look in words.
      */}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: sans,
            fontSize: type.micro,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            color: colour.slate,
            marginBottom: 5,
          }}
        >
          Current version
        </Text>
        <Text style={{ fontFamily: serif, fontSize: type.small, lineHeight: leading.tight }}>
          This document is a snapshot. The records behind it are versioned, and a revision creates a
          new version rather than editing this one.
        </Text>
        <Text
          style={{
            fontFamily: sans,
            fontSize: type.small,
            color: colour.deepTide,
            marginTop: 6,
          }}
        >
          {url}
        </Text>
        <Text style={{ fontFamily: sans, fontSize: type.micro, color: colour.slate, marginTop: 3 }}>
          {version}
        </Text>
        {note === undefined ? null : (
          <Text
            style={{ fontFamily: sans, fontSize: type.micro, color: colour.slate, marginTop: 5 }}
          >
            {note}
          </Text>
        )}
      </View>
    </View>
  );
}

/** A full-width divider used between movements of a publication. */
export function CurvedDivider({ width = contentWidth }: { width?: number }) {
  return (
    <Svg width={width} height={12} viewBox={`0 0 ${String(width)} 12`} style={{ marginVertical: 10 }}>
      <Path
        d={`M0 8 C ${String(width * 0.28)} 2, ${String(width * 0.55)} 10, ${String(width)} 4`}
        stroke={colour.rule}
        strokeWidth={1}
        fill="none"
      />
    </Svg>
  );
}
