/**
 * The publication family, as the web describes it.
 *
 * Five volumes are generated from the same records the site renders, so a
 * printed page and a web page cannot disagree. This module carries only what a
 * reader needs to choose between them — audience, what it holds, how far it has
 * got — and the chapter list of the patient volume, whose written-versus-brief
 * split is the honest measure of the whole programme's progress.
 *
 * Nothing here states anything about a peptide. A unit test holds the chapter
 * list to the volume itself, so this cannot drift from what the book contains.
 */

export interface VolumeChapter {
  readonly number: string;
  readonly title: string;
  readonly written: boolean;
}

export interface Volume {
  readonly key: string;
  readonly number: string;
  readonly title: string;
  readonly subtitle: string | null;
  readonly audience: string;
  readonly holds: string;
  readonly status: string;
  readonly chapters?: readonly VolumeChapter[];
}

/**
 * Understanding Peptides, chapter by chapter. Mirrors the CHAPTERS array in
 * src/publishing/books/understanding-peptides.tsx; `written` is true where that
 * file sets a `written` kind, and false where the chapter is still a brief.
 */
export const UNDERSTANDING_PEPTIDES_CHAPTERS: readonly VolumeChapter[] = [
  { number: 'One', title: 'What is a peptide?', written: true },
  { number: 'Two', title: 'Amino acids, peptides, proteins', written: true },
  { number: 'Three', title: 'Peptides in the human body', written: true },
  { number: 'Four', title: 'How peptide signalling works', written: true },
  { number: 'Five', title: 'Receptors', written: true },
  { number: 'Six', title: 'Why peptides are studied', written: false },
  { number: 'Seven', title: 'Routes of administration', written: true },
  { number: 'Eight', title: 'Understanding evidence', written: true },
  { number: 'Nine', title: 'Safety and uncertainty', written: true },
  { number: 'Ten', title: 'Quality, source and testing', written: true },
  { number: 'Eleven', title: 'Questions to ask your clinician', written: true },
  { number: 'Twelve', title: 'How to use The Tides Index', written: true },
];

export const VOLUMES: readonly Volume[] = [
  {
    key: 'understanding-peptides',
    number: 'Volume one',
    title: 'Understanding Peptides',
    subtitle: 'A plain-language introduction',
    audience: 'Patients and new clinic staff',
    holds:
      'What a peptide is, how peptides signal, what the body makes, how substances move through it, how to read evidence, and what to ask a clinician. No doses and no administration instructions.',
    status:
      'Draft for review: eleven chapters, with a planned chapter on why peptides are studied held back until it can be sourced. Every unsupported point is printed as what remains uncertain rather than filled in.',
    chapters: UNDERSTANDING_PEPTIDES_CHAPTERS,
  },
  {
    key: 'science-applications',
    number: 'Volume two',
    title: 'Peptide Science & Applications',
    subtitle: 'The general science behind the records',
    audience: 'Clinicians and scientifically confident readers',
    holds:
      'Receptors, signalling and modulation; pharmacokinetic terms and how peptides differ; routes; human versus preclinical evidence; and what the register computes about its own coverage.',
    status: 'Draft, generated from the records. Awaiting scientific review.',
  },
  {
    key: 'reference-guide',
    number: 'Volume three',
    title: 'The Peptide Reference Guide',
    subtitle: 'Twelve compound monographs, bound',
    audience: 'Clinicians',
    holds: 'Every compound record as a monograph, with its evidence, routes, unknowns and sources.',
    status: 'Draft, generated from the records. Awaiting scientific review.',
  },
  {
    key: 'protocols',
    number: 'Volume four',
    title: 'Peptide Protocols & Clinical Quick Reference',
    subtitle: 'Source-reported regimens, attributed',
    audience: 'Clinics comparing what sources report',
    holds:
      'Every regimen exactly as its source published it, with route, context, monitoring and cautions. No recommended protocol, because no source stated one.',
    status: 'Draft, generated from the records. Awaiting scientific review.',
  },
  {
    key: 'peptide-quality',
    number: 'Volume five',
    title: 'Peptide Quality: From Manufacturing to the Final Vial',
    subtitle: 'What testing establishes, and what it does not',
    audience: 'Anyone reading a certificate of analysis',
    holds:
      'Purity, identity and content as three separate questions; certificates; sterility and endotoxin; formulation; and the path from sequence to vial.',
    status: 'First-edition excerpt. Awaiting scientific review.',
  },
];
