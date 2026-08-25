import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  FileText,
  Flag,
  User,
  Users,
} from "lucide-react";
import { getTaskById, getTaskSubmissions, getMySubmission } from "@/lib/data";
import { requireProfile } from "@/lib/auth";
import { PriorityBadge } from "@/components/features/badges";
import { StatusBadge } from "@/components/features/badges";
import { StatusSelect } from "@/components/features/status-select";
import { ChecklistList } from "@/components/features/checklist-list";
import { NotesEditor } from "@/components/features/notes-editor";
import { SubmissionPanel } from "@/components/features/submission-panel";
import { SubmissionsManager } from "@/components/features/submissions-manager";
import { AttachmentsSection } from "@/components/features/attachments-section";
import { TaskFormDialog } from "@/components/features/task-form-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getCourses } from "@/lib/data";
import { cn, formatTanggal, isOverdue, nowMs } from "@/lib/utils";

function cutoffOf(task: { deadline: string; submission_deadline: string | null }) {
  return task.submission_deadline ?? task.deadline;
}

export default async function TaskDetailPage({
  params,
}: PageProps<"/tugas/[id]">) {
  const { id } = await params;
  const profile = await requireProfile();
  const data = await getTaskById(id);
  if (!data || !data.task) notFound();

  const isAdmin = profile.role === "admin";
  const { task, attachments, checklist } = data;
  const overdue = isOverdue(task, task.my_status);
  const checklistPct =
    checklist.length > 0
      ? Math.round((checklist.filter((c) => c.completed).length / checklist.length) * 100)
      : null;

  const [courses, mySubmission, submissions] = await Promise.all([
    isAdmin ? getCourses() : Promise.resolve([] as never[]),
    profile.role === "mahasiswa" && task.allow_submission
      ? getMySubmission(task.id, profile.id)
      : Promise.resolve(null),
    isAdmin ? getTaskSubmissions(task.id) : Promise.resolve([] as never[]),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/tugas"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Kembali ke Tugas
        </Link>
        {isAdmin && <TaskFormDialog courses={courses} task={task} />}
      </div>

      {/* Header tugas */}
      <header className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">
          {task.course_name}
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{task.title}</h1>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <span className="flex items-center gap-1.5">
            <PriorityBadge priority={task.priority} />
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            {task.type === "individu" ? <User className="size-4" /> : <Users className="size-4" />}
            {task.type === "individu" ? "Individu" : "Kelompok"}
          </span>
          <span
            className={cn(
              "flex items-center gap-1.5",
              overdue ? "font-semibold text-red-600 dark:text-red-400" : "text-muted-foreground"
            )}
          >
            <CalendarClock className="size-4" />
            Deadline: {formatTanggal(task.deadline, true)}
          </span>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        {/* Kolom utama */}
        <div className="space-y-6">
          {task.description && (
            <Card className="gap-2 py-5">
              <CardHeader className="px-5">
                <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                  Deskripsi
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 text-sm leading-relaxed whitespace-pre-wrap">
                {task.description}
              </CardContent>
            </Card>
          )}

          {/* Attachment */}
          <Card className="gap-2 py-5">
            <CardHeader className="px-5">
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wide text-muted-foreground">
                <FileText className="size-4" /> Attachment
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5">
              <AttachmentsSection attachments={attachments} />
            </CardContent>
          </Card>

          {/* Checklist */}
          <Card className="gap-3 py-5">
            <CardHeader className="px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                  Checklist
                </CardTitle>
                {checklistPct !== null && (
                  <span className="text-xs font-medium text-muted-foreground">{checklistPct}%</span>
                )}
              </div>
              {checklistPct !== null && (
                <Progress value={checklistPct} className="mt-2" />
              )}
            </CardHeader>
            <CardContent className="px-5">
              <ChecklistList items={checklist} taskId={task.id} isAdmin={isAdmin} />
            </CardContent>
          </Card>

          {/* Catatan */}
          {!isAdmin && (
            <Card className="gap-2 py-5">
              <CardHeader className="px-5">
                <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                  Catatan Pribadi
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5">
                <NotesEditor taskId={task.id} initialNotes={task.my_notes ?? ""} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Kolom kanan */}
        <aside className="space-y-6">
          <Card className="gap-2 py-5">
            <CardHeader className="px-5">
              <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                Status Kamu
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-5">
              <StatusBadge status={task.my_status} />
              {overdue && (
                <p className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                  <Flag className="size-3.5" /> Melewati deadline — segera selesaikan!
                </p>
              )}
              <StatusSelect taskId={task.id} current={task.my_status} />
            </CardContent>
          </Card>

          {/* Submission */}
          {isAdmin ? (
            <Card className="gap-2 py-5">
              <CardHeader className="px-5">
                <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wide text-muted-foreground">
                  <CheckCircle2 className="size-4" /> Submission ({submissions.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5">
                <SubmissionsManager taskId={task.id} submissions={submissions} />
              </CardContent>
            </Card>
          ) : (
            task.allow_submission && (
              <Card className="gap-2 py-5">
                <CardHeader className="px-5">
                  <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                    Pengumpulan Tugas
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5">
                  <SubmissionPanel
                    taskId={task.id}
                    submission={mySubmission}
                    canSubmit={new Date(cutoffOf(task)).getTime() > nowMs()}
                    cutoffLabel={formatTanggal(cutoffOf(task), true)}
                  />
                </CardContent>
              </Card>
            )
          )}

          <p className="text-xs text-muted-foreground">
            Dibuat: {formatTanggal(task.created_at)}
          </p>
        </aside>
      </div>
    </div>
  );
}
