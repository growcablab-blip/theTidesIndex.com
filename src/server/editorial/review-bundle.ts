import type { Database } from '../db/types';
import { buildPacketExport, type ExportedPacket } from './packet-export';
import type { ReviewPacketClaim } from './review-packet';

/**
 * The external review bundle: what actually gets sent to a person.
 *
 * The C.10 export was the packet as a document. This is the packet as a
 * *submission* — cover, onboarding, the evidence, and a form to answer on. The
 * difference matters because a reviewer receiving a document has to work out
 * what they are being asked; a reviewer receiving a submission does not.
 *
 * Two things here are derived rather than stored, and both are derived because
 * storing them would mean writing content nobody extracted from a source.
 *
 * **Scope.** No claim carries a scope sentence. What the record holds is the
 * certificate-type scope where one applies, the claim category, and the chapter
 * and section headings of every passage cited — which is what a reviewer needs
 * to judge whether the statement travels further than its source does. Where
 * nothing narrows a claim, the bundle says so in those words rather than
 * leaving a blank that reads like "applies to everything".
 *
 * **Evidence status.** Assembled from what exists: how many passages resolve to
 * an exact locator, whether every source behind the claim is citable, whether
 * any primary study has been opened, and whether a human approval stands at the
 * current version. Each is a fact about the record, not a grade.
 */

export interface ClaimScope {
  /** The document family a certificate-content requirement governs. */
  readonly certificateTypeScope: string | null;
  readonly claimCategory: string | null;
  /** Chapter and section headings of the passages cited, in citation order. */
  readonly sourceSubjects: readonly string[];
  /**
   * True when nothing on the record narrows this claim beyond its own wording.
   *
   * Reported rather than hidden: a statement whose scope is only whatever its
   * sentence implies is exactly the kind a reviewer should be asked about.
   */
  readonly noRecordedScope: boolean;
}

export function claimScope(claim: ReviewPacketClaim): ClaimScope {
  const subjects: string[] = [];
  for (const evidence of claim.evidence) {
    const parts = [evidence.chapter, evidence.section].filter((v): v is string => v !== null);
    if (parts.length === 0) continue;
    const subject = parts.join(' — ');
    if (!subjects.includes(subject)) subjects.push(subject);
  }

  return {
    certificateTypeScope: claim.certificateTypeScope,
    claimCategory: claim.claimCategory,
    sourceSubjects: subjects,
    noRecordedScope:
      claim.certificateTypeScope === null && claim.claimCategory === null && subjects.length === 0,
  };
}

export interface EvidenceStatus {
  readonly passages: number;
  /** Passages that resolve to an exact location rather than to a whole work. */
  readonly passagesWithLocator: number;
  /** False when any source behind this claim is under replacement or excluded. */
  readonly allSourcesCitable: boolean;
  /** Passages whose primary study this index has actually opened. Usually zero. */
  readonly primarySourcesTraced: number;
  /** A human approval recorded against the version shown. */
  readonly humanApprovalStanding: boolean;
  /** Checks recorded by a tool. Never a scientific approval — constrained. */
  readonly automatedChecks: number;
}

export function evidenceStatus(claim: ReviewPacketClaim): EvidenceStatus {
  return {
    passages: claim.evidence.length,
    passagesWithLocator: claim.evidence.filter((e) => e.locatorText !== null).length,
    allSourcesCitable: claim.evidence.every((e) => e.qcStatus !== 'replace' && e.qcStatus !== 'exclude'),
    primarySourcesTraced: claim.evidence.filter((e) => e.primarySourceVerified).length,
    humanApprovalStanding: claim.history.some(
      (h) =>
        h.appliesToCurrentVersion &&
        h.performedBy === 'human' &&
        h.reviewType === 'scientific' &&
        h.outcome === 'approved',
    ),
    automatedChecks: claim.history.filter((h) => h.performedBy === 'automated').length,
  };
}

/** One claim, with everything the bundle prints about it. */
export interface BundleClaim {
  readonly claim: ReviewPacketClaim;
  readonly scope: ClaimScope;
  readonly status: EvidenceStatus;
}

export interface ReviewBundle {
  readonly document: ExportedPacket;
  readonly claims: readonly BundleClaim[];
  /**
   * The reviewer this bundle is addressed to, where one has been selected.
   *
   * Null until an actual reviewer exists. The bundle prints "reviewer not yet
   * selected" rather than a blank line, because a blank line on a cover page
   * reads like an oversight and this is a state.
   */
  readonly addressedTo: string | null;
}

export async function buildReviewBundle(
  tx: Database,
  topicId: string,
  options: { readonly issuedAt?: string; readonly addressedTo?: string } = {},
): Promise<ReviewBundle | null> {
  const document = await buildPacketExport(
    tx,
    topicId,
    options.issuedAt === undefined ? {} : { issuedAt: options.issuedAt },
  );
  if (document === null) return null;

  return {
    document,
    claims: document.packet.claims.map((claim) => ({
      claim,
      scope: claimScope(claim),
      status: evidenceStatus(claim),
    })),
    addressedTo: options.addressedTo ?? null,
  };
}
