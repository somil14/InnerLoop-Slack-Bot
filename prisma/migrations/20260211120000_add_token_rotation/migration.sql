ALTER TABLE "Tenant" ADD COLUMN "botRefreshToken" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "botTokenExpiresAt" TIMESTAMP(3);
