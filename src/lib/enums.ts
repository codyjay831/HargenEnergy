/**
 * Centralized enum re-exports and Zod schemas
 * 
 * Single source of truth for all enums and their validation.
 * Re-exports Prisma enums and provides corresponding Zod schemas.
 */

import { z } from "zod";
import {
  RequestStatus,
  BillableType,
  OverflowStatus,
  Urgency,
  ClientStatus,
  PlanType,
  SupportRequestKind,
  SupportRequestSource,
  OutreachCompanyStatus,
  Role,
  DisbursementStatus,
  DisbursementPaymentMethod,
  SystemAccessType,
  SystemAccessMethod,
  SystemAccessStatus,
  EngagementType,
  HandoffTier,
  PricingMode,
} from "@/generated/prisma/client";

// Re-export Prisma enums
export {
  RequestStatus,
  BillableType,
  OverflowStatus,
  Urgency,
  ClientStatus,
  PlanType,
  SupportRequestKind,
  SupportRequestSource,
  OutreachCompanyStatus,
  Role,
  DisbursementStatus,
  DisbursementPaymentMethod,
  SystemAccessType,
  SystemAccessMethod,
  SystemAccessStatus,
  EngagementType,
  HandoffTier,
  PricingMode,
};

// Zod schemas for validation
export const ZRequestStatus = z.nativeEnum(RequestStatus);
export const ZBillableType = z.nativeEnum(BillableType);
export const ZOverflowStatus = z.nativeEnum(OverflowStatus);
export const ZUrgency = z.nativeEnum(Urgency);
export const ZClientStatus = z.nativeEnum(ClientStatus);
export const ZPlanType = z.nativeEnum(PlanType);
export const ZSupportRequestKind = z.nativeEnum(SupportRequestKind);
export const ZSupportRequestSource = z.nativeEnum(SupportRequestSource);
export const ZOutreachCompanyStatus = z.nativeEnum(OutreachCompanyStatus);
export const ZRole = z.nativeEnum(Role);
export const ZDisbursementStatus = z.nativeEnum(DisbursementStatus);
export const ZDisbursementPaymentMethod = z.nativeEnum(DisbursementPaymentMethod);
export const ZSystemAccessType = z.nativeEnum(SystemAccessType);
export const ZSystemAccessMethod = z.nativeEnum(SystemAccessMethod);
export const ZSystemAccessStatus = z.nativeEnum(SystemAccessStatus);
export const ZEngagementType = z.nativeEnum(EngagementType);
export const ZHandoffTier = z.nativeEnum(HandoffTier);
export const ZPricingMode = z.nativeEnum(PricingMode);

// Helper functions for UI option generation
export function getRequestStatusOptions() {
  return Object.values(RequestStatus).map(value => ({
    value,
    label: value.replace(/_/g, " "),
  }));
}

export function getUrgencyOptions() {
  return Object.values(Urgency).map(value => ({
    value,
    label: value.replace(/_/g, " "),
  }));
}

export function getPlanTypeOptions() {
  return Object.values(PlanType).map(value => ({
    value,
    label: value.replace(/_/g, " "),
  }));
}

export function getBillableTypeOptions() {
  return Object.values(BillableType).map(value => ({
    value,
    label: value.replace(/_/g, " "),
  }));
}

export function getClientStatusOptions() {
  return Object.values(ClientStatus).map(value => ({
    value,
    label: value.replace(/_/g, " "),
  }));
}

export function getOutreachCompanyStatusOptions() {
  return Object.values(OutreachCompanyStatus).map(value => ({
    value,
    label: value.replace(/_/g, " "),
  }));
}
