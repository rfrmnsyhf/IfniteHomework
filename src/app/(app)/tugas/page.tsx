import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { getCourses, getMyTasks } from "@/lib/data";
import { requireProfile } from "@/lib/auth";
import { EmptyState } from "@/components/features/empty-state";
import { FilterSelect } from "@/components/features/filter-select";
import { TaskCard } from "@/components/features/task-card";
import { TaskFormDialog } from "@/components/features/task-form-dialog";
import { cn, isOverdue } from "@/lib/utils";
import type { PersonalTaskStatus } from "@/lib/types";

const TABS = [
  { key: "semua", label: "Semua" },
  { key: "belum", label: "Belum" },
  { key: "progress", label: "Progress" },
  { key: "selesai", label: "Selesai" },
  { key: "terlambat", label: "Terlambat" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function matchTab(t: PersonalTaskStatus, overdue: boolean, tab: TabKey): boolean {
  switch (tab) {
    case "semua":
      return true;
    case "belum":
      return t === "belum_dikerjakan";
    case "progress":
      return t === "sedang_dikerjakan" || t === "menunggu_review";
    case "selesai":
      return t === "selesai";
    case "terlambat":
      return overdue && t !== "selesai";
  }
}

export default async function TugasPage({
  searchParams,
}: PageProps<"/tugas">) {
  const sp = await searchParams;
  const tab = (typeof sp.tab === "string" ? sp.tab : "semua") as TabKey;
  const courseFilter = typeof sp.course === "string" ? sp.course : "";
  const priorityFilter = typeof sp.priority === "string" ? sp.priority : "";

  const [profile, allTasks, courses] = await Promise.all([
    requireProfile(),
    getMyTasks(),
    getCourses(),
  ]);
  const isAdmin = profile.role === "admin";

  const filtered = allTasks.filter((t) => {
    if (!matchTab(t.my_status, isOverdue(t, t.my_status), tab)) return false;
    if (courseFilter && t.course_id !== courseFilter) return false;
    if (priorityFilter && t.priority !== priorityFilter) return false;
    return true;
  });

  function linkWith(patch: Partial<Record<"tab" | "course" | "priority", string>>) {
    const params = new URLSearchParams();
    const merged = { tab, course: courseFilter, priority: priorityFilter, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v && k !== "tab") params.set(k, v);
    params.set("tab", merged.tab);
    const qs = params.toString().replace(/^tab=/, "");
    return `/tugas?${qs}`;
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tugas</h1>
          <p className="text-sm text-muted-foreground">
            Semua tugas kelas dalam satu tempat.
          </p>
        </div>
        {isAdmin && <TaskFormDialog courses={courses} />}
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((tb) => (
          <Link
            key={tb.key}
            href={linkWith({ tab: tb.key })}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              tab === tb.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {tb.label}
          </Link>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <FilterSelect
          paramKey="course"
          placeholder="Semua Mata Kuliah"
          options={courses.map((c) => ({ value: c.id, label: c.name }))}
        />
        <FilterSelect
          paramKey="priority"
          placeholder="Semua Prioritas"
          options={[
            { value: "tinggi", label: "Tinggi" },
            { value: "sedang", label: "Sedang" },
            { value: "rendah", label: "Rendah" },
          ]}
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Tidak ada tugas di filter ini"
          description="Coba ubah tab atau filter mata kuliah/prioritas."
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t) => (
            <TaskCard key={t.id} task={t} />
          ))}
        </div>
      )}
    </div>
  );
}
