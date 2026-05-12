import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface IntakeDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function IntakeDetailPage({ params }: IntakeDetailPageProps) {
  const resolvedParams = await params;
  const id = typeof resolvedParams?.id === "string" ? resolvedParams.id : undefined;

  if (!id) {
    notFound();
  }

  const request = await prisma.supportRequest.findUnique({
    where: { id },
    select: { clientId: true, kind: true },
  });

  if (!request) {
    notFound();
  }

  // Redirect to the prospect page with the drawer open
  redirect(`/admin/clients/${request.clientId}?open=walkthrough`);

}
