"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { loginWithNim } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [nim, setNim] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await loginWithNim(nim.trim(), password);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    const next = searchParams.get("next");
    const dest = result.redirectTo ?? (next && next.startsWith("/") ? next : "/dashboard");
    router.replace(dest);
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="lg:hidden">
        <Link href="/" className="inline-flex items-center gap-2 text-xl font-bold tracking-tight">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            ⚡
          </span>
          ClassFlow
        </Link>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Selamat datang kembali</h1>
        <p className="text-sm text-muted-foreground">
          Masuk untuk melihat tugas dan deadline kamu.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nim">NIM</Label>
          <Input
            id="nim"
            type="text"
            autoComplete="off"
            placeholder="1224405"
            value={nim}
            onChange={(e) => setNim(e.target.value)}
            required
            minLength={7}
            maxLength={7}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin" />}
          Masuk
        </Button>
      </form>

      {error && (
        <p className="text-xs text-destructive">
          {error}
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Lupa password? Hubungi admin kelas untuk reset akun.
      </p>
    </div>
  );
}