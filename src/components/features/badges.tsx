import { cn } from "@/lib/utils";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  SUBMISSION_LABELS,
  TYPE_LABELS,
  type PersonalTaskStatus,
  type SubmissionStatus,
  type TaskPriority,
  type TaskType,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  tinggi: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900",
  sedang:
    "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-900",
  rendah: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
};

const STATUS_STYLE: Record<PersonalTaskStatus, string> = {
  belum_dikerjakan: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  sedang_dikerjakan: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  menunggu_review: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400",
  selesai: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
};

const SUBMISSION_STYLE: Record<SubmissionStatus, string> = {
  submitted: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  revised: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  graded: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
};

export function PriorityBadge({
  priority,
  className,
}: {
  priority: TaskPriority;
  className?: string;
}) {
  const dot =
    priority === "tinggi"
      ? "bg-red-500"
      : priority === "sedang"
        ? "bg-amber-500"
        : "bg-zinc-400";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        PRIORITY_STYLE[priority],
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", dot)} />
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

export function StatusBadge({
  status,
  className,
}: {
  status: PersonalTaskStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLE[status],
        className
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function TypeBadge({ type, className }: { type: TaskType; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs text-muted-foreground",
        className
      )}
    >
      {TYPE_LABELS[type]}
    </span>
  );
}

export function SubmissionBadge({
  status,
  className,
}: {
  status: SubmissionStatus;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(SUBMISSION_STYLE[status], className)}>
      {SUBMISSION_LABELS[status]}
    </Badge>
  );
}
