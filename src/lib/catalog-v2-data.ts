import { HandoffTier, PricingMode } from "@/generated/prisma/client";

export type CatalogV2Task = {
  name: string;
  description?: string;
  maxMinutes?: number;
  suggestedHandoffTier?: HandoffTier;
  suggestedPricingMode?: PricingMode;
  showOnWalkthrough?: boolean;
  walkthroughOrder?: number;
};

export type CatalogV2Category = {
  name: string;
  description?: string;
  tasks: CatalogV2Task[];
};

export const CATALOG_V2: CatalogV2Category[] = [
  {
    name: "Permits",
    description: "Permit readiness, submission, follow-up, and corrections",
    tasks: [
      {
        name: "Permit Readiness Check",
        maxMinutes: 30,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
        showOnWalkthrough: true,
        walkthroughOrder: 11,
      },
      {
        name: "Permit Submission",
        maxMinutes: 45,
        suggestedHandoffTier: HandoffTier.CLEAN,
        suggestedPricingMode: PricingMode.FLAT,
      },
      {
        name: "Permit Follow-Up",
        maxMinutes: 30,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
        showOnWalkthrough: true,
        walkthroughOrder: 1,
      },
      {
        name: "Permit Corrections / Resubmittal",
        maxMinutes: 45,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
      },
      {
        name: "AHJ / Portal Setup Help",
        maxMinutes: 30,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
        showOnWalkthrough: true,
        walkthroughOrder: 12,
      },
    ],
  },
  {
    name: "Utility & PTO",
    description: "Utility applications, deficiencies, and PTO closeout",
    tasks: [
      {
        name: "Utility Application Submission",
        maxMinutes: 45,
        suggestedHandoffTier: HandoffTier.CLEAN,
        suggestedPricingMode: PricingMode.FLAT,
        showOnWalkthrough: true,
        walkthroughOrder: 2,
      },
      {
        name: "Utility Follow-Up",
        maxMinutes: 30,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
        showOnWalkthrough: true,
        walkthroughOrder: 3,
      },
      {
        name: "Utility Deficiency / Resubmittal",
        maxMinutes: 45,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
      },
      {
        name: "PTO Tracking",
        maxMinutes: 20,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
      },
      {
        name: "PTO Closeout Help",
        maxMinutes: 30,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
      },
    ],
  },
  {
    name: "CRM & Operations",
    description: "Job hygiene, filing, pipeline review, and lead entry",
    tasks: [
      {
        name: "Job Status Cleanup",
        maxMinutes: 45,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
        showOnWalkthrough: true,
        walkthroughOrder: 4,
      },
      {
        name: "Document Filing",
        maxMinutes: 30,
        suggestedHandoffTier: HandoffTier.CLEAN,
        suggestedPricingMode: PricingMode.FLAT,
        showOnWalkthrough: true,
        walkthroughOrder: 5,
      },
      {
        name: "Missing Info List",
        maxMinutes: 30,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
        showOnWalkthrough: true,
        walkthroughOrder: 6,
      },
      {
        name: "Weekly Pipeline Review",
        maxMinutes: 60,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
        showOnWalkthrough: true,
        walkthroughOrder: 7,
      },
      {
        name: "Customer / Lead Entry",
        maxMinutes: 20,
        suggestedHandoffTier: HandoffTier.CLEAN,
        suggestedPricingMode: PricingMode.FLAT,
        showOnWalkthrough: true,
        walkthroughOrder: 8,
      },
    ],
  },
  {
    name: "Customer Communication",
    description: "Customer updates and coordination",
    tasks: [
      {
        name: "Customer Status Update",
        maxMinutes: 20,
        suggestedHandoffTier: HandoffTier.CLEAN,
        suggestedPricingMode: PricingMode.FLAT,
        showOnWalkthrough: true,
        walkthroughOrder: 9,
      },
      {
        name: "Missing Info Request",
        maxMinutes: 20,
        suggestedHandoffTier: HandoffTier.MESSY,
        suggestedPricingMode: PricingMode.HOURLY,
        showOnWalkthrough: true,
        walkthroughOrder: 10,
      },
      {
        name: "Appointment Confirmation",
        maxMinutes: 15,
        suggestedHandoffTier: HandoffTier.CLEAN,
        suggestedPricingMode: PricingMode.FLAT,
      },
    ],
  },
  {
    name: "Inspections & Closeout",
    description: "Inspection scheduling, failures, and closeout packets",
    tasks: [
      {
        name: "Inspection Scheduling",
        maxMinutes: 20,
        suggestedHandoffTier: HandoffTier.CLEAN,
        suggestedPricingMode: PricingMode.FLAT,
        showOnWalkthrough: true,
        walkthroughOrder: 13,
      },
      {
        name: "Failed Inspection Review",
        maxMinutes: 45,
        suggestedHandoffTier: HandoffTier.RECOVERY,
        suggestedPricingMode: PricingMode.REVIEW_THEN_HOURLY,
      },
      {
        name: "Closeout Packet",
        maxMinutes: 45,
        suggestedHandoffTier: HandoffTier.CLEAN,
        suggestedPricingMode: PricingMode.FLAT,
      },
    ],
  },
];
