"use client";
/* eslint-disable react-hooks/set-state-in-effect -- sync task prop to form state */

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { saveTask, deleteTask } from "@/lib/actions/admin";
import type { Course, TaskPriority, TaskType } from "@/lib/types";

const PRIORITY_OPTS: Array<{ v: TaskPriority; l: string }> = [
  { v: "rendah", l: "Rendah" },
  { v: "sedang", l: "Sedang" },
  { v: "tinggi", l: "Tinggi" },
];
const TYPE_OPTS: Array<{ v: TaskType; l: string }> = [
  { v: "individu", l: "Individu" },
  { v: "kelompok", l: "Kelompok" },
];

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  // Parse ISO string as UTC, then format as Jakarta time for datetime-local input
  const d = new Date(iso);
  const jakarta = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${jakarta.getFullYear()}-${pad(jakarta.getMonth() + 1)}-${pad(jakarta.getDate())}T${pad(jakarta.getHours())}:${pad(jakarta.getMinutes())}`;
}

export function TaskFormDialog({
  courses,
  task,
  trigger,
}: {
  courses: Course[];
  task?: {
    id: string;
    course_id: string;
    title: string;
    description: string | null;
    deadline: string;
    priority: TaskPriority;
    type: TaskType;
    allow_submission: boolean;
    submission_deadline: string | null;
  };
  trigger?: React.ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [courseId, setCourseId] = useState(task?.course_id ?? "");
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [deadline, setDeadline] = useState(toLocalInput(task?.deadline ?? null));
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "sedang");
  const [type, setType] = useState<TaskType>(task?.type ?? "individu");
  const [allowSubmission, setAllowSubmission] = useState(task?.allow_submission ?? true);
  const [submissionDeadline, setSubmissionDeadline] = useState(
    toLocalInput(task?.submission_deadline ?? null)
  );

  useEffect(() => {
    setCourseId(task?.course_id ?? "");
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setDeadline(toLocalInput(task?.deadline ?? null));
    setPriority(task?.priority ?? "sedang");
    setType(task?.type ?? "individu");
    setAllowSubmission(task?.allow_submission ?? true);
    setSubmissionDeadline(toLocalInput(task?.submission_deadline ?? null));
  }, [task?.course_id, task?.deadline, task?.description, task?.priority, task?.submission_deadline, task?.title, task?.type, task?.allow_submission]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!deadline || isNaN(Date.parse(deadline))) { toast.error("Deadline tidak valid"); return; }
    if (allowSubmission && submissionDeadline && isNaN(Date.parse(submissionDeadline))) { toast.error("Batas pengumpulan tidak valid"); return; }
    // Parse datetime-local as Jakarta time (Asia/Jakarta = UTC+7)
    const toUTC = (local: string) => new Date(local + "+07:00").toISOString();
    startTransition(async () => {
      const res = await saveTask({
        id: task?.id,
        course_id: courseId,
        title,
        description,
        deadline: toUTC(deadline),
        priority,
        type,
        allow_submission: allowSubmission,
        submission_deadline:
          allowSubmission && submissionDeadline
            ? toUTC(submissionDeadline)
            : null,
      });
      if (res.error) {
        toast.error("Gagal menyimpan tugas", { description: res.error });
        return;
      }
      toast.success(task ? "Tugas diperbarui" : "Tugas dibuat");
      setOpen(false);
      if (!task) {
        setTitle("");
        setDescription("");
        setDeadline("");
        setSubmissionDeadline("");
      }
      router.refresh();
    });
  }

  const [confirmDelete, setConfirmDelete] = useState(false);
  function onDelete() {
    if (!task) return;
    setConfirmDelete(true);
  }
  function confirmDeleteTask() {
    if (!task) return;
    startTransition(async () => {
      const res = await deleteTask(task.id);
      if (res.error) {
        toast.error("Gagal menghapus", { description: res.error });
        return;
      }
      toast.success("Tugas dihapus");
      setConfirmDelete(false);
      setOpen(false);
      router.push("/tugas");
      router.refresh();
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            trigger ?? (
              <Button size="sm">
                <Plus className="size-4" /> Tambah Tugas
              </Button>
            )
          }
        />
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Tugas" : "Tugas Baru"}</DialogTitle>
          <DialogDescription>
            {task
              ? "Perubahan deadline akan memberi notifikasi ke anggota."
              : "Tugas otomatis ditugaskan ke seluruh mahasiswa kelas."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Mata Kuliah</Label>
            <Select value={courseId} onValueChange={(v) => setCourseId(v ?? "")} required>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih mata kuliah" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tf-title">Judul</Label>
            <Input
              id="tf-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="cth: REST API Inventory"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tf-desc">Deskripsi</Label>
            <Textarea
              id="tf-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Instruksi tugas..."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tf-deadline">Deadline</Label>
              <Input
                id="tf-deadline"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Batas Pengumpulan</Label>
              <Input
                type="datetime-local"
                value={submissionDeadline}
                onChange={(e) => setSubmissionDeadline(e.target.value)}
                disabled={!allowSubmission}
                placeholder="Default = deadline"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Prioritas</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority((v ?? "sedang") as TaskPriority)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTS.map((p) => (
                    <SelectItem key={p.v} value={p.v}>
                      {p.l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Jenis</Label>
              <Select
                value={type}
                onValueChange={(v) => setType((v ?? "individu") as TaskType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTS.map((t) => (
                    <SelectItem key={t.v} value={t.v}>
                      {t.l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="tf-sub">Menerima Pengumpulan File</Label>
              <p className="text-xs text-muted-foreground">Mahasiswa dapat upload submission</p>
            </div>
            <Switch
              id="tf-sub"
              checked={allowSubmission}
              onCheckedChange={setAllowSubmission}
            />
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {task && (
              <Button
                type="button"
                variant="destructive"
                onClick={onDelete}
                disabled={pending}
              >
                Hapus
              </Button>
            )}
            <Button type="submit" disabled={pending} className="ml-auto">
              {pending && <Loader2 className="size-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    {task && (
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus tugas ini?</DialogTitle>
            <DialogDescription>
              Tugas &quot;{task.title}&quot; akan dihapus beserta checklist, attachment, dan status terkait. Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={pending}>
              Batal
            </Button>
            <Button variant="destructive" onClick={confirmDeleteTask} disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />} Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )}
    </>
  );
}
