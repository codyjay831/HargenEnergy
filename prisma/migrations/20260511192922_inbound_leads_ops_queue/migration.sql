/*
  Warnings:

  - You are about to drop the column `requestType` on the `SupportRequest` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "SupportRequestKind" AS ENUM ('PROSPECT_INTAKE', 'CLIENT_OPS');

-- CreateEnum
CREATE TYPE "SupportRequestSource" AS ENUM ('PUBLIC_FORM', 'PORTAL', 'EMAIL', 'PHONE', 'TEXT', 'VOICEMAIL', 'ADMIN');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "activatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SupportRequest" DROP COLUMN "requestType",
ADD COLUMN     "kind" "SupportRequestKind" NOT NULL DEFAULT 'CLIENT_OPS',
ADD COLUMN     "source" "SupportRequestSource" NOT NULL DEFAULT 'ADMIN';

-- CreateIndex
CREATE INDEX "SupportRequest_kind_status_idx" ON "SupportRequest"("kind", "status");

-- CreateIndex
CREATE INDEX "SupportRequest_clientId_kind_idx" ON "SupportRequest"("clientId", "kind");
