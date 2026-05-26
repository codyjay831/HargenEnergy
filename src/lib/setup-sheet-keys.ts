export type SetupSheetKey =
  | "activation"
  | "engagement"
  | "billing"
  | "system-access"
  | "portal-invite"
  | "walkthrough"
  | "client-details"
  | "work-requests"
  | "portal-account"
  | "support-areas"
  | "send-work";

export const ADMIN_RAIL_SHEET: Record<string, SetupSheetKey> = {
  client: "activation",
  scope: "engagement",
  billing: "billing",
  access: "system-access",
  invite: "portal-invite",
  "first-work": "work-requests",
};

export const CUSTOMER_RAIL_SHEET: Record<string, SetupSheetKey> = {
  portal: "portal-account",
  billing: "billing",
  access: "system-access",
  support: "support-areas",
  "send-work": "send-work",
};

export const ADMIN_STEP_SHEET: Partial<Record<string, SetupSheetKey>> = {
  "client-created": "client-details",
  "walkthrough-reviewed": "walkthrough",
  "lifecycle-active": "activation",
  "engagement-selected": "engagement",
  "approved-work": "engagement",
  capacity: "billing",
  billing: "billing",
  "system-access-admin": "system-access",
  "portal-invite": "portal-invite",
  "customer-system-access": "system-access",
  "first-work": "work-requests",
};

export const CUSTOMER_STEP_SHEET: Partial<Record<string, SetupSheetKey>> = {
  "portal-access-ready": "portal-account",
  "customer-billing": "billing",
  "customer-system-access": "system-access",
  "support-areas-visible": "support-areas",
  "send-work-ready": "send-work",
  "first-work-submitted": "send-work",
};

const NAVIGATE_ONLY_STEP_IDS = new Set(["portal-access"]);

const SHEET_TITLES: Record<SetupSheetKey, { admin: string; customer: string }> = {
  activation: { admin: "Activation", customer: "Activation" },
  engagement: { admin: "Engagement & approved work", customer: "Engagement" },
  billing: { admin: "Billing", customer: "Billing setup" },
  "system-access": { admin: "System access", customer: "System access" },
  "portal-invite": { admin: "Portal invite", customer: "Portal invite" },
  walkthrough: { admin: "Walkthrough / intake", customer: "Walkthrough" },
  "client-details": { admin: "Client details", customer: "Client details" },
  "work-requests": { admin: "Work requests", customer: "Work requests" },
  "portal-account": { admin: "Portal account", customer: "Portal access" },
  "support-areas": { admin: "Support areas", customer: "Approved support areas" },
  "send-work": { admin: "Send work", customer: "Send work" },
};

export function setupSheetTitle(
  key: SetupSheetKey,
  variant: "admin" | "customer",
): string {
  return SHEET_TITLES[key][variant];
}

export function enrichSetupSteps<T extends { id: string }>(
  steps: T[],
  sheetMap: Partial<Record<string, SetupSheetKey>>,
): Array<T & { interactionMode?: "sheet" | "navigate"; sheetKey?: SetupSheetKey }> {
  return steps.map((step) => {
    if (NAVIGATE_ONLY_STEP_IDS.has(step.id)) {
      return { ...step, interactionMode: "navigate" as const };
    }
    const sheetKey = sheetMap[step.id];
    if (!sheetKey) {
      return step;
    }
    return {
      ...step,
      interactionMode: "sheet" as const,
      sheetKey,
    };
  });
}
