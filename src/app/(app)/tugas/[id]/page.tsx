import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, CheckCircle2, FileText, Flag, User, Users } from "lucide-react";
import { Suspense } from "react";
import { getTaskCore, getTaskAttachments, getTaskChecklist, getTaskSubmissions, getMySubmission } from "@/lib/data";
import { requireProfile } from "@/lib/auth";
import { PriorityBadge, StatusBadge } from "@/components/features/badges";
import { StatusSelect } from "@/components/features/status-select";
import { ChecklistList } from "@/components/features/checklist-list";
import { NotesEditor } from "@/components/features/notes-editor";
import { SubmissionPanel } from "@/components/features/submission-panel";
import { SubmissionsManager } from "@/components/features/submissions-manager";
import { AttachmentsSection } from "@/components/features/attachments-section";
import { TaskFormDialog } from "@/components/features/task-form-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { getCourses } from "@/lib/data";
import { cn, formatTanggal, isOverdue, nowMs } from "@/lib/utils";

function cutoffOf(task: { deadline: string; submission_deadline: string | null }) {
  return task.submission_deadline ?? task.deadline;
}
async function ChecklistSection({ taskId, isAdmin }: { taskId: string; isAdmin: boolean }) {
  const items = await getTaskChecklist(taskId);
  const pct = items.length > 0 ? Math.round((items.filter((c) => c.completed).length / items.length) * 100) : null;
  return (
    <Card className="gap-3 py-5">
      <CardHeader className="px-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Checklist</CardTitle>
          {pct !== null && <span className="text-xs font-medium text-muted-foreground">{pct}%</span>}
        </div>
        {pct !== null && <Progress value={pct} className="mt-2" />}
      </CardHeader>
      <CardContent className="px-5">
        <ChecklistList items={items} taskId={taskId} isAdmin={isAdmin} />
      </CardContent>
    </Card>
  );
}
async function AttachmentsSectionWrapper({ taskId }: { taskId: string }) {
  const atts = await getTaskAttachments(taskId);
  return (
    <Card className="gap-2 py-5">
      <CardHeader className="px-5">
        <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wide text-muted-foreground">
          <FileText className="size-4" /> Attachment
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5">
        <AttachmentsSection attachments={atts} />
      </CardContent>
    </Card>
  );
}
async function SubmissionSection({ taskId, isAdmin, userId, allow, cutoff }: { taskId: string; isAdmin: boolean; userId: string; allow: boolean; cutoff: string }) {
  if (isAdmin) {
    const subs = await getTaskSubmissions(taskId);
    return (
      <Card className="gap-2 py-5">
        <CardHeader className="px-5">
          <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wide text-muted-foreground">
            <CheckCircle2 className="size-4" /> Submission ({subs.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5">
          <SubmissionsManager taskId={taskId} submissions={subs} />
        </CardContent>
      </Card>
    );
  }
  if (!allow) return null;
  const sub = await getMySubmission(taskId, userId);
  return (
    <Card className="gap-2 py-5">
      <CardHeader className="px-5">
        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Pengumpulan Tugas</CardTitle>
      </CardHeader>
      <CardContent className="px-5">
        <SubmissionPanel taskId={taskId} submission={sub} canSubmit={new Date(cutoff).getTime() > nowMs()} cutoffLabel={formatTanggal(cutoff, true)} />
      </CardContent>
    </Card>
  );
}

export default async function TaskDetailPage({ params }: PageProps<"/tugas/[id]">) {
  const { id } = await params;
  const profile = await requireProfile();
  const isAdmin = profile.role === "admin";
  const [task, courses] = await Promise.all([getTaskCore(id), isAdmin ? getCourses() : Promise.resolve([] as never[])]);
  if (!task) notFound();
  const overdue = isOverdue(task, task.my_status);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/tugas" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Kembali ke Tugas
        </Link>
        {isAdmin && <TaskFormDialog courses={courses as never} task={task} />}
      </div>
      <header className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">{task.course_name}</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{task.title}</h1>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <span className="flex items-center gap-1.5"><PriorityBadge priority={task.priority} /></span>
          <span className="flex items-center gap-1.5 text-muted-foreground">{task.type === "individu" ? <User className="size-4" /> : <Users className="size-4" />}{task.type === "individu" ? "Individu" : "Kelompok"}</span>
          <span className={cn("flex items-center gap-1.5", overdue ? "font-semibold text-red-600 dark:text-red-400" : "text-muted-foreground")}>
            <CalendarClock className="size-4" /> Deadline: {formatTanggal(task.deadline, true)}
          </span>
        </div>
      </header>
      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          {task.description && (
            <Card className="gap-2 py-5">
              <CardHeader className="px-5"><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Deskripsi</CardTitle></CardHeader>
              <CardContent className="px-5 text-sm leading-relaxed whitespace-pre-wrap">{task.description}</CardContent>
            </Card>
          )}
          <Suspense fallback={<Skeleton className="h-24 w-full" />}><AttachmentsSectionWrapper taskId={task.id} /></Suspense>
          <Suspense fallback={<Skeleton className="h-32 w-full" />}><ChecklistSection taskId={task.id} isAdmin={isAdmin} /></Suspense>
          {!isAdmin && (
            <Card className="gap-2 py-5">
              <CardHeader className="px-5"><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Catatan Pribadi</CardTitle></CardHeader>
              <CardContent className="px-5"><NotesEditor taskId={task.id} initialNotes={task.my_notes ?? ""} /></CardContent>
            </Card>
          )}
        </div>
        <aside className="space-y-6">
          <Card className="gap-2 py-5">
            <CardHeader className="px-5"><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Status Kamu</CardTitle></CardHeader>
            <CardContent className="space-y-3 px-5">
              <StatusBadge status={task.my_status} />
              {overdue && <p className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400"><Flag className="size-3.5" /> Melewati deadline — segera selesaikan!</p>}
              <StatusSelect taskId={task.id} current={task.my_status} />
            </CardContent>
          </Card>
          <Suspense fallback={<Skeleton className="h-32 w-full" />}>
            <SubmissionSection taskId={task.id} isAdmin={isAdmin} userId={profile.id} allow={task.allow_submission} cutoff={cutoffOf(task)} />
          </Suspense>
          <p className="text-xs text-muted-foreground">Dibuat: {formatTanggal(task.created_at)}</p>
        </aside>
      </div>
    </div>
  );
}
