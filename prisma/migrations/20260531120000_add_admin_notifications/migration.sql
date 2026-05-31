-- CreateEnum (idempotent for environments with manual pre-apply)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'AdminNotificationType'
    ) THEN
        CREATE TYPE "AdminNotificationType" AS ENUM ('CLIENT_COMMENT', 'CLIENT_INFO_RESPONSE');
    END IF;
END
$$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "AdminNotification" (
    "id" TEXT NOT NULL,
    "type" "AdminNotificationType" NOT NULL,
    "supportRequestId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "attachmentCount" INTEGER NOT NULL DEFAULT 0,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AdminNotification_readAt_createdAt_idx" ON "AdminNotification"("readAt", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AdminNotification_supportRequestId_idx" ON "AdminNotification"("supportRequestId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'AdminNotification_supportRequestId_fkey'
    ) THEN
        ALTER TABLE "AdminNotification"
        ADD CONSTRAINT "AdminNotification_supportRequestId_fkey"
        FOREIGN KEY ("supportRequestId")
        REFERENCES "SupportRequest"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;
    END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'AdminNotification_clientId_fkey'
    ) THEN
        ALTER TABLE "AdminNotification"
        ADD CONSTRAINT "AdminNotification_clientId_fkey"
        FOREIGN KEY ("clientId")
        REFERENCES "Client"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;
    END IF;
END
$$;
