import { Document, Text, View } from '@react-pdf/renderer';
import type { DocumentProps } from '@react-pdf/renderer';
import type { ReactElement } from 'react';
import { colour, contentWidth, sans, serif, type } from './theme';
import { Body, Callout, PublicationPage, SectionHeading } from './primitives';
import type { LibraryProtocol, ProtocolLibrary } from '@/server/public/protocol-library';

/**
 * PEPTIDE PROTOCOLS & CLINICAL QUICK REFERENCE — first version.
 *
 * Generated from the protocol library, never written. Every regimen appears as
 * one named source published it, with the kind of evidence it rests on as the
 * first line of its entry, in the order: compound, then evidence context from
 * the strongest kind of source to the weakest, then source key.
 *
 * That ordering is the one deliberate choice in the book and it is not a
 * ranking of regimens. It puts an approved-label regimen above a handbook's
 * because a reader turning to a compound should meet what a regulator
 * authorised, or what a trial tested, before what a practitioner reports — and
 * should see, by the label, which is which. Within an evidence context, source
 * key order carries no judgement.
 *
 * There is no Tides dose in this book and no column for one.
 */

export interface ProtocolBookProps {
  readonly library: ProtocolLibrary;
  readonly generatedAt: string;
}

const CONTEXT: Record<string, { label: string; order: number; note: string }> = {
  approved_label_evidence: {
    label: 'Approved-label regimen',
    order: 0,
    note: 'Specified in labelling a regulator authorised, for that product and indication only.',
  },
  human_rct: {
    label: 'Human trial regimen',
    order: 1,
    note: 'The schedule a randomised trial tested in its population.',
  },
  human_controlled_nonrandomized: {
    label: 'Human controlled-study regimen',
    order: 2,
    note: 'The schedule a controlled, non-randomised human study used.',
  },
  human_prospective_uncontrolled: {
    label: 'Human study regimen',
    order: 3,
    note: 'The schedule a human study without a comparison group used.',
  },
  human_observational: {
    label: 'Human observational',
    order: 4,
    note: 'What was given to people outside a study, reported afterwards.',
  },
  animal_in_vivo: { label: 'Preclinical — animal', order: 5, note: 'An animal dosing schedule.' },
  practitioner_reference: {
    label: 'Practitioner handbook',
    order: 6,
    note: 'What a clinician or author reports using. No study is behind it unless stated.',
  },
  expert_commentary: { label: 'Expert commentary', order: 7, note: '' },
  experiential_anecdotal: { label: 'Experiential report', order: 8, note: '' },
};

function contextOf(protocol: LibraryProtocol): { label: string; order: number } {
  return CONTEXT[protocol.evidenceTypeKey] ?? { label: protocol.evidenceTypeLabel, order: 9 };
}

const ALWAYS = new Set(['Route', 'Amount as reported', 'Frequency', 'Duration', 'Monitoring']);

const FIELDS: readonly [string, (p: LibraryProtocol) => string | null][] = [
  ['Population or model', (p) => p.populationModel],
  ['Route', (p) => p.routeName],
  ['Formulation', (p) => p.formulation],
  ['Amount as reported', (p) => p.amountReported],
  ['Frequency', (p) => p.frequencyText],
  ['Timing', (p) => p.timingText],
  ['Duration', (p) => p.durationText],
  ['Cycle / off period', (p) => p.cycleText],
  ['Titration', (p) => p.titrationText],
  ['Combinations', (p) => p.combinationsText],
  ['Monitoring', (p) => p.monitoringText],
  ['Cautions', (p) => p.contraindicationsText],
  ['Side effects reported', (p) => p.safetyNotes],
];

export function ProtocolBook({ library, generatedAt }: ProtocolBookProps): ReactElement<DocumentProps> {
  const publication = 'Peptide Protocols & Clinical Quick Reference';

  const byCompound = new Map<string, LibraryProtocol[]>();
  for (const protocol of library.protocols) {
    const list = byCompound.get(protocol.peptideSlug) ?? [];
    list.push(protocol);
    byCompound.set(protocol.peptideSlug, list);
  }
  for (const list of byCompound.values()) {
    list.sort(
      (a, b) =>
        contextOf(a).order - contextOf(b).order ||
        (a.sources[0]?.sourceKey ?? '').localeCompare(b.sources[0]?.sourceKey ?? ''),
    );
  }
  const compounds = [...byCompound.entries()].sort((a, b) =>
    a[1][0]!.peptideName.localeCompare(b[1][0]!.peptideName),
  );

  return (
    <Document title={publication} author="The Tides Index" subject="Source-reported regimens, attributed">
      <PublicationPage publication={publication} section="How to read this book">
        <Text style={{ fontFamily: sans, fontSize: type.micro, letterSpacing: 1.1, textTransform: 'uppercase', color: colour.slate }}>
          The Tides Index · first version
        </Text>
        <Text style={{ fontFamily: serif, fontSize: 28, color: colour.ink, marginTop: 6, lineHeight: 1.15 }}>
          Peptide Protocols &amp; Clinical Quick Reference
        </Text>
        <Text style={{ fontFamily: serif, fontSize: type.body, color: colour.inkSoft, marginTop: 10, lineHeight: 1.5, maxWidth: contentWidth * 0.85 }}>
          What named sources have reported, source by source. {library.totalCount} regimens for{' '}
          {library.compounds.length} compounds from {library.facets.sources.length} sources.
        </Text>

        <Callout title="This book issues no dose">
          <Text>
            Every entry is a record that a source reported a regimen, and where. None is a
            recommendation, and nothing here says any regimen works, is safe, or suits anyone. Most
            entries come from practitioner handbooks that cite no study for their amounts, and the
            first line of each entry says what kind of source it is. The records have not been reviewed
            by a person.
          </Text>
        </Callout>

        <SectionHeading>The first line of every entry</SectionHeading>
        {Object.values(CONTEXT)
          .filter((c) => c.note !== '')
          .map((c) => (
            <View key={c.label} style={{ flexDirection: 'row', marginBottom: 4 }}>
              <Text style={{ width: 150, fontFamily: sans, fontSize: type.micro, letterSpacing: 0.6, textTransform: 'uppercase', color: colour.deepTide, paddingTop: 1.5 }}>
                {c.label}
              </Text>
              <Text style={{ flex: 1, fontFamily: serif, fontSize: type.small, color: colour.inkSoft, lineHeight: 1.4 }}>
                {c.note}
              </Text>
            </View>
          ))}

        <SectionHeading>Order</SectionHeading>
        <Body>
          Within each compound, entries run from approved labelling, through human studies, to
          practitioner handbooks. That is an order of source type, so a reader meets what a regulator
          authorised or a trial tested before what a practitioner reports. It is not a ranking of the
          regimens themselves. Where a field is blank in a source, the entry says &ldquo;Not stated by this
          source&rdquo; rather than leaving a gap a reader might fill.
        </Body>
      </PublicationPage>

      {compounds.map(([slug, protocols]) => (
        <PublicationPage key={slug} publication={publication} section={protocols[0]!.peptideName}>
          <Text style={{ fontFamily: serif, fontSize: 22, color: colour.ink }}>{protocols[0]!.peptideName}</Text>
          <Text style={{ fontFamily: sans, fontSize: type.micro, color: colour.slate, marginTop: 3, marginBottom: 10 }}>
            {protocols.length} regimen{protocols.length === 1 ? '' : 's'} from{' '}
            {new Set(protocols.map((p) => p.sources[0]?.sourceKey)).size} source
            {new Set(protocols.map((p) => p.sources[0]?.sourceKey)).size === 1 ? '' : 's'}
          </Text>

          {protocols.map((protocol) => {
            const source = protocol.sources[0];
            return (
              <View key={protocol.id} wrap={false} style={{ borderTopWidth: 0.5, borderTopColor: colour.ruleSoft, paddingTop: 8, marginBottom: 10 }}>
                <Text style={{ fontFamily: sans, fontSize: type.micro, letterSpacing: 0.9, textTransform: 'uppercase', color: colour.deepTide }}>
                  {contextOf(protocol).label}
                </Text>
                <Text style={{ fontFamily: serif, fontSize: type.body, color: colour.ink, marginTop: 2 }}>
                  {source?.authors?.[0] ?? 'Author not recorded'}
                  {source?.year ? ` (${String(source.year)})` : ''} — {source?.sourceTitle ?? protocol.protocolKey}
                </Text>
                <Text style={{ fontFamily: serif, fontSize: type.small, color: colour.inkSoft, marginTop: 2, lineHeight: 1.4 }}>
                  {protocol.objectiveContext}
                </Text>

                <View style={{ marginTop: 4 }}>
                  {FIELDS.map(([label, get]) => {
                    const value = get(protocol);
                    if (value === null && !ALWAYS.has(label)) return null;
                    return (
                      <View key={label} style={{ flexDirection: 'row', marginTop: 1.5 }}>
                        <Text style={{ width: 104, fontFamily: sans, fontSize: type.micro, letterSpacing: 0.5, textTransform: 'uppercase', color: colour.slate, paddingTop: 1 }}>
                          {label}
                        </Text>
                        <Text style={{ flex: 1, fontFamily: serif, fontSize: type.small, color: value === null ? colour.slate : colour.inkSoft, lineHeight: 1.4 }}>
                          {value ?? 'Not stated by this source'}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {protocol.regulatoryContext === null ? null : (
                  <Text style={{ fontFamily: serif, fontSize: type.micro, color: colour.slate, marginTop: 4, lineHeight: 1.4 }}>
                    {protocol.regulatoryContext}
                  </Text>
                )}
                <Text style={{ fontFamily: sans, fontSize: type.micro, color: colour.slate, marginTop: 3 }}>
                  {source?.sourceKey ?? ''}
                  {source?.locatorText ? ` · ${source.locatorText}` : ' · location not recorded'}
                </Text>
              </View>
            );
          })}

          <Text style={{ fontFamily: sans, fontSize: type.micro, color: colour.slate, marginTop: 6 }}>
            Generated {generatedAt} from the Tides Index protocol library. Not reviewed by a person. Check
            thetidesindex.com before relying on a printed copy.
          </Text>
        </PublicationPage>
      ))}
    </Document>
  );
}
