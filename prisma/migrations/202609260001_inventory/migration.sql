ALTER TABLE "ProductVariant"
 ADD COLUMN "stockQuantity" DECIMAL(18,3) NOT NULL DEFAULT 0,
 ADD COLUMN "stockUnit" TEXT NOT NULL DEFAULT 'piece',
 ADD COLUMN "lowStockThreshold" DECIMAL(18,3) NOT NULL DEFAULT 0,
 ADD COLUMN "trackInventory" BOOLEAN NOT NULL DEFAULT false,
 ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 ADD COLUMN "inventoryVersion" INTEGER NOT NULL DEFAULT 0,
 ADD CONSTRAINT "stock_nonnegative" CHECK ("stockQuantity" >= 0 AND "lowStockThreshold" >= 0),
 ADD CONSTRAINT "stock_unit_valid" CHECK ("stockUnit" IN ('piece','m3','m2','lm'));
ALTER TABLE "Order" ADD COLUMN "inventoryDeductedAt" TIMESTAMP(3), ADD COLUMN "inventoryReturnedAt" TIMESTAMP(3);
CREATE TYPE "InventoryMovementType" AS ENUM ('SALE','RECEIPT','RETURN','ADJUSTMENT','DAMAGE','INITIAL');
CREATE TABLE "InventoryMovement" (
 "id" TEXT PRIMARY KEY, "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE RESTRICT,
 "variantId" TEXT NOT NULL REFERENCES "ProductVariant"("id") ON DELETE RESTRICT,
 "type" "InventoryMovementType" NOT NULL, "quantity" DECIMAL(18,3) NOT NULL,
 "beforeQuantity" DECIMAL(18,3) NOT NULL, "afterQuantity" DECIMAL(18,3) NOT NULL,
 "stockUnit" TEXT NOT NULL, "reason" TEXT NOT NULL, "note" TEXT NOT NULL DEFAULT '',
 "adminId" UUID REFERENCES "AdminUser"("id") ON DELETE RESTRICT,
 "orderId" INTEGER REFERENCES "Order"("id") ON DELETE RESTRICT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "movement_balanced" CHECK ("beforeQuantity" >= 0 AND "afterQuantity" >= 0 AND "beforeQuantity" + "quantity" = "afterQuantity")
);
CREATE INDEX "InventoryMovement_variantId_createdAt_idx" ON "InventoryMovement"("variantId","createdAt");
CREATE INDEX "InventoryMovement_orderId_type_idx" ON "InventoryMovement"("orderId","type");
-- Audit entries are append-only, including for privileged application callers.
CREATE FUNCTION inventory_history_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Inventory history is immutable'; END; $$;
CREATE TRIGGER inventory_history_immutable BEFORE UPDATE OR DELETE ON "InventoryMovement" FOR EACH ROW EXECUTE FUNCTION inventory_history_immutable();
