CREATE TABLE "ScheduledReport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScheduledReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ScheduledReport_tenantId_frequency_idx" ON "ScheduledReport"("tenantId", "frequency");

ALTER TABLE "ScheduledReport" ADD CONSTRAINT "ScheduledReport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
