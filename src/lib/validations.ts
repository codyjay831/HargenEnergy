import { z } from "zod";

import {
  isHandoffTierValue,
  isPricingModeValue,
  isUrgencyValue,
  isEngagementTypeValue,
} from "@/lib/ui-enums";
import {
  ALLOWED_ATTACHMENT_TYPES,
  MAX_FILE_SIZE_ATTACHMENT,
  MAX_PORTAL_ATTACHMENTS,
} from "@/lib/storage/limits";
import { isAllowedPortalAttachmentRef } from "@/lib/storage/blob-ref";

const trimmedString = z.string().trim();

const phoneCharsRegex = /^[\d\s+().-]{7,40}$/;

export const requestHelpSchema = z.object({
  companyName: trimmedString
    .min(1, "Company name is required")
    .max(200, "Company name must be at most 200 characters."),
  name: trimmedString
    .min(1, "Contact name is required")
    .max(120, "Contact name must be at most 120 characters."),
  role: trimmedString
    .max(120, "Role must be at most 120 characters.")
    .optional(),
  email: trimmedString
    .email("Invalid email address")
    .max(254, "Email must be at most 254 characters."),
  phone: trimmedString
    .max(40, "Phone must be at most 40 characters.")
    .refine((v) => !v || phoneCharsRegex.test(v), {
      message:
        "Phone may only include digits, spaces, +, -, parentheses, and periods (at least 7 characters if provided).",
    })
    .optional(),
  website: trimmedString
    .max(500, "Website must be at most 500 characters.")
    .refine(
      (v) => {
        if (!v) return true;
        try {
          const u = new URL(v);
          return u.protocol === "http:" || u.protocol === "https:";
        } catch {
          return false;
        }
      },
      { message: "Website must be a valid http(s) URL." },
    )
    .optional(),
  serviceArea: trimmedString
    .max(500, "Service area must be at most 500 characters.")
    .optional(),
  supportNeeded: z
    .array(z.string().max(120, "Each support option is too long."))
    .min(1, "Please select at least one support option")
    .max(24, "Too many support options selected."),
  bottleneck: trimmedString
    .min(1, "Please describe your current bottleneck")
    .max(8000, "Description must be at most 8000 characters."),
  plan: z.enum(["light", "core", "priority", "not-sure", "request-based"]),
  urgency: z.enum(["normal", "this-week", "urgent", "ongoing"]),
  tools: trimmedString
    .max(4000, "Tools field must be at most 4000 characters.")
    .optional(),
  takeOffPlate: trimmedString
    .max(4000, "This field must be at most 4000 characters.")
    .optional(),
  /** Honeypot: real users leave empty; bots often fill every field. */
  websiteUrlHoneypot: z.string().max(512).optional(),
});

export type RequestHelpInput = z.infer<typeof requestHelpSchema>;

export const requestHelpStep1Schema = requestHelpSchema.pick({
  companyName: true,
  name: true,
  email: true,
  phone: true,
  bottleneck: true,
  supportNeeded: true,
});

export function validateRequestHelpStep1(data: {
  companyName: string;
  name: string;
  email: string;
  phone?: string;
  bottleneck: string;
  supportNeeded: string[];
}) {
  return requestHelpStep1Schema.safeParse(data);
}

const portalMetadataString = trimmedString.max(500).optional();

export function createPortalAttachmentSchema(clientId: string) {
  return z.object({
    url: trimmedString
      .min(1)
      .max(2048)
      .refine((url) => isAllowedPortalAttachmentRef(url, clientId), {
        message: "Attachment must be a valid Vercel Blob URL for this client.",
      }),
    name: trimmedString.min(1).max(255),
    type: trimmedString.refine(
      (value) => (ALLOWED_ATTACHMENT_TYPES as readonly string[]).includes(value),
      { message: "Invalid attachment file type." },
    ),
    size: z.number().int().nonnegative().max(MAX_FILE_SIZE_ATTACHMENT).optional(),
  });
}

export function createPortalSubmitRequestSchema(clientId: string) {
  return z
    .object({
      title: trimmedString
        .min(1, "Title is required.")
        .max(200, "Title must be at most 200 characters."),
      workTaskId: trimmedString.min(1, "Work type is required."),
      supportNeeded: trimmedString
        .min(1, "Support needed is required.")
        .max(500, "Support needed must be at most 500 characters."),
      description: trimmedString
        .min(1, "Description is required.")
        .max(8000, "Description must be at most 8000 characters."),
      urgency: trimmedString.min(1).max(32),
      customerName: portalMetadataString,
      utilityAhj: portalMetadataString,
      toolsContext: portalMetadataString,
      desiredOutcome: portalMetadataString,
      projectUrl: trimmedString.max(1000).optional(),
      metadata: z.record(z.string(), z.any()).optional(),
      attachments: z
        .array(createPortalAttachmentSchema(clientId))
        .max(MAX_PORTAL_ATTACHMENTS)
        .optional(),
    })
    .refine((data) => isUrgencyValue(data.urgency), {
      message: "Invalid urgency.",
      path: ["urgency"],
    });
}

export type PortalSubmitRequestInput = z.infer<
  ReturnType<typeof createPortalSubmitRequestSchema>
>;

export const portalAddCommentSchema = z.object({
  requestId: trimmedString.min(1).max(128),
  body: trimmedString
    .min(1, "Message is required.")
    .max(10_000, "Message must be at most 10000 characters."),
});

export type PortalAddCommentInput = z.infer<typeof portalAddCommentSchema>;

export const updateClientEngagementSchema = z.object({
  clientId: z.string().min(1).max(128),
  engagementType: z.string().refine(isEngagementTypeValue, {
    message: "Invalid engagement type.",
  }),
  approvedWorkTaskIds: z.array(z.string().min(1).max(128)).max(50),
});

export const updateRequestHandoffPricingSchema = z
  .object({
    requestId: z.string().min(1).max(128),
    handoffTier: z.string().refine(isHandoffTierValue, {
      message: "Invalid handoff tier.",
    }),
    pricingMode: z.string().refine(isPricingModeValue, {
      message: "Invalid pricing mode.",
    }),
    flatPriceCents: z.number().int().positive().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.pricingMode === "FLAT") {
      if (!data.flatPriceCents || data.flatPriceCents <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Flat fee requires a price greater than zero.",
          path: ["flatPriceCents"],
        });
      }
    }
  });

export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters long")
  .max(72, "Password must be at most 72 characters (bcrypt limit).")
  .refine((value) => /[A-Za-z]/.test(value), {
    message: "Password must contain at least one letter",
  })
  .refine((value) => /\d/.test(value), {
    message: "Password must contain at least one number",
  });

export const outreachCompanySchema = z.object({
  name: trimmedString
    .min(1, "Company name is required")
    .max(200, "Company name must be at most 200 characters."),
  website: trimmedString
    .max(500, "Website must be at most 500 characters.")
    .optional()
    .nullable(),
  city: trimmedString.max(100).optional().nullable(),
  county: trimmedString.max(100).optional().nullable(),
  state: trimmedString.max(100).optional().nullable(),
  serviceArea: trimmedString.max(500).optional().nullable(),
  businessType: z.string().optional().nullable(),
  companySizeEstimate: trimmedString.max(100).optional().nullable(),
  leadSource: trimmedString.max(100).optional().nullable(),
  sourceQuery: trimmedString.max(500).optional().nullable(),
  sourceUrl: trimmedString.max(1000).optional().nullable(),
  status: z.string().optional(),
  interestLevel: z.number().min(0).max(5).optional(),
  fitScore: z.number().min(0).max(5).optional(),
  notes: trimmedString.max(10000).optional().nullable(),
  painTags: z.array(z.string()).optional(),
  doNotContact: z.boolean().optional(),
  enrichmentData: z.record(z.string(), z.unknown()).optional().nullable(),
});

export type OutreachCompanyInput = z.infer<typeof outreachCompanySchema>;
