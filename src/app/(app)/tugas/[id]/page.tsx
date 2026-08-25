import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, CheckCircle2, FileText, Flag, User, Users } from "lucide-react";
import { Suspense } from "react";
import { getTaskHeader, getTaskAttachments, getTaskChecklist, getTaskSubmissions, getMySubmission } from "@/lib/data";
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
import { Button } from "@/components/ui/button";
import { getCourses } from "@/lib/data";
import { cn, formatTanggal, isOverdue, nowMs } from "@/lib/utils";
import { DeleteTaskButton } from "@/components/features/delete-task-button";
import type { PersonalTaskStatus } from "@/lib/types";

function cutoffOf(task: { deadline: string; submission_deadline: string | null }) {
  return task.submission_deadline ?? task.deadline;
}

import type { Profile } from "@/lib/types";

interface TaskHeader {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  deadline: string;
  priority: string;
  type: string;
  allow_submission: boolean;
  submission_deadline: string | null;
  created_by: string | null;
  created_at: string;
  course: { name: string; color: string | null } | null;
  my_status?: string;
  my_notes?: string | null;
}

async function TaskMetaSections({ taskId, isAdmin, profile, task }: { taskId: string; isAdmin: boolean; profile: Profile; task: TaskHeader }) {
  const [attachments, checklist, submissions, mySubmission] = await Promise.all([
    getTaskAttachments(taskId),
    getTaskChecklist(taskId),
    isAdmin ? getTaskSubmissions(taskId) : Promise.resolve([]),
    !task.allow_submission ? Promise.resolve(null) : getMySubmission(taskId, profile.id),
  ]);

  const pct = checklist.length > 0 ? Math.round((checklist.filter((c) => c.completed).length / checklist.length) * 100) : null;

  return (
    <>
      {task.description && (
        <Card className="gap-2 py-5">
          <CardHeader className="px-5"><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Deskripsi</CardTitle></CardHeader>
          <CardContent className="px-5 text-sm leading-relaxed whitespace-pre-wrap">{task.description}</CardContent>
        </Card>
      )}
      <Card className="gap-3 py-5">
        <CardHeader className="px-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Checklist</CardTitle>
            {pct !== null && <span className="text-xs font-medium text-muted-foreground">{pct}%</span>}
          </div>
          {pct !== null && <Progress value={pct} className="mt-2" />}
        </CardHeader>
        <CardContent className="px-5">
          <ChecklistList items={checklist} taskId={taskId} isAdmin={isAdmin} />
        </CardContent>
      </Card>
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
      {!isAdmin && (
        <Card className="gap-2 py-5">
          <CardHeader className="px-5"><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Catatan Pribadi</CardTitle></CardHeader>
          <CardContent className="px-5"><NotesEditor taskId={task.id} initialNotes={task.my_notes ?? ""} /></CardContent>
        </Card>
      )}

<Card className="gap-2 py-5">
        <CardHeader className="px-5"><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Status Kamu</CardTitle></CardHeader>
        <CardContent className="space-y-3 px-5">
          <StatusBadge status={(task.my_status ?? "belum_dikerjakan") as PersonalTaskStatus} />
          {isOverdue(task, (task.my_status ?? "belum_dikerjakan") as PersonalTaskStatus) && <p className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400"><Flag className="size-3.5" /> Melewati deadline — segera selesaikan!</p>}
          <StatusSelect taskId={task.id} current={(task.my_status ?? "belum_dikerjakan") as PersonalTaskStatus} />
        </CardContent>
      </Card>
      {isAdmin && submissions.length > 0 && (
        <Card className="gap-2 py-5">
          <CardHeader className="px-5">
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wide text-muted-foreground">
              <CheckCircle2 className="size-4" /> Submission ({submissions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5">
            <SubmissionsManager taskId={taskId} submissions={submissions} />
          </CardContent>
        </Card>
      )}
      {!isAdmin && task.allow_submission && (
        <Card className="gap-2 py-5">
          <CardHeader className="px-5">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Pengumpulan Tugas</CardTitle>
          </CardHeader>
          <CardContent className="px-5">
            <SubmissionPanel taskId={taskId} submission={mySubmission} canSubmit={new Date(cutoffOf(task)).getTime() > nowMs()} cutoffLabel={formatTanggal(cutoffOf(task), true)} />
          </CardContent>
        </Card>
      )}
      <p className="text-xs text-muted-foreground">Dibuat: {formatTanggal(task.created_at)}</p>
    </>
  );
}

async function AdminEditButton({ task }: { task: TaskHeader }) {
  const courses = await getCourses();
  return <TaskFormDialog courses={courses as never} task={task as never} />;
}

async function TaskDetailInner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const isAdmin = profile.role === "admin";

  const task = await getTaskHeader(id);
  if (!task) notFound();

  const overdue = isOverdue(task, "belum_dikerjakan");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/tugas" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Kembali ke Tugas
        </Link>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Suspense fallback={<Button variant="outline" size="sm" disabled>Edit Tugas</Button>}>
              <AdminEditButton task={task} />
            </Suspense>
          )}
          {isAdmin && <DeleteTaskButton taskId={task.id} title={task.title} />}
        </div>
      </div>
      <header className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">{task.course?.name ?? "-"}</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{task.title}</h1>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <span className="flex items-center gap-1.5"><PriorityBadge priority={task.priority} /></span>
          <span className="flex items-center gap-1.5 text-muted-foreground">{task.type === "individu" ? <User className="size-4" /> : <Users className="size-4" />}{task.type === "individu" ? "Individu" : "Kelompok"}</span>
          <span className={cn("flex items-center gap-1.5", overdue ? "font-semibold text-red-600 dark:text-red-400" : "text-muted-foreground")}>
            <CalendarClock className="size-4" /> Deadline: {formatTanggal(task.deadline, true)}
          </span>
        </div>
      </header>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <TaskMetaSections taskId={id} isAdmin={isAdmin} profile={profile} task={task} />
      </Suspense>
    </div>
  );
}

export default function TaskDetailPage({ params }: PageProps<"/tugas/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <TaskDetailInner params={params} />
    </Suspense>
  );
}

function Loading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Skeleton className="h-6 w-32" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}