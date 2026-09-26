-- Supabase exposes public-schema tables through PostgREST. Application access
-- remains server-side through Prisma; anonymous/authenticated roles get no policy.
ALTER TABLE "InventoryMovement" ENABLE ROW LEVEL SECURITY;
