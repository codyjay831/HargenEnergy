import { z } from "zod";

export const requestHelpSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  name: z.string().min(1, "Contact name is required"),
  role: z.string().optional(),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  website: z.string().optional().or(z.literal("")),
  serviceArea: z.string().optional(),
  supportNeeded: z.array(z.string()).min(1, "Please select at least one support option"),
  bottleneck: z.string().min(1, "Please describe your current bottleneck"),
  plan: z.enum(["light", "core", "priority", "not-sure", "one-time"]),
  urgency: z.enum(["normal", "this-week", "urgent", "ongoing"]),
  tools: z.string().optional(),
  takeOffPlate: z.string().optional(),
});

export type RequestHelpInput = z.infer<typeof requestHelpSchema>;

export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters long")
  .refine((value) => /[A-Za-z]/.test(value), {
    message: "Password must contain at least one letter",
  })
  .refine((value) => /\d/.test(value), {
    message: "Password must contain at least one number",
  });

