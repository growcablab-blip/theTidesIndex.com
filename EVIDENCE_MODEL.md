# EVIDENCE MODEL

The Tides Index keeps **source type**, **evidence type**, **verification status**, and **regulatory status** separate.

## 1. Source types

- `regulatory_label`
- `regulatory_guidance`
- `compendial_standard`
- `primary_journal_article`
- `systematic_review_meta_analysis`
- `clinical_trial_registry`
- `academic_textbook`
- `academic_methods_reference`
- `practitioner_handbook`
- `expert_interview`
- `conference_presentation`
- `manufacturer_quality_document`
- `community_experiential`
- `other`

## 2. Evidence types

Human:
- `approved_label_evidence`
- `human_rct`
- `human_controlled_nonrandomized`
- `human_prospective_uncontrolled`
- `human_observational`
- `human_case_series`
- `human_case_report`
- `human_pk_pd`
- `human_safety_only`

Preclinical:
- `animal_in_vivo`
- `ex_vivo`
- `in_vitro`
- `mechanistic_computational`

Reference/opinion:
- `academic_reference`
- `practitioner_reference`
- `expert_commentary`
- `experiential_anecdotal`

## 3. Verification statuses

- `unreviewed`
- `captured`
- `source_checked`
- `primary_source_checked`
- `scientific_reviewed`
- `clinical_reviewed`
- `compliance_reviewed`
- `published`
- `needs_update`
- `superseded`
- `rejected`

## 4. Regulatory/development status

Store status as a structured record:
- jurisdiction
- indication/context
- status
- authority
- source
- checked_at
- notes

Possible statuses include:
- approved
- authorized_limited
- investigational_clinical
- preclinical
- discontinued
- withdrawn
- not_approved
- unknown

Do not derive these from brand familiarity.

## 5. Evidence display

Public UI should use descriptive language rather than forcing users to learn codes.

Examples:
- “Randomized human trial”
- “Human pharmacokinetic study”
- “Animal study”
- “Academic reference”
- “Practitioner protocol”
- “Expert commentary”

## 6. Evidence synthesis

The platform may summarize a body of evidence but should retain the underlying records. A synthesis should state:
- number/types of human studies
- major limitations
- consistency/inconsistency
- route/formulation differences
- whether endpoints are clinical, surrogate, or mechanistic
- whether results have been replicated
- major negative/null findings where known

## 7. No universal numeric score in MVP

Do not collapse all evidence into a single 1–10 score. It creates false precision. Use structured descriptors and transparent underlying evidence.
