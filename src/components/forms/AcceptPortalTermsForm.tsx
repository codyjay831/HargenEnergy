"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import {
  acceptPortalTerms,
  type AcceptPortalTermsState,
} from "@/app/actions/legal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const initialState: AcceptPortalTermsState = {};

export function AcceptPortalTermsForm() {
  const [state, formAction, isPending] = useActionState(
    acceptPortalTerms,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
        <input
          id="acceptLegal"
          name="acceptLegal"
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-slate-300"
          required
        />
        <Label htmlFor="acceptLegal" className="text-sm leading-6 font-normal">
          I agree to the{" "}
          <Link href="/terms" className="underline" target="_blank" rel="noreferrer">
            Terms of Service
          </Link>{" "}
          and acknowledge the{" "}
          <Link href="/privacy" className="underline" target="_blank" rel="noreferrer">
            Privacy Policy
          </Link>
          .
        </Label>
      </div>

      {state.error && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          <p>{state.error}</p>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Saving..." : "Accept and continue"}
      </Button>
    </form>
  );
}
