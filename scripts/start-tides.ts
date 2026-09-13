/**
 * One command to see The Tides Index.
 *
 *   npm run tides
 *
 * Starts a real Postgres, applies the migrations, loads the evidence, hands the
 * packets to review, starts the site, and prints the pages worth opening.
 *
 * Nobody should need to know what PGlite is to look at the product. This exists
 * so that the answer to "how do I see it?" is one line, and so that the answer
 * stays one line as the system grows.
 *
 * ## What it does not do
 *
 * It does not weaken anything. Every guard the application has is still in
 * force and none is bypassed:
 *
 *   - the demonstration dataset is still refused against a non-local database,
 *     and this script performs its own localhost check before asking for it;
 *   - the publish gates are untouched. Nothing is published by running this;
 *   - `TIDES_PREVIEW_UNPUBLISHED=1` is set so unreviewed records render at their
 *     public routes *with their banners*, which a production build refuses
 *     outright regardless of the flag;
 *   - submitting the evidence packets is still attributed to a named editor.
 *
 * What it does is take the six commands somebody would otherwise have to run in
 * the right order, run them in the right order, and say what happened.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ENV_FILE = `${ROOT}.env.local`;
const DB_PORT = Number(process.env.TIDES_DEV_DB_PORT ?? 5433);
const DB_URL = `postgres://postgres:postgres@127.0.0.1:${String(DB_PORT)}/postgres`;
const SITE_PORT = Number(process.env.PORT ?? 3000);

/** The local editor the demonstration fixture creates. */
const LOCAL_EDITOR = '11111111-1111-4111-8111-1111111111ed';

const children: ChildProcess[] = [];
let shuttingDown = false;

// --- Presentation ----------------------------------------------------------

const DIM = '[2m';
const BOLD = '[1m';
const TEAL = '[36m';
const RESET = '[0m';

function step(text: string): void {
  process.stdout.write(`${DIM}  ·${RESET} ${text}\n`);
}

function fail(text: string): never {
  process.stdout.write(`\n  ${BOLD}Could not start.${RESET}\n  ${text}\n\n`);
  shutdown(1);
  throw new Error(text);
}

// --- Environment -----------------------------------------------------------

/**
 * Writes `.env.local` on a first run.
 *
 * Only ever adds what is missing: an existing file is a decision somebody made,
 * and silently rewriting it would be the kind of helpfulness that loses work.
 */
function ensureEnvFile(): void {
  const required: Record<string, string> = {
    NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
    DATABASE_URL: DB_URL,
    DATABASE_POOL_MAX: '1',
    TIDES_PREVIEW_UNPUBLISHED: '1',
  };

  if (!existsSync(ENV_FILE)) {
    const lines = [
      '# Local development. Not committed.',
      '# Written by `npm run tides` on first run.',
      '',
      ...Object.entries(required).map(([key, value]) => `${key}=${value}`),
      '',
    ];
    writeFileSync(ENV_FILE, lines.join('\n'), 'utf8');
    step('wrote .env.local');
    return;
  }

  const existing = readFileSync(ENV_FILE, 'utf8');
  const missing = Object.entries(required).filter(
    ([key]) => !new RegExp(`^\\s*${key}=`, 'm').test(existing),
  );
  if (missing.length > 0) {
    const addition = `\n# Added by \`npm run tides\`.\n${missing
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')}\n`;
    writeFileSync(ENV_FILE, existing + addition, 'utf8');
    step(`added ${missing.map(([key]) => key).join(', ')} to .env.local`);
  }
}

/** Loads `.env.local` into this process, without overriding what is already set. */
function loadEnvFile(): void {
  if (!existsSync(ENV_FILE)) return;
  for (const raw of readFileSync(ENV_FILE, 'utf8').split('\n')) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    process.env[key] ??= value;
  }
}

// --- Processes -------------------------------------------------------------

function run(
  label: string,
  args: string[],
  options: { readonly quiet?: boolean; readonly env?: Record<string, string> } = {},
): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [tsxBin(), ...args], {
      cwd: ROOT,
      env: { ...process.env, ...options.env },
      stdio: options.quiet === true ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    });
    children.push(child);

    let captured = '';
    if (options.quiet === true) {
      child.stdout?.on('data', (chunk: Buffer) => (captured += chunk.toString()));
      child.stderr?.on('data', (chunk: Buffer) => (captured += chunk.toString()));
    }

    child.on('exit', (code) => {
      if (code !== 0 && options.quiet === true) {
        process.stdout.write(`\n${captured}\n`);
      }
      resolve(code ?? 1);
    });
    child.on('error', () => {
      fail(`Could not run ${label}.`);
    });
  });
}

function tsxBin(): string {
  return `${ROOT}node_modules/tsx/dist/cli.mjs`;
}

/**
 * Spawns a long-running child.
 *
 * `shell` is opt-in rather than `platform === 'win32'`, which is the obvious
 * thing to write and is wrong: under a shell the command string is re-parsed,
 * and on Windows Node itself lives under "Program Files", so the space splits
 * the path and the shell reports that `C:\Program` is not a command. Only
 * `npm` needs a shell here, because on Windows it is `npm.cmd`.
 */
function spawnBackground(
  command: string,
  args: string[],
  options: { readonly env?: Record<string, string>; readonly shell?: boolean } = {},
): ChildProcess {
  const child = spawn(command, args, {
    cwd: ROOT,
    env: { ...process.env, ...options.env },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: options.shell ?? false,
  });
  children.push(child);
  return child;
}

function portOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host: '127.0.0.1' });
    const done = (open: boolean) => {
      socket.destroy();
      resolve(open);
    };
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
    setTimeout(() => done(false), 900);
  });
}

async function waitForPort(port: number, what: string, seconds: number): Promise<void> {
  const deadline = Date.now() + seconds * 1000;
  while (Date.now() < deadline) {
    if (await portOpen(port)) return;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  fail(`${what} did not come up on port ${String(port)} within ${String(seconds)}s.`);
}

function shutdown(code = 0): void {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill();
  }
  process.exit(code);
}

process.on('SIGINT', () => {
  process.stdout.write('\n  Stopping.\n\n');
  shutdown(0);
});
process.on('SIGTERM', () => shutdown(0));

// --- The sequence ----------------------------------------------------------

process.stdout.write(`\n  ${BOLD}The Tides Index${RESET} ${DIM}— starting${RESET}\n\n`);

ensureEnvFile();
loadEnvFile();
process.env.DATABASE_URL ??= DB_URL;
/*
 * One connection, and not a preference.
 *
 * The development database serves the Postgres wire protocol from a single
 * PGlite instance and answers one connection at a time. A pool larger than one
 * interleaves prepared statements across connections it does not really have,
 * and the result is not a clean failure: it is `bind message supplies 1
 * parameters, but prepared statement "" requires 0`, and intermittent
 * ECONNRESET, on pages that are perfectly correct.
 *
 * That cost several hours across this project before the cause was found, so
 * the launcher sets it rather than trusting whatever an .env.local happens to
 * carry. Against a real Postgres the launcher is not involved.
 */
process.env.DATABASE_POOL_MAX = '1';
// Unreviewed records render at their public routes, with their banners. A
// production build refuses this regardless of the flag.
process.env.TIDES_PREVIEW_UNPUBLISHED = '1';

if (!/@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(process.env.DATABASE_URL)) {
  fail(
    'DATABASE_URL in .env.local does not point at localhost.\n  ' +
      'This command is for local development only and will not touch a shared database.',
  );
}

// 1. Database ---------------------------------------------------------------
if (await portOpen(DB_PORT)) {
  step(`database already running on port ${String(DB_PORT)}`);
  step('applying migrations');
  if ((await run('migrations', ['scripts/db/migrate.ts'], { quiet: true })) !== 0) {
    fail('Migrations failed. Run `npm run db:migrate` to see why.');
  }
  step('loading evidence');
  if ((await run('seed', ['scripts/db/seed.ts'], { quiet: true })) !== 0) {
    fail('Seeding failed. Run `npm run db:seed` to see why.');
  }
} else {
  step('starting the database');
  const db = spawnBackground(process.execPath, [tsxBin(), 'scripts/db/dev-server.ts']);
  db.stdout?.on('data', (chunk: Buffer) => {
    // The dev server prints its own migration and seed progress; it is noise
    // here, and the failure path is the port never opening.
    if (/error|failed/i.test(chunk.toString())) process.stdout.write(chunk);
  });
  db.stderr?.on('data', (chunk: Buffer) => process.stdout.write(chunk));
  await waitForPort(DB_PORT, 'The database', 90);
  step('migrations applied and evidence loaded');
}

// 2. Demonstration data -----------------------------------------------------
// Gives the compound pages something published to show. Localhost-checked
// twice: here, and again inside the loader, which refuses outright otherwise.
step('loading the demonstration compound');
const demo = await run('demo data', ['scripts/db/seed-demo.ts'], {
  quiet: true,
  env: { TIDES_ALLOW_DEMO_DATA: '1' },
});
if (demo !== 0) {
  step('  (demonstration data unavailable — the rest of the site is unaffected)');
}

// 3. Hand the packets to review ---------------------------------------------
// Loading a packet is data; submitting one is an act the database attributes to
// a named editor. Without this, every topic reads "evidence captured" rather
// than "awaiting scientific review", which is not what the record means.
step('submitting the evidence packets for review');
await run('submit', ['scripts/evidence/submit-packet.ts', '--all', '--as', LOCAL_EDITOR], {
  quiet: true,
});

// 4. The site ---------------------------------------------------------------
step('starting the site');
const web = spawnBackground('npm', ['run', 'dev'], {
  shell: true,
  env: {
    TIDES_PREVIEW_UNPUBLISHED: '1',
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_POOL_MAX: '1',
  },
});
web.stdout?.on('data', (chunk: Buffer) => {
  const text = chunk.toString();
  if (/error|warn/i.test(text)) process.stdout.write(text);
});
web.stderr?.on('data', (chunk: Buffer) => process.stdout.write(chunk));
await waitForPort(SITE_PORT, 'The site', 120);

const base = `http://localhost:${String(SITE_PORT)}`;
const rows: [string, string][] = [
  ['Home', '/'],
  ['Quality and testing', '/quality'],
  ['— HPLC / purity', '/quality/hplc-purity'],
  ['— Identity testing', '/quality/identity-testing'],
  ['— Content / assay', '/quality/peptide-content-assay'],
  ['— Certificate of analysis', '/quality/certificate-of-analysis'],
  ['Compounds', '/peptides'],
  ['Search', '/search'],
  ['Sources', '/sources'],
  ['Methodology', '/methodology'],
  ['Reviewer packet (dev)', '/dev/review-packet/hplc-purity'],
  ['Review bundle (dev)', '/dev/review-packet/hplc-purity/bundle'],
];

const width = Math.max(...rows.map(([label]) => label.length));
process.stdout.write(`\n  ${BOLD}THE TIDES INDEX IS READY${RESET}\n\n`);
for (const [label, path] of rows) {
  process.stdout.write(`  ${label.padEnd(width)}  ${TEAL}${base}${path}${RESET}\n`);
}
process.stdout.write(
  `\n  ${DIM}Nothing is published. Records awaiting review render with a banner saying so.${RESET}\n` +
    `  ${DIM}Ctrl+C stops the site and the database.${RESET}\n\n`,
);

// Stay up until interrupted.
await new Promise(() => {
  /* the processes above own the lifetime */
});
