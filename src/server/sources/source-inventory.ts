import { createHash } from 'node:crypto';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedData } from '@db/seed/seed-data';

/**
 * Reconciles SOURCE_MANIFEST.json against the private source directory.
 *
 * Two failure modes this guards against:
 *
 *   1. A registry entry that points at a file which is not there. Ingestion
 *      would then silently produce claims with no retrievable source.
 *   2. A file that is quietly swapped for a different copy. Recording a digest
 *      means a changed file is detectable, which matters because page numbers
 *      in a citation refer to one specific edition and printing.
 *
 * Nothing here reads or extracts source content. It only inspects the files.
 */

export const SOURCES_DIR = fileURLToPath(new URL('../../../sources/', import.meta.url));

export type SourceFileState = 'present' | 'missing' | 'not_recorded';

export interface SourceInventoryEntry {
  readonly sourceKey: string;
  readonly title: string;
  readonly qcStatus: string;
  readonly isCitable: boolean;
  readonly expectedFilename: string | null;
  readonly state: SourceFileState;
  readonly sizeBytes: number | null;
  readonly sha256: string | null;
}

export interface SourceInventory {
  readonly entries: readonly SourceInventoryEntry[];
  /** Files present on disk that no registry entry claims. */
  readonly unregisteredFiles: readonly string[];
  readonly checkedAt: string;
}

function isCitable(qcStatus: string): boolean {
  return qcStatus !== 'replace' && qcStatus !== 'exclude';
}

async function sha256(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(path);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => {
      resolve(hash.digest('hex'));
    });
    stream.on('error', reject);
  });
}

export async function buildSourceInventory(
  options: { withDigests?: boolean } = {},
): Promise<SourceInventory> {
  const onDisk = existsSync(SOURCES_DIR)
    ? readdirSync(SOURCES_DIR).filter((name) => !name.startsWith('.') && name !== 'README.md')
    : [];
  const claimed = new Set<string>();

  const entries: SourceInventoryEntry[] = [];

  for (const source of seedData.sourceManifest.sources) {
    const expected = source.known_local_filename;

    if (!expected) {
      entries.push({
        sourceKey: source.source_key,
        title: source.title,
        qcStatus: source.qc_status,
        isCitable: isCitable(source.qc_status),
        expectedFilename: null,
        state: 'not_recorded',
        sizeBytes: null,
        sha256: null,
      });
      continue;
    }

    claimed.add(expected);
    const path = join(SOURCES_DIR, expected);
    const present = existsSync(path);

    entries.push({
      sourceKey: source.source_key,
      title: source.title,
      qcStatus: source.qc_status,
      isCitable: isCitable(source.qc_status),
      expectedFilename: expected,
      state: present ? 'present' : 'missing',
      sizeBytes: present ? statSync(path).size : null,
      sha256: present && options.withDigests ? await sha256(path) : null,
    });
  }

  return {
    entries,
    unregisteredFiles: onDisk.filter((name) => !claimed.has(name)),
    checkedAt: new Date().toISOString(),
  };
}

/**
 * A registry entry is broken when it names a file that is not on disk. An entry
 * with no filename recorded is not broken — SRC-016 is an external source
 * stream that has not been captured yet, and the registry says so.
 */
export function findBrokenEntries(
  inventory: SourceInventory,
): readonly SourceInventoryEntry[] {
  return inventory.entries.filter((entry) => entry.state === 'missing');
}
