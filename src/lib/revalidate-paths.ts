import { revalidatePath } from "next/cache";

/** Revalidate admin client list + detail after client-scoped mutations. */
export function revalidateAdminClientPage(clientId: string) {
  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${clientId}`);
}

/** Revalidate portal surfaces that reflect client setup state. */
export function revalidatePortalClientSurfaces() {
  revalidatePath("/portal");
  revalidatePath("/portal/account");
  revalidatePath("/portal/access");
  revalidatePath("/portal/requests/new");
}
