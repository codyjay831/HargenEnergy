import { AgreementStatus, EngagementType } from "@/generated/prisma/client";
import type { ServiceModelTypeValue } from "@/lib/client-service-model";
import { toServiceModelType } from "@/lib/client-service-model";
import { hasUsableAgreementUrl } from "@/lib/client-agreement";

export type ActivationBlockCode =
  | "agreement_not_complete"
  | "signed_agreement_url_missing"
  | "waiver_reason_missing"
  | "service_model_missing"
  | "support_block_scope_missing";

export type ActivationBlocker = {
  code: ActivationBlockCode;
  message: string;
};

export type ClientActivationReadiness = {
  canActivate: boolean;
  blockers: ActivationBlocker[];
};

export type ClientActivationReadinessInput = {
  agreementStatus: AgreementStatus;
  agreementUrl?: string | null;
  agreementOverrideReason?: string | null;
  engagementType?: EngagementType | null;
  activeServiceModels?: ServiceModelTypeValue[];
  approvedWorkTaskCount: number;
};

function resolveActiveServiceModels(
  input: Pick<ClientActivationReadinessInput, "engagementType" | "activeServiceModels">,
): ServiceModelTypeValue[] {
  if (input.activeServiceModels && input.activeServiceModels.length > 0) {
    return Array.from(new Set(input.activeServiceModels));
  }
  if (!input.engagementType) {
    return [];
  }
  return [toServiceModelType(input.engagementType)];
}

export function getClientActivationReadiness(
  input: ClientActivationReadinessInput,
): ClientActivationReadiness {
  const blockers: ActivationBlocker[] = [];

  if (input.agreementStatus === AgreementStatus.SIGNED) {
    if (!hasUsableAgreementUrl(input.agreementUrl)) {
      blockers.push({
        code: "signed_agreement_url_missing",
        message:
          "A valid signed agreement link is required before activation. Paste the signed agreement URL in Agreement.",
      });
    }
  } else if (input.agreementStatus === AgreementStatus.WAIVED) {
    if (!input.agreementOverrideReason?.trim()) {
      blockers.push({
        code: "waiver_reason_missing",
        message:
          "Agreement is marked waived, but a waiver reason is missing. Add a waiver reason before activation.",
      });
    }
  } else {
    blockers.push({
      code: "agreement_not_complete",
      message:
        "Service agreement must be signed (with link) or explicitly waived before activation.",
    });
  }

  const activeServiceModels = resolveActiveServiceModels(input);
  if (activeServiceModels.length === 0) {
    blockers.push({
      code: "service_model_missing",
      message: "Service model must be selected before activation.",
    });
    return { canActivate: false, blockers };
  }

  if (
    activeServiceModels.includes("SUPPORT_BLOCK") &&
    input.approvedWorkTaskCount < 1
  ) {
    blockers.push({
      code: "support_block_scope_missing",
      message:
        "Support Block clients need at least one approved work type before activation.",
    });
  }

  return {
    canActivate: blockers.length === 0,
    blockers,
  };
}
