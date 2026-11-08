-- PROPOSED ONLY. Not in prisma/migrations, so deploy/setup cannot apply it.
-- Promote to a new Prisma migration only after approval and staging validation.
-- Preconditions: audited project, execution as postgres, privileged Prisma runtime.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $$
DECLARE
  target text;
  targets constant text[] := ARRAY[
    'AdminUser','Category','InventoryMovement','Order','OrderItem',
    'OrderNotification','Post','Product','ProductVariant','_prisma_migrations'
  ];
BEGIN
  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Run as the audited postgres migration role';
  END IF;
  IF NOT (SELECT rolbypassrls OR rolsuper FROM pg_roles WHERE rolname=current_user) THEN
    RAISE EXCEPTION 'Privileged runtime/migration access must be verified first';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f')
      AND NOT (c.relname=ANY(targets))
  ) THEN
    RAISE EXCEPTION 'Unreviewed public relation detected; repeat the security audit';
  END IF;
  FOREACH target IN ARRAY targets LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=target AND c.relkind='r'
        AND pg_get_userbyid(c.relowner)=current_user
    ) THEN
      RAISE EXCEPTION 'Missing table or ownership drift: %', target;
    END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC, anon, authenticated', target);
    -- Restrictive false prevents future permissive policies from reopening clients.
    -- There are deliberately no permissive client policies on these server-only tables.
    EXECUTE format('DROP POLICY IF EXISTS gw_block_direct_clients ON public.%I', target);
    EXECUTE format(
      'CREATE POLICY gw_block_direct_clients ON public.%I AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)', target
    );
  END LOOP;
END;
$$;

REVOKE ALL PRIVILEGES ON SEQUENCE public."Order_id_seq", public."OrderItem_id_seq"
  FROM PUBLIC, anon, authenticated;

-- Existing grants include TRUNCATE, which RLS does not protect against.
-- Keep owner/service permissions; do not FORCE RLS or change runtime credentials here.
-- No table data, customer rows, or migration history is altered.
COMMIT;
