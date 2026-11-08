-- PROPOSED ONLY. Apply after 01, only after approval and staging validation.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- The existing SECURITY DEFINER function uses an empty search_path and checks
-- auth.uid() against the server-managed AdminUser allowlist. Keep that behavior.
REVOKE ALL PRIVILEGES ON FUNCTION public.gw_is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gw_is_admin() TO authenticated;

-- Trigger invocation does not require callers to execute the function directly.
ALTER FUNCTION public.inventory_history_immutable() SET search_path = '';
REVOKE ALL PRIVILEGES ON FUNCTION public.inventory_history_immutable()
  FROM PUBLIC, anon, authenticated;

-- Revoke global defaults as well as schema defaults: schema-specific REVOKE
-- cannot cancel privileges granted by a global default (notably PUBLIC EXECUTE).
-- Applies to objects created by postgres, the audited application migration role.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- supabase_admin has separate defaults owned by Supabase. Do not modify its
-- objects/defaults or managed auth/storage/realtime schemas in this migration.
-- Objects subsequently created through another role require explicit review.
COMMIT;
