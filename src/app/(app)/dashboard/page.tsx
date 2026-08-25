import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Hourglass,
  Inbox,
} from "lucide-react";
import {
  getClassProgress,
  getMyTasks,
} from "@/lib/data";
import { getMyClass, requireProfile } from "@/lib/auth";
import { EmptyState } from "@/components/features/empty-state";
import { TaskCard } from "@/components/features/task-card";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { TaskWithMeta } from "@/lib/types";
import { cn, nowMs, relativeDeadline } from "@/lib/utils";

function StatCard({
  value,
  label,
  icon: Icon,
  accent,
}: {
  value: string | number;
  label: string;
  icon: React.ElementType;
  accent?: "red" | "green" | "primary";
}) {
  return (
    <Card className="gap-0 py-5">
      <CardContent className="flex items-center gap-4 px-5">
        <div
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-xl",
            accent === "red"
              ? "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
              : accent === "green"
                ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                : "bg-primary/10 text-primary"
          )}
        >
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const profile = await requireProfile();
  const [kelas, tasks] = await Promise.all([getMyClass(), getMyTasks()]);
  const isAdmin = profile.role === "admin";
  const classProgress = isAdmin ? await getClassProgress() : null;

  const now = nowMs();
  const notDone = tasks.filter((t) => t.my_status !== "selesai");
  const active = notDone.filter((t) => new Date(t.deadline).getTime() >= now);
  const overdue = notDone.filter((t) => new Date(t.deadline).getTime() < now);
  const urgent48 = active.filter((t) => new Date(t.deadline).getTime() - now <= 48 * 3600000);
  const urgent24 = active.filter((t) => new Date(t.deadline).getTime() - now <= 24 * 3600000);
  const doneCount = tasks.length - notDone.length;
  const progressPct =
    tasks.length === 0 ? 0 : Math.round((doneCount / tasks.length) * 100);

  const nearest = [...active].sort(
    (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
  )[0];
  const thisWeek = tasks.filter((t) => {
    const diff = new Date(t.deadline).getTime() - now;
    return diff > -24 * 3600000 && diff <= 7 * 86400000;
  });

  const todayLabel = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Selamat datang, {profile.name.split(" ")[0]}
        </h1>
        <p className="text-sm text-muted-foreground">
          {kelas
            ? `${kelas.code} • Semester ${kelas.semester}`
            : "Belum tergabung dalam kelas"}
          {" • "}
          {todayLabel}
        </p>
      </header>

      {/* Banner urgent */}
      {urgent24.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600 dark:text-red-400" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-red-700 dark:text-red-300">
              URGENT — {urgent24.length} tugas deadline ≤ 24 jam
            </p>
            <ul className="mt-1 space-y-0.5 text-sm text-red-600/90 dark:text-red-400/90">
              {urgent24.slice(0, 3).map((t) => (
                <li key={t.id} className="truncate">
                  ⚠ {t.course_name} — {t.title} ({relativeDeadline(t.deadline)})
                </li>
              ))}
              {urgent24.length > 3 && (
                <li className="text-xs">+{urgent24.length - 3} lainnya di halaman Tugas</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Statistik */}
      <section className="grid grid-cols-2 gap-5 xl:grid-cols-4">
        <StatCard value={active.length} label="Tugas Aktif" icon={Inbox} />
        <StatCard value={urgent48.length} label="Deadline < 48 Jam" icon={CalendarClock} accent={urgent48.length > 0 ? "red" : undefined} />
        <StatCard value={`${progressPct}%`} label="Progress Kamu" icon={Hourglass} accent="green" />
        <StatCard value={overdue.length} label="Terlambat" icon={AlertTriangle} accent={overdue.length > 0 ? "red" : undefined} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Deadline terdekat */}
        <Card className="h-fit gap-0 overflow-hidden py-0">
          <CardHeader className="border-b bg-muted/30 py-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide">
              Deadline Terdekat
            </CardTitle>
          </CardHeader>
          {nearest ? (
            <CardContent className="space-y-4 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {nearest.course_name}
                </p>
                <h3 className="mt-1 text-lg font-bold leading-snug">{nearest.title}</h3>
              </div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 dark:text-red-400">
                  <CalendarClock className="size-4" />
                  {relativeDeadline(nearest.deadline)}
                </span>
                <StatusChip status={nearest.my_status} />
              </div>
              <Progress
                value={
                  nearest.checklist_total > 0
                    ? Math.round((nearest.checklist_done / nearest.checklist_total) * 100)
                    : nearest.my_status === "selesai"
                      ? 100
                      : 0
                }
              />
              <Link href={`/tugas/${nearest.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                Lihat Tugas <ArrowRight className="size-4" />
              </Link>
            </CardContent>
          ) : (
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Tidak ada deadline mendatang. Nikmati waktunya! 🎉
            </CardContent>
          )}
        </Card>

        {/* Tugas minggu ini */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Tugas Minggu Ini</h2>
            <Link href="/tugas" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Semua Tugas <ArrowRight className="size-4" />
            </Link>
          </div>
          {thisWeek.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Tidak ada tugas minggu ini"
              description="Semua deadline sudah aman. Cek halaman Kalender untuk rencana ke depan."
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
              {thisWeek.slice(0, 6).map((t) => (
                <TaskCard key={t.id} task={t} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Progres kelas (admin saja) */}
      {isAdmin && classProgress && classProgress.perTask.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-semibold">Progres Kelas</h2>
          <Card className="py-5">
            <CardContent className="px-5">
              <ul className="divide-y">
                {classProgress.perTask.slice(0, 6).map((t) => {
                  const pct =
                    t.total_students === 0
                      ? 0
                      : Math.round((t.done / t.total_students) * 100);
                  return (
                    <li key={t.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{t.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{t.course_name}</p>
                      </div>
                      <div className="hidden w-40 sm:block">
                        <Progress value={pct} />
                      </div>
                      <p className="w-28 shrink-0 text-right text-xs text-muted-foreground">
                        {t.done}/{t.total_students} selesai
                      </p>
                      {t.not_started > 0 && (
                        <span className="hidden w-20 shrink-0 text-right text-xs font-medium text-red-500 md:block">
                          ⚠ {t.not_started} belum mulai
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Kosong total */}
      {tasks.length === 0 && (
        <EmptyState
          icon={ClipboardList}
          title="Belum ada tugas"
          description={
            isAdmin
              ? "Buat tugas pertama dari halaman Mata Kuliah atau Tugas."
              : "Tunggu admin membagikan tugas pertama."
          }
        />
      )}
    </div>
  );
}

function StatusChip({ status }: { status: TaskWithMeta["my_status"] }) {
  const labels: Record<string, string> = {
    belum_dikerjakan: "Belum Dikerjakan",
    sedang_dikerjakan: "Sedang Dikerjakan",
    menunggu_review: "Menunggu Review",
    selesai: "Selesai",
  };
  const styles: Record<string, string> = {
    belum_dikerjakan: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
    sedang_dikerjakan: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
    menunggu_review: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400",
    selesai: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  };
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", styles[status])}>
      {labels[status]}
    </span>
  );
}
