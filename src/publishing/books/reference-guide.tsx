import { Document, Page, Svg, Circle, Rect, Path, Text, View } from '@react-pdf/renderer';
import type { DocumentProps } from '@react-pdf/renderer';
import type { Style } from '@react-pdf/types';
import type { ReactElement, ReactNode } from 'react';
import {
  Body,
  ChapterOpener,
  Cover,
  CurrentVersionBlock,
  Lede,
  SectionHeading,
} from '../primitives';
import { SeriesMark } from '../figures';
import { colour, contentWidth, leading, page, sans, serif, type } from '../theme';
import type {
  PeptidePage,
  PractitionerProtocol,
  RegulatoryStatus,
} from '@/server/public/queries';
import type { Citation, EvidenceGap, PublicClaim } from '@/server/public/shapes';

/**
 * THE PEPTIDE REFERENCE GUIDE — the whole register, bound.
 *
 * One monograph per record, in one template. The template is the point: a
 * reader who learns where "what is not established" sits on the first
 * monograph finds it in the same place on the last, and a compound with
 * nothing under a heading still shows the heading with its absence stated.
 *
 * The template is deliberately unequal. A reference is used by looking things
 * up, and a page where every heading has the same weight gives the eye nowhere
 * to land. So the monograph has four levels:
 *
 *   1  WHAT IT IS          the opening band — identity and the evidence at a glance
 *   2  EVIDENCE            major — human data, then preclinical, each under its mark
 *      SAFETY / UNCERTAINTIES  major, in the caution register (not alarm)
 *   3  MECHANISM · ROUTES · PROTOCOL SOURCES   secondary, compact
 *   4  RESEARCH QUESTIONS · SOURCES            compact, small type
 *
 * Nothing here is written into the file. Every line is read from a record, so
 * the book cannot say anything the database does not, and it carries each
 * record's version and review state on the monograph itself.
 *
 * Identity-separated records stay separate. CJC-1295 and Modified GRF (1-29)
 * get a monograph each, as do TB-500 and thymosin beta-4, because merging them
 * would put one molecule's evidence behind another molecule's name.
 */

export interface ReferenceGuideProps {
  readonly peptides: readonly PeptidePage[];
  readonly generatedAt: string;
}

const PUBLICATION = 'The Peptide Reference Guide';
const HAIRLINE = { borderBottomWidth: 0.5, borderBottomColor: colour.ruleSoft } as const;
/** The gutter a section number hangs in, so titles align down the page. */
const HANG = 24;

/**
 * Keep-with-next, by reservation.
 *
 * Each heading is an unbreakable block ending in an invisible spacer of this
 * height, cancelled by an equal negative bottom margin. The spacer means a
 * heading only stays on a page with that much room beneath it; the margin
 * means the reader never sees the space.
 *
 * Not `minPresenceAhead`: in @react-pdf/renderer 4.9 a page break it forces
 * loses the page's absolutely positioned footer to the top edge of the next
 * sheet (reproduced in isolation, with and without repeating table headers).
 */
const KEEP = { major: 120, minor: 56, label: 70, table: 120 } as const;

// ---------------------------------------------------------------------------
// Page shell
// ---------------------------------------------------------------------------

const CHROME = {
  position: 'absolute',
  left: page.margin.inner,
  right: page.margin.outer,
  flexDirection: 'row',
  justifyContent: 'space-between',
  fontFamily: sans,
  fontSize: type.micro,
  lineHeight: 1.2,
  color: colour.slate,
} as const;

/**
 * The guide's page: the same chrome as `PublicationPage`, drawn locally.
 *
 * A monograph is one flowing page that runs to six or nine sheets. In
 * @react-pdf/renderer 4.9 the shared primitive's bottom-anchored footer drifts
 * 31pt on the fourth sheet of a wrapping page and is drawn at the top edge from
 * the fifth on (reproduced in isolation; the protocols volume shows the same
 * pattern). Anchoring the footer from the top of the sheet does not drift.
 *
 * The running head names the compound on every sheet of its monograph.
 */
function GuidePage({ section, children }: { section: string; children: ReactNode }) {
  return (
    <Page
      size="A4"
      wrap
      style={{
        backgroundColor: colour.warmWhite,
        paddingTop: page.margin.top,
        paddingBottom: page.margin.bottom,
        paddingLeft: page.margin.inner,
        paddingRight: page.margin.outer,
        fontFamily: serif,
        fontSize: type.body,
        lineHeight: leading.body,
        color: colour.ink,
      }}
    >
      <View fixed style={{ ...CHROME, top: 28, letterSpacing: 0.8, textTransform: 'uppercase' }}>
        <Text>{PUBLICATION}</Text>
        <Text>{section}</Text>
      </View>
      <View fixed style={{ ...CHROME, top: page.height - 26 - type.micro * 1.2 }}>
        <Text>thetidesindex.com</Text>
        <Text render={({ pageNumber }) => String(pageNumber)} />
      </View>
      {children}
    </Page>
  );
}

type TextStyle = Style;

// ---------------------------------------------------------------------------
// Reading the record — the site's classification, replicated exactly
// ---------------------------------------------------------------------------

type Lane = 'human' | 'preclinical' | 'reference';

/**
 * Replicates `laneOf` from `src/components/public/record-opening.tsx`.
 *
 * Replicated rather than imported: that module imports `next/link` and the
 * web component primitives, which have no business in a PDF build. The rule
 * must stay identical to the site's, so the printed counts never disagree with
 * the page a reader checks them against.
 */
function laneOf(claim: PublicClaim): Lane | null {
  if (claim.evidence.some((e) => e.isHumanEvidence)) return 'human';
  if (claim.evidence.some((e) => e.evidenceClass === 'preclinical')) return 'preclinical';
  if (claim.evidence.length > 0) return 'reference';
  return null;
}

/** The site's mechanism rule (`MechanismAsReported`). */
function isMechanism(claim: PublicClaim): boolean {
  return (claim.claimCategory ?? '').startsWith('mechanism');
}

/** The site's safety rule (`SafetyContext`). */
function isSafety(claim: PublicClaim): boolean {
  return (claim.claimCategory ?? '').startsWith('safety');
}

/** Open or partly open — the site's "open questions" count. */
function isOpen(gap: EvidenceGap): boolean {
  return gap.resolutionState === 'open' || gap.resolutionState === 'partially_resolved';
}

function words(value: string): string {
  return value.replaceAll('_', ' ');
}

function plural(n: number, one: string, many: string): string {
  return `${String(n)} ${n === 1 ? one : many}`;
}

/** Every citation the monograph rests on, once each, in key order. */
function citationsOf(peptide: PeptidePage): readonly Citation[] {
  const all: Citation[] = [
    ...peptide.claims.flatMap((claim) => claim.evidence.map((e) => e.citation)),
    ...peptide.routes.map((route) => route.citation),
    ...peptide.disagreements.flatMap((d) => d.positions.map((p) => p.citation)),
    ...peptide.protocols.flatMap((protocol) => protocol.sources),
    ...peptide.regulatoryStatuses.flatMap((s) => (s.citation === null ? [] : [s.citation])),
  ];
  const seen = new Map<string, Citation>();
  for (const citation of all) {
    if (!seen.has(citation.sourceKey)) seen.set(citation.sourceKey, citation);
  }
  return [...seen.values()].sort((a, b) => a.sourceKey.localeCompare(b.sourceKey));
}

function attribution(claim: PublicClaim): string {
  const parts = claim.evidence.map(
    (e) =>
      `${e.citation.sourceKey} · ${e.evidenceTypeLabel}${e.primarySourceVerified ? ' · full text read' : ''}`,
  );
  return [...new Set(parts)].join('   ');
}

// ---------------------------------------------------------------------------
// Marks — the site's three shapes
// ---------------------------------------------------------------------------

const LANE_STYLE: Readonly<
  Record<Lane, { label: string; ink: string; tint: string; empty: string }>
> = {
  human: {
    label: 'Human data',
    ink: colour.evidenceHuman,
    tint: colour.evidenceHumanBg,
    empty: 'No statement on this record rests on evidence from people. That is a fact about what has been studied, not a judgement about the compound.',
  },
  preclinical: {
    label: 'Preclinical data',
    ink: colour.evidencePreclinical,
    tint: colour.evidencePreclinicalBg,
    empty: 'No statement rests on laboratory or animal work alone.',
  },
  reference: {
    label: 'Reference and practice',
    ink: colour.evidenceReference,
    tint: colour.evidenceReferenceBg,
    empty: 'No statement rests only on textbooks, practitioner references or named clinicians.',
  },
};

/**
 * Circle for human, square for preclinical, diamond for reference and practice
 * — the shapes the site uses. Shape carries the meaning as well as colour, so a
 * black-and-white photocopy still tells a trial from a handbook.
 */
function LaneMark({ lane, size = 7 }: { lane: Lane; size?: number }) {
  const fill = LANE_STYLE[lane].ink;
  return (
    <Svg width={size} height={size} viewBox="0 0 10 10">
      {lane === 'human' ? <Circle cx={5} cy={5} r={4.6} fill={fill} /> : null}
      {lane === 'preclinical' ? <Rect x={0.8} y={0.8} width={8.4} height={8.4} rx={1} fill={fill} /> : null}
      {lane === 'reference' ? <Path d="M5 0.3 L9.7 5 L5 9.7 L0.3 5 Z" fill={fill} /> : null}
    </Svg>
  );
}

/** The key to the marks, in one line. */
function LaneKey() {
  const lanes: readonly Lane[] = ['human', 'preclinical', 'reference'];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 4, marginBottom: 8 }}>
      {lanes.map((lane) => (
        <View key={lane} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <LaneMark lane={lane} size={8} />
          <Text style={{ fontFamily: sans, fontSize: type.caption, color: colour.inkSoft }}>
            {lane === 'human' ? 'Human evidence' : lane === 'preclinical' ? 'Preclinical evidence' : 'Reference and practice'}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Type and structure
// ---------------------------------------------------------------------------

/**
 * Text that may break inside a long unspaced token — a sequence, a DOI, a URL.
 * Hyphenation is off for the whole publication, so without this a long
 * identifier runs off the measure and is clipped at the page edge.
 */
function Breakable({ text, style }: { text: string; style: TextStyle }) {
  const pieces = text
    .split(/(?<=[/\-._?&=,;:)])/)
    .flatMap((piece) => (piece.length > 24 ? (piece.match(/.{1,12}/g) ?? [piece]) : [piece]));
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {pieces.map((piece, index) => (
        <Text key={`${String(index)}-${piece}`} style={style}>
          {piece}
        </Text>
      ))}
    </View>
  );
}

/** An empty section's whole content. Never a box. */
function NotRecorded({ children }: { children?: string }) {
  return (
    <Text
      style={{
        fontFamily: serif,
        fontStyle: 'italic',
        fontSize: type.small,
        lineHeight: leading.tight,
        color: colour.slate,
        marginTop: 2,
        marginBottom: 4,
      }}
    >
      Not recorded{children === undefined ? '.' : ` — ${children}`}
    </Text>
  );
}

/** Level two: the two sections a reader turns to first after the opening. */
function MajorHeading({
  number,
  title,
  standfirst,
  keep = true,
  tone = 'plain',
}: {
  number: string;
  title: string;
  standfirst?: string;
  /** False when the heading already sits inside an unbreakable block with its first content. */
  keep?: boolean;
  tone?: 'plain' | 'caution';
}) {
  const accent = tone === 'caution' ? colour.caution : colour.tideTeal;
  return (
    <View style={{ marginTop: 22, marginBottom: keep ? 8 - KEEP.major : 8 }} wrap={false}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          borderBottomWidth: 1.25,
          borderBottomColor: tone === 'caution' ? colour.caution : colour.ink,
          paddingBottom: 4,
        }}
      >
        <Text
          style={{
            flex: 1,
            fontFamily: sans,
            fontWeight: 600,
            fontSize: 12.5,
            lineHeight: 1.2,
            letterSpacing: 1.6,
            textTransform: 'uppercase',
            color: tone === 'caution' ? colour.caution : colour.ink,
          }}
        >
          <Text style={{ fontWeight: 400, fontSize: 9, letterSpacing: 0, color: accent }}>{`${number}    `}</Text>
          {title}
        </Text>
      </View>
      {standfirst === undefined ? null : (
        <Text
          style={{
            fontFamily: serif,
            fontSize: type.small,
            lineHeight: leading.tight,
            color: colour.slate,
            marginTop: 4,
            marginLeft: HANG,
          }}
        >
          {standfirst}
        </Text>
      )}
      {keep ? <View style={{ height: KEEP.major }} /> : null}
    </View>
  );
}

/** Level three and four: compact, a label on a hairline. */
function MinorHeading({
  number,
  title,
  note,
  reserve = KEEP.minor,
}: {
  number: string;
  title: string;
  note?: string;
  /** Room that must remain below the heading; larger before a table. */
  reserve?: number;
}) {
  return (
    <View style={{ marginTop: 16, marginBottom: 5 - reserve }} wrap={false}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          borderBottomWidth: 0.5,
          borderBottomColor: colour.rule,
          paddingBottom: 3,
        }}
      >
        <Text
          style={{
            flex: 1,
            fontFamily: sans,
            fontWeight: 600,
            fontSize: type.caption,
            lineHeight: 1.2,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            color: colour.deepTide,
          }}
        >
          <Text style={{ fontWeight: 400, fontSize: type.micro, letterSpacing: 0, color: colour.slate }}>{`${number}      `}</Text>
          {title}
        </Text>
      </View>
      {note === undefined ? null : (
        <Text
          style={{
            fontFamily: sans,
            fontSize: type.micro,
            lineHeight: leading.tight,
            color: colour.slate,
            marginTop: 3,
            marginLeft: HANG,
          }}
        >
          {note}
        </Text>
      )}
      <View style={{ height: reserve }} />
    </View>
  );
}

/** A small label inside a section. */
function Label({
  children,
  colourOverride,
  reserve = KEEP.label,
}: {
  children: string;
  colourOverride?: string;
  reserve?: number;
}) {
  return (
    <View wrap={false} style={{ marginTop: 9, marginBottom: 3 - reserve }}>
      <Text
        style={{
          fontFamily: sans,
          fontWeight: 500,
          fontSize: type.micro,
          lineHeight: 1.2,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: colourOverride ?? colour.slate,
        }}
      >
        {children}
      </Text>
      <View style={{ height: reserve }} />
    </View>
  );
}

interface TableColumn {
  readonly label: string;
  readonly flex: number;
}

interface TableRow {
  readonly key: string;
  readonly cells: readonly string[];
  readonly note?: string | null;
}

/**
 * A table that may run across pages: the header row is `fixed` inside the table
 * so it repeats on every page the table reaches, and no row splits.
 */
function LongTable({
  columns,
  rows,
  dense = false,
}: {
  columns: readonly TableColumn[];
  rows: readonly TableRow[];
  dense?: boolean;
}) {
  return (
    /*
     * No bottom margin. react-pdf moves a node that fits when its bottom margin
     * crosses the page end (`shouldBreak` counts `marginBottom`, the split test
     * does not), so a table ending a few points above the foot jumped a whole
     * sheet and stranded its heading. What follows supplies its own top space.
     */
    <View style={{ marginTop: 2 }}>
      <View
        fixed
        style={{
          flexDirection: 'row',
          borderBottomWidth: 0.75,
          borderBottomColor: colour.inkSoft,
          paddingTop: 2,
          paddingBottom: 3,
        }}
      >
        {columns.map((column) => (
          <Text
            key={column.label}
            style={{
              flex: column.flex,
              fontFamily: sans,
              fontSize: 6.6,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              color: colour.slate,
              paddingRight: 6,
            }}
          >
            {column.label}
          </Text>
        ))}
      </View>
      {rows.map((row) => (
        <View key={row.key} wrap={false} style={{ ...HAIRLINE, paddingVertical: dense ? 2.5 : 4 }}>
          <View style={{ flexDirection: 'row' }}>
            {row.cells.map((cell, index) => (
              <Text
                key={`${row.key}-${String(index)}`}
                style={{
                  flex: columns[index]?.flex ?? 1,
                  fontFamily: index === 0 ? sans : serif,
                  paddingTop: index === 0 ? 1.6 : 0,
                  fontSize: index === 0 ? type.micro : type.small,
                  lineHeight: leading.tight,
                  color: index === 0 ? colour.deepTide : colour.inkSoft,
                  paddingRight: 6,
                }}
              >
                {cell}
              </Text>
            ))}
          </View>
          {row.note === undefined || row.note === null ? null : (
            <Text
              style={{
                fontFamily: serif,
                fontSize: type.micro,
                lineHeight: leading.tight,
                color: colour.slate,
                marginTop: 2,
                // Points, not a percentage: a percentage margin inside an
                // unbreakable row stopped react-pdf splitting the table, and
                // the whole table jumped a sheet. The table always spans the
                // full measure, so the first column's share is exact.
                marginLeft:
                  (contentWidth * (columns[0]?.flex ?? 1)) /
                  columns.reduce((sum, c) => sum + c.flex, 0),
              }}
            >
              {row.note}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Claims
// ---------------------------------------------------------------------------

/** A statement with its mark, attribution and what it leaves uncertain. */
function ClaimRow({
  claim,
  compact = false,
  lead,
}: {
  claim: PublicClaim;
  compact?: boolean;
  /** Heading and banner kept on the same sheet as this statement. */
  lead?: ReactNode;
}) {
  const lane = laneOf(claim);
  return (
    /*
     * Only the statement and its attribution are unbreakable. A long
     * uncertainty note may run on to the next sheet, so one tall statement
     * no longer pushes a heading and half a page of air ahead of it.
     */
    <View style={{ ...HAIRLINE, paddingBottom: compact ? 3.5 : 5.5 }}>
      <View wrap={false}>
      {lead}
      <View style={{ flexDirection: 'row', paddingTop: compact ? 3.5 : 5.5 }}>
      <View style={{ width: 14, paddingTop: compact ? 2.5 : 3 }}>
        {lane === null ? null : <LaneMark lane={lane} size={compact ? 6 : 7} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: serif,
            fontSize: compact ? type.small : 9.6,
            lineHeight: leading.tight,
            color: colour.ink,
          }}
        >
          {claim.claimText}
        </Text>
        {claim.evidence.length === 0 ? null : (
          <Text
            style={{
              fontFamily: sans,
              fontSize: compact ? 6.6 : type.micro,
              lineHeight: leading.tight,
              color: colour.slate,
              marginTop: 1.5,
            }}
          >
            {compact ? [...new Set(claim.evidence.map((e) => e.citation.sourceKey))].join(' · ') : attribution(claim)}
          </Text>
        )}
      </View>
      </View>
      </View>
        {compact || claim.uncertaintyText === null ? null : (
          <Text
            style={{
              fontFamily: serif,
              fontSize: type.micro + 0.3,
              lineHeight: leading.tight,
              color: colour.inkSoft,
              marginTop: 2,
              marginLeft: 14,
            }}
          >
            <Text style={{ fontFamily: sans, fontSize: 6.4, letterSpacing: 0.6, color: colour.slate }}>
              UNCERTAIN{'  '}
            </Text>
            {claim.uncertaintyText}
          </Text>
        )}
        {claim.needsUpdate ? (
          <Text style={{ fontFamily: sans, fontSize: 6.6, color: colour.caution, marginTop: 1.5, marginLeft: 14 }}>
            Flagged for re-review
          </Text>
        ) : null}
    </View>
  );
}

/** A lane of the evidence section: its banner, then its statements. */
function LaneGroup({
  lane,
  claims,
  prominent,
  lead,
}: {
  lane: Lane;
  claims: readonly PublicClaim[];
  prominent: boolean;
  /** A heading that must not be separated from this lane's first statement. */
  lead?: ReactNode;
}) {
  const style = LANE_STYLE[lane];
  const [first, ...rest] = claims;
  const banner = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: prominent ? 10 : 12,
        marginBottom: 2,
        paddingVertical: prominent ? 4.5 : 2.5,
        paddingHorizontal: prominent ? 7 : 0,
        ...(prominent ? { backgroundColor: style.tint } : { borderBottomWidth: 0.5, borderBottomColor: colour.rule }),
      }}
    >
      <View style={{ width: 14 }}>
        <LaneMark lane={lane} size={prominent ? 8 : 6.5} />
      </View>
        <Text
          style={{
            flex: 1,
            fontFamily: sans,
            fontWeight: prominent ? 600 : 500,
            fontSize: prominent ? type.caption + 0.4 : type.micro,
            letterSpacing: 1.1,
            textTransform: 'uppercase',
            color: prominent ? style.ink : colour.slate,
          }}
        >
          {style.label}
        </Text>
      <Text style={{ fontFamily: sans, fontSize: type.micro, color: prominent ? style.ink : colour.slate }}>
        {claims.length === 0 ? 'none recorded' : plural(claims.length, 'statement', 'statements')}
      </Text>
    </View>
  );
  /*
   * The banner travels with its first statement (or its absence) in one
   * unbreakable block — `minPresenceAhead` alone left a banner stranded at a
   * page foot when the statement after it was itself unbreakable and tall.
   */
  return (
    <>
      {first === undefined ? (
        <View wrap={false}>
          {lead}
          {banner}
          <View style={{ paddingLeft: 14 }}>
            <NotRecorded>{style.empty}</NotRecorded>
          </View>
        </View>
      ) : (
        <ClaimRow
          claim={first}
          compact={!prominent}
          lead={
            <>
              {lead}
              {banner}
            </>
          }
        />
      )}
      {rest.map((claim) => (
        <ClaimRow key={claim.id} claim={claim} compact={!prominent} />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// The opening band
// ---------------------------------------------------------------------------

const MAX_MARKS = 20;

function GlanceCell({
  label,
  count,
  countLabel,
  mark,
  tone = 'plain',
}: {
  label: string;
  count: number;
  countLabel: string;
  mark: (index: number) => ReactNode;
  tone?: 'plain' | 'caution';
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colour.white,
        borderWidth: 0.5,
        borderColor: tone === 'caution' ? colour.cautionRule : colour.rule,
        borderStyle: tone === 'caution' ? 'dashed' : 'solid',
        borderRadius: 2,
        paddingVertical: 7,
        paddingHorizontal: 8,
      }}
    >
      <Text
        style={{
          fontFamily: sans,
          fontSize: 6.6,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          color: tone === 'caution' ? colour.caution : colour.slate,
        }}
      >
        {label}
      </Text>
      {/* One text run, so the label sits on the numeral's baseline. */}
      <Text style={{ fontFamily: serif, fontSize: 20, lineHeight: 1.15, color: colour.ink, marginTop: 2 }}>
        {String(count)}
        <Text style={{ fontFamily: sans, fontSize: 6.6, color: colour.slate }}>{`  ${countLabel}`}</Text>
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2.5, marginTop: 5, minHeight: 6 }}>
        {count === 0 ? (
          <Text style={{ fontFamily: sans, fontSize: 6.6, color: colour.slate }}>none recorded</Text>
        ) : (
          Array.from({ length: Math.min(count, MAX_MARKS) }, (_, index) => (
            <View key={String(index)}>{mark(index)}</View>
          ))
        )}
        {count > MAX_MARKS ? (
          <Text style={{ fontFamily: sans, fontSize: 6, color: colour.slate }}>+{count - MAX_MARKS}</Text>
        ) : null}
      </View>
    </View>
  );
}

function IdentityRow({ term, children }: { term: string; children: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', paddingVertical: 2.5, ...HAIRLINE }}>
      <Text style={{ width: 92, fontFamily: sans, fontSize: type.micro, color: colour.slate }}>{term}</Text>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

const identityValue: TextStyle = {
  fontFamily: serif,
  fontSize: type.small,
  lineHeight: leading.tight,
  color: colour.inkSoft,
};

function OpeningBand({ peptide, ordinal, total }: { peptide: PeptidePage; ordinal: number; total: number }) {
  const counts = { human: 0, preclinical: 0, reference: 0 };
  for (const claim of peptide.claims) {
    const lane = laneOf(claim);
    if (lane !== null) counts[lane] += 1;
  }
  const openQuestions = peptide.gaps.filter(isOpen).length;
  const screen = peptide.literatureScreens[0];
  const classification = [peptide.compoundTypeLabel, peptide.categoryLabel]
    .filter((part): part is string => part !== null)
    .join(' · ');

  return (
    <View
      wrap={false}
      style={{
        backgroundColor: colour.mist,
        borderTopWidth: 3,
        borderTopColor: colour.tideTeal,
        paddingTop: 12,
        paddingBottom: 12,
        paddingHorizontal: 14,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text
          style={{
            fontFamily: sans,
            fontWeight: 600,
            fontSize: type.micro,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            color: colour.tideTeal,
          }}
        >
          01  What it is
        </Text>
        <Text style={{ fontFamily: sans, fontSize: type.micro, color: colour.slate }}>
          Monograph {String(ordinal)} of {String(total)}
        </Text>
      </View>

      <Text style={{ fontFamily: serif, fontSize: 30, lineHeight: 1.12, color: colour.ink, marginTop: 6 }}>
        {peptide.canonicalName}
      </Text>
      <Text style={{ fontFamily: sans, fontSize: type.caption, color: colour.deepTide, marginTop: 2 }}>
        {classification === '' ? 'Classification not recorded' : classification}
      </Text>

      {peptide.shortDescription === null ? (
        <View style={{ marginTop: 6 }}>
          <NotRecorded>no one-line description is recorded for this compound.</NotRecorded>
        </View>
      ) : (
        <Text
          style={{
            fontFamily: serif,
            fontSize: 11.5,
            lineHeight: leading.tight,
            color: colour.inkSoft,
            marginTop: 7,
          }}
        >
          {peptide.shortDescription}
        </Text>
      )}

      <View style={{ marginTop: 9 }}>
        <IdentityRow term="Also called">
          {peptide.aliases.length === 0 ? (
            <Text style={{ ...identityValue, color: colour.slate, fontStyle: 'italic' }}>Not recorded</Text>
          ) : (
            <Text style={identityValue}>{peptide.aliases.map((alias) => alias.alias).join(' · ')}</Text>
          )}
        </IdentityRow>
        <IdentityRow term="Sequence">
          {peptide.sequence === null ? (
            <Text style={{ ...identityValue, color: colour.slate, fontStyle: 'italic' }}>Not recorded</Text>
          ) : (
            <Breakable
              text={peptide.sequence}
              style={{ fontFamily: sans, fontSize: type.micro, lineHeight: leading.tight, color: colour.inkSoft }}
            />
          )}
        </IdentityRow>
        <IdentityRow term="Molecule">
          <Text
            style={
              peptide.molecularDescription === null
                ? { ...identityValue, color: colour.slate, fontStyle: 'italic' }
                : identityValue
            }
          >
            {peptide.molecularDescription ?? 'Not recorded'}
          </Text>
        </IdentityRow>
        <IdentityRow term="Origin">
          <Text
            style={
              peptide.naturalOrSynthetic === null
                ? { ...identityValue, color: colour.slate, fontStyle: 'italic' }
                : identityValue
            }
          >
            {peptide.naturalOrSynthetic === null ? 'Not recorded' : words(peptide.naturalOrSynthetic)}
          </Text>
        </IdentityRow>
      </View>

      <Text
        style={{
          fontFamily: sans,
          fontWeight: 500,
          fontSize: 6.6,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: colour.slate,
          marginTop: 11,
          marginBottom: 4,
        }}
      >
        Evidence at a glance · statements on this record, by the strongest evidence behind each
      </Text>
      <View style={{ flexDirection: 'row', gap: 5 }}>
        <GlanceCell
          label="Human"
          count={counts.human}
          countLabel={counts.human === 1 ? 'statement' : 'statements'}
          mark={() => <LaneMark lane="human" size={5.5} />}
        />
        <GlanceCell
          label="Preclinical"
          count={counts.preclinical}
          countLabel={counts.preclinical === 1 ? 'statement' : 'statements'}
          mark={() => <LaneMark lane="preclinical" size={5.5} />}
        />
        <GlanceCell
          label="Reference and practice"
          count={counts.reference}
          countLabel={counts.reference === 1 ? 'statement' : 'statements'}
          mark={() => <LaneMark lane="reference" size={5.5} />}
        />
        <GlanceCell
          label="Not established"
          tone="caution"
          count={openQuestions}
          countLabel={openQuestions === 1 ? 'open question' : 'open questions'}
          mark={() => (
            <Svg width={5.5} height={5.5} viewBox="0 0 10 10">
              <Circle cx={5} cy={5} r={4} fill="none" stroke={colour.caution} strokeWidth={1.4} />
            </Svg>
          )}
        />
      </View>

      {counts.human === 0 ? (
        <Text style={{ fontFamily: serif, fontSize: type.small, lineHeight: leading.tight, color: colour.inkSoft, marginTop: 7 }}>
          No human evidence is recorded on this record. Preclinical and practice statements do not establish
          effects in people.
        </Text>
      ) : null}
      <Text style={{ fontFamily: sans, fontSize: 6.6, lineHeight: leading.tight, color: colour.slate, marginTop: 6 }}>
        {screen === undefined
          ? 'Literature screen: none has been run for this compound.'
          : `Literature screen: ${screen.databaseName}, ${screen.searchDate} — ${String(screen.resultCount)} records returned, ${String(screen.includedCount)} about this compound, ${String(screen.humanPrimaryCount)} primary human records. A record is a publication, not a study.`}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Monograph
// ---------------------------------------------------------------------------

function sourceLine(citation: Citation): string {
  const authors =
    citation.authors.length === 0
      ? ''
      : `${citation.authors.slice(0, 3).join(', ')}${citation.authors.length > 3 ? ' et al.' : ''}. `;
  const year = citation.year === null ? '' : `(${String(citation.year)}) `;
  return `${authors}${year}${citation.sourceTitle}. ${citation.sourceTypeLabel}.`;
}

function RegulatoryRow({ status }: { status: RegulatoryStatus }) {
  return (
    <View wrap={false} style={{ ...HAIRLINE, paddingVertical: 3 }}>
      <Text style={{ fontFamily: serif, fontSize: type.small, lineHeight: leading.tight, color: colour.ink }}>
        {status.jurisdiction}: {words(status.status)}
        {status.authority === null ? '' : ` (${status.authority})`}
        {status.indicationContext === null ? '' : ` — ${status.indicationContext}`}
      </Text>
      <Text style={{ fontFamily: sans, fontSize: 6.6, lineHeight: leading.tight, color: colour.slate, marginTop: 1 }}>
        Checked {status.checkedAt}
        {status.citation === null ? '' : ` · ${status.citation.sourceKey}`} · time-sensitive; goes out of date
      </Text>
    </View>
  );
}

function Monograph({
  peptide,
  ordinal,
  total,
  generatedAt,
}: {
  peptide: PeptidePage;
  ordinal: number;
  total: number;
  generatedAt: string;
}) {
  const byLane = (lane: Lane) => peptide.claims.filter((claim) => laneOf(claim) === lane);
  const human = byLane('human');
  const preclinical = byLane('preclinical');
  const reference = byLane('reference');
  const mechanism = peptide.claims.filter(isMechanism);
  const mechanismPreclinical = mechanism.filter((c) => laneOf(c) === 'preclinical').length;
  const safety = peptide.claims.filter(isSafety);
  const safetyGaps = peptide.gaps.filter((gap) => gap.gapType === 'safety_not_established');
  const otherGaps = peptide.gaps.filter((gap) => gap.gapType !== 'safety_not_established');
  const protocols = peptide.protocols as readonly PractitionerProtocol[];
  const protocolSources = new Set(protocols.flatMap((p) => p.sources.map((s) => s.sourceKey))).size;
  const questions = peptide.gaps.filter(
    (gap): gap is EvidenceGap & { researchQuestion: string } => gap.researchQuestion !== null,
  );
  const citations = citationsOf(peptide);

  return (
    <GuidePage section={peptide.canonicalName}>
      <OpeningBand peptide={peptide} ordinal={ordinal} total={total} />

      <Text style={{ fontFamily: sans, fontSize: 6.6, lineHeight: leading.tight, color: colour.slate, marginTop: 5 }}>
        Record version {String(peptide.version)} ·{' '}
        {peptide.publishedAt === null
          ? 'not published; extracted and awaiting human scientific review'
          : `published ${peptide.publishedAt}`}
        {peptide.lastReviewedAt === null ? '' : ` · last reviewed ${peptide.lastReviewedAt}`} · A printout of a
        structured record: regimens are reproduced as named sources reported them, nothing is averaged or
        recommended, and this index issues no dose.
      </Text>
      {!peptide.isPeptide ? (
        <Text style={{ fontFamily: sans, fontSize: type.micro, color: colour.caution, marginTop: 4 }}>
          Not a peptide. Recorded here because it appears in the same clinical conversations; evidence about
          peptides does not transfer to it.
        </Text>
      ) : null}
      {peptide.needsUpdate ? (
        <Text style={{ fontFamily: sans, fontSize: type.micro, color: colour.caution, marginTop: 4 }}>
          This record is flagged for re-review.
        </Text>
      ) : null}

      {/* 02 EVIDENCE — major ------------------------------------------------ */}
      <LaneGroup
        lane="human"
        claims={human}
        prominent
        lead={
          <MajorHeading
            number="02"
            title="Evidence"
            keep={false}
            standfirst="Grouped by the kind of evidence behind each statement, human first, so that what has been shown in people is never mixed with what has been shown in animals or described in practice."
          />
        }
      />
      <LaneGroup lane="preclinical" claims={preclinical} prominent />
      <LaneGroup lane="reference" claims={reference} prominent={false} />

      <Label>Replication</Label>
      {peptide.replication.length === 0 ? (
        <NotRecorded>no finding on this record has been assessed for replication.</NotRecorded>
      ) : (
        peptide.replication.map((assessment) => (
          <View key={assessment.id} wrap={false} style={{ ...HAIRLINE, paddingVertical: 3.5 }}>
            <Text style={{ fontFamily: serif, fontSize: type.small, lineHeight: leading.tight, color: colour.ink }}>
              {assessment.finding}
            </Text>
            <Text style={{ fontFamily: sans, fontSize: 6.6, lineHeight: leading.tight, color: colour.deepTide, marginTop: 1 }}>
              {words(assessment.state)}
              {assessment.humanConfirmed ? ' · confirmed in humans' : ''}
            </Text>
            <Text style={{ fontFamily: serif, fontSize: type.micro + 0.3, lineHeight: leading.tight, color: colour.inkSoft, marginTop: 1.5 }}>
              {assessment.basis}
              {assessment.limitations === null ? '' : ` Limits: ${assessment.limitations}`}
            </Text>
          </View>
        ))
      )}

      {/* 03 MECHANISM — secondary -------------------------------------------- */}
      <MinorHeading
        number="03"
        title="Mechanism, as reported"
        {...(mechanism.length === 0
          ? {}
          : {
              note: `${String(mechanismPreclinical)} of ${plural(mechanism.length, 'statement', 'statements')} ${mechanism.length === 1 ? 'rests' : 'rest'} on preclinical evidence. Attributed as sources state them; no pathway is drawn.`,
            })}
      />
      {mechanism.length === 0 ? (
        <NotRecorded>no mechanism statement is recorded from the sources held here.</NotRecorded>
      ) : (
        mechanism.map((claim) => <ClaimRow key={claim.id} claim={claim} compact />)
      )}

      {/* 04 ROUTES — secondary ------------------------------------------------- */}
      <MinorHeading
        number="04"
        title="Routes"
        reserve={KEEP.table}
        note="Specific to this compound, in the stated formulation and population. Absorption by one peptide says nothing about another."
      />
      {peptide.routes.length === 0 ? (
        <NotRecorded>no route is recorded by any source held here.</NotRecorded>
      ) : (
        <LongTable
          columns={[
            { label: 'Route', flex: 1 },
            { label: 'Evidence', flex: 1.2 },
            { label: 'Population / formulation', flex: 1.9 },
            { label: 'Source', flex: 0.7 },
          ]}
          rows={peptide.routes.map((route) => ({
            key: route.id,
            cells: [
              route.routeName,
              route.evidenceTypeLabel,
              [route.populationModel, route.formulation].filter((p): p is string => p !== null).join(' · ') ||
                'Not stated',
              route.citation.sourceKey,
            ],
            note: route.limitationsNotes,
          }))}
        />
      )}
      <Label reserve={KEEP.table}>Pharmacokinetics, as reported</Label>
      {peptide.pharmacokinetics.length === 0 ? (
        <NotRecorded>nothing held here reports what the body does to this compound, by any route.</NotRecorded>
      ) : (
        <LongTable
          columns={[
            { label: 'Parameter', flex: 1 },
            { label: 'Value', flex: 1.3 },
            { label: 'Conditions', flex: 2.5 },
          ]}
          rows={peptide.pharmacokinetics.map((observation) => ({
            key: observation.id,
            cells: [
              observation.parameter,
              observation.valueText,
              [observation.population, observation.studyCondition, observation.evidenceTypeLabel]
                .filter((part) => part !== null && part !== '')
                .join(' · '),
            ],
          }))}
        />
      )}

      {/* 05 PROTOCOL SOURCES — secondary, attributed ---------------------------- */}
      <MinorHeading
        number="05"
        title="Protocol sources"
        reserve={KEEP.table}
        note={
          protocols.length === 0
            ? 'Which named sources report a regimen. Never averaged; no dose is issued here.'
            : `${plural(protocols.length, 'regimen', 'regimens')} from ${plural(protocolSources, 'source', 'sources')}, each as one named source reported it. Never averaged; no dose is issued here. Full attributed detail is in Peptide Protocols & Clinical Quick Reference.`
        }
      />
      {protocols.length === 0 ? (
        <NotRecorded>no source held here reports a regimen for this compound.</NotRecorded>
      ) : (
        <LongTable
          columns={[
            { label: 'Reported by', flex: 0.9 },
            { label: 'Kind of source', flex: 1.2 },
            { label: 'Route', flex: 0.9 },
            { label: 'Context', flex: 2.4 },
          ]}
          rows={protocols.map((protocol) => ({
            key: protocol.id,
            cells: [
              protocol.sources.map((source) => source.sourceKey).join(', '),
              protocol.evidenceTypeLabel,
              protocol.routeName ?? 'Not stated',
              protocol.objectiveContext,
            ],
          }))}
        />
      )}

      {/* 06 SAFETY / UNCERTAINTIES — major, caution register ------------------- */}
      <MajorHeading
        number="06"
        title="Safety and uncertainties"
        tone="caution"
        standfirst="What sources report about harm, and what the record holds as not established. No reported harm is not the same as shown to be safe."
      />
      <Label colourOverride={colour.caution}>Safety, as reported</Label>
      {safety.length === 0 ? (
        <NotRecorded>no statement about safety is recorded. Nothing here is a finding that the compound is safe.</NotRecorded>
      ) : (
        safety.map((claim) => <ClaimRow key={claim.id} claim={claim} />)
      )}

      {safetyGaps.length === 0 ? null : (
        <View
          wrap={false}
          style={{
            borderLeftWidth: 2,
            borderLeftColor: colour.caution,
            backgroundColor: colour.cautionBg,
            paddingVertical: 6,
            paddingHorizontal: 9,
            marginTop: 8,
          }}
        >
          <Text style={{ fontFamily: sans, fontWeight: 500, fontSize: 6.6, letterSpacing: 1, textTransform: 'uppercase', color: colour.caution, marginBottom: 2 }}>
            Safety not established
          </Text>
          {safetyGaps.map((gap) => (
            <GapLine key={gap.id} gap={gap} />
          ))}
        </View>
      )}

      <Label colourOverride={colour.caution}>Not established</Label>
      {otherGaps.length === 0 ? (
        <NotRecorded>
          {safetyGaps.length === 0
            ? 'no gap is recorded, which on any record is itself worth questioning.'
            : 'no gap beyond safety is recorded.'}
        </NotRecorded>
      ) : (
        otherGaps.map((gap) => (
          <View key={gap.id} wrap={false} style={{ ...HAIRLINE, paddingVertical: 1 }}>
            <GapLine gap={gap} />
          </View>
        ))
      )}

      {peptide.disagreements.length === 0 ? (
        <>
          <Label colourOverride={colour.caution}>Where sources disagree</Label>
          <NotRecorded>no disagreement between sources is recorded on this compound.</NotRecorded>
        </>
      ) : (
        peptide.disagreements.map((disagreement, index) => (
          <View key={disagreement.id} wrap={false} style={{ ...HAIRLINE, paddingVertical: 4 }}>
            {/* The label rides inside the first disagreement, which is too tall for a reservation. */}
            {index === 0 ? (
              <Label colourOverride={colour.caution} reserve={0}>
                Where sources disagree
              </Label>
            ) : null}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Text style={{ flex: 1, fontFamily: serif, fontSize: type.small, lineHeight: leading.tight, color: colour.ink }}>
                {disagreement.topic}
              </Text>
              <Text
                style={{
                  fontFamily: sans,
                  fontSize: 6.4,
                  letterSpacing: 0.7,
                  textTransform: 'uppercase',
                  color: disagreement.resolution === 'unresolved' ? colour.caution : colour.deepTide,
                }}
              >
                {words(disagreement.resolution)}
              </Text>
            </View>
            {disagreement.resolutionBasis === null ? null : (
              <Text style={{ fontFamily: serif, fontSize: type.micro + 0.3, lineHeight: leading.tight, color: colour.inkSoft, marginTop: 1.5 }}>
                {disagreement.resolutionBasis}
              </Text>
            )}
            {disagreement.positions.map((position) => (
              <View key={position.id} style={{ flexDirection: 'row', marginTop: 2 }}>
                <Text style={{ width: 52, fontFamily: sans, fontSize: 6.6, color: colour.deepTide, paddingTop: 0.8 }}>
                  {position.citation.sourceKey}
                </Text>
                <Text style={{ flex: 1, fontFamily: serif, fontSize: type.micro + 0.3, lineHeight: leading.tight, color: colour.inkSoft }}>
                  {position.positionText ?? 'Position shown in the full record.'}
                </Text>
              </View>
            ))}
          </View>
        ))
      )}

      {/* 07 RESEARCH QUESTIONS — compact ---------------------------------------- */}
      <MinorHeading
        number="07"
        title="Research questions"
        note="Derived from the absences above. Each describes a study that would reduce uncertainty; none is a suggestion to try anything."
      />
      {questions.length === 0 ? (
        <NotRecorded>no research question is derived from this record’s gaps yet.</NotRecorded>
      ) : (
        questions.map((gap, index) => (
          <View key={gap.id} wrap={false} style={{ flexDirection: 'row', paddingVertical: 2 }}>
            <Text style={{ width: HANG, fontFamily: sans, fontSize: 6.6, color: colour.slate, paddingTop: 1 }}>
              Q{String(index + 1)}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: serif, fontSize: type.small, lineHeight: leading.tight, color: colour.ink }}>
                {gap.researchQuestion}
              </Text>
              {gap.opportunityType === null ? null : (
                <Text style={{ fontFamily: sans, fontSize: 6.4, lineHeight: leading.tight, color: colour.slate, marginTop: 0.5 }}>
                  {words(gap.opportunityType)}
                </Text>
              )}
            </View>
          </View>
        ))
      )}

      <Label>Regulatory context · date-stamped</Label>
      {peptide.regulatoryStatuses.length === 0 ? (
        <NotRecorded>no regulator’s position is recorded. That is an absence in this index, not evidence about the compound.</NotRecorded>
      ) : (
        peptide.regulatoryStatuses.map((status) => <RegulatoryRow key={status.id} status={status} />)
      )}

      {/* 08 SOURCES — small type ------------------------------------------------ */}
      <MinorHeading
        number="08"
        title="Sources"
        note="Every key cited on this monograph. Locators for each statement are in the online record."
      />
      {citations.length === 0 ? (
        <NotRecorded>no source is cited on this record.</NotRecorded>
      ) : (
        citations.map((citation) => {
          const identifier =
            citation.doi === null ? citation.canonicalUrl : `https://doi.org/${citation.doi}`;
          return (
            <View key={citation.sourceId} wrap={false} style={{ flexDirection: 'row', paddingVertical: 1.8 }}>
              <Text style={{ width: 50, fontFamily: sans, fontWeight: 500, fontSize: 6.8, color: colour.deepTide }}>
                {citation.sourceKey}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: sans, fontSize: 6.8, lineHeight: leading.tight, color: colour.inkSoft }}>
                  {sourceLine(citation)}
                  {citation.isCitable ? '' : ' Held copy partial or awaiting replacement.'}
                </Text>
                {identifier === null ? null : (
                  <Breakable
                    text={identifier}
                    style={{ fontFamily: sans, fontSize: 6.4, lineHeight: leading.tight, color: colour.tideTeal }}
                  />
                )}
              </View>
            </View>
          );
        })
      )}

      <Text
        style={{
          fontFamily: sans,
          fontSize: 6.6,
          lineHeight: leading.tight,
          color: colour.slate,
          marginTop: 10,
          paddingTop: 5,
          borderTopWidth: 0.5,
          borderTopColor: colour.rule,
        }}
      >
        {peptide.canonicalName} · record version {String(peptide.version)} · generated {generatedAt}
        {peptide.evidenceCutoffAt === null ? '' : ` · evidence surveyed to ${peptide.evidenceCutoffAt}`}.
      </Text>
    </GuidePage>
  );
}

/** A recorded absence: the "source needed" state, marked once and quietly. */
function GapLine({ gap }: { gap: EvidenceGap }) {
  return (
    <View style={{ flexDirection: 'row', paddingVertical: 2 }}>
      <Text style={{ width: 12, fontFamily: serif, fontSize: type.small, color: colour.caution }}>?</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: serif, fontSize: type.small, lineHeight: leading.tight, color: colour.ink }}>
          {gap.statement}
        </Text>
        {gap.resolutionState === 'open' ? null : (
          <Text style={{ fontFamily: sans, fontSize: 6.4, lineHeight: leading.tight, color: colour.slate, marginTop: 0.5 }}>
            {words(gap.resolutionState)}
            {gap.resolutionCheckedAt === null ? '' : `, checked ${gap.resolutionCheckedAt}`}
            {gap.resolutionNote === null ? '' : ` — ${gap.resolutionNote}`}
          </Text>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Front matter pieces
// ---------------------------------------------------------------------------

/** The three editorial states, as the site defines them, shown once for the whole volume. */
function EditorialStateKey() {
  const states: readonly { label: string; glyph: ReactNode; description: string }[] = [
    {
      label: 'Source fact',
      glyph: <Text style={{ fontFamily: serif, fontSize: 11, color: colour.tideTeal }}>§</Text>,
      description: 'Directly supported by a cited source, at a location you can check.',
    },
    {
      label: 'Tides synthesis',
      glyph: (
        <Svg width={10} height={10} viewBox="0 0 10 10">
          <Circle cx={5} cy={2.2} r={1.2} fill={colour.deepTide} />
          <Circle cx={2} cy={7.6} r={1.2} fill={colour.deepTide} />
          <Circle cx={8} cy={7.6} r={1.2} fill={colour.deepTide} />
        </Svg>
      ),
      description:
        'A conclusion this index draws from several sourced facts, naming every one. None is printed in this volume.',
    },
    {
      label: 'Source needed',
      glyph: <Text style={{ fontFamily: serif, fontSize: 11, color: colour.caution }}>?</Text>,
      description: 'A factual point no source held by this index supports, so the index does not make it.',
    },
  ];
  return (
    <View wrap={false} style={{ flexDirection: 'row', gap: 10, marginTop: 4, marginBottom: 8 }}>
      {states.map((state) => (
        <View key={state.label} style={{ flex: 1, borderTopWidth: 1, borderTopColor: colour.rule, paddingTop: 5 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 14 }}>
            {state.glyph}
            <Text style={{ fontFamily: sans, fontWeight: 500, fontSize: type.micro, letterSpacing: 0.9, textTransform: 'uppercase', color: colour.deepTide }}>
              {state.label}
            </Text>
          </View>
          <Text style={{ fontFamily: serif, fontSize: type.small, lineHeight: leading.tight, color: colour.inkSoft, marginTop: 3 }}>
            {state.description}
          </Text>
        </View>
      ))}
    </View>
  );
}

const ANATOMY: readonly TableRow[] = [
  { key: '01', cells: ['01', 'What it is', 'Name, other names, identity, and the evidence at a glance. The opening band.'] },
  { key: '02', cells: ['02', 'Evidence', 'Human data, then preclinical data, then reference and practice; replication.'] },
  { key: '03', cells: ['03', 'Mechanism', 'As sources report it, with the evidence class of each statement.'] },
  { key: '04', cells: ['04', 'Routes', 'Routes and any pharmacokinetics, with population, formulation and source.'] },
  { key: '05', cells: ['05', 'Protocol sources', 'Which named sources report a regimen, and in what context. No dose.'] },
  { key: '06', cells: ['06', 'Safety and uncertainties', 'Reported harms, what is not established, where sources disagree.'] },
  { key: '07', cells: ['07', 'Research questions', 'Studies that would reduce the uncertainty; then regulatory context, dated.'] },
  { key: '08', cells: ['08', 'Sources', 'Every source key cited, with its DOI or address where one is recorded.'] },
];

// ---------------------------------------------------------------------------

export function ReferenceGuide({
  peptides,
  generatedAt,
}: ReferenceGuideProps): ReactElement<DocumentProps> {
  const withHuman = peptides.filter((peptide) =>
    peptide.claims.some((claim) => laneOf(claim) === 'human'),
  ).length;
  const total = peptides.length;

  return (
    <Document
      title={PUBLICATION}
      author="The Tides Index"
      subject="Compound monographs generated from structured records. Not reviewed."
      creator="The Tides Index"
    >
      <Cover
        imprint="The Tides Index"
        series="Reference series · Volume four"
        title="The Peptide Reference Guide"
        subtitle={`${String(total)} compound monographs`}
        descriptor="Independent peptide science & clinical reference"
        editionLine={`First edition · generated ${generatedAt}`}
        statusLine="Generated from structured records. Every monograph is awaiting human scientific review, and says so."
        mark={<SeriesMark width={300} volume={4} />}
      />

      {/* --- How to read it --------------------------------------------------- */}
      <GuidePage section="How to read this volume">
        <ChapterOpener
          eyebrow="Front matter"
          title="How to read this volume"
          standfirst={`One template, ${String(total)} times. The headings do not move.`}
        />

        <Lede>
          Every monograph answers the same questions in the same order, and a heading with nothing
          under it still appears, carrying its absence. Most of what is known about most of these
          compounds is an absence, and a book that printed only the findings would misrepresent the
          field by omission.
        </Lede>

        <SectionHeading>The shape of a monograph</SectionHeading>
        <Body>
          The sections are not equal, and are not meant to look it. The opening band and the two
          major sections — evidence, and safety and uncertainties — carry the weight; the rest are
          compact and set in smaller type.
        </Body>
        <LongTable
          columns={[
            { label: 'No.', flex: 0.35 },
            { label: 'Section', flex: 1.3 },
            { label: 'What it holds', flex: 4 },
          ]}
          rows={ANATOMY}
          dense
        />

        <SectionHeading>Marks and editorial states</SectionHeading>
        <Body>
          Each statement carries a mark for the strongest kind of evidence behind it — a shape as
          well as a colour, so it survives a photocopier — and its source keys beneath. Every
          statement in a monograph is a source fact, so none carries a badge; what the record holds
          as not established is listed under safety and uncertainties with a question mark.
        </Body>
        <LaneKey />
        <EditorialStateKey />

        <View wrap={false} style={{ marginTop: 14 }}>
          {/* Plain text, not `Label`: this block is already unbreakable, so no reservation. */}
          <Text
            style={{
              fontFamily: sans,
              fontWeight: 500,
              fontSize: type.micro,
              lineHeight: 1.2,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: colour.slate,
              marginBottom: 5,
            }}
          >
            What this volume is not
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 3 }}>
          {[
            'Not a ranking. Monographs are alphabetical, and nothing here scores a compound.',
            'Not a dosing guide. Regimens appear as a list of which sources report one; the detail is in the protocols volume, attributed and never averaged.',
            'Not reviewed. Every record was extracted by automation and is awaiting a named scientific reviewer.',
            'Not a merge. Where one name is used for two molecules, there are two monographs.',
          ].map((item) => (
            <View key={item} style={{ width: '50%', flexDirection: 'row', paddingRight: 10 }}>
              <Text style={{ width: 12, fontSize: type.small, color: colour.tideTeal }}>—</Text>
              <Text style={{ flex: 1, fontFamily: serif, fontSize: type.small, lineHeight: leading.tight, color: colour.ink }}>
                {item}
              </Text>
            </View>
          ))}
          </View>
        </View>
      </GuidePage>

      {/* --- Contents --------------------------------------------------------- */}
      <GuidePage section="Contents">
        <ChapterOpener eyebrow="Contents" title={`${String(total)} monographs`} />
        <Body>
          Alphabetical. {withHuman} of {total} records carry at least one statement resting on
          evidence from people. Counts sit inside each monograph, next to where they came from; there
          is no table here comparing compounds, because a count of statements measures attention, not
          evidence.
        </Body>
        {peptides.map((peptide, index) => (
          <View
            key={peptide.id}
            wrap={false}
            style={{ flexDirection: 'row', ...HAIRLINE, paddingVertical: 6 }}
          >
            <Text style={{ width: 28, fontFamily: sans, fontSize: type.small, color: colour.tideTeal }}>
              {String(index + 1).padStart(2, '0')}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: serif, fontSize: type.body, color: colour.ink }}>
                {peptide.canonicalName}
              </Text>
              <Text style={{ fontFamily: sans, fontSize: type.micro, color: colour.slate, marginTop: 1.5 }}>
                {peptide.categoryLabel ?? 'Category not recorded'}
              </Text>
            </View>
          </View>
        ))}
      </GuidePage>

      {/* --- The monographs ---------------------------------------------------- */}
      {peptides.map((peptide, index) => (
        <Monograph
          key={peptide.id}
          peptide={peptide}
          ordinal={index + 1}
          total={total}
          generatedAt={generatedAt}
        />
      ))}

      {/* --- Back matter -------------------------------------------------------- */}
      <GuidePage section="Method">
        <ChapterOpener
          eyebrow="Back matter"
          title="Method and review state"
          standfirst="Where every line in this book came from."
        />
        <Body>
          Each monograph is generated from a structured record. A statement reaches a record only by
          resolving to an exact location in a named source, with a recorded reading distinct from
          the passage itself and a statement of what remains uncertain.
        </Body>
        <Body>
          No record in this edition has been through scientific review. That is the next step, and
          until it happens this volume is a working artefact: useful for checking what a source says
          and where, and not a clinical reference.
        </Body>

        <View
          wrap={false}
          style={{
            borderLeftWidth: 2,
            borderLeftColor: colour.caution,
            backgroundColor: colour.cautionBg,
            padding: 11,
            marginTop: 8,
            maxWidth: contentWidth,
          }}
        >
          <Text style={{ fontFamily: serif, fontSize: type.small, lineHeight: 1.45 }}>
            This book records what sources report. It does not recommend treatment, it issues no
            dose, and nothing in it should be used to start, stop or change anything.
          </Text>
        </View>

        <CurrentVersionBlock
          url="thetidesindex.com"
          version={`The Peptide Reference Guide · first edition · generated ${generatedAt}`}
          note="Records unreviewed. A printed copy goes out of date the moment a record is corrected."
        />
      </GuidePage>
    </Document>
  );
}
