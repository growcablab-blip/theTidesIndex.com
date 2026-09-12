/**
 * Grades a set of viewport measurements against the visual-QA guard.
 *
 *   npm run qa:visual -- path/to/measurements.json
 *
 * The gathering half of responsive QA happens in a browser and is not
 * automatable here; the judging half is pure, and this is what turns it from a
 * library nobody calls into the thing that actually issues the verdict.
 *
 * The point is the refusal. A run that contains an invalid measurement exits
 * non-zero and says the page has *not* been checked at those widths, which is a
 * different outcome from a clean pass and must not be reported as one.
 */
import { readFileSync } from 'node:fs';
import { allPassed, evaluateMeasurement, summarise, type RawMeasurement } from './visual-qa';

const path = process.argv[2];
if (path === undefined) {
  console.error('Usage: npm run qa:visual -- <measurements.json>');
  process.exit(2);
}

const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
if (!Array.isArray(parsed)) {
  console.error('Expected a JSON array of measurements.');
  process.exit(2);
}

const evaluations = (parsed as RawMeasurement[]).map(evaluateMeasurement);

console.log('');
console.log('  VISUAL QA');
console.log('');
console.log(summarise(evaluations));
console.log('');

process.exit(allPassed(evaluations) ? 0 : 1);
