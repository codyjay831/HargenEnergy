import { HandoffTier, PricingMode } from "@/generated/prisma/client";

export type CatalogV2Task = {
  name: string;
  description?: string;
  maxMinutes?: number;
  suggestedHandoffTier?: HandoffTier;
  suggestedPricingMode?: PricingMode;
  showOnDiscovery?: boolean;
  discoveryOrder?: number;
};

export type CatalogV2Category = {
  name: string;
  description?: string;
  tasks: CatalogV2Task[];
};

export const CATALOG_V2: CatalogV2Category[] = [
  {
    name: "Permit & AHJ Coordination",
    description:
      "Support with permit-related project movement, AHJ follow-up, portal coordination, correction tracking, and submission organization.",
    tasks: [
      {
        name: "Permit Package Coordination",
        maxMinutes: 45,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
        showOnDiscovery: true,
        discoveryOrder: 1,
      },
      {
        name: "Permit Application Prep",
        maxMinutes: 45,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
      },
      {
        name: "AHJ Portal Support",
        maxMinutes: 30,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
        showOnDiscovery: true,
        discoveryOrder: 2,
      },
      {
        name: "Permit Status Follow-Up",
        maxMinutes: 30,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
        showOnDiscovery: true,
        discoveryOrder: 3,
      },
      {
        name: "Permit Correction Review",
        maxMinutes: 45,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
      },
      {
        name: "Permit Resubmittal Coordination",
        maxMinutes: 45,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
      },
      {
        name: "Permit Approval / Issue Tracking",
        maxMinutes: 20,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
      },
    ],
  },
  {
    name: "Utility & PTO Support",
    description:
      "Help with interconnection paperwork, utility follow-up, deficiency tracking, PTO status, and final utility closeout.",
    tasks: [
      {
        name: "Utility & PTO Coordination",
        maxMinutes: 45,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
        showOnDiscovery: true,
        discoveryOrder: 4,
      },
      {
        name: "Interconnection Application Prep",
        maxMinutes: 45,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
      },
      {
        name: "Utility Application Submission Support",
        maxMinutes: 45,
        suggestedHandoffTier: HandoffTier.CLEAN,
        suggestedPricingMode: PricingMode.FLAT,
        showOnDiscovery: true,
        discoveryOrder: 5,
      },
      {
        name: "Utility Status Follow-Up",
        maxMinutes: 30,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
        showOnDiscovery: true,
        discoveryOrder: 6,
      },
      {
        name: "Utility Deficiency Review",
        maxMinutes: 45,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
      },
      {
        name: "Utility Resubmittal Coordination",
        maxMinutes: 45,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
      },
      {
        name: "PTO Status Tracking",
        maxMinutes: 20,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
      },
      {
        name: "PTO Closeout Coordination",
        maxMinutes: 30,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
      },
    ],
  },
  {
    name: "Inspection & Closeout Support",
    description:
      "Support for inspection coordination, failed inspection follow-up, correction tracking, and final closeout documentation.",
    tasks: [
      {
        name: "Inspection & Closeout Coordination",
        maxMinutes: 45,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
        showOnDiscovery: true,
        discoveryOrder: 7,
      },
      {
        name: "Inspection Scheduling Support",
        maxMinutes: 20,
        suggestedHandoffTier: HandoffTier.CLEAN,
        suggestedPricingMode: PricingMode.FLAT,
        showOnDiscovery: true,
        discoveryOrder: 8,
      },
      {
        name: "Inspection Readiness Coordination",
        maxMinutes: 30,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
      },
      {
        name: "Failed Inspection Review",
        maxMinutes: 45,
        suggestedHandoffTier: HandoffTier.RECOVERY,
        suggestedPricingMode: PricingMode.REVIEW_THEN_HOURLY,
      },
      {
        name: "Correction Item Tracking",
        maxMinutes: 30,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
      },
      {
        name: "Reinspection Coordination",
        maxMinutes: 30,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
      },
      {
        name: "Closeout Packet Organization",
        maxMinutes: 45,
        suggestedHandoffTier: HandoffTier.CLEAN,
        suggestedPricingMode: PricingMode.FLAT,
      },
      {
        name: "Final Job Closeout Review",
        maxMinutes: 30,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
      },
    ],
  },
  {
    name: "Customer & Scheduling Coordination",
    description:
      "Help keeping customers informed, confirming appointments, collecting missing information, and coordinating access or availability.",
    tasks: [
      {
        name: "Customer Update Support",
        maxMinutes: 20,
        suggestedHandoffTier: HandoffTier.CLEAN,
        suggestedPricingMode: PricingMode.FLAT,
        showOnDiscovery: true,
        discoveryOrder: 9,
      },
      {
        name: "Missing Information Request",
        maxMinutes: 20,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
        showOnDiscovery: true,
        discoveryOrder: 10,
      },
      {
        name: "Appointment Confirmation",
        maxMinutes: 15,
        suggestedHandoffTier: HandoffTier.CLEAN,
        suggestedPricingMode: PricingMode.FLAT,
      },
      {
        name: "Access & Availability Coordination",
        maxMinutes: 20,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
        showOnDiscovery: true,
        discoveryOrder: 11,
      },
      {
        name: "Customer Document Follow-Up",
        maxMinutes: 20,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
        showOnDiscovery: true,
        discoveryOrder: 12,
      },
      {
        name: "Delay / Next-Step Communication",
        maxMinutes: 20,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
      },
    ],
  },
  {
    name: "Solar Project Admin & Pipeline Cleanup",
    description:
      "Help organizing active jobs, cleaning up project records, finding missing items, and identifying stalled work.",
    tasks: [
      {
        name: "Stuck Job Review",
        maxMinutes: 45,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
        showOnDiscovery: true,
        discoveryOrder: 13,
      },
      {
        name: "Active Job Status Cleanup",
        maxMinutes: 45,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
        showOnDiscovery: true,
        discoveryOrder: 14,
      },
      {
        name: "Missing Item List",
        maxMinutes: 30,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
        showOnDiscovery: true,
        discoveryOrder: 15,
      },
      {
        name: "Project File Organization",
        maxMinutes: 30,
        suggestedHandoffTier: HandoffTier.CLEAN,
        suggestedPricingMode: PricingMode.FLAT,
        showOnDiscovery: true,
        discoveryOrder: 16,
      },
      {
        name: "Weekly Solar Pipeline Review",
        maxMinutes: 60,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
        showOnDiscovery: true,
        discoveryOrder: 17,
      },
      {
        name: "Lead / Customer Record Entry",
        maxMinutes: 20,
        suggestedHandoffTier: HandoffTier.CLEAN,
        suggestedPricingMode: PricingMode.FLAT,
      },
      {
        name: "CRM Cleanup Support",
        maxMinutes: 45,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
      },
      {
        name: "Open Follow-Up List",
        maxMinutes: 30,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
      },
    ],
  },
  {
    name: "Battery Storage Support",
    description:
      "Support for solar-plus-storage project documentation, battery-related permitting items, registration, closeout, and follow-up coordination.",
    tasks: [
      {
        name: "Battery Project Coordination",
        maxMinutes: 45,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
        showOnDiscovery: true,
        discoveryOrder: 18,
      },
      {
        name: "Battery Permit / ESS Documentation Support",
        maxMinutes: 45,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
      },
      {
        name: "Battery Interconnection / Utility Follow-Up",
        maxMinutes: 45,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
      },
      {
        name: "Battery Warranty Registration",
        maxMinutes: 15,
        suggestedHandoffTier: HandoffTier.CLEAN,
        suggestedPricingMode: PricingMode.FLAT,
      },
      {
        name: "Battery Serial Number / Equipment Record Update",
        maxMinutes: 15,
        suggestedHandoffTier: HandoffTier.CLEAN,
        suggestedPricingMode: PricingMode.FLAT,
      },
      {
        name: "Battery Closeout Documentation",
        maxMinutes: 30,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
      },
      {
        name: "Monitoring / App Setup Coordination",
        maxMinutes: 30,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
      },
    ],
  },
];
