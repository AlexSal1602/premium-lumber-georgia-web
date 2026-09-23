CREATE TABLE "Order" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "idempotencyKey" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'NEW',
  "locale" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "city" TEXT,
  "address" TEXT,
  "deliveryMethod" TEXT NOT NULL,
  "comment" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'GEL',
  "totalCents" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "OrderItem" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "orderId" INTEGER NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "nameKa" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "nameRu" TEXT NOT NULL,
  "thickness" REAL NOT NULL,
  "width" REAL NOT NULL,
  "length" REAL NOT NULL,
  "coverageWidth" REAL,
  "species" TEXT NOT NULL,
  "grade" TEXT NOT NULL,
  "moisture" TEXT NOT NULL,
  "availability" TEXT NOT NULL,
  "unit" TEXT NOT NULL,
  "quantityMilli" INTEGER NOT NULL,
  "basePriceCents" INTEGER NOT NULL,
  "basePriceUnit" TEXT NOT NULL,
  "unitPrice" REAL NOT NULL,
  "totalCents" INTEGER NOT NULL,
  CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
