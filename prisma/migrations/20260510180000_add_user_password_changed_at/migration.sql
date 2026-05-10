-- AlterTable
ALTER TABLE "User" ADD COLUMN "passwordChangedAt" TIMESTAMP(3);

UPDATE "User" SET "passwordChangedAt" = "createdAt" WHERE "passwordChangedAt" IS NULL;

ALTER TABLE "User" ALTER COLUMN "passwordChangedAt" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "passwordChangedAt" SET DEFAULT CURRENT_TIMESTAMP;
