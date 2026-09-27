# FIRST ADMINISTRATOR BOOTSTRAP

How the first staff account is created on a database that has none, and why it
takes a deliberate step rather than a sign-up form.

---

## The deadlock

`profiles` carries two row-level security policies (migration 0003):

```sql
CREATE POLICY staff_read ON profiles FOR SELECT TO authenticated
  USING (tides_current_staff_role() IS NOT NULL OR user_id = tides_current_user_id());
CREATE POLICY admin_manage ON profiles FOR ALL TO authenticated
  USING (tides_has_role('admin')) WITH CHECK (tides_has_role('admin'));
```

Both resolve the caller's role **by reading `profiles`**. On an empty table
nobody has a role, so nobody may insert — including the person who is about to
become the administrator. The application cannot bootstrap itself.

**That is correct, not a bug.** The alternative is a policy under which any
authenticated stranger can appoint themselves an administrator of a medical
reference. The deadlock is the safe failure.

---

## The resolution

Row-level security is **not forced** on this table, so the role that owns it is
not subject to the policies. That role is the one in `DATABASE_URL` — the same
connection that runs migrations.

```bash
npm run db:bootstrap-admin -- --user-id <uuid> --name "Full Name" --email person@example.org
```

`scripts/db/bootstrap-admin.ts` uses that connection and nothing else.

**What is not done, deliberately:**

- No policy is dropped, relaxed, or temporarily disabled.
- No service-role key is introduced. Nothing in this codebase reads one, and
  adding one to save a copy-and-paste would be a poor trade: it is a credential
  that bypasses every policy, for a task performed once.
- Nothing about any person is hard-coded. The id, name and email are arguments.

Afterwards the table behaves exactly as before. The new administrator appoints
the rest of the staff through the application, under their own identity, where
the policies decide what they may do and the action is audited.

---

## Procedure

### 1. The Supabase account must exist first

Create or invite the user in the Supabase dashboard (**Authentication → Users**)
and copy their **user id** — a uuid, not the email.

The script cannot confirm the id belongs to a real account: that would need a
service-role key. A wrong id produces a profile nobody can sign in as, which is
visible and reversible — see below.

### 2. Check the table is empty

```bash
npm run db:bootstrap-admin -- --list
```

On a fresh production database this prints:

```
  STAFF PROFILES — 0
  None. This database has no staff and no administrator.
```

### 3. Create the first administrator

```bash
DATABASE_URL='<the owner connection string>' \
  npm run db:bootstrap-admin -- \
    --user-id 00000000-0000-0000-0000-000000000000 \
    --name "Full Name" \
    --email person@example.org
```

`--email` is optional and is what the editorial interface displays; it does not
authenticate anything.

Expected output:

```
  FIRST ADMINISTRATOR CREATED
  Full Name — admin
  00000000-0000-0000-0000-000000000000
```

### 4. Sign in

Go to `/admin/sign-in` and authenticate as that Supabase account. The session
resolves the profile, the role decides what the interface offers, and the
policies decide what the database permits.

### 5. Appoint everyone else in the application

Do not re-run this script. It refuses while an active administrator exists:

```
  This database already has 1 active administrator(s).
  Bootstrapping is for an empty table.
```

---

## If the id was wrong

The profile exists and nobody can sign in as it. Using the same owner
connection:

```sql
DELETE FROM profiles WHERE user_id = '<the wrong uuid>';
```

Then run the bootstrap again with the right id.

---

## Verification

The procedure was rehearsed end to end against the development database on
27 September 2026, with a throwaway uuid:

| Step | Result |
|---|---|
| `--list` on an empty table | reported 0 profiles |
| bootstrap with a uuid and name | created the profile with role `admin` |
| bootstrap a second time | **refused**, naming the existing administrator |
| delete the rehearsal row | removed cleanly |
| `qa:production` afterwards | **No blockers** |

The rehearsal profile was deleted; the development database has no staff.

---

## Roles

`admin` is the only role the bootstrap creates. The rest are appointed through
the application:

| Role | |
|---|---|
| `admin` | Administrator |
| `editor` | Editor |
| `scientific_reviewer` | Scientific reviewer |
| `clinical_reviewer` | Clinical reviewer |
| `compliance_reviewer` | Compliance reviewer |

A reviewer may only record the kind of review their role performs, and only in
their own name — enforced by policy, not by the interface.
