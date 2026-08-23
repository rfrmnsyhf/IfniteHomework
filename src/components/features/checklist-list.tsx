"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Circle, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addChecklistItem, removeChecklistItem } from "@/lib/actions/admin";
import { toggleChecklistItem } from "@/lib/actions/task-status";
import type { ChecklistItem } from "@/lib/types";

export function ChecklistList({
  items,
  taskId,
  isAdmin,
}: {
  items: ChecklistItem[];
  taskId: string;
  isAdmin: boolean;
}) {
  const [optimisticItems, setOptimisticItems] = useState(items);
  const [, startTransition] = useTransition();

  // sinkronisasi saat data server berubah
  const [syncedTaskId, setSyncedTaskId] = useState(taskId);
  if (syncedTaskId !== taskId) {
    setSyncedTaskId(taskId);
    setOptimisticItems(items);
  }
  const [lastItems, setLastItems] = useState(items);
  if (lastItems !== items) {
    setLastItems(items);
    setOptimisticItems(items);
  }

  const done = optimisticItems.filter((i) => i.completed).length;

  function toggle(item: ChecklistItem) {
    const next = !item.completed;
    setOptimisticItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, completed: next } : i))
    );
    startTransition(async () => {
      const res = await toggleChecklistItem(item.id, next);
      if (res.error) toast.error("Gagal", { description: res.error });
    });
  }

  function remove(itemId: string) {
    setOptimisticItems((prev) => prev.filter((i) => i.id !== itemId));
    startTransition(async () => {
      const res = await removeChecklistItem(itemId);
      if (res.error) toast.error("Gagal menghapus item", { description: res.error });
    });
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2.5">
        {optimisticItems.map((item) => (
          <li key={item.id} className="group flex items-center gap-3">
            <button
              type="button"
              onClick={() => toggle(item)}
              className="shrink-0"
              aria-label={item.completed ? "Batalkan centang" : "Centang"}
            >
              {item.completed ? (
                <CheckCircle2 className="size-5 text-emerald-500" />
              ) : (
                <Circle className="size-5 text-muted-foreground hover:text-foreground" />
              )}
            </button>
            <span className={item.completed ? "text-sm text-muted-foreground line-through" : "text-sm"}>
              {item.title}
            </span>
            {isAdmin && (
              <button
                type="button"
                onClick={() => remove(item.id)}
                className="ml-auto text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                aria-label="Hapus item"
              >
                <X className="size-4" />
              </button>
            )}
          </li>
        ))}
      </ul>

      {isAdmin && <AddChecklistForm taskId={taskId} />}
      <p className="text-xs text-muted-foreground">
        {done}/{optimisticItems.length} selesai — checklist bersifat global untuk seluruh kelas.
      </p>
    </div>
  );
}

function AddChecklistForm({ taskId }: { taskId: string }) {
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    startTransition(async () => {
      const res = await addChecklistItem(taskId, value.trim());
      if (res.error) toast.error("Gagal menambah item", { description: res.error });
      else setValue("");
    });
  }

  return (
    <form onSubmit={add} className="flex gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Tambah item baru..."
      />
      <Button type="submit" variant="outline" size="icon" disabled={pending || !value.trim()}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
      </Button>
    </form>
  );
}
