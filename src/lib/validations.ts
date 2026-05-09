import { z } from "zod";

const trimmedString = z.string().trim();

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
    .optional(),
  website: trimmedString
    .max(500, "Website must be at most 500 characters.")
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
  plan: z.enum(["light", "core", "priority", "not-sure", "one-time"]),
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
