import { describe, expect, it } from "vitest";
import type { ClientSetupStep } from "@/lib/client-setup-readiness";
import {
  CUSTOMER_NEXT_STEP_ORDER,
  CUSTOMER_SETUP_RAIL,
  findNextRequiredStep,
} from "./setup-guide-utils";

const OPERATIONAL_STEP_IDS = [
  "customer-system-access",
  "send-work-ready",
  "first-work-submitted",
];

describe("customer setup guide rail", () => {
  it("has exactly four setup nodes without operational steps", () => {
    expect(CUSTOMER_SETUP_RAIL).toHaveLength(4);
    expect(CUSTOMER_SETUP_RAIL.map((node) => node.id)).toEqual([
      "portal",
      "agreement",
      "billing",
      "support",
    ]);
    expect(CUSTOMER_SETUP_RAIL.some((node) => node.id === "access")).toBe(false);
    expect(CUSTOMER_SETUP_RAIL.some((node) => node.id === "send-work")).toBe(false);
  });

  it("keeps next-step order aligned with rail step ids", () => {
    const railStepIds = new Set(CUSTOMER_SETUP_RAIL.flatMap((node) => node.stepIds));
    for (const stepId of CUSTOMER_NEXT_STEP_ORDER) {
      expect(railStepIds.has(stepId)).toBe(true);
    }
    for (const stepId of OPERATIONAL_STEP_IDS) {
      expect(CUSTOMER_NEXT_STEP_ORDER.includes(stepId)).toBe(false);
    }
  });
});

describe("findNextRequiredStep", () => {
  const baseSteps: ClientSetupStep[] = [
    {
      id: "portal-access-ready",
      title: "Portal access",
      owner: "customer",
      status: "complete",
      blockers: ["informational"],
      required: true,
    },
    {
      id: "customer-agreement",
      title: "Service agreement",
      owner: "customer",
      status: "complete",
      blockers: ["blocks_submit"],
      required: true,
    },
    {
      id: "customer-billing",
      title: "Billing setup",
      owner: "admin",
      status: "not_required",
      blockers: ["informational"],
      required: false,
    },
    {
      id: "support-areas-visible",
      title: "Approved support areas",
      owner: "customer",
      status: "complete",
      blockers: ["informational"],
      required: true,
    },
  ];

  it("returns null when all required steps are complete or not required", () => {
    expect(findNextRequiredStep(baseSteps, CUSTOMER_NEXT_STEP_ORDER)).toBeNull();
  });

  it("skips not_required billing and returns the next incomplete required step", () => {
    const steps = baseSteps.map((step) =>
      step.id === "support-areas-visible"
        ? { ...step, status: "blocked" as const, owner: "admin" as const }
        : step,
    );

    const next = findNextRequiredStep(steps, CUSTOMER_NEXT_STEP_ORDER);
    expect(next?.id).toBe("support-areas-visible");
  });
});
