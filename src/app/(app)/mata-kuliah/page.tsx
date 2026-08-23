import Link from "next/link";
import { ArrowRight, BookOpen, GraduationCap } from "lucide-react";
import { getCourses } from "@/lib/data";
import { requireAdmin, requireProfile } from "@/lib/auth";
import { CourseFormDialog } from "@/components/features/course-form-dialog";
import { EmptyState } from "@/components/features/empty-state";
import { Card, CardContent } from "@/components/ui/card";

export default async function MataKuliahPage() {
  const profile = await requireProfile();
  const isAdmin = profile.role === "admin";
  if (isAdmin) await requireAdmin(); // no-op guard untuk konsistensi
  const courses = await getCourses();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mata Kuliah</h1>
          <p className="text-sm text-muted-foreground">Workload tugas per mata kuliah.</p>
        </div>
        {isAdmin && <CourseFormDialog />}
      </header>

      {courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Belum ada mata kuliah"
          description={isAdmin ? "Tambahkan mata kuliah pertama." : "Menunggu admin menambahkan mata kuliah."}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((c) => (
            <Card key={c.id} className="group gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md">
              <span aria-hidden className="h-1.5 w-full" style={{ backgroundColor: c.color ?? "#71717a" }} />
              <CardContent className="space-y-4 p-5">
                <div>
                  <h2 className="font-bold leading-snug group-hover:text-primary">{c.name}</h2>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <GraduationCap className="size-4" />
                    {c.lecturer_name ?? "Dosen belum ditentukan"}
                  </p>
                </div>

                <div className="grid grid-cols-3 divide-x rounded-lg border text-center">
                  <div className="px-2 py-2">
                    <p className="text-lg font-bold leading-none">{c.total}</p>
                    <p className="text-[11px] text-muted-foreground">Total Tugas</p>
                  </div>
                  <div className="px-2 py-2">
                    <p className="text-lg font-bold leading-none text-emerald-600 dark:text-emerald-400">
                      {c.done}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Selesai</p>
                  </div>
                  <div className="px-2 py-2">
                    <p className="text-lg font-bold leading-none text-blue-600 dark:text-blue-400">
                      {c.total - c.done}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Berjalan</p>
                  </div>
                </div>

                <Link
                  href={`/mata-kuliah/${c.id}`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  Buka Mata Kuliah <ArrowRight className="size-4" />
                </Link>
                {isAdmin && (
                  <div className="pt-1">
                    <CourseFormDialog course={c} />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
