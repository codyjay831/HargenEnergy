"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireClientUser } from "@/lib/auth-guards";
import { recordTermsAcceptance } from "@/lib/legal-acceptance";

const acceptPortalTermsSchema = z.object({
  acceptLegal: z.literal("on"),
});

export type AcceptPortalTermsState = {
  error?: string;
};

export async function acceptPortalTerms(
  _prevState: AcceptPortalTermsState | undefined,
  formData: FormData,
): Promise<AcceptPortalTermsState> {
  const session = await requireClientUser();
  const parsed = acceptPortalTermsSchema.safeParse({
    acceptLegal: formData.get("acceptLegal"),
  });

  if (!parsed.success) {
    return {
      error: "Please confirm Terms of Service and Privacy Policy to continue.",
    };
  }

  await recordTermsAcceptance({
    userId: session.user.id,
    clientId: session.user.clientId,
  });

  redirect("/portal");
}
