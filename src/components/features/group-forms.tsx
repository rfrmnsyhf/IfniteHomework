"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveGroup, setGroupMember } from "@/lib/actions/admin";
import type { Profile } from "@/lib/types";

export function GroupFormDialog({
  group,
}: {
  group?: { id: string; name: string; project_title: string | null; description: string | null };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(group?.name ?? "");
  const [project, setProject] = useState(group?.project_title ?? "");
  const [description, setDescription] = useState(group?.description ?? "");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveGroup({
        id: group?.id,
        name,
        project_title: project,
        description,
      });
      if (res.error) {
        toast.error("Gagal menyimpan kelompok", { description: res.error });
        return;
      }
      toast.success(group ? "Kelompok diperbarui" : "Kelompok dibuat");
      setOpen(false);
      if (!group) {
        setName("");
        setProject("");
        setDescription("");
      }
      router.refresh();
    });
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> {group ? "Edit Kelompok" : "Buat Kelompok"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{group ? "Edit Kelompok" : "Kelompok Baru"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gf-name">Nama Kelompok</Label>
              <Input id="gf-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gf-project">Judul Proyek</Label>
              <Input
                id="gf-project"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="cth: Aplikasi Presensi"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gf-desc">Deskripsi</Label>
              <Input id="gf-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="size-4 animate-spin" />}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function GroupMembersManager({
  groupId,
  current,
  candidates,
}: {
  groupId: string;
  current: Array<{ user_id: string; role_in_group: string | null }>;
  candidates: Profile[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [roleDrafts, setRoleDrafts] = useState<Record<string, string>>({});
  const [addUserId, setAddUserId] = useState("");
  const [addRole, setAddRole] = useState("");

  function setRole(userId: string, role: string | null) {
    startTransition(async () => {
      const res = await setGroupMember(groupId, userId, role);
      if (res.error) toast.error("Gagal", { description: res.error });
      else {
        toast.success("Anggota diperbarui");
        router.refresh();
      }
    });
  }

  const available = candidates.filter((c) => !current.some((m) => m.user_id === c.id));

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {current.map((m) => (
          <li key={m.user_id} className="flex items-center gap-2 rounded-lg border p-2">
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {candidates.find((c) => c.id === m.user_id)?.name ?? m.user_id.slice(0, 8)}
            </span>
            <Input
              className="h-8 w-36"
              value={roleDrafts[m.user_id] ?? m.role_in_group ?? ""}
              onChange={(e) =>
                setRoleDrafts((d) => ({ ...d, [m.user_id]: e.target.value }))
              }
              placeholder="Peran..."
            />
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => setRole(m.user_id, roleDrafts[m.user_id] ?? m.role_in_group ?? "")}
            >
              Set
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 hover:text-destructive"
              disabled={pending}
              onClick={() => setRole(m.user_id, null)}
              aria-label="Keluarkan dari kelompok"
            >
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ul>

      {available.length > 0 && (
        <form
          className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!addUserId) return;
            setRole(addUserId, addRole || "Anggota");
            setAddUserId("");
            setAddRole("");
          }}
        >
          <div className="min-w-40 space-y-1.5">
            <Label>Tambah Anggota</Label>
            <select
              value={addUserId}
              onChange={(e) => setAddUserId(e.target.value)}
              className="h-8 w-full rounded-md border bg-background px-2 text-sm"
            >
              <option value="">Pilih mahasiswa...</option>
              {available.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Input
              className="h-8 w-32"
              value={addRole}
              onChange={(e) => setAddRole(e.target.value)}
              placeholder="Peran (Backend)"
            />
          </div>
          <Button type="submit" size="sm" disabled={pending || !addUserId}>
            <Plus className="size-4" />
          </Button>
        </form>
      )}
    </div>
  );
}
