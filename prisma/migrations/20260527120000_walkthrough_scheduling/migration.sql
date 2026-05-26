-- Walkthrough scheduling: Google Calendar OAuth + appointments + reminders

-- CreateEnum
CREATE TYPE "GoogleCalendarConnectionStatus" AS ENUM ('CONNECTED', 'TOKEN_EXPIRED', 'REVOKED', 'ERROR');
CREATE TYPE "WalkthroughSchedulingLinkStatus" AS ENUM ('ACTIVE', 'USED', 'EXPIRED', 'REVOKED');
CREATE TYPE "WalkthroughAppointmentStatus" AS ENUM ('SCHEDULED', 'RESCHEDULED', 'COMPLETED', 'NO_SHOW', 'CANCELED');
CREATE TYPE "GoogleCalendarSyncStatus" AS ENUM ('PENDING', 'SYNCED', 'FAILED', 'SKIPPED');
CREATE TYPE "WalkthroughReminderType" AS ENUM ('CONFIRMATION', 'TWENTY_FOUR_HOUR', 'ONE_HOUR', 'RESCHEDULE', 'CANCEL');
CREATE TYPE "WalkthroughReminderChannel" AS ENUM ('EMAIL', 'SMS');
CREATE TYPE "WalkthroughReminderStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');
CREATE TYPE "WalkthroughFitDecision" AS ENUM ('GOOD_FIT', 'MAYBE_FIT', 'NOT_A_FIT');

-- CreateTable
CREATE TABLE "GoogleCalendarConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "googleAccountEmail" TEXT NOT NULL,
    "calendarId" TEXT,
    "calendarName" TEXT,
    "encryptedAccessToken" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT NOT NULL,
    "accessTokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "scopes" TEXT NOT NULL,
    "status" "GoogleCalendarConnectionStatus" NOT NULL DEFAULT 'CONNECTED',
    "meetCreationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "meetLastSuccessAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleCalendarConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WalkthroughAvailabilitySettings" (
    "id" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Los_Angeles',
    "slotDurationMinutes" INTEGER NOT NULL DEFAULT 45,
    "bufferBeforeMinutes" INTEGER NOT NULL DEFAULT 10,
    "bufferAfterMinutes" INTEGER NOT NULL DEFAULT 10,
    "minimumNoticeHours" INTEGER NOT NULL DEFAULT 24,
    "bookingWindowDays" INTEGER NOT NULL DEFAULT 14,
    "weekdayWindows" JSONB NOT NULL,
    "blackoutDates" JSONB NOT NULL DEFAULT '[]',
    "defaultMeetingUrl" TEXT,
    "defaultMeetingType" TEXT NOT NULL DEFAULT 'Google Meet',
    "smsRemindersEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByUserId" TEXT,

    CONSTRAINT "WalkthroughAvailabilitySettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WalkthroughSchedulingLink" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "encryptedToken" TEXT,
    "clientId" TEXT NOT NULL,
    "supportRequestId" TEXT NOT NULL,
    "status" "WalkthroughSchedulingLinkStatus" NOT NULL DEFAULT 'ACTIVE',
    "sentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalkthroughSchedulingLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WalkthroughAppointment" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "supportRequestId" TEXT NOT NULL,
    "schedulingLinkId" TEXT,
    "scheduledStartUtc" TIMESTAMP(3) NOT NULL,
    "scheduledEndUtc" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "meetingType" TEXT,
    "meetingUrl" TEXT,
    "customerContactName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "status" "WalkthroughAppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "googleEventId" TEXT,
    "googleEventLink" TEXT,
    "googleSyncStatus" "GoogleCalendarSyncStatus" NOT NULL DEFAULT 'PENDING',
    "googleSyncError" TEXT,
    "canceledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "noShowAt" TIMESTAMP(3),
    "discoveryNotes" TEXT,
    "fitDecision" "WalkthroughFitDecision",
    "fitDecisionReason" TEXT,
    "recapContent" TEXT,
    "recapSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalkthroughAppointment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WalkthroughReminder" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "type" "WalkthroughReminderType" NOT NULL,
    "channel" "WalkthroughReminderChannel" NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" "WalkthroughReminderStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalkthroughReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleCalendarConnection_userId_key" ON "GoogleCalendarConnection"("userId");
CREATE UNIQUE INDEX "WalkthroughSchedulingLink_tokenHash_key" ON "WalkthroughSchedulingLink"("tokenHash");
CREATE UNIQUE INDEX "WalkthroughSchedulingLink_supportRequestId_key" ON "WalkthroughSchedulingLink"("supportRequestId");
CREATE INDEX "WalkthroughSchedulingLink_clientId_idx" ON "WalkthroughSchedulingLink"("clientId");
CREATE INDEX "WalkthroughSchedulingLink_status_idx" ON "WalkthroughSchedulingLink"("status");
CREATE UNIQUE INDEX "WalkthroughAppointment_schedulingLinkId_key" ON "WalkthroughAppointment"("schedulingLinkId");
CREATE INDEX "WalkthroughAppointment_clientId_idx" ON "WalkthroughAppointment"("clientId");
CREATE INDEX "WalkthroughAppointment_supportRequestId_idx" ON "WalkthroughAppointment"("supportRequestId");
CREATE INDEX "WalkthroughAppointment_status_scheduledStartUtc_idx" ON "WalkthroughAppointment"("status", "scheduledStartUtc");
CREATE INDEX "WalkthroughAppointment_scheduledStartUtc_scheduledEndUtc_idx" ON "WalkthroughAppointment"("scheduledStartUtc", "scheduledEndUtc");
CREATE UNIQUE INDEX "WalkthroughReminder_appointmentId_type_channel_key" ON "WalkthroughReminder"("appointmentId", "type", "channel");
CREATE INDEX "WalkthroughReminder_status_scheduledFor_idx" ON "WalkthroughReminder"("status", "scheduledFor");

-- AddForeignKey
ALTER TABLE "GoogleCalendarConnection" ADD CONSTRAINT "GoogleCalendarConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WalkthroughSchedulingLink" ADD CONSTRAINT "WalkthroughSchedulingLink_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WalkthroughSchedulingLink" ADD CONSTRAINT "WalkthroughSchedulingLink_supportRequestId_fkey" FOREIGN KEY ("supportRequestId") REFERENCES "SupportRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WalkthroughSchedulingLink" ADD CONSTRAINT "WalkthroughSchedulingLink_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WalkthroughAppointment" ADD CONSTRAINT "WalkthroughAppointment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WalkthroughAppointment" ADD CONSTRAINT "WalkthroughAppointment_supportRequestId_fkey" FOREIGN KEY ("supportRequestId") REFERENCES "SupportRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WalkthroughAppointment" ADD CONSTRAINT "WalkthroughAppointment_schedulingLinkId_fkey" FOREIGN KEY ("schedulingLinkId") REFERENCES "WalkthroughSchedulingLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WalkthroughReminder" ADD CONSTRAINT "WalkthroughReminder_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "WalkthroughAppointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default availability settings
INSERT INTO "WalkthroughAvailabilitySettings" (
    "id",
    "timezone",
    "slotDurationMinutes",
    "bufferBeforeMinutes",
    "bufferAfterMinutes",
    "minimumNoticeHours",
    "bookingWindowDays",
    "weekdayWindows",
    "blackoutDates",
    "defaultMeetingType",
    "smsRemindersEnabled",
    "updatedAt"
) VALUES (
    'default',
    'America/Los_Angeles',
    45,
    10,
    10,
    24,
    14,
    '{"mon":[{"start":"09:00","end":"17:00"}],"tue":[{"start":"09:00","end":"17:00"}],"wed":[{"start":"09:00","end":"17:00"}],"thu":[{"start":"09:00","end":"17:00"}],"fri":[{"start":"09:00","end":"17:00"}],"sat":[],"sun":[]}'::jsonb,
    '[]'::jsonb,
    'Google Meet',
    false,
    CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO NOTHING;
