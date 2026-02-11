-- Create EventDaily aggregate table
CREATE TABLE "EventDaily" (
  "tenantId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "event" TEXT NOT NULL,
  "count" INTEGER NOT NULL,

  CONSTRAINT "EventDaily_pkey" PRIMARY KEY ("tenantId", "date", "event")
);

CREATE INDEX "EventDaily_tenantId_date_idx" ON "EventDaily"("tenantId", "date");

ALTER TABLE "EventDaily"
  ADD CONSTRAINT "EventDaily_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
