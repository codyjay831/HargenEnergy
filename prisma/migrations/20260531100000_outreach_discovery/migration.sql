-- CreateEnum
CREATE TYPE "OutreachDiscoveryStatus" AS ENUM ('NEW', 'REVIEWING', 'SAVED', 'DISMISSED');

-- AlterTable OutreachCompany
ALTER TABLE "OutreachCompany" ADD COLUMN "normalizedName" TEXT;
ALTER TABLE "OutreachCompany" ADD COLUMN "googlePlaceId" TEXT;
ALTER TABLE "OutreachCompany" ADD COLUMN "permitStackId" TEXT;
ALTER TABLE "OutreachCompany" ADD COLUMN "enrichmentStatus" TEXT;
ALTER TABLE "OutreachCompany" ADD COLUMN "enrichmentQueuedAt" TIMESTAMP(3);

-- Backfill googlePlaceId from sourceUrl
UPDATE "OutreachCompany"
SET "googlePlaceId" = (
  regexp_match("sourceUrl", 'place_id:([^&]+)'))[1]
WHERE "sourceUrl" IS NOT NULL
  AND "sourceUrl" LIKE '%place_id:%'
  AND "googlePlaceId" IS NULL;

-- Backfill normalizedName (approximate; app keeps in sync on writes)
UPDATE "OutreachCompany"
SET "normalizedName" = trim(
  regexp_replace(
    regexp_replace(
      lower(regexp_replace("name", '[^\w\s]', ' ', 'g')),
      '\m(llc|inc|corp|corporation|co|company|ltd|limited)\M',
      ' ',
      'g'
    ),
    '\s+',
    ' ',
    'g'
  )
)
WHERE "normalizedName" IS NULL;

-- Resolve duplicate googlePlaceId values before adding the unique index.
-- Keep the earliest row and clear the rest so migration cannot fail.
WITH ranked AS (
  SELECT
    id,
    "googlePlaceId",
    ROW_NUMBER() OVER (
      PARTITION BY "googlePlaceId"
      ORDER BY "createdAt" ASC, id ASC
    ) AS rn
  FROM "OutreachCompany"
  WHERE "googlePlaceId" IS NOT NULL
)
UPDATE "OutreachCompany" oc
SET "googlePlaceId" = NULL
FROM ranked
WHERE oc.id = ranked.id
  AND ranked.rn > 1;

-- CreateIndex
CREATE UNIQUE INDEX "OutreachCompany_googlePlaceId_key" ON "OutreachCompany"("googlePlaceId");
CREATE INDEX "OutreachCompany_normalizedName_city_idx" ON "OutreachCompany"("normalizedName", "city");

-- CreateTable OutreachDiscovery
CREATE TABLE "OutreachDiscovery" (
    "id" TEXT NOT NULL,
    "googlePlaceId" TEXT,
    "permitStackId" TEXT,
    "normalizedName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "address" TEXT,
    "website" TEXT,
    "phone" TEXT,
    "rating" DOUBLE PRECISION,
    "userRatingsTotal" INTEGER,
    "detailsFetchedAt" TIMESTAMP(3),
    "status" "OutreachDiscoveryStatus" NOT NULL DEFAULT 'NEW',
    "source" "OutreachSearchSource",
    "leadSource" TEXT,
    "sourceQuery" TEXT,
    "lastRunId" TEXT,
    "matchedCompanyId" TEXT,
    "fitScore" INTEGER,
    "painTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutreachDiscovery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OutreachDiscovery_googlePlaceId_key" ON "OutreachDiscovery"("googlePlaceId");
CREATE INDEX "OutreachDiscovery_normalizedName_city_idx" ON "OutreachDiscovery"("normalizedName", "city");
CREATE INDEX "OutreachDiscovery_status_idx" ON "OutreachDiscovery"("status");
CREATE INDEX "OutreachDiscovery_matchedCompanyId_idx" ON "OutreachDiscovery"("matchedCompanyId");
CREATE INDEX "OutreachDiscovery_lastRunId_idx" ON "OutreachDiscovery"("lastRunId");

-- AddForeignKey
ALTER TABLE "OutreachDiscovery" ADD CONSTRAINT "OutreachDiscovery_lastRunId_fkey" FOREIGN KEY ("lastRunId") REFERENCES "OutreachSearchRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OutreachDiscovery" ADD CONSTRAINT "OutreachDiscovery_matchedCompanyId_fkey" FOREIGN KEY ("matchedCompanyId") REFERENCES "OutreachCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
