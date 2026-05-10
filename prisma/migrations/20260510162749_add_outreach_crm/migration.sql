-- CreateEnum
CREATE TYPE "OutreachCompanyStatus" AS ENUM ('LEAD_FOUND', 'CONTACTED', 'FOLLOW_UP_NEEDED', 'REPLIED', 'INTERESTED', 'CALL_BOOKED', 'TRIAL_OFFERED', 'WON', 'NO_RESPONSE', 'NOT_INTERESTED', 'BAD_FIT', 'DO_NOT_CONTACT');

-- CreateEnum
CREATE TYPE "OutreachChannel" AS ENUM ('EMAIL', 'WEBSITE_FORM', 'LINKEDIN', 'FACEBOOK', 'PHONE', 'TEXT', 'IN_PERSON', 'OTHER');

-- CreateEnum
CREATE TYPE "OutreachActivityType" AS ENUM ('MESSAGE_SENT', 'REPLY_RECEIVED', 'FOLLOW_UP_SENT', 'CALL_BOOKED', 'CALL_COMPLETED', 'PROPOSAL_SENT', 'DECLINED', 'NOTE');

-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('SOLAR_INSTALLER', 'ELECTRICAL_CONTRACTOR', 'ROOFING_SOLAR', 'BATTERY_INSTALLER', 'SOLAR_SERVICE_COMPANY', 'OTHER');

-- CreateTable
CREATE TABLE "OutreachCompany" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "city" TEXT,
    "county" TEXT,
    "state" TEXT,
    "serviceArea" TEXT,
    "businessType" "BusinessType" DEFAULT 'OTHER',
    "companySizeEstimate" TEXT,
    "leadSource" TEXT,
    "sourceQuery" TEXT,
    "sourceUrl" TEXT,
    "status" "OutreachCompanyStatus" NOT NULL DEFAULT 'LEAD_FOUND',
    "interestLevel" INTEGER DEFAULT 0,
    "fitScore" INTEGER DEFAULT 0,
    "notes" TEXT,
    "painTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "doNotContact" BOOLEAN NOT NULL DEFAULT false,
    "enrichmentData" JSONB,
    "lastContactedAt" TIMESTAMP(3),
    "nextFollowUpAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutreachCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutreachContact" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roleTitle" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "linkedinUrl" TEXT,
    "facebookUrl" TEXT,
    "companyFacebookUrl" TEXT,
    "websiteContactFormUrl" TEXT,
    "preferredChannel" "OutreachChannel",
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutreachContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutreachActivity" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "contactId" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channel" "OutreachChannel" NOT NULL,
    "activityType" "OutreachActivityType" NOT NULL,
    "templateUsed" TEXT,
    "messageSnapshot" TEXT,
    "notes" TEXT,
    "responseSummary" TEXT,
    "outcome" TEXT,
    "nextFollowUpAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutreachActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutreachTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" "OutreachChannel" NOT NULL,
    "templateType" TEXT,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutreachTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OutreachCompany_status_idx" ON "OutreachCompany"("status");

-- CreateIndex
CREATE INDEX "OutreachCompany_state_city_idx" ON "OutreachCompany"("state", "city");

-- CreateIndex
CREATE INDEX "OutreachContact_companyId_idx" ON "OutreachContact"("companyId");

-- CreateIndex
CREATE INDEX "OutreachActivity_companyId_idx" ON "OutreachActivity"("companyId");

-- CreateIndex
CREATE INDEX "OutreachActivity_date_idx" ON "OutreachActivity"("date");

-- AddForeignKey
ALTER TABLE "OutreachContact" ADD CONSTRAINT "OutreachContact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "OutreachCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachActivity" ADD CONSTRAINT "OutreachActivity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "OutreachCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachActivity" ADD CONSTRAINT "OutreachActivity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "OutreachContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachActivity" ADD CONSTRAINT "OutreachActivity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
