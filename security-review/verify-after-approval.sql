-- READ ONLY. Run after approval/application; no customer data is selected.
BEGIN READ ONLY;
-- Expected: 20 rows (10 tables x 2 roles), every rls=true, every client privilege=false.
SELECT c.relname AS table_name, c.relrowsecurity AS rls,
       r.rolname AS client_role,
       has_table_privilege(r.oid,c.oid,'SELECT') AS can_select,
       has_table_privilege(r.oid,c.oid,'INSERT') AS can_insert,
       has_table_privilege(r.oid,c.oid,'UPDATE') AS can_update,
       has_table_privilege(r.oid,c.oid,'DELETE') AS can_delete,
       has_table_privilege(r.oid,c.oid,'TRUNCATE') AS can_truncate
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
CROSS JOIN pg_roles r
WHERE n.nspname='public' AND c.relkind IN ('r','p')
  AND r.rolname IN ('anon','authenticated')
ORDER BY 1,3;
-- Expected: 10 restrictive false policies, and the existing 3 Storage policies.
SELECT schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
FROM pg_policies WHERE schemaname IN ('public','storage') ORDER BY 1,2,3;
-- Expected: anon=false; authenticated=true for gw_is_admin only.
SELECT r.rolname,p.proname,has_function_privilege(r.oid,p.oid,'EXECUTE') AS can_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace CROSS JOIN pg_roles r
WHERE n.nspname='public' AND r.rolname IN ('anon','authenticated') ORDER BY 1,2;
-- Expected: false for anon/authenticated; owner/service access is retained.
SELECT r.rolname,c.relname,has_sequence_privilege(r.oid,c.oid,'USAGE') AS can_use,
       has_sequence_privilege(r.oid,c.oid,'SELECT') AS can_read,
       has_sequence_privilege(r.oid,c.oid,'UPDATE') AS can_set
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN pg_roles r
WHERE n.nspname='public' AND c.relkind='S' AND r.rolname IN ('anon','authenticated');
COMMIT;
