import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  AnnotatedCertificate,
  ChainOfCustodyFigure,
  TransparencyDimensions,
} from '@/components/public/certificate';
import { ClaimCard } from '@/components/public/evidence';
import { transparencyDimensions, type CertificateReading } from '@/server/public/certificate';
import type { PublicClaim } from '@/server/public/shapes';

/**
 * What a certificate page actually puts in front of a reader (Phase C.5).
 *
 * The data layer keeps reported and verified apart, keeps the parties apart, and
 * keeps Q7's scope attached to Q7's requirements. All of that is worth nothing if
 * the rendering drops it, and a rendering change that drops it looks like a
 * tidying commit.
 */

const CERTIFICATE: CertificateReading = {
  id: 'c1',
  certificateKey: 'specimen-third-party-report',
  certificateType: 'third_party_test_report',
  documentTitle: 'SPECIMEN — Analytical Test Report (fictional teaching document)',
  issuingEntity: 'Example Analytical Services (fictional)',
  laboratoryName: 'Example Analytical Services (fictional)',
  laboratoryAddress: 'Unit 0, Exampleton (fictional address)',
  laboratoryContact: null,
  manufacturerName: null,
  manufacturerAddress: null,
  distributorName: 'Example Peptide Supply Co. (fictional)',
  documentDate: '2026-04-14',
  reportNumber: 'SPEC-TR-000000',
  provenanceNotes: null,
  statedMaterialName: 'Example Peptide (fictional material)',
  statedGrade: null,
  statedStrength: null,
  batchNumber: 'EXB-0000',
  manufacturerBatchNumber: null,
  sampleIdentifier: 'LAB-SMP-0000',
  submittedSampleIdentifier: null,
  expiryDate: null,
  retestDate: null,
  testedMaterialScope: 'unknown',
  submittedBy: 'Example Peptide Supply Co. (fictional)',
  chainOfCustodyKnown: false,
  batchLinkage: 'stated_only',
  manufacturerIdentityEstablished: false,
  authorisedBy: 'A. Analyst (fictional)',
  whatItDemonstrates: 'That a named laboratory reports results for a sample it received.',
  whatItDoesNotDemonstrate: 'Who made the material, or that the sample came from the batch named.',
  provenanceGaps: null,
  missingFields: ['Original manufacturer name and address'],
  unverifiedRelationships: null,
  authenticityState: 'not_checked',
  authenticityNotes: null,
  isSpecimen: true,
  tests: [
    {
      id: 't1',
      testName: 'Purity by reversed-phase HPLC',
      analyticalMethod: 'Reversed-phase HPLC',
      methodReference: null,
      referenceStandard: null,
      specificationText: 'Not less than 98.0%',
      resultNumeric: '99.1',
      resultUnit: '% of total peak area',
      resultText: null,
      attachmentReference: null,
      testDate: '2026-04-11',
      qualityTopicSlug: 'hplc-purity',
      qualityTopicName: 'HPLC / chromatographic purity',
      qualityTopicIsPublished: false,
      independentlyVerified: false,
      verificationNotes: null,
    },
    {
      id: 't2',
      testName: 'Sterility',
      analyticalMethod: null,
      methodReference: null,
      referenceStandard: null,
      specificationText: null,
      resultNumeric: null,
      resultUnit: null,
      resultText: 'Not tested',
      attachmentReference: null,
      testDate: null,
      qualityTopicSlug: 'sterility',
      qualityTopicName: 'Sterility',
      qualityTopicIsPublished: false,
      independentlyVerified: false,
      verificationNotes: null,
    },
  ],
};

describe('the specimen certificate as rendered', () => {
  const html = renderToStaticMarkup(
    <AnnotatedCertificate certificate={CERTIFICATE} simple={false} />,
  );

  it('declares itself fictional before showing any of its values', () => {
    const notice = html.indexOf('Fictional specimen');
    const firstValue = html.indexOf('EXB-0000');

    expect(notice).toBeGreaterThan(-1);
    // Ahead of the numbers in document order, not after the reader has already
    // taken them at face value.
    expect(notice).toBeLessThan(firstValue);
  });

  it('says what kind of document it is, and what that kind establishes', () => {
    expect(html).toContain('Third-party analytical test report');
    expect(html).toContain('It establishes nothing about who made the material');
  });

  it('marks every reported result as not independently checked', () => {
    expect(html).toContain('Reported by the document — not independently checked');
    expect(html).not.toContain('>Independently checked<');
  });

  it('shows a field the document lacks rather than leaving a blank', () => {
    expect(html).toContain('Not stated on this document');
    expect(html).toContain('Without this, the material cannot be traced');
  });

  it('calls the batch linkage stated rather than demonstrated', () => {
    expect(html).toContain('Stated, not demonstrated');
    expect(html).toContain('a claim by whoever issued it');
  });

  it('marks a result with no acceptance criterion as having nothing to be judged against', () => {
    expect(html).toContain('Without a stated limit, there is nothing for the result');
  });

  it('names a linked topic that has nothing published without linking to it', () => {
    expect(html).toContain('HPLC / chromatographic purity');
    expect(html).toContain('reference page in preparation');
    expect(html).not.toContain('href="/quality/hplc-purity"');
  });
});

describe('simple mode on a certificate', () => {
  const simple = renderToStaticMarkup(
    <AnnotatedCertificate certificate={CERTIFICATE} simple={true} />,
  );
  const practitioner = renderToStaticMarkup(
    <AnnotatedCertificate certificate={CERTIFICATE} simple={false} />,
  );

  it('holds back method and laboratory detail', () => {
    expect(practitioner).toContain('Laboratory address');
    expect(practitioner).toContain('Method reference');
    expect(simple).not.toContain('Laboratory address');
    expect(simple).not.toContain('Method reference');
  });

  it('keeps everything a reader needs to ask the real question', () => {
    // Simple mode is a shorter page, never a more reassuring one.
    expect(simple).toContain('Batch or lot number');
    expect(simple).toContain('Reported by the document');
    expect(simple).toContain('Stated, not demonstrated');
    expect(simple).toContain('Fictional specimen');
  });
});

describe('transparency dimensions as rendered', () => {
  const html = renderToStaticMarkup(
    <TransparencyDimensions dimensions={transparencyDimensions(CERTIFICATE)} />,
  );

  it('shows dimensions and says they are not added up', () => {
    expect(html).toContain('Document identity');
    expect(html).toContain('Batch linkage');
    expect(html).toContain('not added up');
  });

  it('renders nothing shaped like a score', () => {
    expect(html).not.toMatch(/\b\d{1,3}\s*\/\s*100\b/);
    expect(html).not.toMatch(/\bscore\b/i);
    expect(html).not.toMatch(/\bout of ten\b/i);

    // 'rating' is allowed exactly once, in the sentence denying that this is
    // one. Anywhere else would mean the page had grown the very thing this
    // section is designed not to be.
    const ratings = [...html.matchAll(/rating/gi)];
    expect(ratings).toHaveLength(1);
    expect(html).toContain('not a rating of the material');
  });

  it('counts partial coverage instead of calling a partial document empty', () => {
    // One of the two tests states a method. Reporting that as "none stated" was
    // a real defect, caught by reading the rendered page rather than the code.
    expect(html).toMatch(/stated for 1 of 2 tests/);
  });
});

describe('the chain-of-custody figure', () => {
  const html = renderToStaticMarkup(<ChainOfCustodyFigure certificate={CERTIFICATE} />);

  it('is an accessible figure', () => {
    expect(html).toContain('role="img"');
    expect(html).toMatch(/<title id="[^"]+">/);
    expect(html).toMatch(/<desc id="[^"]+">/);
  });

  it('draws the first link as broken and says why', () => {
    expect(html).toContain('broken');
    expect(html).toContain('That link is always made by someone, not by the document');
  });
});

describe('a certificate requirement never appears without its scope', () => {
  const claim: PublicClaim = {
    id: 'cl1',
    claimKey: 'COA-002',
    claimText: 'The certificate should list each test performed, including the acceptance limits.',
    plainLanguageText: 'The certificate should list every test and the limit each had to meet.',
    claimCategory: 'certificate-content',
    importance: 'critical',
    certificateTypeScope: 'manufacturer_coa',
    interpretationNotes: 'Q7 s. 11.42.',
    uncertaintyText: 'Scoped to API and intermediate certificates.',
    isEditorialNonEvidentiary: false,
    needsUpdate: false,
    lastReviewedAt: null,
    evidence: [],
  };

  it('states the document type the requirement governs', () => {
    const html = renderToStaticMarkup(<ClaimCard claim={claim} simple={false} />);
    expect(html).toContain('Applies to a manufacturer');
    expect(html).toContain('active ingredient or intermediate');
  });

  it('states it in simple mode too, where the misreading is likeliest', () => {
    const html = renderToStaticMarkup(<ClaimCard claim={claim} simple={true} />);
    expect(html).toContain('Applies to a manufacturer');
  });

  it('adds no scope line to a claim that is not about certificate content', () => {
    const html = renderToStaticMarkup(
      <ClaimCard claim={{ ...claim, certificateTypeScope: null }} simple={false} />,
    );
    expect(html).not.toContain('Applies to');
  });
});
