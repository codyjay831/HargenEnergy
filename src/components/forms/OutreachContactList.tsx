"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Mail, Phone, Globe, Trash2, User, ExternalLink, Copy, Check } from "lucide-react";
import { addOutreachContact, deleteOutreachContact } from "@/app/actions/outreach";
import type { OutreachContact } from "@/generated/prisma/client";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  buildMinimalContactGreeting,
  openGmailCompose,
} from "@/lib/outreach-compose";

interface OutreachContactListProps {
  companyId: string;
  companyName: string;
  initialContacts: OutreachContact[];
}

export function OutreachContactList({
  companyId,
  companyName,
  initialContacts,
}: OutreachContactListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [copiedEmailId, setCopiedEmailId] = useState<string | null>(null);
  const [newContact, setNewContact] = useState({
    name: "",
    roleTitle: "",
    email: "",
    phone: "",
    linkedinUrl: "",
  });
  const router = useRouter();

  const handleAdd = async () => {
    if (!newContact.name) return;
    const result = await addOutreachContact({
      companyId,
      ...newContact,
      isPrimary: initialContacts.length === 0,
    });

    if (result.success) {
      setNewContact({ name: "", roleTitle: "", email: "", phone: "", linkedinUrl: "" });
      setIsAdding(false);
      router.refresh();
    } else {
      alert(result.error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this contact?")) return;
    const result = await deleteOutreachContact(id, companyId);
    if (result.success) {
      router.refresh();
    } else {
      alert(result.error);
    }
  };

  const handleCopyEmail = (contactId: string, email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmailId(contactId);
    toast.success("Email copied");
    setTimeout(() => setCopiedEmailId(null), 2000);
  };

  const handleOpenGmail = (contact: OutreachContact) => {
    if (!contact.email) return;

    const subject = `Connecting with ${companyName}`;
    const body = buildMinimalContactGreeting(contact.name);
    const { truncated, fullBody } = openGmailCompose({
      to: contact.email,
      subject,
      body,
    });

    if (truncated) {
      navigator.clipboard.writeText(fullBody);
      toast.info("Full message copied — paste in Gmail if the body was truncated.");
    } else {
      toast.success("Opening Gmail compose…");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isAdding} onOpenChange={setIsAdding}>
          <DialogTrigger
            render={
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Contact</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role / Title</Label>
                <Input
                  id="role"
                  value={newContact.roleTitle}
                  onChange={(e) => setNewContact({ ...newContact, roleTitle: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn URL</Label>
                <Input
                  id="linkedin"
                  value={newContact.linkedinUrl}
                  onChange={(e) => setNewContact({ ...newContact, linkedinUrl: e.target.value })}
                />
              </div>
              <Button className="w-full" onClick={handleAdd}>
                Save Contact
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {initialContacts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No contacts added yet.</p>
        ) : (
          initialContacts.map((contact) => (
            <div
              key={contact.id}
              className="flex items-center justify-between p-3 border rounded-lg bg-slate-50/50"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{contact.name}</p>
                    {contact.isPrimary && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0 shrink-0">
                        Primary
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{contact.roleTitle || "Contact"}</p>

                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {contact.email && (
                      <>
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground truncate max-w-[180px]">
                          <Mail className="h-3 w-3 shrink-0" />
                          {contact.email}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-[10px] px-2"
                          onClick={() => handleOpenGmail(contact)}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Gmail
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleCopyEmail(contact.id, contact.email!)}
                        >
                          {copiedEmailId === contact.id ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </>
                    )}
                    {contact.phone && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {contact.phone}
                      </span>
                    )}
                    {contact.linkedinUrl && (
                      <a
                        href={contact.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        <Globe className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0"
                onClick={() => handleDelete(contact.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
