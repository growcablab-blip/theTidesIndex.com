import { NextResponse, type NextRequest } from 'next/server';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { getStaffSession } from '@/server/auth/session';
import { getStaffDb } from '@/server/db/client';
import { withStaffSession } from '@/server/db/session';

/**
 * Locations available within a source, for the evidence-attachment form.
 *
 * Runs under the caller's staff session, so an unauthenticated request returns
 * nothing rather than a filtered list — there is no privileged read here.
 */
export async function GET(request: NextRequest) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ locations: [] }, { status: 401 });
  }

  const sourceId = z.uuid().safeParse(request.nextUrl.searchParams.get('sourceId') ?? '');
  if (!sourceId.success) {
    return NextResponse.json({ locations: [] }, { status: 400 });
  }

  const locations = await withStaffSession(getStaffDb(), session.userId, async (tx) => {
    const result: unknown = await tx.execute(sql`
      select id, locator_text
      from source_locations
      where source_id = ${sourceId.data}
      order by page_start nulls last, created_at
    `);
    const list = Array.isArray(result)
      ? result
      : ((result as { rows?: unknown[] }).rows ?? []);
    return (list as { id: string; locator_text: string | null }[]).map((row) => ({
      id: row.id,
      locatorText: row.locator_text,
    }));
  });

  return NextResponse.json({ locations });
}
