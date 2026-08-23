"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveTaskNotes } from "@/lib/actions/task-status";

export function NotesEditor({
  taskId,
  initialNotes,
}: {
  taskId: string;
  initialNotes: string;
}) {
  const [saved, setSaved] = useState({ taskId, initialNotes });
  const [value, setValue] = useState(initialNotes);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();

  // pola React "menyesuaikan state saat render" — sinkron saat navigasi antar tugas
  if (saved.taskId !== taskId || saved.initialNotes !== initialNotes) {
    setSaved({ taskId, initialNotes });
    setValue(initialNotes);
    setDirty(false);
  }

  function save() {
    startTransition(async () => {
      const res = await saveTaskNotes(taskId, value);
      if (res.error) {
        toast.error("Gagal menyimpan catatan", { description: res.error });
        return;
      }
      setDirty(false);
      toast.success("Catatan disimpan");
    });
  }

  return (
    <div className="space-y-3">
      <Textarea
        rows={4}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setDirty(true);
        }}
        placeholder="Tambahkan catatan pribadi..."
      />
      <div className="flex justify-end">
        <Button size="sm" onClick={save} disabled={!dirty || pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Simpan Catatan
        </Button>
      </div>
    </div>
  );
}