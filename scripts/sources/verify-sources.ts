/**
 * Reconciles SOURCE_MANIFEST.json against the private source directory.
 *
 * Run after adding or replacing a source file. Writes a digest inventory to
 * data/private/source-inventory.json, which is gitignored: it records the
 * SHA-256 of each held copy so a file that is quietly swapped for a different
 * edition becomes detectable. Page numbers in a citation refer to one specific
 * printing.
 *
 *   npm run sources:verify
 *   npm run sources:verify -- --digests
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildSourceInventory, findBrokenEntries } from '@/server/sources/source-inventory';

const withDigests = process.argv.includes('--digests');

const inventory = await buildSourceInventory({ withDigests });

console.log(`Source registry — ${inventory.entries.length} entries\n`);
for (const entry of inventory.entries) {
  const state =
    entry.state === 'present'
      ? entry.isCitable
        ? 'ok'
        : 'ok (not citable)'
      : entry.state === 'missing'
        ? 'MISSING'
        : 'no file recorded';

  const size = entry.sizeBytes !== null ? `${(entry.sizeBytes / 1_048_576).toFixed(1)} MB` : '';
  console.log(
    `  ${entry.sourceKey}  ${state.padEnd(18)} ${entry.qcStatus.padEnd(11)} ${size.padStart(9)}  ${entry.title.slice(0, 60)}`,
  );
}

if (inventory.unregisteredFiles.length > 0) {
  console.log('\nFiles present but not in the registry:');
  for (const name of inventory.unregisteredFiles) {
    console.log(`  ${name}`);
  }
  console.log('Register them in SOURCE_MANIFEST.json or remove them.');
}

const outputDir = fileURLToPath(new URL('../../data/private/', import.meta.url));
mkdirSync(outputDir, { recursive: true });
writeFileSync(
  `${outputDir}source-inventory.json`,
  `${JSON.stringify(inventory, null, 2)}\n`,
  'utf8',
);
console.log('\nWrote data/private/source-inventory.json (gitignored).');

const broken = findBrokenEntries(inventory);
if (broken.length > 0) {
  console.error('\nRegistry entries point at files that are not present:');
  for (const entry of broken) {
    console.error(`  ${entry.sourceKey} -> ${entry.expectedFilename ?? ''}`);
  }
  process.exitCode = 1;
}
