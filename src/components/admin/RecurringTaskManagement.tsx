"use client";

import { useState, useTransition } from "react";
import { 
  createRecurringTask, 
  deleteRecurringTask, 
  processRecurringTasks 
} from "@/app/actions/recurring";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Trash2, Play, Plus, Loader2, Calendar } from "lucide-react";
import { toast } from "sonner";

interface RecurringTask {
  id: string;
  frequency: string;
  nextRunAt: Date;
  isActive: boolean;
  client: { id: string; companyName: string };
  workTask: { id: string; name: string };
}

interface RecurringTaskManagementProps {
  initialTasks: RecurringTask[];
  clients: { id: string; companyName: string }[];
  allTasks: { id: string; name: string }[];
}

export function RecurringTaskManagement({ 
  initialTasks, 
  clients, 
  allTasks 
}: RecurringTaskManagementProps) {
  const [isPending, startTransition] = useTransition();
  const [tasks] = useState(initialTasks);
  
  const [newClientId, setNewClientId] = useState("");
  const [newTaskId, setNewTaskId] = useState("");
  const [newFrequency, setNewFrequency] = useState("WEEKLY");
  const [nextRun, setNextRun] = useState(format(new Date(), "yyyy-MM-dd"));

  const handleCreate = () => {
    if (!newClientId || !newTaskId) return;
    startTransition(async () => {
      try {
        await createRecurringTask({
          clientId: newClientId,
          workTaskId: newTaskId,
          frequency: newFrequency as "DAILY" | "WEEKLY" | "MONTHLY",
          nextRunAt: new Date(nextRun),
        });
        toast.success("Recurring task created");
        window.location.reload();
      } catch {
        toast.error("Failed to create recurring task");
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteRecurringTask(id);
        toast.success("Recurring task deleted");
        window.location.reload();
      } catch {
        toast.error("Failed to delete recurring task");
      }
    });
  };

  const handleProcess = () => {
    startTransition(async () => {
      try {
        const result = await processRecurringTasks();
        toast.success(`Processed tasks. Created ${result.createdCount} new requests.`);
        window.location.reload();
      } catch {
        toast.error("Failed to process tasks");
      }
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold">Scheduled ticket templates</h2>
          <p className="text-sm text-muted-foreground">
            Internal recurring reminders for hourly support block clients — not the customer-facing definition of support.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleProcess} disabled={isPending}>
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
          Run Automation Now
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-md">Create New Recurring Task</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select onValueChange={(val) => setNewClientId(val || "")} value={newClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Task</Label>
              <Select onValueChange={(val) => setNewTaskId(val || "")} value={newTaskId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Task" />
                </SelectTrigger>
                <SelectContent>
                  {allTasks.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select onValueChange={(val) => setNewFrequency(val || "WEEKLY")} value={newFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Next Run Date</Label>
              <Input type="date" value={nextRun} onChange={(e) => setNextRun(e.target.value)} />
            </div>
          </div>
          <Button className="mt-4 w-full md:w-auto" onClick={handleCreate} disabled={isPending || !newClientId || !newTaskId}>
            <Plus className="mr-2 h-4 w-4" />
            Add Recurring Task
          </Button>
        </CardContent>
      </Card>

      <div className="bg-white border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Task</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Next Run</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">
                  No recurring tasks configured.
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.client.companyName}</TableCell>
                  <TableCell>{task.workTask.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{task.frequency}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {format(new Date(task.nextRunAt), "MMM d, yyyy")}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" className="text-red-600" onClick={() => handleDelete(task.id)} disabled={isPending}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
