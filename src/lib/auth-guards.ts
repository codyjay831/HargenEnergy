import { auth } from "@/auth";
import type { Session } from "next-auth";
import type { ClientRole, StaffRole } from "@/generated/prisma/client";
import {
  clientHasCapability,
  resolveClientRole,
  resolveStaffRole,
  staffHasCapability,
  type ClientCapability,
  type StaffCapability,
} from "@/lib/permissions";

function getSessionStaffRole(session: Session): StaffRole {
  return resolveStaffRole((session.user as { staffRole?: StaffRole | null }).staffRole);
}

function getSessionClientRole(session: Session): ClientRole {
  return resolveClientRole((session.user as { clientRole?: ClientRole | null }).clientRole);
}

export async function requireSession(): Promise<Session> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized.");
  }
  return session;
}

export async function requireStaff(
  capability?: StaffCapability,
): Promise<Session> {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") {
    throw new Error("Unauthorized. Admin access required.");
  }
  if (capability && !staffHasCapability(getSessionStaffRole(session), capability)) {
    throw new Error("Forbidden. Missing permission.");
  }
  return session;
}

export async function requireClientUser(
  capability?: ClientCapability,
): Promise<Session> {
  const session = await requireSession();
  if (session.user.role !== "CLIENT" || !session.user.clientId) {
    throw new Error("Unauthorized. Client access required.");
  }
  if (capability && !clientHasCapability(getSessionClientRole(session), capability)) {
    throw new Error("Forbidden. Missing permission.");
  }
  return session;
}

export function assertClientScope(session: Session, clientId: string): void {
  if (session.user.role === "ADMIN") {
    return;
  }
  if (session.user.role === "CLIENT" && session.user.clientId === clientId) {
    return;
  }
  throw new Error("Forbidden.");
}

export async function requireStaffOrClientScope(clientId: string): Promise<Session> {
  const session = await requireSession();
  assertClientScope(session, clientId);
  return session;
}
