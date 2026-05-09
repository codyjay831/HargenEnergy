import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function AdminClients() {
  const clients = await prisma.client.findMany({
    orderBy: {
      companyName: "asc",
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Clients</h1>
      
      {clients.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center text-muted-foreground">
          No clients yet. Clients are created when a support request is submitted.
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.companyName}</TableCell>
                  <TableCell>{client.contactName}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{client.planType}</Badge>
                  </TableCell>
                  <TableCell>
                    {client.subscriptionStatus ? (
                      <Badge variant={client.subscriptionStatus === "active" ? "default" : "destructive"}>
                        {client.subscriptionStatus}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">No subscription</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(client.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link 
                      href={`/admin/clients/${client.id}`}
                      className="text-primary hover:underline text-sm font-medium"
                    >
                      Manage
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
