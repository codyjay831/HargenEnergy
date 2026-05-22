"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { 
  toggleServiceCategory, 
  toggleWorkTask, 
  seedInitialServices,
  upsertServiceCategory,
  upsertWorkTask
} from "@/app/actions/services";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Loader2, Settings2, Plus, RefreshCw, Edit2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { type CustomField } from "@/app/actions/services";

interface Task {
  id: string;
  name: string;
  isActive: boolean;
  maxMinutes: number | null;
  description?: string | null;
  requiredFields?: any;
}

interface Category {
  id: string;
  name: string;
  isActive: boolean;
  description?: string | null;
  tasks: Task[];
}

interface ServiceManagementProps {
  initialCategories: Category[];
}

export function ServiceManagement({ initialCategories }: ServiceManagementProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  // Dialog states
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingTask, setEditingTask] = useState<{ task: Task; categoryId: string } | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [addingTaskToCategory, setAddingTaskToCategory] = useState<string | null>(null);

  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" });
  const [taskForm, setTaskForm] = useState({ 
    name: "", 
    description: "", 
    maxMinutes: "",
    requiredFields: [] as CustomField[]
  });
  const [isImporting, setIsImporting] = useState(false);
  const [importJson, setImportJson] = useState("");

  const addField = () => {
    const newField: CustomField = {
      id: `field_${Date.now()}`,
      label: "",
      type: "text",
      required: false
    };
    setTaskForm({
      ...taskForm,
      requiredFields: [...taskForm.requiredFields, newField]
    });
  };

  const updateField = (index: number, updates: Partial<CustomField>) => {
    const newFields = [...taskForm.requiredFields];
    newFields[index] = { ...newFields[index], ...updates };
    setTaskForm({ ...taskForm, requiredFields: newFields });
  };

  const removeField = (index: number) => {
    const newFields = taskForm.requiredFields.filter((_, i) => i !== index);
    setTaskForm({ ...taskForm, requiredFields: newFields });
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.category && json.tasks) {
          startTransition(async () => {
            const category = await upsertServiceCategory({
              name: json.category,
              description: json.description
            });
            
            for (const task of json.tasks) {
              await upsertWorkTask({
                categoryId: category.id,
                name: task.name,
                description: task.description,
                maxMinutes: task.maxMinutes,
                requiredFields: task.fields
              });
            }
            router.refresh();
            toast.success("Imported successfully");
          });
        }
      } catch {
        toast.error("Invalid JSON format");
      }
    };
    reader.readAsText(file);
  };

  const handlePasteImport = async () => {
    try {
      const json = JSON.parse(importJson);
      if (json.category && json.tasks) {
        startTransition(async () => {
          const category = await upsertServiceCategory({
            name: json.category,
            description: json.description
          });
          
          for (const task of json.tasks) {
            await upsertWorkTask({
              categoryId: category.id,
              name: task.name,
              description: task.description,
              maxMinutes: task.maxMinutes,
              requiredFields: task.fields
            });
          }
          router.refresh();
          setIsImporting(false);
          setImportJson("");
          toast.success("Imported successfully");
        });
      } else {
        toast.error("Invalid JSON structure. Must have 'category' and 'tasks' array.");
      }
    } catch {
      toast.error("Invalid JSON format");
    }
  };

  const handleToggleCategory = (id: string, currentStatus: boolean) => {
    startTransition(async () => {
      try {
        await toggleServiceCategory(id, !currentStatus);
        router.refresh();
        toast.success(`Category ${!currentStatus ? "enabled" : "disabled"}`);
      } catch {
        toast.error("Failed to update category");
      }
    });
  };

  const handleToggleTask = (id: string, currentStatus: boolean) => {
    startTransition(async () => {
      try {
        await toggleWorkTask(id, !currentStatus);
        router.refresh();
        toast.success(`Task ${!currentStatus ? "enabled" : "disabled"}`);
      } catch {
        toast.error("Failed to update task");
      }
    });
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name) {
      toast.error("Category name is required");
      return;
    }

    startTransition(async () => {
      try {
        await upsertServiceCategory({
          id: editingCategory?.id,
          name: categoryForm.name,
          description: categoryForm.description,
        });
        router.refresh();
        setEditingCategory(null);
        setIsAddingCategory(false);
        setCategoryForm({ name: "", description: "" });
        toast.success(`Category ${editingCategory ? "updated" : "added"} successfully`);
      } catch {
        toast.error("Failed to save category");
      }
    });
  };

  const handleSaveTask = async () => {
    if (!taskForm.name) {
      toast.error("Task name is required");
      return;
    }

    const categoryId = editingTask?.categoryId || addingTaskToCategory;
    if (!categoryId) return;

    startTransition(async () => {
      try {
        const maxMinutes = taskForm.maxMinutes ? parseInt(taskForm.maxMinutes) : undefined;
        
        await upsertWorkTask({
          id: editingTask?.task.id,
          categoryId,
          name: taskForm.name,
          description: taskForm.description,
          maxMinutes: isNaN(maxMinutes as number) ? undefined : maxMinutes,
          requiredFields: taskForm.requiredFields,
        });
        
        router.refresh();
        setEditingTask(null);
        setAddingTaskToCategory(null);
        setTaskForm({ name: "", description: "", maxMinutes: "", requiredFields: [] });
        toast.success(`Task ${editingTask ? "updated" : "added"} successfully`);
      } catch (error: any) {
        console.error("Save task error:", error);
        toast.error(error.message || "Failed to save task");
      }
    });
  };

  const handleSeed = async () => {
    startTransition(async () => {
      try {
        await seedInitialServices();
        toast.success("Services seeded successfully");
        router.refresh();
      } catch {
        toast.error("Failed to seed services");
      }
    });
  };

  if (initialCategories.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Settings2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No services configured</h3>
          <p className="text-muted-foreground mb-6 text-center max-w-sm">
            You haven&apos;t set up any service categories or tasks yet. 
            Start by seeding the default solar operations tasks.
          </p>
          <Button onClick={handleSeed} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Seed Default Services
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Service Catalog</h2>
          <p className="text-sm text-muted-foreground">Enable or disable services offered to clients.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSeed} disabled={isPending}>
            <RefreshCw className="mr-2 h-3 w-3" />
            Reset to Defaults
          </Button>
          <div className="relative">
            <input
              type="file"
              accept=".json"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleImportJson}
              disabled={isPending}
            />
            <Button variant="outline" size="sm" disabled={isPending}>
              <Upload className="mr-2 h-3 w-3" />
              Import File
            </Button>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsImporting(true)}
            disabled={isPending}
          >
            <Plus className="mr-2 h-3 w-3" />
            Paste JSON
          </Button>
          <Button 
            size="sm" 
            onClick={() => {
              setCategoryForm({ name: "", description: "" });
              setIsAddingCategory(true);
            }}
          >
            <Plus className="mr-2 h-3 w-3" />
            Add Category
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {initialCategories.map((category) => (
          <Card key={category.id} className={!category.isActive ? "opacity-60" : ""}>
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <div className="space-y-1">
                <CardTitle className="text-md flex items-center gap-2">
                  {category.name}
                  {!category.isActive && <Badge variant="outline">Disabled</Badge>}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => {
                      setCategoryForm({ 
                        name: category.name, 
                        description: category.description || "" 
                      });
                      setEditingCategory(category);
                    }}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </CardTitle>
                {category.description && (
                  <p className="text-xs text-muted-foreground">{category.description}</p>
                )}
              </div>
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8"
                  onClick={() => {
                    setTaskForm({ name: "", description: "", maxMinutes: "", requiredFields: [] });
                    setAddingTaskToCategory(category.id);
                  }}
                >
                  <Plus className="mr-2 h-3 w-3" />
                  Add Task
                </Button>
                <div className="flex items-center gap-2 border-l pl-4">
                  <span className="text-xs text-muted-foreground">Active</span>
                  <Checkbox 
                    checked={category.isActive} 
                    onCheckedChange={() => handleToggleCategory(category.id, category.isActive)}
                    disabled={isPending}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Active</TableHead>
                    <TableHead>Task Name</TableHead>
                    <TableHead>Time Cap</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {category.tasks.map((task) => (
                    <TableRow key={task.id} className={!task.isActive ? "text-muted-foreground" : ""}>
                      <TableCell>
                        <Checkbox 
                          checked={task.isActive} 
                          onCheckedChange={() => handleToggleTask(task.id, task.isActive)}
                          disabled={isPending || !category.isActive}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {task.name}
                      </TableCell>
                      <TableCell>
                        {task.maxMinutes ? `${task.maxMinutes}m` : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            const fields = task.requiredFields 
                              ? (typeof task.requiredFields === 'string' ? JSON.parse(task.requiredFields) : task.requiredFields)
                              : [];
                            setTaskForm({ 
                              name: task.name, 
                              description: task.description || "", 
                              maxMinutes: task.maxMinutes?.toString() || "",
                              requiredFields: fields
                            });
                            setEditingTask({ task, categoryId: category.id });
                          }}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Category Dialog */}
      <Dialog 
        open={isAddingCategory || !!editingCategory} 
        onOpenChange={(open) => {
          if (!open) {
            setIsAddingCategory(false);
            setEditingCategory(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
            <DialogDescription>
              {editingCategory ? "Update the details of this service category." : "Create a new service category."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input 
                id="name" 
                value={categoryForm.name} 
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="e.g. Solar Operations"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea 
                id="description" 
                value={categoryForm.description} 
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Brief description of this category..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddingCategory(false);
              setEditingCategory(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleSaveCategory} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Dialog */}
      <Dialog 
        open={!!addingTaskToCategory || !!editingTask} 
        onOpenChange={(open) => {
          if (!open) {
            setAddingTaskToCategory(null);
            setEditingTask(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "Add Task"}</DialogTitle>
            <DialogDescription>
              {editingTask ? "Update the details of this work task." : "Create a new work task for this category."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="task-name">Name</Label>
              <Input 
                id="task-name" 
                value={taskForm.name} 
                onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
                placeholder="e.g. Site Assessment"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="task-description">Description (Optional)</Label>
              <Textarea 
                id="task-description" 
                value={taskForm.description} 
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                placeholder="Brief description of this task..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="maxMinutes">Time Cap (Minutes)</Label>
              <Input 
                id="maxMinutes" 
                type="number"
                value={taskForm.maxMinutes} 
                onChange={(e) => setTaskForm({ ...taskForm, maxMinutes: e.target.value })}
                placeholder="e.g. 60"
              />
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-base">Custom Data Fields</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={addField}
                >
                  <Plus className="h-3 w-3 mr-2" /> Add Field
                </Button>
              </div>
              
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {taskForm.requiredFields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-end bg-slate-50 p-3 rounded-md border">
                    <div className="col-span-5 space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">Label</Label>
                      <Input 
                        value={field.label} 
                        onChange={(e) => updateField(index, { label: e.target.value })} 
                        placeholder="e.g. Utility ID"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="col-span-4 space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">Type</Label>
                      <Select 
                        value={field.type} 
                        onValueChange={(val: CustomField["type"] | null) => {
                          if (val) updateField(index, { type: val });
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 flex flex-col items-center gap-1 pb-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">Req</Label>
                      <Checkbox 
                        checked={field.required} 
                        onCheckedChange={(val) => updateField(index, { required: !!val })} 
                      />
                    </div>
                    <div className="col-span-1 pb-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => removeField(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {taskForm.requiredFields.length === 0 && (
                  <p className="text-xs text-center text-muted-foreground py-4 italic">
                    No custom fields defined. Click &quot;Add Field&quot; to collect specific info for this task.
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setAddingTaskToCategory(null);
              setEditingTask(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleSaveTask} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={isImporting} onOpenChange={setIsImporting}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Service Category</DialogTitle>
            <DialogDescription>
              Paste a JSON configuration to quickly create a category and its tasks. 
              This is perfect for AI-generated service catalogs.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="import-json">JSON Configuration</Label>
              <Textarea 
                id="import-json" 
                value={importJson} 
                onChange={(e) => setImportJson(e.target.value)}
                placeholder='{ "category": "Solar", "tasks": [...] }'
                className="min-h-[300px] font-mono text-xs"
              />
            </div>
            <div className="p-3 bg-slate-50 border rounded-md">
              <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Example Structure:</p>
              <pre className="text-[10px] text-slate-600 overflow-x-auto">
{`{
  "category": "Battery Storage",
  "description": "Energy storage systems",
  "tasks": [
    {
      "name": "Warranty Registration",
      "maxMinutes": 15,
      "fields": [
        { "id": "serial", "label": "Serial Number", "type": "text", "required": true }
      ]
    }
  ]
}`}
              </pre>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImporting(false)}>
              Cancel
            </Button>
            <Button onClick={handlePasteImport} disabled={isPending || !importJson}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
