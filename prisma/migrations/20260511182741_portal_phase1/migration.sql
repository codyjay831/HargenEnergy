-- CreateEnum
CREATE TYPE "SystemAccessType" AS ENUM ('AHJ', 'UTILITY', 'CRM', 'EMAIL', 'OTHER');

-- CreateEnum
CREATE TYPE "SystemAccessMethod" AS ENUM ('VAULT_LINK', 'CLIENT_WILL_INVITE', 'ADMIN_SECURE_NOTE');

-- CreateEnum
CREATE TYPE "SystemAccessStatus" AS ENUM ('NOT_PROVIDED', 'PROVIDED', 'VERIFIED');

-- CreateEnum
CREATE TYPE "DisbursementPaymentMethod" AS ENUM ('HARGEN_PAYS', 'CLIENT_PAYS_DIRECT', 'REIMBURSE_HARGEN');

-- CreateEnum
CREATE TYPE "DisbursementStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'DECLINED', 'PAID', 'CLIENT_PAID_DIRECT', 'CANCELLED');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "brandAccent" TEXT,
ADD COLUMN     "logoUrl" TEXT;

-- CreateTable
CREATE TABLE "ClientSystemAccess" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "systemType" "SystemAccessType" NOT NULL,
    "label" TEXT NOT NULL,
    "loginUrl" TEXT,
    "username" TEXT,
    "accessMethod" "SystemAccessMethod" NOT NULL DEFAULT 'VAULT_LINK',
    "vaultLink" TEXT,
    "adminSecureNote" TEXT,
    "status" "SystemAccessStatus" NOT NULL DEFAULT 'NOT_PROVIDED',
    "lastVerifiedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientSystemAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisbursementRequest" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "supportRequestId" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "paymentMethod" "DisbursementPaymentMethod" NOT NULL DEFAULT 'HARGEN_PAYS',
    "status" "DisbursementStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "requestedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "declinedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "receiptUrl" TEXT,
    "receiptNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DisbursementRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientSystemAccess_clientId_idx" ON "ClientSystemAccess"("clientId");

-- CreateIndex
CREATE INDEX "DisbursementRequest_clientId_idx" ON "DisbursementRequest"("clientId");

-- CreateIndex
CREATE INDEX "DisbursementRequest_supportRequestId_idx" ON "DisbursementRequest"("supportRequestId");

-- CreateIndex
CREATE INDEX "DisbursementRequest_status_idx" ON "DisbursementRequest"("status");

-- AddForeignKey
ALTER TABLE "ClientSystemAccess" ADD CONSTRAINT "ClientSystemAccess_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisbursementRequest" ADD CONSTRAINT "DisbursementRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisbursementRequest" ADD CONSTRAINT "DisbursementRequest_supportRequestId_fkey" FOREIGN KEY ("supportRequestId") REFERENCES "SupportRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisbursementRequest" ADD CONSTRAINT "DisbursementRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisbursementRequest" ADD CONSTRAINT "DisbursementRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
