import { Suspense } from "react";
import { Zap } from "lucide-react";
import { LoginForm } from "@/components/features/login-form";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Panel kiri — branding (desktop) */}
      <div className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="inline-flex items-center gap-2 text-xl font-bold tracking-tight">
          <span className="grid size-9 place-items-center rounded-xl bg-white/15">
            <Zap className="size-5" />
          </span>
          ClassFlow
        </div>
        <div className="space-y-6 max-w-md">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Satu kelas. Semua tugas.
          </h1>
          <p className="text-lg text-white/80">
            Tidak ada lagi &ldquo;deadline-nya kapan?&rdquo;. Semua tugas, deadline,
            progres, dan pengumuman kelas dalam satu tempat.
          </p>
        </div>
        <p className="text-sm text-white/60">Manage your class. Finish your tasks.</p>
      </div>

      {/* Panel kanan — form */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <Suspense fallback={<Skeleton className="h-96 w-full max-w-sm" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
