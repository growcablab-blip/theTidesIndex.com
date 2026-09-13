-- Grants on public views created after 0003.
--
-- 0003 granted SELECT on every `public_v_*` view that existed when it ran. The
-- views added in 0022 and 0023 (compound products, forms, pharmacokinetic
-- observations, literature screens and their records, identity claims,
-- replication assessments) were created afterwards and never granted, so the
-- public role could not read them. Nothing was published, so no page failed;
-- the first cross-register query to touch them did.
--
-- The loop is the 0003 loop, repeated: idempotent, and it covers any view a
-- later migration adds as long as that migration also repeats it.
DO $$
DECLARE
  v record;
BEGIN
  FOR v IN
    SELECT table_name FROM information_schema.views
    WHERE table_schema = 'public' AND table_name LIKE 'public\_v\_%'
  LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO anon, authenticated', v.table_name);
  END LOOP;
END
$$;
