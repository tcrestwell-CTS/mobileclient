import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GripVertical, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { useTripStatuses, type TripStatus } from "@/hooks/useTripStatuses";

export function TripStatusesSettings() {
  const {
    statuses,
    loading,
    addStatus,
    renameStatus,
    updateStatusColor,
    deleteStatus,
    reorderStatuses,
  } = useTripStatuses();

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6366f1");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<TripStatus | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await addStatus(newName.trim(), newColor);
    setNewName("");
    setNewColor("#6366f1");
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    await renameStatus(id, editName.trim());
    setEditingId(null);
  };

  const handleDragStart = (idx: number) => setDragIdx(idx);

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const reordered = [...statuses];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(idx, 0, moved);
    setDragIdx(idx);
    // Optimistic reorder in state
    reorderStatuses(reordered);
  };

  const handleDragEnd = () => setDragIdx(null);

  if (loading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trip Statuses</CardTitle>
        <CardDescription>
          Customize the workflow columns for your Kanban board. Drag to reorder.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status List */}
        <div className="space-y-1">
          {statuses.map((s, idx) => (
            <div
              key={s.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                type="color"
                value={s.color}
                onChange={(e) => updateStatusColor(s.id, e.target.value)}
                className="w-6 h-6 rounded border-0 cursor-pointer p-0"
                title="Change color"
              />

              {editingId === s.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-8 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(s.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRename(s.id)}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium text-foreground">{s.name}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => { setEditingId(s.id); setEditName(s.name); }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(s)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Add New */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="w-8 h-8 rounded border-0 cursor-pointer p-0"
          />
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New status name..."
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button onClick={handleAdd} size="sm" className="gap-1.5" disabled={!newName.trim()}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </CardContent>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Status</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? Trips with this status will keep their current status value but it won't appear as a Kanban column.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleteTarget) await deleteStatus(deleteTarget.id);
                setDeleteTarget(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
