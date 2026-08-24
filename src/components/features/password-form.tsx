"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { changePassword } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PasswordForm() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const cur = String(fd.get("currentPassword") ?? "");
    const nw = String(fd.get("newPassword") ?? "");
    const cf = String(fd.get("confirmPassword") ?? "");
    const res = await changePassword(cur, nw, cf);
    setLoading(false);
    if (res.error) { setErr(res.error); return; }
    toast.success("Password berhasil diubah");
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2"><Label htmlFor="currentPassword">Password Saat Ini</Label><Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required /></div>
      <div className="space-y-2"><Label htmlFor="newPassword">Password Baru</Label><Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required minLength={8} /></div>
      <div className="space-y-2"><Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label><Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} /></div>
      {err && <p className="text-xs text-destructive">{err}</p>}
      <Button type="submit" className="w-full" disabled={loading}>{loading ? "Menyimpan..." : "Ubah Password"}</Button>
    </form>
  );
}
