-- CreateEnum
CREATE TYPE "LegalTemplateType" AS ENUM ('CLIENT_SERVICES_AGREEMENT', 'WORK_AUTHORIZATION');

-- CreateEnum
CREATE TYPE "AgreementPacketStatus" AS ENUM ('DRAFT', 'READY', 'SENT', 'VIEWED', 'SIGNED', 'ACTIVE', 'VOIDED', 'SUPERSEDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AgreementServiceType" AS ENUM ('SUPPORT_BLOCK', 'REQUEST_BASED', 'CUSTOM');

-- CreateTable
CREATE TABLE "LegalTemplate" (
    "id" TEXT NOT NULL,
    "type" "LegalTemplateType" NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bodyMarkdown" TEXT NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgreementFile" (
    "id" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256Hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgreementFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgreementPacket" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "status" "AgreementPacketStatus" NOT NULL DEFAULT 'DRAFT',
    "clientServicesTemplateId" TEXT NOT NULL,
    "workAuthorizationTemplateId" TEXT NOT NULL,
    "companyLegalName" TEXT NOT NULL,
    "companyDba" TEXT,
    "companyAddress" TEXT,
    "signerName" TEXT NOT NULL,
    "signerTitle" TEXT NOT NULL,
    "signerEmail" TEXT NOT NULL,
    "serviceType" "AgreementServiceType" NOT NULL,
    "selectedScopeJson" JSONB,
    "pricingJson" JSONB,
    "billingJson" JSONB,
    "acceptanceSnapshotJson" JSONB,
    "snapshotAt" TIMESTAMP(3),
    "unsignedPdfFileId" TEXT,
    "signedPdfFileId" TEXT,
    "sentAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "supersededById" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgreementPacket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgreementPacketEvent" (
    "id" TEXT NOT NULL,
    "agreementPacketId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorEmail" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgreementPacketEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LegalTemplate_type_version_key" ON "LegalTemplate"("type", "version");

-- CreateIndex
CREATE INDEX "LegalTemplate_type_isActive_idx" ON "LegalTemplate"("type", "isActive");

-- CreateIndex
CREATE INDEX "AgreementPacket_clientId_idx" ON "AgreementPacket"("clientId");

-- CreateIndex
CREATE INDEX "AgreementPacket_status_idx" ON "AgreementPacket"("status");

-- CreateIndex
CREATE INDEX "AgreementPacket_createdAt_idx" ON "AgreementPacket"("createdAt");

-- CreateIndex
CREATE INDEX "AgreementPacketEvent_agreementPacketId_createdAt_idx" ON "AgreementPacketEvent"("agreementPacketId", "createdAt");

-- AddForeignKey
ALTER TABLE "AgreementPacket" ADD CONSTRAINT "AgreementPacket_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgreementPacket" ADD CONSTRAINT "AgreementPacket_clientServicesTemplateId_fkey" FOREIGN KEY ("clientServicesTemplateId") REFERENCES "LegalTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgreementPacket" ADD CONSTRAINT "AgreementPacket_workAuthorizationTemplateId_fkey" FOREIGN KEY ("workAuthorizationTemplateId") REFERENCES "LegalTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgreementPacket" ADD CONSTRAINT "AgreementPacket_unsignedPdfFileId_fkey" FOREIGN KEY ("unsignedPdfFileId") REFERENCES "AgreementFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgreementPacket" ADD CONSTRAINT "AgreementPacket_signedPdfFileId_fkey" FOREIGN KEY ("signedPdfFileId") REFERENCES "AgreementFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgreementPacket" ADD CONSTRAINT "AgreementPacket_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "AgreementPacket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgreementPacket" ADD CONSTRAINT "AgreementPacket_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgreementPacketEvent" ADD CONSTRAINT "AgreementPacketEvent_agreementPacketId_fkey" FOREIGN KEY ("agreementPacketId") REFERENCES "AgreementPacket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
