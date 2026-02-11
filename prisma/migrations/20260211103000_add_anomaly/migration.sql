CREATE TABLE "Anomaly" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "metric" TEXT NOT NULL,
  "value" DECIMAL(12,2) NOT NULL,
  "baseline" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Anomaly_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Anomaly_tenantId_createdAt_idx" ON "Anomaly"("tenantId", "createdAt");

ALTER TABLE "Anomaly"
ADD CONSTRAINT "Anomaly_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
