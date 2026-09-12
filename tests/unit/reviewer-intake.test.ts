import { describe, expect, it } from 'vitest';
import {
  checkReviewerIntake,
  intakeToProfileColumns,
  INTAKE_QUESTIONS,
} from '@/server/editorial/reviewer-intake';

/**
 * Reviewer intake (human review pilot).
 *
 * The intake is the last point at which this index can be careless about who its
 * reviewers are. After it, a name sits beside a published approval.
 *
 * Two properties matter more than the rest, and both are about the conflicts
 * question rather than about credentials:
 *
 *   a disclosure must never become a disqualification, because excluding
 *   everyone with commercial exposure to pharmaceutical quality would exclude
 *   most people who understand it;
 *
 *   and "nobody asked" must stay distinguishable from "asked, and there is
 *   none", because an approval by somebody nobody asked should not read like one
 *   by somebody who answered.
 */

const VALID = {
  fullName: 'A. Reviewer',
  professionalRole: 'Analytical chemist',
  reviewDomain: 'Chromatography and pharmaceutical quality control',
  contactEmail: 'Reviewer@Example.org',
  conflictsDisclosed: false,
  disclosedAt: '2026-09-12',
};

describe('reviewer intake', () => {
  it('accepts the minimum a reader needs to weigh an approval', () => {
    const result = checkReviewerIntake(VALID);
    expect(result.ok).toBe(true);
    expect(result.intake?.fullName).toBe('A. Reviewer');
    expect(result.intake?.organisation).toBeNull();
    expect(result.intake?.credentialSummary).toBeNull();
  });

  it('normalises the contact address', () => {
    const result = checkReviewerIntake(VALID);
    expect(result.intake?.contactEmail).toBe('reviewer@example.org');
  });

  it('treats an empty optional field as absent rather than as an empty string', () => {
    // A profile holding '' reads as populated everywhere that checks for null,
    // which is the semantic-null defect from C.8 in a different table.
    const result = checkReviewerIntake({ ...VALID, organisation: '   ' });
    expect(result.ok).toBe(true);
    expect(result.intake?.organisation).toBeNull();
  });

  // --- Conflicts ------------------------------------------------------------

  it('accepts a reviewer with a disclosed conflict', () => {
    const result = checkReviewerIntake({
      ...VALID,
      conflictsDisclosed: true,
      disclosureNotes: 'Consults for a contract analytical laboratory.',
    });
    // The point of the whole design: this is a valid reviewer.
    expect(result.ok).toBe(true);
    expect(result.intake?.conflictsDisclosed).toBe(true);
  });

  it('refuses a declared conflict with nothing said about it', () => {
    const result = checkReviewerIntake({ ...VALID, conflictsDisclosed: true });
    expect(result.ok).toBe(false);
    expect(result.problems.map((p) => p.field)).toContain('disclosureNotes');
  });

  it('refuses an answer with no date', () => {
    const result = checkReviewerIntake({ ...VALID, disclosedAt: null });
    expect(result.ok).toBe(false);
    expect(result.problems.map((p) => p.field)).toContain('disclosedAt');
  });

  it('allows "nobody asked", and refuses to date it', () => {
    const unasked = checkReviewerIntake({
      ...VALID,
      conflictsDisclosed: null,
      disclosedAt: null,
    });
    expect(unasked.ok).toBe(true);
    expect(unasked.intake?.conflictsDisclosed).toBeNull();

    const dated = checkReviewerIntake({ ...VALID, conflictsDisclosed: null });
    expect(dated.ok).toBe(false);
    expect(dated.problems.map((p) => p.field)).toContain('conflictsDisclosed');
  });

  // --- What is not collected ------------------------------------------------

  it('asks for nothing beyond what a reader needs, plus one way to reach them', () => {
    expect(INTAKE_QUESTIONS.map((q) => q.field)).toEqual([
      'fullName',
      'professionalRole',
      'reviewDomain',
      'organisation',
      'credentialSummary',
      'contactEmail',
      'conflictsDisclosed',
    ]);
  });

  it('discards anything else offered', () => {
    const result = checkReviewerIntake({
      ...VALID,
      dateOfBirth: '1970-01-01',
      homeAddress: '1 Example Street',
      registrationNumber: 'GPhC 1234567',
      publications: ['…'],
    });
    expect(result.ok).toBe(true);
    const serialised = JSON.stringify(result.intake);
    expect(serialised).not.toContain('1970-01-01');
    expect(serialised).not.toContain('Example Street');
    expect(serialised).not.toContain('1234567');
  });

  // --- Reporting problems ---------------------------------------------------

  it('reports every problem at once, addressed to its field', () => {
    const result = checkReviewerIntake({ conflictsDisclosed: true });
    expect(result.ok).toBe(false);
    expect(result.intake).toBeNull();
    const fields = result.problems.map((p) => p.field);
    expect(fields).toContain('fullName');
    expect(fields).toContain('professionalRole');
    expect(fields).toContain('contactEmail');
    expect(result.problems.length).toBeGreaterThan(3);
  });

  // --- Becoming a row -------------------------------------------------------

  it('maps to profile columns without ever marking a record as a demonstration', () => {
    const result = checkReviewerIntake(VALID);
    const columns = intakeToProfileColumns(result.intake!);

    expect(columns.display_name).toBe('A. Reviewer');
    expect(columns.role).toBe('scientific_reviewer');
    expect(columns.conflicts_disclosed).toBe(false);
    // An intake can never produce a demonstration profile, however it is called:
    // that flag belongs to the fixture and to nothing else.
    expect(columns.is_demonstration).toBe(false);
  });

  it('produces no user_id, because the intake is not the account', () => {
    const columns = intakeToProfileColumns(checkReviewerIntake(VALID).intake!);
    expect(Object.keys(columns)).not.toContain('user_id');
  });
});
