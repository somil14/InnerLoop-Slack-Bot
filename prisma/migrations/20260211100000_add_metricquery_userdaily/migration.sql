-- Add learning fields to MetricQuery
ALTER TABLE "MetricQuery"
ADD COLUMN "resolved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "confidence" DOUBLE PRECISION;

-- Add UserDaily aggregate table
CREATE TABLE "UserDaily" (
  "tenantId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "active" INTEGER NOT NULL,
  "new" INTEGER NOT NULL,

  CONSTRAINT "UserDaily_pkey" PRIMARY KEY ("tenantId", "date")
);

ALTER TABLE "UserDaily"
ADD CONSTRAINT "UserDaily_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
