-- CreateEnum
CREATE TYPE "AgreementStatus" AS ENUM ('NOT_SENT', 'SENT', 'SIGNED', 'WAIVED');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN "agreementStatus" "AgreementStatus" NOT NULL DEFAULT 'NOT_SENT';
ALTER TABLE "Client" ADD COLUMN "agreementSentAt" TIMESTAMP(3);
ALTER TABLE "Client" ADD COLUMN "agreementSignedAt" TIMESTAMP(3);
ALTER TABLE "Client" ADD COLUMN "agreementUrl" TEXT;
ALTER TABLE "Client" ADD COLUMN "agreementNotes" TEXT;
ALTER TABLE "Client" ADD COLUMN "agreementOverrideReason" TEXT;

-- Existing active clients predate agreement tracking; waive so work gates stay unchanged until admin sets real status.
UPDATE "Client"
SET
  "agreementStatus" = 'WAIVED',
  "agreementOverrideReason" = 'Pre-agreement-tracking active client'
WHERE "status" = 'ACTIVE';
