/**
 * Role definitions.
 *
 * Pure data and pure functions, with no server-only imports, so client
 * components can use them to decide what to offer. They decide presentation
 * only: the database policies decide what is permitted, under the acting user's
 * own identity.
 */

export type StaffRole =
  | 'admin'
  | 'editor'
  | 'scientific_reviewer'
  | 'clinical_reviewer'
  | 'compliance_reviewer';

export type ReviewType =
  | 'source_check'
  | 'primary_verification'
  | 'scientific'
  | 'clinical'
  | 'compliance';

export const ROLE_LABELS: Readonly<Record<StaffRole, string>> = {
  admin: 'Administrator',
  editor: 'Editor',
  scientific_reviewer: 'Scientific reviewer',
  clinical_reviewer: 'Clinical reviewer',
  compliance_reviewer: 'Compliance reviewer',
};

/**
 * Which review types a role may record.
 *
 * Mirrors the `reviewer_insert` policy in db/migrations/0003. The separation
 * matters: it is what prevents one account from assembling the full set of
 * approvals a protocol needs.
 */
export function reviewTypesForRole(role: StaffRole): readonly ReviewType[] {
  switch (role) {
    case 'admin':
      return ['source_check', 'primary_verification', 'scientific', 'clinical', 'compliance'];
    case 'editor':
      return ['source_check', 'primary_verification'];
    case 'scientific_reviewer':
      return ['scientific'];
    case 'clinical_reviewer':
      return ['clinical'];
    case 'compliance_reviewer':
      return ['compliance'];
  }
}

export function canEditContent(role: StaffRole): boolean {
  return role === 'admin' || role === 'editor';
}
