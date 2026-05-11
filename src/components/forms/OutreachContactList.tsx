"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Mail, Phone, Globe, Trash2, User } from "lucide-react";
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

interface OutreachContactListProps {
  companyId: string;
  initialContacts: OutreachContact[];
}

export function OutreachContactList({ companyId, initialContacts }: OutreachContactListProps) {
  const [isAdding, setIsAdding] = useState(false);
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
              <Button className="w-full" onClick={handleAdd}>Save Contact</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {initialContacts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No contacts added yet.</p>
        ) : (
          initialContacts.map((contact) => (
            <div key={contact.id} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50/50">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{contact.name}</p>
                    {contact.isPrimary && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">Primary</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{contact.roleTitle || "Contact"}</p>
                  
                  <div className="flex items-center gap-3 mt-2">
                    {contact.email && (
                      <button 
                        onClick={() => {
                          if (!contact.email) return;
                          navigator.clipboard.writeText(contact.email);
                          alert("Email copied to clipboard");
                        }}
                        className="flex items-center gap-1 text-[10px] text-primary hover:underline"
                      >
                        <Mail className="h-3 w-3" />
                        {contact.email}
                      </button>
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
                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
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
