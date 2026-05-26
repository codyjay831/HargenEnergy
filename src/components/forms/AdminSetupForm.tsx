"use client";

import { useActionState } from "react";
import {
  createFirstAdminAction,
  type AdminSetupState,
} from "@/app/actions/admin-setup";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";

const initialState: AdminSetupState = {};

export function AdminSetupForm() {
  const [state, formAction, isPending] = useActionState(
    createFirstAdminAction,
    initialState,
  );

  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4" autoComplete="off">
      <div className="space-y-2">
        <Label htmlFor="setupToken">Setup token</Label>
        <PasswordInput
          id="setupToken"
          name="setupToken"
          autoComplete="off"
          required
        />
        <p className="text-xs text-muted-foreground">
          The one-time setup token configured for this environment.
        </p>
        {fieldErrors.setupToken?.[0] && (
          <p className="text-xs text-red-600">{fieldErrors.setupToken[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" type="text" autoComplete="name" required />
        {fieldErrors.name?.[0] && (
          <p className="text-xs text-red-600">{fieldErrors.name[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
        {fieldErrors.email?.[0] && (
          <p className="text-xs text-red-600">{fieldErrors.email[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
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
        <Label htmlFor="confirmPassword">Confirm password</Label>
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

      <Button className="w-full" type="submit" disabled={isPending}>
        {isPending ? "Creating admin..." : "Create admin account"}
      </Button>
    </form>
  );
}
