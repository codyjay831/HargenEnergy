-- CreateEnum
CREATE TYPE "OutreachSearchSource" AS ENUM ('GOOGLE', 'PERMITSTACK');

-- CreateEnum
CREATE TYPE "OutreachSearchStatus" AS ENUM ('SUCCESS', 'EMPTY', 'ERROR');

-- CreateTable
CREATE TABLE "OutreachSearchRun" (
    "id" TEXT NOT NULL,
    "source" "OutreachSearchSource" NOT NULL,
    "createdById" TEXT,
    "queryText" TEXT,
    "params" JSONB,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "searchMode" TEXT,
    "status" "OutreachSearchStatus" NOT NULL,
    "errorMessage" TEXT,
    "resultSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutreachSearchRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OutreachSearchRun_createdAt_idx" ON "OutreachSearchRun"("createdAt");

-- CreateIndex
CREATE INDEX "OutreachSearchRun_source_createdAt_idx" ON "OutreachSearchRun"("source", "createdAt");

-- AddForeignKey
ALTER TABLE "OutreachSearchRun" ADD CONSTRAINT "OutreachSearchRun_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
