import { Document, Svg, Circle, Path, Text, View } from '@react-pdf/renderer';
import type { DocumentProps } from '@react-pdf/renderer';
import type { ReactElement } from 'react';
import {
  Body,
  Bullets,
  Callout,
  ChapterOpener,
  Cover,
  CurrentVersionBlock,
  Lede,
  PublicationPage,
  SectionHeading,
  SourceNote,
  SubHeading,
  Table,
} from '../primitives';
import { SeriesMark } from '../figures';
import { colour, contentWidth, sans, serif, type } from '../theme';
import type {
  PeptidePage,
  PractitionerProtocol,
  RegulatoryStatus,
} from '@/server/public/queries';
import type { EvidenceRecord, PublicClaim } from '@/server/public/shapes';

/**
 * THE PEPTIDE REFERENCE GUIDE — the whole register, bound.
 *
 * Twelve monographs from twelve records, in one template. The template is the
 * point: a reader who learns where "what is not established" sits on the first
 * monograph finds it in the same place on the twelfth, and a compound with
 * nothing under a heading still shows the heading with its absence stated.
 * That is what makes the volume comparable without ranking anything — the
 * shape is constant, so the differences a reader notices are differences in
 * the evidence rather than in how somebody chose to write it up.
 *
 * Nothing here is written into the file. Every line is read from a record, so
 * the book cannot say anything the database does not, and it carries each
 * record's version and review state on the monograph itself.
 *
 * Identity-separated records stay separate. CJC-1295 and Modified GRF (1-29)
 * get a monograph each, as do TB-500 and thymosin beta-4, because merging them
 * would put one molecule's evidence behind another molecule's name — which is
 * the single most consequential error this field makes.
 */

export interface ReferenceGuideProps {
  readonly peptides: readonly PeptidePage[];
  readonly generatedAt: string;
}

const PUBLICATION = 'The Peptide Reference Guide';
const RULE = { borderBottomWidth: 0.5, borderBottomColor: colour.ruleSoft } as const;

// ---------------------------------------------------------------------------
// Marks
// ---------------------------------------------------------------------------

/**
 * An evidence-class mark: filled for human, half for preclinical, open for
 * reference and opinion. Shape carries the meaning as well as colour, because
 * a reader photocopying a page in black and white should still be able to tell
 * a trial from a handbook.
 */
function ClassMark({ evidenceClass }: { evidenceClass: string }) {
  const size = 8;
  if (evidenceClass === 'human') {
    return (
      <Svg width={size} height={size} viewBox="0 0 8 8">
        <Circle cx={4} cy={4} r={3.4} fill={colour.evidenceHuman} />
      </Svg>
    );
  }
  if (evidenceClass === 'preclinical') {
    return (
      <Svg width={size} height={size} viewBox="0 0 8 8">
        <Circle cx={4} cy={4} r={3.4} fill={colour.white} stroke={colour.slate} strokeWidth={1} />
        <Path d="M4 0.6 A3.4 3.4 0 0 1 4 7.4 Z" fill={colour.slate} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 8 8">
      <Circle cx={4} cy={4} r={3.4} fill={colour.white} stroke={colour.slate} strokeWidth={1} />
    </Svg>
  );
}

function ClassKey() {
  const items: readonly [string, string][] = [
    ['human', 'Human evidence'],
    ['preclinical', 'Preclinical'],
    ['reference_opinion', 'Reference or opinion'],
  ];
  return (
    <View style={{ flexDirection: 'row', gap: 14, marginTop: 6 }}>
      {items.map(([key, label]) => (
        <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <ClassMark evidenceClass={key} />
          <Text style={{ fontFamily: sans, fontSize: type.micro, color: colour.slate }}>
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Reading the record
// ---------------------------------------------------------------------------

function classesOf(claim: PublicClaim): Set<string> {
  return new Set(claim.evidence.map((evidence: EvidenceRecord) => evidence.evidenceClass));
}

function inCategory(claim: PublicClaim, words: readonly string[]): boolean {
  const haystack = `${claim.claimCategory ?? ''} ${claim.claimText}`.toLowerCase();
  return words.some((word) => haystack.includes(word));
}

/** The strongest class any of a claim's evidence carries. */
function leadClass(claim: PublicClaim): string {
  const classes = classesOf(claim);
  if (classes.has('human')) return 'human';
  if (classes.has('preclinical')) return 'preclinical';
  return 'reference_opinion';
}

function approvedIn(statuses: readonly RegulatoryStatus[]): readonly string[] {
  return statuses.filter((s) => s.status === 'approved').map((s) => s.jurisdiction);
}

function sourceLines(peptide: PeptidePage): readonly string[] {
  const seen = new Map<string, string>();
  for (const claim of peptide.claims) {
    for (const evidence of claim.evidence) {
      const { citation } = evidence;
      const year = citation.year === null ? '' : ` (${String(citation.year)})`;
      seen.set(citation.sourceKey, `${citation.sourceKey} — ${citation.sourceTitle}${year}`);
    }
  }
  for (const protocol of peptide.protocols) {
    for (const source of protocol.sources) {
      seen.set(source.sourceKey, `${source.sourceKey} — ${source.sourceTitle}`);
    }
  }
  return [...seen.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, line]) => line);
}

// ---------------------------------------------------------------------------
// Monograph parts
// ---------------------------------------------------------------------------

function ClaimList({ claims }: { claims: readonly PublicClaim[] }) {
  return (
    <>
      {claims.map((claim) => (
        <View key={claim.id} style={{ ...RULE, paddingVertical: 6 }} wrap={false}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <View style={{ paddingTop: 3 }}>
              <ClassMark evidenceClass={leadClass(claim)} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: serif,
                  fontSize: type.small,
                  color: colour.ink,
                  lineHeight: 1.45,
                }}
              >
                {claim.claimText}
              </Text>
              <Text
                style={{
                  fontFamily: sans,
                  fontSize: type.micro,
                  color: colour.slate,
                  marginTop: 2,
                }}
              >
                {claim.evidence
                  .map(
                    (evidence) =>
                      `${evidence.citation.sourceKey} · ${evidence.evidenceTypeLabel}${
                        evidence.primarySourceVerified ? ' · full text read' : ''
                      }`,
                  )
                  .join('   ')}
              </Text>
              {claim.uncertaintyText === null ? null : (
                <Text
                  style={{
                    fontFamily: serif,
                    fontSize: type.micro,
                    color: colour.inkSoft,
                    marginTop: 2,
                    lineHeight: 1.4,
                  }}
                >
                  Uncertain: {claim.uncertaintyText}
                </Text>
              )}
            </View>
          </View>
        </View>
      ))}
    </>
  );
}

function Absent({ children }: { children: string }) {
  return (
    <Text
      style={{
        fontFamily: serif,
        fontSize: type.small,
        color: colour.slate,
        marginTop: 3,
        marginBottom: 3,
      }}
    >
      {children}
    </Text>
  );
}

function Monograph({ peptide, generatedAt }: { peptide: PeptidePage; generatedAt: string }) {
  const human = peptide.claims.filter((claim) => classesOf(claim).has('human'));
  const preclinical = peptide.claims.filter(
    (claim) => !classesOf(claim).has('human') && classesOf(claim).has('preclinical'),
  );
  const mechanism = peptide.claims.filter((claim) =>
    inCategory(claim, ['mechanism', 'receptor', 'signal']),
  );
  const safety = peptide.claims.filter((claim) =>
    inCategory(claim, ['safety', 'adverse', 'harm', 'toxic']),
  );
  const screen = peptide.literatureScreens[0];
  const approved = approvedIn(peptide.regulatoryStatuses);
  const protocols = peptide.protocols as readonly PractitionerProtocol[];
  const questions = peptide.gaps.flatMap((gap) =>
    gap.researchQuestion === null ? [] : [gap.researchQuestion],
  );

  return (
    <>
      {/* --- Opening page: identity, orientation, the glance ---------------- */}
      <PublicationPage publication={PUBLICATION} section={peptide.canonicalName}>
        <View style={{ ...RULE, paddingBottom: 9, marginBottom: 12 }}>
          <Text
            style={{
              fontFamily: sans,
              fontSize: type.micro,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              color: colour.tideTeal,
            }}
          >
            Monograph
          </Text>
          <Text style={{ fontFamily: serif, fontSize: 27, color: colour.ink, marginTop: 3 }}>
            {peptide.canonicalName}
          </Text>
          {peptide.aliases.length === 0 ? null : (
            <Text
              style={{
                fontFamily: sans,
                fontSize: type.micro,
                color: colour.slate,
                marginTop: 4,
                lineHeight: 1.5,
              }}
            >
              {peptide.aliases.map((alias) => alias.alias).join(' · ')}
            </Text>
          )}
        </View>

        <SectionHeading>What it is</SectionHeading>
        {peptide.shortDescription === null ? (
          <Absent>No orientation line is recorded for this compound.</Absent>
        ) : (
          <Lede>{peptide.shortDescription}</Lede>
        )}
        {peptide.sequence === null ? null : (
          <Text
            style={{
              fontFamily: sans,
              fontSize: type.micro,
              color: colour.inkSoft,
              marginTop: 4,
              lineHeight: 1.5,
            }}
          >
            Sequence: {peptide.sequence}
            {peptide.molecularDescription === null ? '' : ` · ${peptide.molecularDescription}`}
          </Text>
        )}

        <SectionHeading>Evidence at a glance</SectionHeading>
        <Table
          head={['Dimension', 'What the record holds']}
          rows={[
            [
              'Human evidence',
              screen === undefined
                ? `${String(human.length)} statements rest on human evidence`
                : `${String(screen.humanPrimaryCount)} primary human records identified by a ${screen.databaseName} screen on ${screen.searchDate}; substudies counted separately`,
            ],
            [
              'Preclinical',
              `${String(preclinical.length)} statements rest on laboratory or animal work alone`,
            ],
            [
              'Literature screened',
              screen === undefined
                ? 'No screen has been run for this compound'
                : `${String(screen.resultCount)} records returned by the ${screen.databaseName} search of ${screen.searchDate}, of which ${String(screen.includedCount)} were about this compound. A record is a publication, not a study: substudies and duplicates are counted where the screen says so.`,
            ],
            [
              'Replication',
              peptide.replication.length === 0
                ? 'Not assessed'
                : peptide.replication
                    .map((assessment) => assessment.state.replaceAll('_', ' '))
                    .join('; '),
            ],
            [
              'Routes recorded',
              peptide.routes.length === 0
                ? 'None recorded'
                : peptide.routes.map((route) => route.routeName).join(', '),
            ],
            [
              'Source-reported regimens',
              protocols.length === 0
                ? 'None recorded'
                : `${String(protocols.length)} from ${String(
                    new Set(protocols.flatMap((p) => p.sources.map((s) => s.sourceKey))).size,
                  )} sources`,
            ],
            ['Recorded as unsettled', `${String(peptide.gaps.length)} points`],
            [
              'Regulatory',
              approved.length > 0
                ? `Approved — ${approved.join(', ')}`
                : peptide.regulatoryStatuses.length > 0
                  ? 'No approval recorded'
                  : 'Nothing recorded',
            ],
          ]}
          widths={[1, 2.6]}
        />
        <ClassKey />

        <Callout title="What this monograph is">
          <Text>
            A printout of a structured record. Every regimen below is reproduced as one named source
            reported it, nothing is averaged or recommended, and this index issues no dose of its
            own.
            {peptide.publishedAt === null
              ? ' This record has not been published and has not been reviewed by a person.'
              : ''}
          </Text>
        </Callout>
      </PublicationPage>

      {/* --- Evidence pages ------------------------------------------------- */}
      <PublicationPage publication={PUBLICATION} section={peptide.canonicalName}>
        <SectionHeading>Human evidence</SectionHeading>
        {human.length === 0 ? (
          <Absent>
            No statement on this record rests on evidence from people. That is a fact about what has
            been studied, not a judgement about the compound.
          </Absent>
        ) : (
          <ClaimList claims={human} />
        )}

        <SectionHeading>Preclinical evidence</SectionHeading>
        {preclinical.length === 0 ? (
          <Absent>No statement rests on laboratory or animal work alone.</Absent>
        ) : (
          <ClaimList claims={preclinical} />
        )}

        <SectionHeading>Mechanism</SectionHeading>
        {mechanism.length === 0 ? (
          <Absent>No mechanism is recorded for this compound in the sources held here.</Absent>
        ) : (
          <ClaimList claims={mechanism} />
        )}

        <SectionHeading>Replication</SectionHeading>
        {peptide.replication.length === 0 ? (
          <Absent>No finding on this record has been assessed for replication.</Absent>
        ) : (
          peptide.replication.map((assessment) => (
            <View key={assessment.id} style={{ ...RULE, paddingVertical: 6 }} wrap={false}>
              <SubHeading>{assessment.finding}</SubHeading>
              <Text style={{ fontFamily: sans, fontSize: type.micro, color: colour.deepTide }}>
                {assessment.state.replaceAll('_', ' ')}
                {assessment.humanConfirmed ? ' · confirmed in humans' : ''}
              </Text>
              <Text
                style={{
                  fontFamily: serif,
                  fontSize: type.small,
                  color: colour.inkSoft,
                  marginTop: 2,
                  lineHeight: 1.45,
                }}
              >
                {assessment.basis}
              </Text>
              {assessment.limitations === null ? null : (
                <Text
                  style={{
                    fontFamily: serif,
                    fontSize: type.micro,
                    color: colour.slate,
                    marginTop: 2,
                    lineHeight: 1.4,
                  }}
                >
                  Limits: {assessment.limitations}
                </Text>
              )}
            </View>
          ))
        )}
      </PublicationPage>

      {/* --- Practical pages -------------------------------------------------- */}
      <PublicationPage publication={PUBLICATION} section={peptide.canonicalName}>
        <SectionHeading>Routes</SectionHeading>
        {peptide.routes.length === 0 ? (
          <Absent>No route is recorded by any source held here.</Absent>
        ) : (
          peptide.routes.map((route) => (
            <View key={route.id} style={{ ...RULE, paddingVertical: 5 }} wrap={false}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: serif, fontSize: type.small, color: colour.deepTide }}>
                  {route.routeName}
                </Text>
                <Text style={{ fontFamily: sans, fontSize: type.micro, color: colour.slate }}>
                  {route.evidenceTypeLabel}
                </Text>
              </View>
              {route.limitationsNotes === null ? null : (
                <Text
                  style={{
                    fontFamily: serif,
                    fontSize: type.micro,
                    color: colour.inkSoft,
                    marginTop: 2,
                    lineHeight: 1.4,
                  }}
                >
                  {route.limitationsNotes}
                </Text>
              )}
            </View>
          ))
        )}

        <SectionHeading>Pharmacokinetics and formulation</SectionHeading>
        {peptide.pharmacokinetics.length === 0 && peptide.forms.length === 0 ? (
          <Absent>
            Nothing held here reports what the body does to this compound, by any route.
          </Absent>
        ) : (
          <>
            {peptide.pharmacokinetics.map((observation) => (
              <View key={observation.id} style={{ ...RULE, paddingVertical: 5 }} wrap={false}>
                <Text style={{ fontFamily: serif, fontSize: type.small, color: colour.ink }}>
                  {observation.parameter}: {observation.valueText}
                </Text>
                <Text
                  style={{
                    fontFamily: sans,
                    fontSize: type.micro,
                    color: colour.slate,
                    marginTop: 1.5,
                  }}
                >
                  {[observation.population, observation.studyCondition, observation.evidenceTypeLabel]
                    .filter((part) => part !== null && part !== '')
                    .join(' · ')}
                </Text>
              </View>
            ))}
          </>
        )}

        <SectionHeading>Safety, as reported</SectionHeading>
        {safety.length === 0 ? (
          <Absent>
            No statement about safety is recorded. Nothing here should be read as a finding that the
            compound is safe.
          </Absent>
        ) : (
          <ClaimList claims={safety} />
        )}

        <SectionHeading>Source-reported regimens</SectionHeading>
        {protocols.length === 0 ? (
          <Absent>No source held here reports a regimen for this compound.</Absent>
        ) : (
          <>
            <Body>
              {protocols.length} records, each as one named source published it. The full detail of
              every regimen is in Peptide Protocols &amp; Clinical Quick Reference; what this volume
              records is which kinds of source report one.
            </Body>
            <Table
              head={['Reported by', 'Kind of source', 'Route', 'Context']}
              rows={protocols.map((protocol) => [
                protocol.sources.map((source) => source.sourceKey).join(', '),
                protocol.evidenceTypeLabel,
                protocol.routeName ?? 'Not stated',
                protocol.objectiveContext,
              ])}
              widths={[0.9, 1.2, 0.9, 2.2]}
            />
          </>
        )}
      </PublicationPage>

      {/* --- Disagreement, absence, provenance -------------------------------- */}
      <PublicationPage publication={PUBLICATION} section={peptide.canonicalName}>
        <SectionHeading>Where sources disagree</SectionHeading>
        {peptide.disagreements.length === 0 ? (
          <Absent>No disagreement between sources is recorded on this compound.</Absent>
        ) : (
          peptide.disagreements.map((disagreement) => (
            <View key={disagreement.id} style={{ marginBottom: 8 }} wrap={false}>
              <SubHeading>{disagreement.topic}</SubHeading>
              <Text
                style={{
                  fontFamily: sans,
                  fontSize: type.micro,
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                  color:
                    disagreement.resolution === 'unresolved' ? colour.caution : colour.deepTide,
                  marginBottom: 2,
                }}
              >
                {disagreement.resolution.replaceAll('_', ' ')}
              </Text>
              {disagreement.resolutionBasis === null ? null : (
                <Text
                  style={{
                    fontFamily: serif,
                    fontSize: type.small,
                    color: colour.inkSoft,
                    lineHeight: 1.45,
                  }}
                >
                  {disagreement.resolutionBasis}
                </Text>
              )}
              <Bullets
                items={disagreement.positions.map(
                  (position) =>
                    `${position.citation.sourceKey}: ${position.positionText ?? 'position shown in the full record'}`,
                )}
              />
            </View>
          ))
        )}

        <SectionHeading>Not established</SectionHeading>
        {peptide.gaps.length === 0 ? (
          <Absent>No gaps are recorded — which on a record this size is itself suspect.</Absent>
        ) : (
          <Bullets items={peptide.gaps.map((gap) => gap.statement)} />
        )}

        {questions.length === 0 ? null : (
          <Callout title="Questions for research">
            <Text>
              Derived from the absences above. Each describes a study that would reduce uncertainty;
              none is a suggestion to try anything.
            </Text>
            <Bullets items={questions} />
          </Callout>
        )}

        <SectionHeading>Regulatory context</SectionHeading>
        {peptide.regulatoryStatuses.length === 0 ? (
          <Absent>
            No position from any regulator is recorded. That is an absence in this index, and it is
            not evidence about the compound either way.
          </Absent>
        ) : (
          peptide.regulatoryStatuses.map((status) => (
            <View key={status.id} style={{ ...RULE, paddingVertical: 5 }}>
              <Text style={{ fontFamily: serif, fontSize: type.small, color: colour.ink }}>
                {status.jurisdiction}: {status.status.replaceAll('_', ' ')}
                {status.authority === null ? '' : ` (${status.authority})`}
              </Text>
              <Text
                style={{
                  fontFamily: sans,
                  fontSize: type.micro,
                  color: colour.slate,
                  marginTop: 1.5,
                }}
              >
                Checked {status.checkedAt}. Regulatory position is secondary to the evidence and
                goes out of date.
              </Text>
            </View>
          ))
        )}

        <SectionHeading>Key sources</SectionHeading>
        <SourceNote items={sourceLines(peptide)} />

        <View style={{ marginTop: 10 }}>
          <Text
            style={{
              fontFamily: sans,
              fontSize: type.micro,
              color: colour.slate,
              lineHeight: 1.5,
            }}
          >
            Record version {peptide.version}. Generated {generatedAt}.
            {peptide.publishedAt === null
              ? ' Not published; extracted and awaiting human scientific review.'
              : ` Published ${peptide.publishedAt}.`}
          </Text>
        </View>
      </PublicationPage>
    </>
  );
}

// ---------------------------------------------------------------------------

export function ReferenceGuide({
  peptides,
  generatedAt,
}: ReferenceGuideProps): ReactElement<DocumentProps> {
  const withHuman = peptides.filter((peptide) =>
    peptide.claims.some((claim) => classesOf(claim).has('human')),
  ).length;

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
        subtitle={`${String(peptides.length)} compound monographs`}
        descriptor="Independent peptide science & clinical reference"
        editionLine={`First edition · generated ${generatedAt}`}
        statusLine="Generated from structured records. Every monograph is awaiting human scientific review, and says so."
        mark={<SeriesMark width={300} volume={4} />}
      />

      {/* --- How to read it --------------------------------------------------- */}
      <PublicationPage publication={PUBLICATION} section="How to read this volume">
        <ChapterOpener
          eyebrow="Front matter"
          title="How to read this volume"
          standfirst="One template, twelve times. The headings do not move."
        />

        <Lede>
          Every monograph answers the same questions in the same order, and a heading with nothing
          under it still appears, carrying its absence. Most of what is known about most of these
          compounds is an absence, and a book that printed only the findings would misrepresent the
          field by omission.
        </Lede>

        <SectionHeading>What the marks mean</SectionHeading>
        <Body>
          Each statement carries a mark for the strongest kind of evidence behind it, and the source
          key beside it. The mark is a shape as well as a colour, so it survives a photocopier.
        </Body>
        <ClassKey />

        <SectionHeading>What this volume is not</SectionHeading>
        <Bullets
          items={[
            'Not a ranking. Monographs are alphabetical, and nothing here scores a compound.',
            'Not a dosing guide. Regimens appear as a list of which sources report one; the detail is in the protocols volume, attributed and never averaged.',
            'Not reviewed. Every record was extracted by automation and is awaiting a named scientific reviewer.',
            'Not a merge. Where one name is used for two molecules, there are two monographs.',
          ]}
        />

        <Callout title="Where the counts are, and are not">
          <Text>
            Counts appear inside a monograph, next to the database and date they came from, because
            that is the only place they mean anything. There is no table in this book comparing how
            many papers each compound has: a paper count measures attention, not evidence.
          </Text>
        </Callout>
      </PublicationPage>

      {/* --- Contents --------------------------------------------------------- */}
      <PublicationPage publication={PUBLICATION} section="Contents">
        <ChapterOpener eyebrow="Contents" title={`${String(peptides.length)} monographs`} />
        <Body>
          Alphabetical. {withHuman} of {peptides.length} records carry at least one statement resting
          on evidence from people.
        </Body>
        {peptides.map((peptide, index) => (
          <View
            key={peptide.id}
            style={{
              flexDirection: 'row',
              borderBottomWidth: 0.5,
              borderBottomColor: colour.ruleSoft,
              paddingVertical: 7,
            }}
          >
            <Text
              style={{ width: 28, fontFamily: sans, fontSize: type.small, color: colour.tideTeal }}
            >
              {String(index + 1).padStart(2, '0')}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: serif, fontSize: type.body, color: colour.ink }}>
                {peptide.canonicalName}
              </Text>
              <Text
                style={{
                  fontFamily: sans,
                  fontSize: type.micro,
                  color: colour.slate,
                  marginTop: 1.5,
                }}
              >
                {peptide.categoryLabel ?? 'Category not recorded'}
              </Text>
            </View>
          </View>
        ))}
      </PublicationPage>

      {/* --- The monographs ---------------------------------------------------- */}
      {peptides.map((peptide) => (
        <Monograph key={peptide.id} peptide={peptide} generatedAt={generatedAt} />
      ))}

      {/* --- Back matter -------------------------------------------------------- */}
      <PublicationPage publication={PUBLICATION} section="Method">
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
      </PublicationPage>
    </Document>
  );
}
