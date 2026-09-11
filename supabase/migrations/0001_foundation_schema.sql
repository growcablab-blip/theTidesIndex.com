-- The Tides Index
-- Foundation schema v1
-- This migration is a starter architecture for Claude Code to review/refine before applying.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

do $$ begin
  create type source_qc_status as enum ('usable','incomplete','replace','pending','exclude');
exception when duplicate_object then null; end $$;

do $$ begin
  create type verification_status as enum (
    'unreviewed','captured','source_checked','primary_source_checked',
    'scientific_reviewed','clinical_reviewed','compliance_reviewed',
    'published','needs_update','superseded','rejected'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type publication_status as enum ('draft','review','published','needs_update','superseded','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type evidence_relationship as enum ('supports','contradicts','contextualizes','cites');
exception when duplicate_object then null; end $$;

do $$ begin
  create type review_outcome as enum ('approved','changes_requested','rejected');
exception when duplicate_object then null; end $$;

create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null check (role in ('admin','editor','scientific_reviewer','clinical_reviewer','compliance_reviewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  title text not null,
  source_type text not null,
  qc_status source_qc_status not null default 'pending',
  authors jsonb not null default '[]'::jsonb,
  publisher text,
  publication_name text,
  publication_date date,
  year integer,
  edition text,
  doi text,
  pmid text,
  trial_registry_id text,
  isbn text,
  canonical_url text,
  local_private_filename text,
  primary_role text,
  authority_notes text,
  copyright_access_notes text,
  public_fulltext_allowed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sources_title_trgm_idx on sources using gin (title gin_trgm_ops);
create index if not exists sources_source_type_idx on sources(source_type);
create index if not exists sources_qc_status_idx on sources(qc_status);

create table if not exists source_locations (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references sources(id) on delete cascade,
  page_start integer,
  page_end integer,
  chapter text,
  section text,
  figure text,
  table_number text,
  timestamp_start_seconds integer,
  timestamp_end_seconds integer,
  locator_text text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists source_locations_source_idx on source_locations(source_id);

create table if not exists peptides (
  id uuid primary key default gen_random_uuid(),
  peptide_key text not null unique,
  canonical_name text not null,
  slug text not null unique,
  compound_type text,
  natural_or_synthetic text,
  molecular_description text,
  sequence text,
  primary_category text,
  simple_summary text,
  practitioner_summary text,
  unknowns_summary text,
  verification_status verification_status not null default 'unreviewed',
  publication_status publication_status not null default 'draft',
  version integer not null default 1,
  last_reviewed_at timestamptz,
  evidence_cutoff_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists peptides_name_trgm_idx on peptides using gin (canonical_name gin_trgm_ops);
create index if not exists peptides_slug_idx on peptides(slug);

create table if not exists peptide_aliases (
  id uuid primary key default gen_random_uuid(),
  peptide_id uuid not null references peptides(id) on delete cascade,
  alias text not null,
  alias_type text,
  notes text,
  unique(peptide_id, alias)
);

create index if not exists peptide_aliases_alias_trgm_idx on peptide_aliases using gin (alias gin_trgm_ops);

create table if not exists routes (
  id uuid primary key default gen_random_uuid(),
  route_key text not null unique,
  name text not null unique,
  description_simple text,
  description_practitioner text,
  general_limitations text
);

create table if not exists quality_topics (
  id uuid primary key default gen_random_uuid(),
  quality_key text not null unique,
  name text not null,
  slug text not null unique,
  simple_summary text,
  practitioner_summary text,
  what_it_proves text,
  what_it_does_not_prove text,
  publication_status publication_status not null default 'draft',
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists claims (
  id uuid primary key default gen_random_uuid(),
  claim_key text not null unique,
  peptide_id uuid references peptides(id) on delete set null,
  quality_topic_id uuid references quality_topics(id) on delete set null,
  claim_text text not null,
  plain_language_text text,
  claim_category text,
  importance text not null default 'medium' check (importance in ('low','medium','high','critical')),
  interpretation_notes text,
  verification_status verification_status not null default 'unreviewed',
  publication_status publication_status not null default 'draft',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (peptide_id is not null or quality_topic_id is not null or claim_category is not null)
);

create table if not exists claim_evidence (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references claims(id) on delete cascade,
  source_id uuid not null references sources(id) on delete restrict,
  source_location_id uuid references source_locations(id) on delete set null,
  evidence_type text not null,
  relationship evidence_relationship not null default 'supports',
  population_model text,
  route_id uuid references routes(id) on delete set null,
  formulation text,
  extracted_text_private text,
  interpretation text,
  primary_source_verified boolean not null default false,
  reviewer_notes text,
  created_at timestamptz not null default now()
);

create index if not exists claim_evidence_claim_idx on claim_evidence(claim_id);
create index if not exists claim_evidence_source_idx on claim_evidence(source_id);
create index if not exists claim_evidence_type_idx on claim_evidence(evidence_type);

create table if not exists protocols (
  id uuid primary key default gen_random_uuid(),
  protocol_key text not null unique,
  peptide_id uuid references peptides(id) on delete set null,
  combination_name text,
  objective_context text not null,
  population_model text,
  route_id uuid references routes(id) on delete set null,
  formulation text,
  amount_reported text,
  amount_unit text,
  frequency_text text,
  timing_text text,
  duration_text text,
  cycle_text text,
  titration_text text,
  combinations_text text,
  monitoring_text text,
  contraindications_text text,
  safety_notes text,
  regulatory_context text,
  evidence_type text not null,
  verification_status verification_status not null default 'unreviewed',
  patient_visibility boolean not null default false,
  publication_status publication_status not null default 'draft',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (peptide_id is not null or combination_name is not null)
);

create table if not exists protocol_sources (
  id uuid primary key default gen_random_uuid(),
  protocol_id uuid not null references protocols(id) on delete cascade,
  source_id uuid not null references sources(id) on delete restrict,
  source_location_id uuid references source_locations(id) on delete set null,
  source_role text not null default 'original' check (source_role in ('original','secondary_reference','commentary')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists peptide_routes (
  id uuid primary key default gen_random_uuid(),
  peptide_id uuid not null references peptides(id) on delete cascade,
  route_id uuid not null references routes(id) on delete restrict,
  evidence_type text not null,
  source_id uuid not null references sources(id) on delete restrict,
  source_location_id uuid references source_locations(id) on delete set null,
  population_model text,
  formulation text,
  pk_notes text,
  bioavailability_notes text,
  verification_status verification_status not null default 'unreviewed',
  created_at timestamptz not null default now()
);

create table if not exists regulatory_statuses (
  id uuid primary key default gen_random_uuid(),
  peptide_id uuid not null references peptides(id) on delete cascade,
  jurisdiction text not null,
  indication_context text,
  status text not null,
  authority text,
  source_id uuid references sources(id) on delete set null,
  checked_at date not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists publications (
  id uuid primary key default gen_random_uuid(),
  publication_key text not null unique,
  publication_type text not null,
  title text not null,
  slug text not null unique,
  audience text not null,
  reading_mode text,
  version integer not null default 1,
  publication_status publication_status not null default 'draft',
  published_at timestamptz,
  last_reviewed_at timestamptz,
  evidence_cutoff_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists publication_sections (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references publications(id) on delete cascade,
  sort_order integer not null,
  heading text,
  body_structured jsonb not null default '{}'::jsonb,
  audience text,
  generated_from_claims boolean not null default false,
  unique(publication_id, sort_order)
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  review_type text not null,
  reviewer_user_id uuid references auth.users(id) on delete set null,
  outcome review_outcome not null,
  comments text,
  reviewed_at timestamptz not null default now()
);

create table if not exists revisions (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  version integer not null,
  diff_summary text not null,
  snapshot jsonb,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

-- Private-by-default foundation.
alter table profiles enable row level security;
alter table sources enable row level security;
alter table source_locations enable row level security;
alter table peptides enable row level security;
alter table peptide_aliases enable row level security;
alter table routes enable row level security;
alter table quality_topics enable row level security;
alter table claims enable row level security;
alter table claim_evidence enable row level security;
alter table protocols enable row level security;
alter table protocol_sources enable row level security;
alter table peptide_routes enable row level security;
alter table regulatory_statuses enable row level security;
alter table publications enable row level security;
alter table publication_sections enable row level security;
alter table reviews enable row level security;
alter table revisions enable row level security;

-- Claude Code should add role-aware internal policies and narrow public read views/policies
-- after the authentication/review model is implemented. Do not expose draft/private source data.
