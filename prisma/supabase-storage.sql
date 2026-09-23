-- Run once with the Supabase SQL editor (or npm run db:storage).
-- Authorization is read from the server-managed allowlist, never user metadata.
CREATE OR REPLACE FUNCTION public.gw_is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (SELECT 1 FROM public."AdminUser" WHERE id = (SELECT auth.uid()) AND enabled = true); $$;
REVOKE ALL ON FUNCTION public.gw_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gw_is_admin() TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('product-images', 'product-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS gw_admin_image_insert ON storage.objects;
CREATE POLICY gw_admin_image_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images' AND public.gw_is_admin());
DROP POLICY IF EXISTS gw_admin_image_delete ON storage.objects;
CREATE POLICY gw_admin_image_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'product-images' AND public.gw_is_admin());
DROP POLICY IF EXISTS gw_admin_image_select ON storage.objects;
CREATE POLICY gw_admin_image_select ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'product-images' AND public.gw_is_admin());
