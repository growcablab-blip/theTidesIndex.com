# CONTENT SCHEMA

This document defines the minimum logical schema. Claude Code should turn this into normalized PostgreSQL migrations.

## Source

Required:
- id UUID
- source_key text unique
- title
- source_type
- qc_status
- created_at
- updated_at

Optional:
- authors/editors
- publication/publisher
- year/date
- edition
- doi
- pmid
- trial_registry_id
- url
- isbn
- local_private_filename
- authority_notes
- copyright_access_notes
- source_summary

## SourceLocation

- id
- source_id
- page_start
- page_end
- chapter
- section
- figure
- table_number
- timestamp_start
- timestamp_end
- locator_text
- notes

## Peptide

- id
- peptide_key
- canonical_name
- slug
- compound_type
- short_description
- natural_or_synthetic
- molecular_description
- sequence
- primary_category
- status
- simple_summary
- practitioner_summary
- unknowns_summary
- created_at
- updated_at

## PeptideAlias

- id
- peptide_id
- alias
- alias_type
- notes

## Claim

- id
- claim_key
- peptide_id nullable
- quality_topic_id nullable
- claim_text
- plain_language_text
- claim_category
- importance
- interpretation_notes
- verification_status
- publication_status
- created_at
- updated_at

## ClaimEvidence

- id
- claim_id
- source_id
- source_location_id
- evidence_type
- relationship: supports | contradicts | contextualizes | cites
- population_model
- route_id nullable
- formulation
- extracted_text_private
- interpretation
- primary_source_verified boolean
- reviewer_notes

## Protocol

- id
- protocol_key
- peptide_id nullable
- combination_name nullable
- objective_context
- population_model
- route_id
- formulation
- amount_reported
- amount_unit
- frequency_text
- timing_text
- duration_text
- cycle_text
- titration_text
- combinations_text
- monitoring_text
- contraindications_text
- safety_notes
- regulatory_context
- evidence_type
- verification_status
- patient_visibility default false
- publication_status

## ProtocolSource

- id
- protocol_id
- source_id
- source_location_id
- source_role: original | secondary_reference | commentary
- notes

## Route

- id
- route_key
- name
- description_simple
- description_practitioner
- general_limitations

## PeptideRoute

- id
- peptide_id
- route_id
- evidence_type
- source_id
- source_location_id
- population_model
- formulation
- pk_notes
- bioavailability_notes
- verification_status

## QualityTopic

- id
- quality_key
- name
- slug
- simple_summary
- practitioner_summary
- what_it_proves
- what_it_does_not_prove
- publication_status

## Publication

- id
- publication_key
- publication_type
- title
- slug
- audience
- reading_mode
- version
- published_at
- last_reviewed_at
- evidence_cutoff_at
- status

## PublicationSection

- id
- publication_id
- sort_order
- heading
- body_structured
- audience
- generated_from_claims boolean

## Review

- id
- entity_type
- entity_id
- review_type
- reviewer_user_id
- outcome
- comments
- reviewed_at

## Revision

- id
- entity_type
- entity_id
- version
- diff_summary
- changed_by
- changed_at

## User / Role

Internal-only users with roles:
- admin
- editor
- scientific_reviewer
- clinical_reviewer
- compliance_reviewer

## Important implementation notes

- Never store a protocol as a single free-form blob only.
- Never store citations only as formatted strings.
- Preserve source location as a first-class entity.
- Use database constraints where possible.
- Keep audit/revision history.
- Use slugs only for URLs; IDs remain UUIDs.
