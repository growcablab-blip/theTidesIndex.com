/**
 * Creates the first staff profile, once, on a database that has none.
 *
 *   npm run db:bootstrap-admin -- --user-id <uuid> --name "Full Name" [--email a@b.c]
 *   npm run db:bootstrap-admin -- --list
 *
 * THE PROBLEM THIS SOLVES
 *
 * `profiles` carries two policies: staff may read, and admins may write. Both
 * resolve the caller's role by reading `profiles`. On an empty table nobody has
 * a role, so nobody may insert — including the person who is about to become
 * the administrator. The application cannot bootstrap itself, and that is the
 * correct design: the alternative is a policy that lets an authenticated
 * stranger appoint themselves.
 *
 * HOW IT IS RESOLVED, AND WHAT IS NOT WEAKENED
 *
 * Row-level security is not forced on this table, so the role that owns it —
 * the one in `DATABASE_URL`, the same connection that runs migrations — is not
 * subject to the policies. This script uses that connection and nothing else.
 *
 * No policy is dropped, relaxed or temporarily disabled. No service-role key is
 * introduced, and none is read anywhere in this codebase. After the insert the
 * table behaves exactly as before: the new administrator may appoint the rest
 * of the staff through the application, under their own identity, and the
 * policies decide what they may do.
 *
 * WHAT IT WILL NOT DO
 *
 * It refuses to run when an active administrator already exists, because the
 * second administrator is an ordinary administrative act and belongs in the
 * application where it is audited.
 *
 * It cannot confirm that the user id belongs to a real Supabase account: that
 * would need a service-role key, and introducing one to save a copy-and-paste
 * is a poor trade. Take the id from the Supabase dashboard. A wrong id creates
 * a profile nobody can sign in as, which `--list` will show and which can be
 * deleted with the same connection.
 *
 * Nothing about any particular person is hard-coded here. Both the id and the
 * name are arguments.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from '@db/schema';

const url = process.env.DATABASE_URL;
if (url === undefined || url === '') {
  console.error(
    'DATABASE_URL is not set. Use the same connection string that runs migrations:\n' +
      'it owns the tables, and that is what allows the first insert.',
  );
  process.exit(1);
}

interface Args {
  list: boolean;
  userId: string | null;
  name: string | null;
  email: string | null;
}

function parseArgs(argv: readonly string[]): Args {
  const args: Args = { list: false, userId: null, name: null, email: null };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === '--list') {
      args.list = true;
    } else if (flag === '--user-id' && value !== undefined) {
      args.userId = value;
      i += 1;
    } else if (flag === '--name' && value !== undefined) {
      args.name = value;
      i += 1;
    } else if (flag === '--email' && value !== undefined) {
      args.email = value;
      i += 1;
    }
  }
  return args;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const args = parseArgs(process.argv.slice(2));
const client = postgres(url, { max: 1, prepare: false });

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === 'object' && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

try {
  const db = drizzle(client, { schema, casing: 'snake_case' });

  const existing = rowsOf<{
    user_id: string;
    display_name: string;
    email: string | null;
    role: string;
    is_active: boolean;
  }>(
    await db.execute(sql`
      select user_id::text as user_id, display_name, email, role::text as role, is_active
        from profiles
       order by created_at
    `),
  );

  if (args.list) {
    console.log(`\n  STAFF PROFILES — ${String(existing.length)}\n`);
    for (const row of existing) {
      console.log(
        `  ${row.role.padEnd(22)} ${row.is_active ? 'active  ' : 'inactive'} ` +
          `${row.display_name} <${row.email ?? 'no email'}>`,
      );
      console.log(`    ${row.user_id}`);
    }
    if (existing.length === 0) console.log('  None. This database has no staff and no administrator.');
    console.log('');
    process.exit(0);
  }

  const admins = existing.filter((row) => row.role === 'admin' && row.is_active);
  if (admins.length > 0) {
    console.error(
      `\n  This database already has ${String(admins.length)} active administrator(s).\n\n` +
        '  Bootstrapping is for an empty table. Appoint further staff through the\n' +
        '  application, signed in as an administrator, where the action is audited.\n' +
        '  Run with --list to see who they are.\n',
    );
    process.exitCode = 1;
    process.exit();
  }

  if (args.userId === null || !UUID.test(args.userId)) {
    console.error(
      '\n  --user-id must be the Supabase auth user id, a uuid.\n\n' +
        '  Find it in the Supabase dashboard under Authentication → Users. The account\n' +
        '  must exist before it can be given a role here.\n',
    );
    process.exitCode = 1;
    process.exit();
  }
  if (args.name === null || args.name.trim() === '') {
    console.error('\n  --name is required: it is what the editorial interface shows.\n');
    process.exitCode = 1;
    process.exit();
  }

  await db.execute(sql`
    insert into profiles (user_id, display_name, email, role, is_active)
    values (${args.userId}::uuid, ${args.name.trim()}, ${args.email}, 'admin', true)
  `);

  const [created] = rowsOf<{ user_id: string; display_name: string; role: string }>(
    await db.execute(sql`
      select user_id::text as user_id, display_name, role::text as role
        from profiles where user_id = ${args.userId}::uuid
    `),
  );

  if (created === undefined) {
    console.error('\n  The insert did not take. Nothing was created.\n');
    process.exitCode = 1;
  } else {
    console.log(`\n  FIRST ADMINISTRATOR CREATED\n`);
    console.log(`  ${created.display_name} — ${created.role}`);
    console.log(`  ${created.user_id}\n`);
    console.log('  Row-level security is untouched. Sign in at /admin/sign-in with the');
    console.log('  Supabase account this id belongs to, and appoint the rest of the staff');
    console.log('  through the application.\n');
  }
} catch (error) {
  console.error('Bootstrap failed:', error);
  process.exitCode = 1;
} finally {
  await client.end();
}
