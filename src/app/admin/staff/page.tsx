import type { Metadata } from 'next';
import { requireRole } from '@/server/auth/session';
import { ROLE_LABELS, type StaffRole } from '@/server/auth/roles';
import { listStaff } from '@/server/editorial/queries';
import { Cell, Empty, PageHeader, Row, Section, Table } from '@/components/admin/primitives';
import { NewStaffForm } from './new-staff-form';

export const metadata: Metadata = { title: 'Staff' };

export default async function StaffPage() {
  const session = await requireRole('admin');
  const staff = await listStaff(session);

  return (
    <>
      <PageHeader
        title="Editorial staff"
        description="Access is granted here, not by signing in. An authenticated account with no active profile holds no privileges on any record."
      />

      <Section title="People">
        {staff.length === 0 ? (
          <Empty>No staff profiles.</Empty>
        ) : (
          <Table head={['Name', 'Role', 'Records', 'Reviews', 'Status']}>
            {staff.map((person) => (
              <Row key={person.userId}>
                <Cell>
                  <p className="font-medium">{person.displayName}</p>
                  {person.email ? <p className="text-xs text-slate">{person.email}</p> : null}
                </Cell>
                <Cell>{ROLE_LABELS[person.role as StaffRole] ?? person.role}</Cell>
                <Cell className="max-w-xs text-xs text-slate">
                  {reviewScopeNote(person.role as StaffRole)}
                </Cell>
                <Cell>{person.reviewCount}</Cell>
                <Cell>{person.isActive ? 'Active' : 'Deactivated'}</Cell>
              </Row>
            ))}
          </Table>
        )}
      </Section>

      <Section
        title="Grant access"
        description="Invite the person in Supabase Auth first, then record them here with the user id Supabase issued. The two steps are deliberately separate: authentication alone confers nothing."
      >
        <div className="max-w-xl">
          <NewStaffForm />
        </div>
      </Section>

      <p className="max-w-2xl text-sm text-slate">
        Roles are separated so that no single account can assemble every approval a protocol needs.
        A scientific reviewer cannot sign the clinical gate, and nobody can record a review in
        someone else&rsquo;s name — the database refuses both.
      </p>
    </>
  );
}

function reviewScopeNote(role: StaffRole): string {
  switch (role) {
    case 'admin':
      return 'Full access, including vocabulary changes and deletions.';
    case 'editor':
      return 'Creates and edits records; records source checks and primary verification.';
    case 'scientific_reviewer':
      return 'Records scientific review only.';
    case 'clinical_reviewer':
      return 'Records clinical review only.';
    case 'compliance_reviewer':
      return 'Records compliance review only.';
  }
}
