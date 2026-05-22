-- CreateEnum
CREATE TYPE "EngagementType" AS ENUM ('BLOCK_SUPPORT', 'ONE_OFF');

-- CreateEnum
CREATE TYPE "HandoffTier" AS ENUM ('CLEAN', 'MESSY', 'RECOVERY');

-- CreateEnum
CREATE TYPE "PricingMode" AS ENUM ('FLAT', 'HOURLY', 'REVIEW_THEN_HOURLY');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN "engagementType" "EngagementType" NOT NULL DEFAULT 'BLOCK_SUPPORT';

-- AlterTable
ALTER TABLE "SupportRequest" ADD COLUMN "handoffTier" "HandoffTier",
ADD COLUMN "pricingMode" "PricingMode",
ADD COLUMN "flatPriceCents" INTEGER;

-- AlterTable
ALTER TABLE "WorkTask" ADD COLUMN "suggestedHandoffTier" "HandoffTier",
ADD COLUMN "suggestedPricingMode" "PricingMode";

-- CreateTable
CREATE TABLE "ClientApprovedWorkTask" (
    "clientId" TEXT NOT NULL,
    "workTaskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientApprovedWorkTask_pkey" PRIMARY KEY ("clientId","workTaskId")
);

-- CreateIndex
CREATE INDEX "ClientApprovedWorkTask_workTaskId_idx" ON "ClientApprovedWorkTask"("workTaskId");

-- AddForeignKey
ALTER TABLE "ClientApprovedWorkTask" ADD CONSTRAINT "ClientApprovedWorkTask_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientApprovedWorkTask" ADD CONSTRAINT "ClientApprovedWorkTask_workTaskId_fkey" FOREIGN KEY ("workTaskId") REFERENCES "WorkTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
