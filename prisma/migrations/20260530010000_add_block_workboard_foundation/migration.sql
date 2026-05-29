-- CreateEnum
CREATE TYPE "BlockWorkItemState" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BlockWorkActivityType" AS ENUM (
  'CLIENT_NUDGE',
  'ADMIN_UPDATE',
  'PROGRESS_LOG',
  'SYSTEM_NOTE',
  'CONVERTED_TO_REQUEST'
);

-- CreateTable
CREATE TABLE "BlockWorkItem" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "workTaskId" TEXT NOT NULL,
  "state" "BlockWorkItemState" NOT NULL DEFAULT 'ACTIVE',
  "currentPriorityRank" INTEGER NOT NULL DEFAULT 3,
  "lastClientNudgeAt" TIMESTAMP(3),
  "lastAdminUpdateAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BlockWorkItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockWorkActivity" (
  "id" TEXT NOT NULL,
  "blockWorkItemId" TEXT NOT NULL,
  "authorType" "AuthorType" NOT NULL,
  "authorUserId" TEXT,
  "activityType" "BlockWorkActivityType" NOT NULL,
  "title" TEXT,
  "body" TEXT NOT NULL,
  "metadata" JSONB,
  "visibleToClient" BOOLEAN NOT NULL DEFAULT true,
  "supportRequestId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BlockWorkActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlockWorkItem_clientId_workTaskId_key" ON "BlockWorkItem"("clientId", "workTaskId");

-- CreateIndex
CREATE INDEX "BlockWorkItem_clientId_state_idx" ON "BlockWorkItem"("clientId", "state");

-- CreateIndex
CREATE INDEX "BlockWorkItem_workTaskId_idx" ON "BlockWorkItem"("workTaskId");

-- CreateIndex
CREATE INDEX "BlockWorkItem_currentPriorityRank_updatedAt_idx" ON "BlockWorkItem"("currentPriorityRank", "updatedAt");

-- CreateIndex
CREATE INDEX "BlockWorkActivity_blockWorkItemId_createdAt_idx" ON "BlockWorkActivity"("blockWorkItemId", "createdAt");

-- CreateIndex
CREATE INDEX "BlockWorkActivity_authorUserId_idx" ON "BlockWorkActivity"("authorUserId");

-- CreateIndex
CREATE INDEX "BlockWorkActivity_supportRequestId_idx" ON "BlockWorkActivity"("supportRequestId");

-- AddForeignKey
ALTER TABLE "BlockWorkItem" ADD CONSTRAINT "BlockWorkItem_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockWorkItem" ADD CONSTRAINT "BlockWorkItem_workTaskId_fkey" FOREIGN KEY ("workTaskId") REFERENCES "WorkTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockWorkActivity" ADD CONSTRAINT "BlockWorkActivity_blockWorkItemId_fkey" FOREIGN KEY ("blockWorkItemId") REFERENCES "BlockWorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockWorkActivity" ADD CONSTRAINT "BlockWorkActivity_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockWorkActivity" ADD CONSTRAINT "BlockWorkActivity_supportRequestId_fkey" FOREIGN KEY ("supportRequestId") REFERENCES "SupportRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill active block work items from approved support block tasks.
INSERT INTO "BlockWorkItem" (
  "id",
  "clientId",
  "workTaskId",
  "state",
  "currentPriorityRank",
  "createdAt",
  "updatedAt"
)
SELECT
  CONCAT('bwi_', md5(random()::text || clock_timestamp()::text || cawt."clientId" || cawt."workTaskId")),
  cawt."clientId",
  cawt."workTaskId",
  'ACTIVE'::"BlockWorkItemState",
  3,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "ClientApprovedWorkTask" cawt
JOIN "Client" c
  ON c."id" = cawt."clientId"
LEFT JOIN "ClientServiceModel" csm
  ON csm."clientId" = cawt."clientId"
  AND csm."modelType" = 'SUPPORT_BLOCK'
WHERE
  c."status" = 'ACTIVE'
  AND (
    COALESCE(csm."isActive", false) = true
    OR c."engagementType" = 'SUPPORT_BLOCK'
  )
ON CONFLICT ("clientId", "workTaskId") DO NOTHING;
