import { describe, expect, it } from "vitest";
import type { ClientSetupStep } from "@/lib/client-setup-readiness";
import {
  CUSTOMER_NEXT_STEP_ORDER,
  CUSTOMER_SETUP_RAIL,
  findNextRequiredStep,
  isCustomerSetupComplete,
  resolveCustomerSetupGuideView,
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

describe("isCustomerSetupComplete", () => {
  const completeSteps: ClientSetupStep[] = [
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
      id: "support-areas-visible",
      title: "Approved support areas",
      owner: "customer",
      status: "complete",
      blockers: ["informational"],
      required: true,
    },
  ];

  it("returns true when no required steps remain incomplete", () => {
    expect(isCustomerSetupComplete(completeSteps)).toBe(true);
  });

  it("returns false when a required step is incomplete", () => {
    const steps = completeSteps.map((step) =>
      step.id === "customer-agreement" ? { ...step, status: "blocked" as const } : step,
    );
    expect(isCustomerSetupComplete(steps)).toBe(false);
  });
});

describe("resolveCustomerSetupGuideView", () => {
  const completeSteps: ClientSetupStep[] = [
    {
      id: "portal-access-ready",
      title: "Portal access",
      owner: "customer",
      status: "complete",
      blockers: ["informational"],
      required: true,
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

  const incompleteSteps: ClientSetupStep[] = [
    ...completeSteps,
    {
      id: "customer-agreement",
      title: "Service agreement",
      owner: "admin",
      status: "blocked",
      blockers: ["blocks_submit"],
      required: true,
    },
  ];

  it("returns full when setup is incomplete", () => {
    expect(
      resolveCustomerSetupGuideView({
        customerSteps: incompleteSteps,
        surface: "dashboard",
      }),
    ).toEqual({ mode: "full" });
    expect(
      resolveCustomerSetupGuideView({
        customerSteps: incompleteSteps,
        surface: "account",
      }),
    ).toEqual({ mode: "full" });
  });

  it("returns hidden on dashboard when setup is complete", () => {
    expect(
      resolveCustomerSetupGuideView({
        customerSteps: completeSteps,
        surface: "dashboard",
      }),
    ).toEqual({ mode: "hidden" });
  });

  it("returns minimized on account when setup is complete", () => {
    expect(
      resolveCustomerSetupGuideView({
        customerSteps: completeSteps,
        surface: "account",
      }),
    ).toEqual({ mode: "minimized" });
  });
});
