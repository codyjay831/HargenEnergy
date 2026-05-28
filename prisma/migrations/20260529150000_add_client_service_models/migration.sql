-- CreateEnum
CREATE TYPE "ServiceModelType" AS ENUM ('SUPPORT_BLOCK', 'REQUEST_BASED');

-- CreateTable
CREATE TABLE "ClientServiceModel" (
  "clientId" TEXT NOT NULL,
  "modelType" "ServiceModelType" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deactivatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ClientServiceModel_pkey" PRIMARY KEY ("clientId","modelType")
);

-- CreateIndex
CREATE INDEX "ClientServiceModel_modelType_isActive_idx" ON "ClientServiceModel"("modelType", "isActive");

-- AddForeignKey
ALTER TABLE "ClientServiceModel" ADD CONSTRAINT "ClientServiceModel_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill from legacy Client.engagementType (supports dual-read rollout).
INSERT INTO "ClientServiceModel" ("clientId", "modelType", "isActive", "activatedAt", "createdAt", "updatedAt")
SELECT "id", "engagementType"::text::"ServiceModelType", true, COALESCE("activatedAt", CURRENT_TIMESTAMP), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Client"
ON CONFLICT ("clientId", "modelType") DO UPDATE
SET "isActive" = EXCLUDED."isActive",
    "deactivatedAt" = NULL,
    "updatedAt" = CURRENT_TIMESTAMP;
