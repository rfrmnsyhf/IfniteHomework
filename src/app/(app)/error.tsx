"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50svh] flex-col items-center justify-center gap-4 text-center">
      <div className="grid size-14 place-items-center rounded-full bg-red-100 dark:bg-red-950">
        <AlertTriangle className="size-7 text-red-600 dark:text-red-400" />
      </div>
      <div>
        <h1 className="text-lg font-bold">Terjadi kesalahan</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Ada yang tidak beres saat memuat halaman ini. Coba lagi.
        </p>
      </div>
      <Button onClick={reset}>Coba Lagi</Button>
    </div>
  );
}
