import Link from "next/link";
import { CalendarClock, ChevronRight, User, Users } from "lucide-react";
import { PriorityBadge, StatusBadge } from "@/components/features/badges";
import { StatusSelect } from "@/components/features/status-select";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import type { TaskWithMeta } from "@/lib/types";
import { cn, isOverdue, relativeDeadline } from "@/lib/utils";

export function TaskCard({ task, showStatusSelect = true }: { task: TaskWithMeta; showStatusSelect?: boolean }) {
  const overdue = isOverdue(task, task.my_status);

  return (
    <Card className="group relative flex h-full flex-col overflow-hidden pt-0 transition-shadow hover:shadow-md">
      <span
        aria-hidden
        className="h-1 w-full"
        style={{ backgroundColor: task.course_color ?? "#71717a" }}
      />
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {task.course_name}
          </p>
          <PriorityBadge priority={task.priority} />
        </div>
        <Link href={`/tugas/${task.id}`} className="block">
          <h3 className="font-semibold leading-snug group-hover:text-primary">
            {task.title}
          </h3>
        </Link>
      </CardHeader>
      <CardContent className="flex-1 space-y-4 text-sm">
        <div
          className={cn(
            "flex items-center gap-2",
            overdue ? "font-medium text-red-600 dark:text-red-400" : "text-muted-foreground"
          )}
        >
          <CalendarClock className="size-4 shrink-0" />
          Deadline: {relativeDeadline(task.deadline)}
        </div>
        <div className="flex items-center gap-4 text-muted-foreground">
          <span className="flex items-center gap-1.5 text-xs">
            {task.type === "individu" ? (
              <>
                <User className="size-3.5" /> Individu
              </>
            ) : (
              <>
                <Users className="size-3.5" /> Kelompok
              </>
            )}
          </span>
          {task.checklist_total > 0 && (
            <span className="text-xs">
              Checklist: {task.checklist_done}/{task.checklist_total}
            </span>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/30 py-4">
        <StatusBadge status={task.my_status} />
        {showStatusSelect && <StatusSelect taskId={task.id} current={task.my_status} />}
        {!showStatusSelect && (
          <Link
            href={`/tugas/${task.id}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Detail <ChevronRight className="size-4" />
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}
