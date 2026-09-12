import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { sql } from 'drizzle-orm';
import { previewEnabled } from '@/server/public/preview';
import { getStaffDb } from '@/server/db/client';
import { readQualityTopicReviewPacket } from '@/server/editorial/review-packet';
import { reviewDiff } from '@/server/editorial/review-diff';
import { Container } from '@/components/public/primitives';
import { ReviewPacketPanel } from '@/components/admin/review-packet';
import { ReviewDiffPanel, ReviewerInstructions } from './harness';

/**
 * A development harness for the review packet.
 *
 * The admin surface needs Supabase auth, which is not provisioned, so the one
 * interface the whole editorial workflow depends on has never been looked at.
 * Building it, testing its data assembly, and never seeing it rendered is how
 * the defects in C.4, C.5, C.8 and C.9 survived until somebody read a page.
 *
 * This does not weaken authentication. It is a separate read-only route closed
 * by the same two independent conditions as the public preview — not a
 * production build, and `TIDES_PREVIEW_UNPUBLISHED=1` — and it 404s when either
 * fails. The admin routes are untouched and still require a staff session.
 *
 * What it renders is the real packet from the real assembly against the real
 * seeded data. Nothing here is a mock.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Review packet (development harness)',
  robots: { index: false, follow: false },
};

export default async function ReviewPacketHarness({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!previewEnabled()) notFound();

  const { slug } = await params;
  const db = getStaffDb();

  const topicRows = await db.execute(sql`
    select id, name, quality_key, version, review_state, publication_state
    from quality_topics where slug = ${slug}
  `);
  const topic = (Array.isArray(topicRows) ? topicRows : (topicRows as { rows: unknown[] }).rows)[0] as
    | Record<string, unknown>
    | undefined;
  if (topic === undefined) notFound();

  const packet = await readQualityTopicReviewPacket(db, String(topic.id));

  // A diff against a version earlier than the current one, so the harness shows
  // the returning-reviewer case rather than only the first-look case.
  const currentVersion = Number(topic.version);
  const diff =
    currentVersion > 1
      ? await reviewDiff(db, 'quality_topics', 'quality_topic', String(topic.id), currentVersion - 1)
      : null;

  return (
    <Container width="wide" className="py-8">
      <div className="mb-6 rounded-md border-2 border-dashed border-[var(--color-caution)] bg-[var(--color-caution-bg)] px-5 py-4">
        <p className="text-sm font-semibold tracking-wide text-[var(--color-caution)] uppercase">
          Development harness — not the admin interface
        </p>
        <p className="mt-1.5 text-sm text-ink-soft">
          The review packet as a reviewer sees it, rendered outside the authenticated admin surface
          so it can be examined before Supabase exists. Read-only: nothing here can record a
          decision. Available only in a development build with previews enabled.
        </p>
      </div>

      <header className="mb-8">
        <h1 className="font-serif text-3xl text-ink">{String(topic.name)}</h1>
        <p className="mt-2 text-sm text-slate">
          {String(topic.quality_key)} · version {String(topic.version)} ·{' '}
          {String(topic.review_state).replaceAll('_', ' ')} ·{' '}
          {String(topic.publication_state)}
        </p>
      </header>

      <p className="mb-6 text-sm">
        <Link href={`/dev/review-packet/${slug}/export`} className="text-deep-tide underline">
          Open as a document
        </Link>{' '}
        <span className="text-slate">— the printable export, for a reviewer working on paper.</span>
      </p>

      <div className="space-y-8">
        <ReviewerInstructions claimCount={packet.claims.length} gapCount={packet.gaps.length} />
        {diff ? <ReviewDiffPanel diff={diff} /> : null}
        <ReviewPacketPanel packet={packet} />
      </div>
    </Container>
  );
}
