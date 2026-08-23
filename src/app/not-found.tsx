import Link from "next/link";
import { Compass } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 text-center">
      <div className="grid size-14 place-items-center rounded-full bg-muted">
        <Compass className="size-7 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">404</p>
        <h1 className="text-xl font-bold">Halaman tidak ditemukan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Halaman yang kamu cari mungkin sudah dipindah atau dihapus.
        </p>
      </div>
      <Link href="/dashboard" className={buttonVariants()}>
        Kembali ke Dashboard
      </Link>
    </div>
  );
}
