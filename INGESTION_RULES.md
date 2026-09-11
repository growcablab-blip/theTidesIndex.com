# INGESTION RULES

## Purpose

Source ingestion creates reviewable records. It does not create published medical truth.

## Step 1 — Register source

Capture:
- bibliographic metadata
- source type
- local filename
- completeness/QC
- copyright/public-access status
- strongest topics
- known limitations

## Step 2 — Establish source map

For books:
- table of contents
- chapter/page ranges
- index where available

For interviews/podcasts:
- title
- publisher/channel
- date
- URL
- transcript availability
- timestamps

For journal papers:
- DOI/PMID
- journal/year
- study type
- population/model
- route/formulation

## Step 3 — Extract discrete records

Do not create giant free-form summaries.

Extract:
- claims
- protocols
- route observations
- safety observations
- quality/testing statements
- cited primary sources
- disagreement flags

Each extraction needs exact source location.

## Step 4 — Verify

High-impact claims:
- locate the original cited paper/label when possible
- compare practitioner interpretation with original source
- record whether interpretation overstates evidence

## Step 5 — Review

No automatic public publishing.

## Corrupted/incomplete files

If manifest says `replace` or `incomplete`:
- do not cite missing sections
- do not assume absent pages
- mark any extracted content with source QC state
- request/await replacement copy

## Copyright

Source books remain private.
Do not expose page scans or complete book text publicly.
Store extracted snippets privately only as needed for verification.
Public copy should paraphrase with proper citation.

## AI extraction rules

AI may suggest candidate records, but:
- exact locators must be confirmed
- numerical values must be checked
- units must be checked
- route/formulation must be checked
- source attribution must be checked
- no autonomous publish
