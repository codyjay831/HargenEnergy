-- CreateEnum
CREATE TYPE "BillingMode" AS ENUM ('STRIPE', 'MANUAL', 'COMPED_INTERNAL', 'DEMO');

-- AlterTable
ALTER TABLE "Client"
ADD COLUMN "billingMode" "BillingMode" NOT NULL DEFAULT 'STRIPE',
ADD COLUMN "billingOverrideCreatedAt" TIMESTAMP(3),
ADD COLUMN "billingOverrideCreatedById" TEXT,
ADD COLUMN "billingOverrideExpiresAt" TIMESTAMP(3),
ADD COLUMN "billingOverrideReason" TEXT;

-- CreateIndex
CREATE INDEX "Client_billingMode_idx" ON "Client"("billingMode");

-- AddForeignKey
ALTER TABLE "Client"
ADD CONSTRAINT "Client_billingOverrideCreatedById_fkey"
FOREIGN KEY ("billingOverrideCreatedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
