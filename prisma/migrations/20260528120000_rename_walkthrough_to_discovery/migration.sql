-- Rename walkthrough scheduling domain to discovery (preserves data; no User table changes)

-- Enums
ALTER TYPE "WalkthroughSchedulingLinkStatus" RENAME TO "DiscoverySchedulingLinkStatus";
ALTER TYPE "WalkthroughAppointmentStatus" RENAME TO "DiscoveryAppointmentStatus";
ALTER TYPE "WalkthroughReminderType" RENAME TO "DiscoveryReminderType";
ALTER TYPE "WalkthroughReminderChannel" RENAME TO "DiscoveryReminderChannel";
ALTER TYPE "WalkthroughReminderStatus" RENAME TO "DiscoveryReminderStatus";
ALTER TYPE "WalkthroughFitDecision" RENAME TO "DiscoveryFitDecision";

-- Tables
ALTER TABLE "WalkthroughAvailabilitySettings" RENAME TO "DiscoveryAvailabilitySettings";
ALTER TABLE "WalkthroughSchedulingLink" RENAME TO "DiscoverySchedulingLink";
ALTER TABLE "WalkthroughAppointment" RENAME TO "DiscoveryAppointment";
ALTER TABLE "WalkthroughReminder" RENAME TO "DiscoveryReminder";

-- WorkTask intake catalog columns
ALTER TABLE "WorkTask" RENAME COLUMN "showOnWalkthrough" TO "showOnDiscovery";
ALTER TABLE "WorkTask" RENAME COLUMN "walkthroughOrder" TO "discoveryOrder";
