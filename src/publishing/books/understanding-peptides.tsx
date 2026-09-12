import { Document, Svg, Rect, Line, Text, View } from '@react-pdf/renderer';
import {
  Body,
  ChapterOpener,
  Cover,
  CurrentVersionBlock,
  Lede,
  PublicationPage,
  SectionHeading,
  SubHeading,
} from '../primitives';
import { TideMark } from '../figures';
import { colour, contentWidth, leading, sans, serif, type } from '../theme';

/**
 * UNDERSTANDING PEPTIDES — design skeleton.
 *
 * Structure and page templates only. **No medical content.**
 *
 * This publication is the patient- and new-staff-facing one, which makes it the
 * single most dangerous thing in the programme to draft speculatively: it will
 * be read by people with the least ability to check it, and a plausible
 * paragraph written to fill a page is indistinguishable from a sourced one once
 * it is set in the same typeface.
 *
 * So every chapter here is a *brief*: what the chapter will cover, what kind of
 * source it needs, and an illustration placeholder sized to the real layout.
 * Nothing on these pages states anything about peptides that a reader could
 * mistake for a finding. The skeleton proves the design travels to a second
 * publication; the content waits for extraction and review.
 */

const PUBLICATION = 'Understanding Peptides';
const ISSUED = '12 September 2026';

/** A sized, labelled hole where an illustration will go. */
function IllustrationSlot({
  label,
  height,
  note,
}: {
  label: string;
  height: number;
  note?: string;
}) {
  const width = contentWidth;
  return (
    <View style={{ marginVertical: 12 }} wrap={false}>
      <Svg width={width} height={height} viewBox={`0 0 ${String(width)} ${String(height)}`}>
        <Rect
          x={0.5}
          y={0.5}
          width={width - 1}
          height={height - 1}
          fill={colour.mist}
          stroke={colour.rule}
          strokeWidth={1}
          strokeDasharray="4 3"
          rx={3}
        />
        <Line x1={0} y1={0} x2={width} y2={height} stroke={colour.ruleSoft} strokeWidth={0.5} />
        <Line x1={width} y1={0} x2={0} y2={height} stroke={colour.ruleSoft} strokeWidth={0.5} />
      </Svg>
      <View
        style={{
          position: 'absolute',
          top: height / 2 - 16,
          left: 0,
          right: 0,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontFamily: sans,
            fontSize: type.micro,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            color: colour.slate,
          }}
        >
          Illustration
        </Text>
        <Text
          style={{
            fontFamily: serif,
            fontSize: type.small,
            color: colour.inkSoft,
            marginTop: 3,
            textAlign: 'center',
          }}
        >
          {label}
        </Text>
        {note === undefined ? null : (
          <Text
            style={{
              fontFamily: sans,
              fontSize: type.micro,
              color: colour.slate,
              marginTop: 3,
              textAlign: 'center',
            }}
          >
            {note}
          </Text>
        )}
      </View>
    </View>
  );
}

/** What a chapter will contain, and what it needs before it can be written. */
function ChapterBrief({
  covers,
  needs,
}: {
  covers: readonly string[];
  needs: string;
}) {
  return (
    <View
      style={{
        borderWidth: 0.75,
        borderColor: colour.rule,
        borderRadius: 3,
        padding: 13,
        marginTop: 10,
        backgroundColor: colour.white,
      }}
      wrap={false}
    >
      <Text
        style={{
          fontFamily: sans,
          fontSize: type.micro,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: colour.deepTide,
          marginBottom: 6,
        }}
      >
        This chapter will cover
      </Text>
      {covers.map((item) => (
        <View key={item} style={{ flexDirection: 'row', marginBottom: 3 }}>
          <Text style={{ width: 12, color: colour.tideTeal, fontSize: type.small }}>—</Text>
          <Text
            style={{
              flex: 1,
              fontFamily: serif,
              fontSize: type.small,
              lineHeight: leading.tight,
            }}
          >
            {item}
          </Text>
        </View>
      ))}
      <Text
        style={{
          fontFamily: sans,
          fontSize: type.micro,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: colour.caution,
          marginTop: 9,
          marginBottom: 4,
        }}
      >
        Before it can be written
      </Text>
      <Text style={{ fontFamily: serif, fontSize: type.small, lineHeight: leading.tight }}>
        {needs}
      </Text>
    </View>
  );
}

interface ChapterPlan {
  readonly number: string;
  readonly title: string;
  readonly standfirst: string;
  readonly covers: readonly string[];
  readonly needs: string;
  readonly illustration: string;
  readonly illustrationNote?: string;
}

const CHAPTERS: readonly ChapterPlan[] = [
  {
    number: 'One',
    title: 'What is a peptide?',
    standfirst: 'The definition, and where the boundary with proteins sits.',
    covers: [
      'What distinguishes a peptide from a protein, and why the boundary is a convention rather than a fact of nature',
      'The peptide bond, drawn',
      'Why the distinction matters for how something is made, stored and measured',
    ],
    needs:
      'A biochemistry reference held and verified by this index. Nothing in the current register defines a peptide.',
    illustration: 'The peptide bond, and a chain of three residues',
    illustrationNote: 'Deterministic vector diagram, drawn from a located source',
  },
  {
    number: 'Two',
    title: 'Amino acids, peptides, proteins',
    standfirst: 'One alphabet, three scales.',
    covers: [
      'The twenty proteinogenic amino acids as an alphabet',
      'How sequence gives rise to structure',
      'What changes as a chain gets longer',
    ],
    needs: 'The same biochemistry reference. No claim here may rest on general knowledge.',
    illustration: 'Scale ladder: amino acid → peptide → protein',
  },
  {
    number: 'Three',
    title: 'Peptides in the human body',
    standfirst: 'What the body already makes, and what that does and does not imply.',
    covers: [
      'Endogenous peptides and the roles they play',
      'Why “the body makes it” is not an argument about safety or efficacy',
    ],
    needs:
      'A physiology source. This chapter is where a patient-facing publication is most likely to overstate, so it needs the strictest sourcing in the book.',
    illustration: 'Where endogenous peptides act',
  },
  {
    number: 'Four',
    title: 'How peptide signalling works',
    standfirst: 'Messages, not machinery.',
    covers: [
      'Signalling as a message-and-receiver system',
      'Why specificity matters',
      'What a signalling molecule does not do',
    ],
    needs: 'A physiology or pharmacology source held and verified.',
    illustration: 'Signal, receptor, response — schematic',
  },
  {
    number: 'Five',
    title: 'Receptors',
    standfirst: 'Why a molecule only acts where something is listening.',
    covers: [
      'Receptor binding as recognition',
      'Selectivity, and what follows from a molecule binding more than one target',
    ],
    needs: 'A pharmacology source.',
    illustration: 'Binding and selectivity',
  },
  {
    number: 'Six',
    title: 'Why peptides are studied',
    standfirst: 'The scientific interest, stated without enthusiasm.',
    covers: [
      'What makes peptides attractive as a class to study',
      'The practical difficulties that come with them',
      'The difference between an area of active research and an established treatment',
    ],
    needs:
      'Review literature. This chapter must be written to leave a reader less certain, not more.',
    illustration: 'Research interest and practical difficulty, side by side',
  },
  {
    number: 'Seven',
    title: 'Routes of administration',
    standfirst: 'How a molecule gets in, and why that is not a detail.',
    covers: [
      'The routes and what each demands of a molecule',
      'Why oral administration is hard for peptides',
      'What a route implies for stability and handling',
    ],
    needs:
      'A pharmaceutics source. The existing route taxonomy in the database carries the structure; none of it is yet backed by a located source.',
    illustration: 'Routes, and the barrier each must cross',
  },
  {
    number: 'Eight',
    title: 'Understanding evidence',
    standfirst: 'The chapter this publication exists for.',
    covers: [
      'What a study can and cannot show',
      'Animal evidence, and why it is not human evidence',
      'Practitioner experience, and where it sits',
      'How to read a claim that has no source attached',
    ],
    needs:
      'This chapter can be written earliest: it rests on the editorial method rather than on peptide science, and the method is already documented and tested.',
    illustration: 'A hierarchy of evidence, with the limits of each tier marked',
  },
  {
    number: 'Nine',
    title: 'Safety and uncertainty',
    standfirst: 'What is not known, said plainly.',
    covers: [
      'Why “no reported harm” is not “shown to be safe”',
      'How uncertainty is recorded in this index',
      'What a reader should do with an unknown',
    ],
    needs:
      'Regulatory and pharmacovigilance sources. Nothing in this chapter may imply a safety conclusion the register does not hold.',
    illustration: 'Known, unknown, and not yet asked',
  },
  {
    number: 'Ten',
    title: 'Quality, source and testing',
    standfirst: 'The short version of the Peptide Quality volume.',
    covers: [
      'The three analytical questions, simply',
      'What a certificate is',
      'Why a purity figure answers less than it appears to',
    ],
    needs:
      'Already supported. This chapter can be drawn from the reviewed Peptide Quality material once that review is complete.',
    illustration: 'Purity, identity, content — the simplified triangle',
  },
  {
    number: 'Eleven',
    title: 'Questions to ask your clinician',
    standfirst: 'A page to take with you.',
    covers: [
      'Questions about the evidence behind a suggestion',
      'Questions about the material itself',
      'Questions about monitoring and what would change the plan',
    ],
    needs:
      'Clinical review. This chapter is a prompt sheet and must never read as advice, a protocol or a dosing guide.',
    illustration: 'A single-page prompt card',
  },
];

export function UnderstandingPeptides() {
  return (
    <Document
      title="Understanding Peptides — design skeleton"
      author="The Tides Index"
      subject="Design skeleton. Structure and templates only; contains no medical content."
      creator="The Tides Index"
    >
      <Cover
        imprint="The Tides Index"
        title="Understanding Peptides"
        subtitle="A plain-language introduction"
        descriptor="Independent peptide science & clinical reference"
        editionLine={`Design skeleton · issued ${ISSUED}`}
        statusLine="Structure and page templates only. This document contains no medical content."
        mark={<TideMark width={300} />}
      />

      {/* --- What this is ---------------------------------------------- */}
      <PublicationPage publication={PUBLICATION} section="About this skeleton">
        <ChapterOpener
          eyebrow="Skeleton"
          title="What this document is"
          standfirst="A layout, a structure and a set of briefs. Not a draft."
        />

        <Lede>
          This is the design skeleton for the patient- and new-staff-facing volume. It exists to
          prove that the publication system carries to a second book, and to fix the structure
          before any content is written.
        </Lede>

        <Body>
          There is no medical content in it, and that is deliberate rather than a stage it has not
          reached yet. This is the volume that will be read by the people least able to check it,
          and a plausible paragraph written to fill a page is indistinguishable from a sourced one
          once it is set in the same typeface. So each chapter carries a brief — what it will cover
          and what has to exist before it can be written — and an illustration placeholder at the
          size the real figure will occupy.
        </Body>

        <SectionHeading>What has to happen before it is written</SectionHeading>
        <Body>
          Most of these chapters need sources this index does not yet hold. Two do not: the chapter
          on understanding evidence rests on the editorial method rather than on peptide science,
          and the chapter on quality can be drawn from the Peptide Quality material once its
          scientific review is complete. Those are the two to write first.
        </Body>

        <View
          style={{
            borderLeftWidth: 2,
            borderLeftColor: colour.caution,
            backgroundColor: colour.cautionBg,
            padding: 12,
            marginTop: 10,
          }}
        >
          <Text style={{ fontFamily: serif, fontSize: type.small, lineHeight: leading.tight }}>
            Nothing in this skeleton states anything about peptides. Any sentence that appears to
            is describing what a future chapter will address, not making the claim itself.
          </Text>
        </View>
      </PublicationPage>

      {/* --- Contents --------------------------------------------------- */}
      <PublicationPage publication={PUBLICATION} section="Contents">
        <ChapterOpener eyebrow="Contents" title="Eleven chapters" />

        {CHAPTERS.map((chapter, index) => (
          <View
            key={chapter.title}
            style={{
              flexDirection: 'row',
              borderBottomWidth: 0.5,
              borderBottomColor: colour.ruleSoft,
              paddingVertical: 8,
            }}
          >
            <Text
              style={{
                width: 30,
                fontFamily: sans,
                fontSize: type.small,
                color: colour.tideTeal,
              }}
            >
              {String(index + 1).padStart(2, '0')}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: serif, fontSize: type.body, color: colour.ink }}>
                {chapter.title}
              </Text>
              <Text
                style={{
                  fontFamily: sans,
                  fontSize: type.micro,
                  color: colour.slate,
                  marginTop: 2,
                }}
              >
                {chapter.standfirst}
              </Text>
            </View>
          </View>
        ))}

        <SubHeading>Back matter</SubHeading>
        <Body>Glossary · sources and method · current version · where to check for revisions.</Body>
      </PublicationPage>

      {/* --- One page per chapter --------------------------------------- */}
      {CHAPTERS.map((chapter) => (
        <PublicationPage key={chapter.title} publication={PUBLICATION} section={chapter.title}>
          <ChapterOpener
            eyebrow={chapter.number}
            title={chapter.title}
            standfirst={chapter.standfirst}
          />
          <IllustrationSlot
            label={chapter.illustration}
            height={170}
            {...(chapter.illustrationNote === undefined
              ? {}
              : { note: chapter.illustrationNote })}
          />
          <ChapterBrief covers={chapter.covers} needs={chapter.needs} />
        </PublicationPage>
      ))}

      {/* --- Back matter ------------------------------------------------ */}
      <PublicationPage publication={PUBLICATION} section="Method">
        <ChapterOpener
          eyebrow="Back matter"
          title="Sources, method and version"
          standfirst="The same chain as every Tides Index publication."
        />
        <Body>
          Every statement in the finished volume will resolve to an exact location in a named source,
          carry a recorded reading distinct from the passage itself, and state what remains
          uncertain. Where the sources settle nothing, the page will say so.
        </Body>
        <Body>
          This volume will additionally require clinical review, which the Peptide Quality volume
          does not: it addresses a reader who may act on it.
        </Body>

        <CurrentVersionBlock
          url="thetidesindex.com"
          version={`Understanding Peptides · design skeleton · issued ${ISSUED}`}
          note="No content. No claims. No review."
        />
      </PublicationPage>
    </Document>
  );
}
