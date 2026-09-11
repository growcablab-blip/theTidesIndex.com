-- ===========================================================================
-- Absence is absence.
--
-- Twice now a structured field has carried a string saying it was empty —
-- `analytical_method = 'Not stated'` — and downstream logic has counted the
-- field as populated because a string existed. In C.5 that made a document
-- stating three of four methods report "none stated"; in C.8 it made a document
-- stating none report one.
--
-- Both were caught by reading the rendered page, which is not a control. The
-- rule is therefore enforced where it cannot be forgotten: a structured metadata
-- column either holds a value or holds NULL, and the presentation layer is what
-- renders "Not stated".
--
-- One exception, deliberately preserved. `certificate_tests.result_text` may
-- legitimately contain "Not determined" or "Not tested", because that is what
-- the document itself reports as its result. A source-reported negative is a
-- finding; a database placeholder is a hole. The constraint below covers the
-- metadata columns and leaves the result column alone.
-- ===========================================================================

CREATE OR REPLACE FUNCTION tides_is_placeholder(p_value text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $fn$
  SELECT p_value IS NOT NULL
     AND lower(btrim(p_value)) IN (
       'n/a', 'na', 'n.a.', 'not stated', 'notstated', 'unknown', 'none',
       'not applicable', 'not available', 'not specified', 'not recorded',
       'tbd', 'tba', 'null', 'nil', '-', '--', '?', ''
     )
$fn$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION tides_is_placeholder(text) FROM PUBLIC, anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION tides_is_placeholder(text) TO authenticated, service_role;
--> statement-breakpoint

ALTER TABLE certificates ADD CONSTRAINT certificates_no_placeholder_metadata CHECK (
  NOT (
    tides_is_placeholder(document_title)
    OR tides_is_placeholder(issuing_entity)
    OR tides_is_placeholder(laboratory_name)
    OR tides_is_placeholder(laboratory_address)
    OR tides_is_placeholder(laboratory_contact)
    OR tides_is_placeholder(manufacturer_name)
    OR tides_is_placeholder(manufacturer_address)
    OR tides_is_placeholder(distributor_name)
    OR tides_is_placeholder(report_number)
    OR tides_is_placeholder(stated_material_name)
    OR tides_is_placeholder(stated_grade)
    OR tides_is_placeholder(stated_strength)
    OR tides_is_placeholder(batch_number)
    OR tides_is_placeholder(manufacturer_batch_number)
    OR tides_is_placeholder(sample_identifier)
    OR tides_is_placeholder(submitted_sample_identifier)
    OR tides_is_placeholder(submitted_by)
    OR tides_is_placeholder(authorised_by)
  )
);
--> statement-breakpoint

-- `result_text` is excluded: "Not determined" there is what the document says,
-- not what this index failed to record.
ALTER TABLE certificate_tests ADD CONSTRAINT certificate_tests_no_placeholder_metadata CHECK (
  NOT (
    tides_is_placeholder(test_name)
    OR tides_is_placeholder(analytical_method)
    OR tides_is_placeholder(method_reference)
    OR tides_is_placeholder(reference_standard)
    OR tides_is_placeholder(specification_text)
    OR tides_is_placeholder(result_unit)
    OR tides_is_placeholder(attachment_reference)
    OR tides_is_placeholder(verification_notes)
  )
);
--> statement-breakpoint

-- The same rule where a locator or a source record would otherwise carry one.
ALTER TABLE source_locations ADD CONSTRAINT source_locations_no_placeholder CHECK (
  NOT (
    tides_is_placeholder(locator_text)
    OR tides_is_placeholder(chapter)
    OR tides_is_placeholder(section)
    OR tides_is_placeholder(figure)
    OR tides_is_placeholder(table_number)
  )
);
