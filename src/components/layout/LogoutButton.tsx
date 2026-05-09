"use client";

import { handleSignOut } from "@/app/actions/auth";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  return (
    <button
      onClick={() => handleSignOut()}
      className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-red-600 hover:bg-red-50 transition-colors"
    >
      <LogOut className="h-4 w-4" />
      Logout
    </button>
  );
}
