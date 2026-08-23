import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, GraduationCap, Plus } from "lucide-react";
import { getCourses, getTasksByCourse } from "@/lib/data";
import { requireProfile } from "@/lib/auth";
import { PriorityBadge, StatusBadge } from "@/components/features/badges";
import { EmptyState } from "@/components/features/empty-state";
import { TaskFormDialog } from "@/components/features/task-form-dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatTanggalPendek } from "@/lib/utils";

export default async function CourseDetailPage({
  params,
}: PageProps<"/mata-kuliah/[id]">) {
  const { id } = await params;
  const profile = await requireProfile();
  const isAdmin = profile.role === "admin";

  const courses = await getCourses();
  const course = courses.find((c) => c.id === id);
  if (!course) notFound();

  const tasks = await getTasksByCourse(id);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/mata-kuliah"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Kembali ke Mata Kuliah
      </Link>

      <header className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">
          Mata Kuliah
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{course.name}</h1>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <GraduationCap className="size-4" />
          {course.lecturer_name ?? "Dosen belum ditentukan"}
        </p>
      </header>

      {/* Statistik workload */}
      <section className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: "Total Tugas", value: tasks.length },
          {
            label: "Selesai",
            value: tasks.filter((t) => t.my_status === "selesai").length,
            cls: "text-emerald-600 dark:text-emerald-400",
          },
          {
            label: "Berjalan",
            value: tasks.filter((t) => t.my_status !== "selesai").length,
            cls: "text-blue-600 dark:text-blue-400",
          },
        ].map((s) => (
          <Card key={s.label} className="py-5 text-center">
            <CardContent className="px-3">
              <p className={`text-2xl font-bold leading-none ${s.cls ?? ""}`}>{s.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Daftar tugas */}
      <Card className="gap-0 py-0">
        <CardHeader className="flex-row items-center justify-between border-b bg-muted/30 py-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide">
            Daftar Tugas
          </CardTitle>
          {isAdmin && <TaskFormDialog courses={courses} />}
        </CardHeader>
        <CardContent className="px-0 py-0">
          {tasks.length === 0 ? (
            <EmptyState icon={Plus} title="Belum ada tugas untuk mata kuliah ini" />
          ) : (
            <ul className="divide-y">
              {tasks.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/tugas/${t.id}`}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
                  >
                    <span
                      aria-hidden
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: course.color ?? "#71717a" }}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {t.title}
                    </span>
                    <PriorityBadge priority={t.priority} className="hidden sm:inline-flex" />
                    <StatusBadge status={t.my_status} className="hidden md:inline-flex" />
                    <span className="w-14 shrink-0 text-right text-xs text-muted-foreground">
                      {formatTanggalPendek(t.deadline)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
