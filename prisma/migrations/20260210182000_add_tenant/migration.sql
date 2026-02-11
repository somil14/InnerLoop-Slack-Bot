-- Create Tenant table
CREATE TABLE "Tenant" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slackTeamId" TEXT NOT NULL,
  "botToken" TEXT,
  "plan" TEXT NOT NULL DEFAULT 'free',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tenant_slackTeamId_key" ON "Tenant"("slackTeamId");

-- Backfill Tenant from SlackWorkspace
INSERT INTO "Tenant" ("id", "name", "slackTeamId", "botToken", "plan", "createdAt")
SELECT "id", "teamId", "teamId", "botToken", 'free', "installedAt"
FROM "SlackWorkspace"
ON CONFLICT ("slackTeamId") DO NOTHING;

-- Ensure a default tenant exists for legacy data
INSERT INTO "Tenant" ("id", "name", "slackTeamId", "plan", "createdAt")
SELECT '11111111-1111-1111-1111-111111111111', 'Default Tenant', 'T_DEFAULT', 'free', NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Tenant");

-- RevenueEvent: add tenantId and backfill
ALTER TABLE "RevenueEvent" ADD COLUMN "tenantId" TEXT;

UPDATE "RevenueEvent"
SET "tenantId" = (SELECT "id" FROM "Tenant" ORDER BY "createdAt" LIMIT 1)
WHERE "tenantId" IS NULL;

ALTER TABLE "RevenueEvent"
ALTER COLUMN "tenantId" SET NOT NULL;

ALTER TABLE "RevenueEvent"
ALTER COLUMN "amount" TYPE DECIMAL(12,2);

CREATE INDEX "RevenueEvent_tenantId_createdAt_idx"
ON "RevenueEvent"("tenantId", "createdAt");

ALTER TABLE "RevenueEvent"
ADD CONSTRAINT "RevenueEvent_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- MetricQuery: add tenantId + question and backfill
ALTER TABLE "MetricQuery" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "MetricQuery" ADD COLUMN "question" TEXT;

UPDATE "MetricQuery"
SET "tenantId" = (SELECT "id" FROM "Tenant" ORDER BY "createdAt" LIMIT 1)
WHERE "tenantId" IS NULL;

UPDATE "MetricQuery"
SET "question" = '[legacy]'
WHERE "question" IS NULL;

ALTER TABLE "MetricQuery"
ALTER COLUMN "tenantId" SET NOT NULL;

ALTER TABLE "MetricQuery"
ALTER COLUMN "question" SET NOT NULL;

CREATE INDEX "MetricQuery_tenantId_intent_idx"
ON "MetricQuery"("tenantId", "intent");

ALTER TABLE "MetricQuery"
ADD CONSTRAINT "MetricQuery_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- RevenueDaily aggregate table
CREATE TABLE "RevenueDaily" (
  "tenantId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "total" DECIMAL(12,2) NOT NULL,

  CONSTRAINT "RevenueDaily_pkey" PRIMARY KEY ("tenantId", "date")
);

ALTER TABLE "RevenueDaily"
ADD CONSTRAINT "RevenueDaily_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "RevenueDaily_unique"
ON "RevenueDaily"("tenantId", "date");

-- Drop SlackWorkspace (merged into Tenant)
DROP TABLE IF EXISTS "SlackWorkspace";
