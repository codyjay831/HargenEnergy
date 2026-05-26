-- AlterTable
ALTER TABLE "WorkTask" ADD COLUMN "showOnWalkthrough" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "WorkTask" ADD COLUMN "walkthroughOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SupportRequestWorkTask" (
    "requestId" TEXT NOT NULL,
    "workTaskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportRequestWorkTask_pkey" PRIMARY KEY ("requestId","workTaskId")
);

-- CreateIndex
CREATE INDEX "SupportRequestWorkTask_workTaskId_idx" ON "SupportRequestWorkTask"("workTaskId");

-- AddForeignKey
ALTER TABLE "SupportRequestWorkTask" ADD CONSTRAINT "SupportRequestWorkTask_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "SupportRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportRequestWorkTask" ADD CONSTRAINT "SupportRequestWorkTask_workTaskId_fkey" FOREIGN KEY ("workTaskId") REFERENCES "WorkTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill walkthrough visibility for existing catalog tasks (by name)
UPDATE "WorkTask" SET "showOnWalkthrough" = true, "walkthroughOrder" = 1 WHERE "name" = 'Permit Follow-Up';
UPDATE "WorkTask" SET "showOnWalkthrough" = true, "walkthroughOrder" = 2 WHERE "name" = 'Utility Application Submission';
UPDATE "WorkTask" SET "showOnWalkthrough" = true, "walkthroughOrder" = 3 WHERE "name" = 'Utility Follow-Up';
UPDATE "WorkTask" SET "showOnWalkthrough" = true, "walkthroughOrder" = 4 WHERE "name" = 'Job Status Cleanup';
UPDATE "WorkTask" SET "showOnWalkthrough" = true, "walkthroughOrder" = 5 WHERE "name" = 'Document Filing';
UPDATE "WorkTask" SET "showOnWalkthrough" = true, "walkthroughOrder" = 6 WHERE "name" = 'Missing Info List';
UPDATE "WorkTask" SET "showOnWalkthrough" = true, "walkthroughOrder" = 7 WHERE "name" = 'Weekly Pipeline Review';
UPDATE "WorkTask" SET "showOnWalkthrough" = true, "walkthroughOrder" = 8 WHERE "name" = 'Customer / Lead Entry';
UPDATE "WorkTask" SET "showOnWalkthrough" = true, "walkthroughOrder" = 9 WHERE "name" = 'Customer Status Update';
UPDATE "WorkTask" SET "showOnWalkthrough" = true, "walkthroughOrder" = 10 WHERE "name" = 'Missing Info Request';
UPDATE "WorkTask" SET "showOnWalkthrough" = true, "walkthroughOrder" = 11 WHERE "name" = 'Permit Readiness Check';
UPDATE "WorkTask" SET "showOnWalkthrough" = true, "walkthroughOrder" = 12 WHERE "name" = 'AHJ / Portal Setup Help';
UPDATE "WorkTask" SET "showOnWalkthrough" = true, "walkthroughOrder" = 13 WHERE "name" = 'Inspection Scheduling';
