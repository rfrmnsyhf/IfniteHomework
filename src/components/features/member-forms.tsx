"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, LogOut, UserPlus } from "lucide-react";
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
import { addClassMember, removeClassMember, updateUserRole } from "@/lib/actions/admin";
import { updateMyProfile } from "@/lib/actions/profile";

export function AddMemberDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await addClassMember(email);
      if (res.error) {
        toast.error("Gagal menambah anggota", { description: res.error });
        return;
      }
      toast.success("Anggota ditambahkan ke kelas");
      setOpen(false);
      setEmail("");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)}>
        <UserPlus className="size-4" /> Tambah Anggota
      </Button>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Tambah Anggota Kelas</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="am-email">Email akun yang sudah terdaftar</Label>
            <Input
              id="am-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="mahasiswa@classflow.id"
              required
            />
            <p className="text-xs text-muted-foreground">
              Akun harus dibuat terlebih dahulu (hubungi pemilik proyek untuk seeding akun baru).
            </p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Tambahkan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RemoveMemberButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground hover:text-destructive"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await removeClassMember(userId);
          if (res.error) {
            toast.error("Gagal mengeluarkan", { description: res.error });
            return;
          }
          toast.success("Anggota dikeluarkan dari kelas");
          router.refresh();
        })
      }
    >
      <LogOut className="size-4" /> Keluarkan
    </Button>
  );
}

export function UpdateNameForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateMyProfile(name);
      if (res.error) {
        toast.error("Gagal memperbarui profil", { description: res.error });
        return;
      }
      setDirty(false);
      toast.success("Profil diperbarui");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-md items-end gap-3">
      <div className="flex-1 space-y-2">
        <Label htmlFor="us-name">Nama</Label>
        <Input
          id="us-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setDirty(true);
          }}
        />
      </div>
      <Button type="submit" disabled={!dirty || pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        Simpan
      </Button>
    </form>
  );
}

export function RoleSwitchButton({ userId, currentRole }: { userId: string; currentRole: "admin" | "mahasiswa" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const next = currentRole === "admin" ? "mahasiswa" : "admin";
  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={() => startTransition(async () => {
      const res = await updateUserRole(userId, next);
      if (res.error) { toast.error(res.error); return; }
      toast.success(`Role diubah ke ${next}`);
      router.refresh();
    })}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null} Jadikan {next}
    </Button>
  );
}

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const { createClient } = await import("@/lib/supabase/client");
          await createClient().auth.signOut();
          router.replace("/login");
        })
      }
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
      Keluar
    </Button>
  );
}
