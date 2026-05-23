-- Rename engagement enum values to canonical product language
ALTER TYPE "EngagementType" RENAME VALUE 'BLOCK_SUPPORT' TO 'SUPPORT_BLOCK';
ALTER TYPE "EngagementType" RENAME VALUE 'ONE_OFF' TO 'REQUEST_BASED';

ALTER TABLE "Client" ALTER COLUMN "engagementType" SET DEFAULT 'SUPPORT_BLOCK';
