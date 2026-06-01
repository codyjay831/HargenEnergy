-- CreateEnum
CREATE TYPE "AgreementAcceptanceKind" AS ENUM ('CLIENT_SERVICES_AGREEMENT', 'WORK_AUTHORIZATION');

-- CreateEnum
CREATE TYPE "AgreementSigningLinkStatus" AS ENUM ('ACTIVE', 'USED', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "AgreementPacketAcceptance" (
    "id" TEXT NOT NULL,
    "agreementPacketId" TEXT NOT NULL,
    "acceptanceType" "AgreementAcceptanceKind" NOT NULL,
    "signerName" TEXT NOT NULL,
    "signerTitle" TEXT NOT NULL,
    "signerEmail" TEXT NOT NULL,
    "checkboxText" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "source" TEXT NOT NULL DEFAULT 'online',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgreementPacketAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgreementSigningLink" (
    "id" TEXT NOT NULL,
    "agreementPacketId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "encryptedToken" TEXT,
    "status" "AgreementSigningLinkStatus" NOT NULL DEFAULT 'ACTIVE',
    "sentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgreementSigningLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgreementPacketAcceptance_agreementPacketId_acceptanceTyp_key" ON "AgreementPacketAcceptance"("agreementPacketId", "acceptanceType");

-- CreateIndex
CREATE INDEX "AgreementPacketAcceptance_agreementPacketId_idx" ON "AgreementPacketAcceptance"("agreementPacketId");

-- CreateIndex
CREATE UNIQUE INDEX "AgreementSigningLink_tokenHash_key" ON "AgreementSigningLink"("tokenHash");

-- CreateIndex
CREATE INDEX "AgreementSigningLink_agreementPacketId_status_idx" ON "AgreementSigningLink"("agreementPacketId", "status");

-- AddForeignKey
ALTER TABLE "AgreementPacketAcceptance" ADD CONSTRAINT "AgreementPacketAcceptance_agreementPacketId_fkey" FOREIGN KEY ("agreementPacketId") REFERENCES "AgreementPacket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgreementSigningLink" ADD CONSTRAINT "AgreementSigningLink_agreementPacketId_fkey" FOREIGN KEY ("agreementPacketId") REFERENCES "AgreementPacket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgreementSigningLink" ADD CONSTRAINT "AgreementSigningLink_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
