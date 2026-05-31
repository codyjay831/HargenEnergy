-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY');

-- CreateEnum
CREATE TYPE "OverageInvoiceStatus" AS ENUM ('NOT_INVOICED', 'DRAFT', 'OPEN', 'PAID', 'VOID');

-- AlterTable
ALTER TABLE "Client"
ADD COLUMN "hourlyRateCents" INTEGER,
ADD COLUMN "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
ADD COLUMN "stripePrepaidPriceId" TEXT;

-- AlterTable
ALTER TABLE "SupportRequest"
ADD COLUMN "overageMinutesInvoiced" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "overageRateCentsSnapshot" INTEGER,
ADD COLUMN "overageInvoiceStatus" "OverageInvoiceStatus" NOT NULL DEFAULT 'NOT_INVOICED',
ADD COLUMN "stripeOverageInvoiceId" TEXT,
ADD COLUMN "overageInvoicedAt" TIMESTAMP(3);
