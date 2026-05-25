DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StaffRole') THEN
    CREATE TYPE "StaffRole" AS ENUM ('OWNER', 'MEMBER');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClientRole') THEN
    CREATE TYPE "ClientRole" AS ENUM ('OWNER', 'MEMBER');
  END IF;
END $$;

-- AlterTable
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "staffRole" "StaffRole",
ADD COLUMN IF NOT EXISTS "clientRole" "ClientRole",
ADD COLUMN IF NOT EXISTS "invitedById" TEXT,
ADD COLUMN IF NOT EXISTS "deactivatedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);

-- Backfill ADMIN users as OWNER
UPDATE "User"
SET "staffRole" = 'OWNER'
WHERE "role" = 'ADMIN';

-- Backfill CLIENT users: earliest per client gets OWNER, others MEMBER
WITH ranked_clients AS (
  SELECT
    "id",
    "clientId",
    ROW_NUMBER() OVER (
      PARTITION BY "clientId"
      ORDER BY "createdAt" ASC, "id" ASC
    ) AS rn
  FROM "User"
  WHERE "role" = 'CLIENT' AND "clientId" IS NOT NULL
)
UPDATE "User" u
SET "clientRole" = CASE WHEN rc.rn = 1 THEN 'OWNER'::"ClientRole" ELSE 'MEMBER'::"ClientRole" END
FROM ranked_clients rc
WHERE u."id" = rc."id";

-- For legacy CLIENT rows with null clientId, set MEMBER to avoid null role values
UPDATE "User"
SET "clientRole" = 'MEMBER'
WHERE "role" = 'CLIENT' AND "clientRole" IS NULL;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'User_invitedById_fkey'
  ) THEN
    ALTER TABLE "User"
    ADD CONSTRAINT "User_invitedById_fkey"
    FOREIGN KEY ("invitedById") REFERENCES "User"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_clientId_clientRole_idx" ON "User"("clientId", "clientRole");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_role_staffRole_idx" ON "User"("role", "staffRole");
