-- Create Usage table for plan enforcement
CREATE TABLE "Usage" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "month" TEXT NOT NULL,
  "queries" INTEGER NOT NULL DEFAULT 0,
  "reports" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Usage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Usage_tenantId_month_key" ON "Usage"("tenantId", "month");

ALTER TABLE "Usage"
  ADD CONSTRAINT "Usage_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
