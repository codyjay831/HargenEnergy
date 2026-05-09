-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CLIENT');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('LEAD', 'ACTIVE', 'PAUSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('LIGHT', 'CORE', 'PRIORITY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "Urgency" AS ENUM ('NORMAL', 'THIS_WEEK', 'URGENT', 'ONGOING');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('NEW', 'REVIEWED', 'IN_PROGRESS', 'NEEDS_INFO', 'WAITING_ON_CUSTOMER', 'WAITING_ON_THIRD_PARTY', 'COMPLETE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BillableType" AS ENUM ('INCLUDED', 'OVERFLOW', 'NON_BILLABLE');

-- CreateEnum
CREATE TYPE "OverflowStatus" AS ENUM ('NOT_NEEDED', 'NEEDS_APPROVAL', 'APPROVED', 'DECLINED', 'DEFERRED');

-- CreateEnum
CREATE TYPE "AuthorType" AS ENUM ('ADMIN', 'CLIENT', 'SYSTEM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CLIENT',
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "website" TEXT,
    "serviceArea" TEXT,
    "role" TEXT,
    "currentTools" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'LEAD',
    "planType" "PlanType" NOT NULL DEFAULT 'LIGHT',
    "weeklyHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "subscriptionStatus" TEXT,
    "subscriptionCurrentPeriodEnd" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportRequest" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "requestType" TEXT,
    "supportNeeded" TEXT,
    "description" TEXT NOT NULL,
    "mostHelpful" TEXT,
    "urgency" "Urgency" NOT NULL DEFAULT 'NORMAL',
    "status" "RequestStatus" NOT NULL DEFAULT 'NEW',
    "needsInfo" BOOLEAN NOT NULL DEFAULT false,
    "clientVisibleUpdate" TEXT,
    "internalNotes" TEXT,
    "estimatedMinutes" INTEGER,
    "overflowStatus" "OverflowStatus" NOT NULL DEFAULT 'NOT_NEEDED',
    "overflowReason" TEXT,
    "overflowApprovedAt" TIMESTAMP(3),
    "overflowApprovedById" TEXT,
    "deferredUntil" TIMESTAMP(3),
    "priorityRank" INTEGER,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestComment" (
    "id" TEXT NOT NULL,
    "supportRequestId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "authorType" "AuthorType" NOT NULL,
    "body" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "supportRequestId" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "minutes" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "billableType" "BillableType" NOT NULL DEFAULT 'INCLUDED',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "supportRequestId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weeklyHours" DOUBLE PRECISION NOT NULL,
    "monthlyPriceCents" INTEGER,
    "stripePriceId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportRequest" ADD CONSTRAINT "SupportRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportRequest" ADD CONSTRAINT "SupportRequest_overflowApprovedById_fkey" FOREIGN KEY ("overflowApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestComment" ADD CONSTRAINT "RequestComment_supportRequestId_fkey" FOREIGN KEY ("supportRequestId") REFERENCES "SupportRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestComment" ADD CONSTRAINT "RequestComment_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_supportRequestId_fkey" FOREIGN KEY ("supportRequestId") REFERENCES "SupportRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_supportRequestId_fkey" FOREIGN KEY ("supportRequestId") REFERENCES "SupportRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
