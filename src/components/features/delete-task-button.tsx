"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteTask } from "@/lib/actions/admin";

export function DeleteTaskButton({ taskId, title }: { taskId: string; title: string }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (pending) return;
    setPending(true);
    const res = await deleteTask(taskId);
    if (res.error) {
      toast.error("Gagal menghapus", { description: res.error });
      setPending(false);
      setConfirm(false);
      return;
    }
    toast.success("Tugas dihapus");
    router.push("/tugas");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {!confirm ? (
        <Button variant="destructive" size="sm" onClick={() => setConfirm(true)} disabled={pending}>
          <Trash2 className="size-4" /> Hapus
        </Button>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Hapus &ldquo;{title}&rdquo;?</span>
          <Button variant="ghost" size="sm" onClick={() => setConfirm(false)} disabled={pending}>
            Batal
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />} Hapus
          </Button>
        </div>
      )}
    </div>
  );
}