CREATE TABLE "OrderNotification" (
  "orderId" INTEGER PRIMARY KEY REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "firstAttemptAt" TIMESTAMP(3),
  "lastAttemptAt" TIMESTAMP(3),
  "leaseUntil" TIMESTAMP(3),
  "leaseToken" TEXT,
  "payload" JSONB,
  "providerId" TEXT UNIQUE,
  "acceptedAt" TIMESTAMP(3),
  "lastError" TEXT
);
CREATE INDEX "OrderNotification_status_leaseUntil_idx" ON "OrderNotification"("status", "leaseUntil");
ALTER TABLE "OrderNotification" ENABLE ROW LEVEL SECURITY;
