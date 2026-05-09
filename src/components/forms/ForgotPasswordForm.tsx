"use client";

import { useActionState } from "react";
import {
  requestPasswordResetAction,
  type ForgotPasswordState,
} from "@/app/actions/password-reset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ForgotPasswordState = {};

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    requestPasswordResetAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>

      {state.message && (
        <div
          className={
            state.kind === "error"
              ? "text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3"
              : "text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md p-3"
          }
        >
          {state.message}
        </div>
      )}

      <Button className="w-full" type="submit" disabled={isPending}>
        {isPending ? "Sending..." : "Send reset link"}
      </Button>
    </form>
  );
}
