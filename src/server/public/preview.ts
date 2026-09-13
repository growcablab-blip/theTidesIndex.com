import 'server-only';
import { getStaffDb } from '../db/client';
import { currentPreviewEnv, previewAllowed, previewRefusal } from './preview-gate';
import { readQualityTopic, type QualityTopicReading } from './quality-topic';
import { readPeptidePagePreview, type PeptidePage } from './queries';
import type { ReadingMode } from '@/domain/presentation/reading-mode';
import { readSpecimenCertificate, type CertificateReading } from './certificate';

/**
 * Looking at an unpublished record during development.
 *
 * The HPLC topic is finished as far as automation can take it and sits at
 * `ready_for_scientific_review`. It is not published, and it must not be: the
 * gate requires a human scientific approval and no one has given one. But a
 * reviewer cannot sensibly approve a page they have never seen rendered, and
 * design work on the public experience cannot wait on an approval that the
 * design is meant to inform.
 *
 * So the preview reads the record without publishing it. What it must never
 * become is a way to serve unpublished medical content to the public, so it is
 * closed by two independent conditions:
 *
 *   - the build must not be a production build, and
 *   - `TIDES_PREVIEW_UNPUBLISHED` must be set to `1`.
 *
 * Neither is sufficient alone, and the route 404s when the preview is refused,
 * so a misconfigured deployment exposes nothing and advertises nothing. The
 * publish gate is untouched: this reads, and nothing here can write a
 * publication state.
 */

export function previewEnabled(): boolean {
  return previewAllowed(currentPreviewEnv());
}

/** Why the preview is unavailable, for a development-time message. */
export function previewRefusalReason(): string | null {
  return previewRefusal(currentPreviewEnv());
}

/**
 * Reads a topic regardless of publication state, for local review only.
 *
 * Returns null rather than throwing when the preview is closed, so a caller can
 * fall through to a 404 without distinguishing "refused" from "no such topic" —
 * a probe learns nothing either way.
 */
export async function previewQualityTopic(slug: string): Promise<QualityTopicReading | null> {
  if (!previewEnabled()) return null;
  return readQualityTopic(getStaffDb(), slug, { preview: true });
}

/**
 * A compound record, read without the publication filter.
 *
 * The same reason as the topics, and a sharper one: a compound record is the
 * first place this index's separations — human from preclinical, reported
 * regimen from recommendation, route from evidence for a route — meet a subject
 * where readers already hold strong opinions. Nobody can judge whether those
 * separations survive presentation without seeing the page.
 */
export async function previewPeptidePage(
  slug: string,
  mode: ReadingMode,
): Promise<PeptidePage | null> {
  if (!previewEnabled()) return null;
  return readPeptidePagePreview(getStaffDb(), slug, mode);
}

/** The specimen certificate, read without the publication filter. */
export async function previewSpecimenCertificate(
  certificateKey: string,
): Promise<CertificateReading | null> {
  if (!previewEnabled()) return null;
  return readSpecimenCertificate(getStaffDb(), certificateKey, { preview: true });
}
