"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteCourse, saveCourse } from "@/lib/actions/admin";

const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#0ea5e9"];

export function CourseFormDialog({
  course,
}: {
  course?: { id: string; name: string; lecturer_name: string | null; color: string | null };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(course?.name ?? "");
  const [lecturer, setLecturer] = useState(course?.lecturer_name ?? "");
  const [color, setColor] = useState(course?.color ?? COLORS[0]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveCourse({
        id: course?.id,
        name,
        lecturer_name: lecturer,
        color,
      });
      if (res.error) {
        toast.error("Gagal menyimpan mata kuliah", { description: res.error });
        return;
      }
      toast.success(course ? "Mata kuliah diperbarui" : "Mata kuliah ditambahkan");
      setOpen(false);
      if (!course) setName("");
      router.refresh();
    });
  }

  function onDelete() {
    startTransition(async () => {
      const res = await deleteCourse(course!.id);
      if (res.error) {
        toast.error("Gagal menghapus", { description: res.error });
        return;
      }
      toast.success("Mata kuliah dihapus");
      setOpen(false);
      router.push("/mata-kuliah");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          course ? (
            <Button variant="outline" size="sm">
              Edit
            </Button>
          ) : (
            <Button size="sm">
              <Plus className="size-4" /> Tambah Mata Kuliah
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{course ? "Edit Mata Kuliah" : "Mata Kuliah Baru"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cf-name">Nama</Label>
            <Input
              id="cf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="cth: Pemrograman VI"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cf-dosen">Nama Dosen</Label>
            <Input
              id="cf-dosen"
              value={lecturer}
              onChange={(e) => setLecturer(e.target.value)}
              placeholder="cth: Dr. Budi Santoso"
            />
          </div>
          <div className="space-y-2">
            <Label>Warna</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Warna ${c}`}
                  className={`size-7 rounded-full ring-offset-2 transition-shadow ${
                    color === c ? "ring-2 ring-primary" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            {course && (
              <Button type="button" variant="destructive" size="sm" onClick={onDelete} disabled={pending}>
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
  );
}
