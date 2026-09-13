import { Document, Text, View } from '@react-pdf/renderer';
import type { ReactElement } from 'react';
import type { DocumentProps } from '@react-pdf/renderer';
import { colour, contentWidth, sans, serif, type } from './theme';
import {
  Body,
  Bullets,
  Callout,
  PublicationPage,
  SectionHeading,
  SourceNote,
  SubHeading,
} from './primitives';
import type { PeptidePage, PractitionerProtocol } from '@/server/public/queries';

/**
 * A practitioner reference sheet, built from the record.
 *
 * Unlike the two books in this pipeline, nothing here is written into the file.
 * Every line comes from the database, and the sheet's job is to lay a compound
 * record out at the density a clinician reads at rather than the density a
 * reader browses at. That constraint is the point: a printed sheet is the
 * artefact most likely to be photocopied, passed on, and consulted six months
 * after the record it came from was corrected, so it carries the record's
 * version and the date it was generated on every copy, and it cannot say
 * anything the record does not.
 *
 * It feeds THE PEPTIDE REFERENCE GUIDE and PEPTIDE PROTOCOLS & CLINICAL QUICK
 * REFERENCE. What it is not is a dosing card. Protocols appear attributed to
 * the source that reported each, under a heading that says so, with the
 * evidence class on every one; there is no Tides regimen and no column a reader
 * could mistake for one.
 */

export interface ReferenceSheetProps {
  readonly peptide: PeptidePage;
  /** When the sheet was generated. Printed, because a sheet outlives a screen. */
  readonly generatedAt: string;
}

const RULE = { borderBottomWidth: 0.5, borderBottomColor: colour.ruleSoft } as const;

export function ReferenceSheet({ peptide, generatedAt }: ReferenceSheetProps): ReactElement<DocumentProps> {
  const publication = 'The Tides Index — practitioner reference';
  const approved = peptide.regulatoryStatuses.filter((s) => s.status === 'approved');
  const screen = peptide.literatureScreens[0];

  return (
    <Document
      title={`${peptide.canonicalName} — practitioner reference sheet`}
      author="The Tides Index"
      subject="Independent peptide science and clinical reference"
    >
      <PublicationPage publication={publication} section={peptide.canonicalName}>
        {/* --- Masthead --------------------------------------------------- */}
        <View style={{ ...RULE, paddingBottom: 10, marginBottom: 14 }}>
          <Text
            style={{
              fontFamily: sans,
              fontSize: type.micro,
              letterSpacing: 1.1,
              textTransform: 'uppercase',
              color: colour.slate,
            }}
          >
            Practitioner reference sheet
          </Text>
          <Text
            style={{
              fontFamily: serif,
              fontSize: 26,
              color: colour.ink,
              marginTop: 4,
            }}
          >
            {peptide.canonicalName}
          </Text>
          {peptide.shortDescription === null ? null : (
            <Text
              style={{
                fontFamily: serif,
                fontSize: type.small,
                color: colour.inkSoft,
                marginTop: 5,
                lineHeight: 1.45,
                maxWidth: contentWidth * 0.86,
              }}
            >
              {peptide.shortDescription}
            </Text>
          )}
        </View>

        {/* --- Status bar: what this record is, before anything it says --- */}
        <View style={{ flexDirection: 'row', marginBottom: 14 }}>
          <Fact
            label="Regulatory"
            value={
              approved.length > 0
                ? `Approved — ${approved.map((s) => s.jurisdiction).join(', ')}`
                : peptide.regulatoryStatuses.length > 0
                  ? 'No approval recorded'
                  : 'Nothing recorded'
            }
          />
          <Fact
            label="Human evidence"
            value={
              screen === undefined
                ? `${String(countHumanClaims(peptide))} statements rest on human evidence`
                : `${String(screen.humanPrimaryCount)} primary human records identified (substudies count separately)`
            }
          />
          <Fact
            label="Recorded as unsettled"
            value={`${String(peptide.gaps.length)} points`}
          />
        </View>

        <Callout title="What this sheet is">
          <Text>
            A printout of a structured record, not clinical advice. Every regimen below is
            reproduced as one named source reported it, with that source named beside it. Nothing
            here is combined, averaged or recommended, and this index issues no dose of its own.
            {peptide.publishedAt === null
              ? ' This record has not been published and has not been reviewed by a person.'
              : ''}
          </Text>
        </Callout>

        {/* --- Summary ------------------------------------------------------ */}
        {peptide.practitionerSummary === null ? null : (
          <>
            <SectionHeading>Summary</SectionHeading>
            <Prose text={peptide.practitionerSummary} />
          </>
        )}

        {/* --- Products ----------------------------------------------------- */}
        {peptide.products.length === 0 ? null : (
          <>
            <SectionHeading>Products</SectionHeading>
            <Body>
              One molecule, {peptide.products.length} products. The labelling states they are not
              substitutable, and a figure quoted for one is not a figure for another.
            </Body>
            {peptide.products.map((product) => (
              <View key={product.id} style={{ ...RULE, paddingVertical: 7 }}>
                <Text style={{ fontFamily: serif, fontSize: type.body, color: colour.deepTide }}>
                  {product.productName}
                  {product.applicationNumber === null ? '' : ` · ${product.applicationNumber}`}
                </Text>
                <Pairs
                  pairs={[
                    ['Presentation', product.presentation],
                    ['Strength', product.strengthText],
                    ['Labelled dose', product.labelledDoseText],
                    ['Reconstitution', product.reconstitutionText],
                    ['Storage', product.storageText],
                  ]}
                />
              </View>
            ))}
          </>
        )}

        {/* --- Pharmacokinetics --------------------------------------------- */}
        {peptide.pharmacokinetics.length === 0 ? null : (
          <>
            <SectionHeading>Pharmacokinetics</SectionHeading>
            <Body>
              Each value with the conditions it was measured under. Values for one parameter differ
              because the conditions differ.
            </Body>
            {peptide.pharmacokinetics.map((observation) => (
              <View key={observation.id} style={{ ...RULE, paddingVertical: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: serif, fontSize: type.body, color: colour.ink }}>
                    {observation.parameter}: {observation.valueText}
                  </Text>
                  <Text style={{ fontFamily: sans, fontSize: type.micro, color: colour.slate }}>
                    {observation.evidenceTypeLabel}
                  </Text>
                </View>
                <Pairs
                  pairs={[
                    ['Product', observation.productName],
                    ['Population', observation.population],
                    ['Dose', observation.doseContext],
                    ['Conditions', observation.studyCondition],
                  ]}
                />
              </View>
            ))}
          </>
        )}

        {/* --- Routes -------------------------------------------------------- */}
        {peptide.routes.length === 0 ? null : (
          <>
            <SectionHeading>Routes reported</SectionHeading>
            {peptide.routes.map((route) => (
              <View key={route.id} style={{ ...RULE, paddingVertical: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: serif, fontSize: type.body, color: colour.deepTide }}>
                    {route.routeName ?? route.routeKey}
                  </Text>
                  <Text style={{ fontFamily: sans, fontSize: type.micro, color: colour.slate }}>
                    {route.evidenceTypeLabel}
                  </Text>
                </View>
                {route.limitationsNotes === null ? null : (
                  <Text
                    style={{
                      fontFamily: serif,
                      fontSize: type.small,
                      color: colour.inkSoft,
                      marginTop: 2,
                      lineHeight: 1.4,
                    }}
                  >
                    {route.limitationsNotes}
                  </Text>
                )}
              </View>
            ))}
          </>
        )}

        {/* --- Protocols ----------------------------------------------------- */}
        <SectionHeading>Regimens, as reported</SectionHeading>
        {peptide.protocols.length === 0 ? (
          <Body>No source held by this index reports a regimen for this compound.</Body>
        ) : (
          <>
            <Body>
              {peptide.protocols.length} records, each from one named source. No column here is
              recommended and no two are combined.
            </Body>
            {(peptide.protocols as readonly PractitionerProtocol[]).map((protocol) => (
              <View key={protocol.id} style={{ ...RULE, paddingVertical: 7 }} wrap={false}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text
                    style={{
                      fontFamily: serif,
                      fontSize: type.body,
                      color: colour.deepTide,
                      maxWidth: contentWidth * 0.7,
                    }}
                  >
                    {protocol.objectiveContext}
                  </Text>
                  <Text style={{ fontFamily: sans, fontSize: type.micro, color: colour.slate }}>
                    {protocol.evidenceTypeLabel}
                  </Text>
                </View>
                <Pairs
                  pairs={[
                    ['Population', protocol.populationModel],
                    ['Route', protocol.routeName],
                    ['Formulation', protocol.formulation],
                    ['Amount as reported', protocol.amountReported],
                    ['Frequency', protocol.frequencyText],
                    ['Duration', protocol.durationText],
                    ['Monitoring', protocol.monitoringText],
                    ['Cautions', protocol.contraindicationsText ?? protocol.safetyNotes],
                    ['Context', protocol.regulatoryContext],
                    ['Reported by', protocol.sources.map((s) => s.sourceKey).join('; ')],
                  ]}
                />
              </View>
            ))}
          </>
        )}

        {/* --- Disagreements -------------------------------------------------- */}
        {peptide.disagreements.length === 0 ? null : (
          <>
            <SectionHeading>Where sources differ</SectionHeading>
            {peptide.disagreements.map((disagreement) => (
              <View key={disagreement.id} style={{ marginBottom: 9 }}>
                <SubHeading>{disagreement.topic}</SubHeading>
                <Text
                  style={{
                    fontFamily: sans,
                    fontSize: type.micro,
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                    color:
                      disagreement.resolution === 'unresolved' ? colour.caution : colour.deepTide,
                    marginBottom: 3,
                  }}
                >
                  {resolutionLabel(disagreement.resolution)}
                </Text>
                {disagreement.resolutionBasis === null ? null : (
                  <Body>{disagreement.resolutionBasis}</Body>
                )}
                <Bullets
                  items={disagreement.positions.map(
                    (position) =>
                      `${position.citation.sourceKey} — ${position.citation.sourceTitle}: ${position.positionText ?? 'position shown in the full record'}`,
                  )}
                />
              </View>
            ))}
          </>
        )}

        {/* --- What is not established ---------------------------------------- */}
        {peptide.gaps.length === 0 ? null : (
          <>
            <SectionHeading>Not established</SectionHeading>
            <Bullets items={peptide.gaps.map((gap) => gap.statement)} />
          </>
        )}

        {/* --- Questions for research ----------------------------------------- */}
        {/* Gaps about access carry no question, so they are simply skipped. */}
        {peptide.gaps.some((gap) => gap.researchQuestion !== null) ? (
          <>
            <SectionHeading>Questions for research</SectionHeading>
            <Bullets
              items={peptide.gaps.flatMap((gap) =>
                gap.researchQuestion === null ? [] : [gap.researchQuestion],
              )}
            />
          </>
        ) : null}


        {/* --- Provenance ------------------------------------------------------ */}
        <SectionHeading>Sources</SectionHeading>
        <SourceNote items={sourceLines(peptide)} />

        <View style={{ marginTop: 12, ...RULE, borderBottomWidth: 0 }}>
          <Text style={{ fontFamily: sans, fontSize: type.micro, color: colour.slate, lineHeight: 1.5 }}>
            Record version {peptide.version}. Generated {generatedAt}.
            {peptide.publishedAt === null
              ? ' Not published; not reviewed by a person.'
              : ` Published ${peptide.publishedAt}.`}{' '}
            A printed sheet outlives the record it came from — check thetidesindex.com before
            relying on this copy.
          </Text>
        </View>
      </PublicationPage>
    </Document>
  );
}

// ---------------------------------------------------------------------------

function countHumanClaims(peptide: PeptidePage): number {
  return peptide.claims.filter((claim) =>
    claim.evidence.some((evidence) => evidence.evidenceClass === 'human'),
  ).length;
}

function resolutionLabel(resolution: string): string {
  const labels: Record<string, string> = {
    unresolved: 'Unresolved',
    resolved_different_formulation: 'Resolved — different product',
    resolved_different_population: 'Resolved — different population',
    resolved_different_study_condition: 'Resolved — different study conditions',
    resolved_different_chemical_form: 'Resolved — different chemical form',
    resolved_different_reporting_threshold: 'Resolved — different reporting threshold',
    source_error_confirmed: 'A source is in error',
    secondary_source_less_precise: 'Secondary source less precise',
    regulatory_source_more_specific: 'Regulatory source more specific',
    index_error_confirmed: 'This index was in error',
  };
  return labels[resolution] ?? resolution;
}

function sourceLines(peptide: PeptidePage): readonly string[] {
  const seen = new Map<string, string>();
  for (const claim of peptide.claims) {
    for (const evidence of claim.evidence) {
      seen.set(
        evidence.citation.sourceKey,
        `${evidence.citation.sourceKey} — ${evidence.citation.sourceTitle}`,
      );
    }
  }
  for (const protocol of peptide.protocols) {
    for (const source of protocol.sources) {
      seen.set(source.sourceKey, `${source.sourceKey} — ${source.sourceTitle}`);
    }
  }
  return [...seen.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, line]) => line);
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, paddingRight: 10 }}>
      <Text
        style={{
          fontFamily: sans,
          fontSize: type.micro,
          letterSpacing: 0.9,
          textTransform: 'uppercase',
          color: colour.slate,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily: serif,
          fontSize: type.small,
          color: colour.ink,
          marginTop: 2,
          lineHeight: 1.35,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

/**
 * A label/value list that omits what the record does not carry.
 *
 * "Not stated by this source" is printed rather than the row being dropped for
 * the fields a clinician would go looking for — a blank where a frequency
 * should be is read as "no particular frequency", which is not what a missing
 * value means.
 */
const ALWAYS_SHOWN = new Set(['Amount as reported', 'Frequency', 'Duration', 'Monitoring']);

function Pairs({ pairs }: { pairs: readonly (readonly [string, string | null])[] }) {
  return (
    <View style={{ marginTop: 3 }}>
      {pairs
        .filter(([label, value]) => value !== null || ALWAYS_SHOWN.has(label))
        .map(([label, value]) => (
          <View key={label} style={{ flexDirection: 'row', marginTop: 1.5 }}>
            <Text
              style={{
                width: 96,
                fontFamily: sans,
                fontSize: type.micro,
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                color: colour.slate,
                paddingTop: 1,
              }}
            >
              {label}
            </Text>
            <Text
              style={{
                flex: 1,
                fontFamily: serif,
                fontSize: type.small,
                color: value === null ? colour.slate : colour.inkSoft,
                lineHeight: 1.4,
              }}
            >
              {value ?? 'Not stated by this source'}
            </Text>
          </View>
        ))}
    </View>
  );
}

/** Markdown-ish prose from the record: paragraphs, with `**bold**` flattened. */
function Prose({ text }: { text: string }) {
  return (
    <>
      {text
        .split('\n\n')
        .map((paragraph) => paragraph.replaceAll('**', '').trim())
        .filter((paragraph) => paragraph !== '')
        .map((paragraph) => (
          <Body key={paragraph.slice(0, 40)}>{paragraph}</Body>
        ))}
    </>
  );
}
