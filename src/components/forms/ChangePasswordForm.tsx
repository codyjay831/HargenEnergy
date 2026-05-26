"use client";

import { useActionState } from "react";
import {
  changeOwnPasswordAction,
  type ChangePasswordState,
} from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";

const initialState: ChangePasswordState = {};

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(
    changeOwnPasswordAction,
    initialState,
  );

  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4" autoComplete="off">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current password</Label>
        <PasswordInput
          id="currentPassword"
          name="currentPassword"
          autoComplete="current-password"
          required
        />
        {fieldErrors.currentPassword?.[0] && (
          <p className="text-xs text-red-600">
            {fieldErrors.currentPassword[0]}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={12}
        />
        <p className="text-xs text-muted-foreground">
          At least 12 characters with one letter and one number.
        </p>
        {fieldErrors.password?.[0] && (
          <p className="text-xs text-red-600">{fieldErrors.password[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          required
          minLength={12}
        />
        {fieldErrors.confirmPassword?.[0] && (
          <p className="text-xs text-red-600">
            {fieldErrors.confirmPassword[0]}
          </p>
        )}
      </div>

      {state.error && (
        <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
          <AlertCircle className="h-4 w-4" />
          <p>{state.error}</p>
        </div>
      )}

      {state.success && (
        <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md p-3">
          {state.success}
        </div>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Updating..." : "Update password"}
      </Button>
    </form>
  );
}
