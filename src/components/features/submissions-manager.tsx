"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { gradeSubmission, getSubmissionDownloadUrl } from "@/lib/actions/submissions";
import { SubmissionBadge } from "@/components/features/badges";
import type { Submission } from "@/lib/types";
import { formatTanggal } from "@/lib/utils";

function SubmissionRow({ submission }: { submission: Submission }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [pending, startTransition] = useTransition();

  const graded = submission.status === "graded";

  function download() {
    startTransition(async () => {
      const res = await getSubmissionDownloadUrl(submission.id);
      if ("error" in res || !res.url) {
        toast.error("Gagal membuat link unduhan");
        return;
      }
      window.open(res.url, "_blank");
    });
  }

  function grade(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await gradeSubmission(submission.id, feedback);
      if (res.error) {
        toast.error("Gagal menilai", { description: res.error });
        return;
      }
      toast.success(`"${submission.student_name}" ditandai selesai dinilai`);
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-semibold">{submission.student_name ?? "-"}</p>
        <SubmissionBadge status={submission.status} />
        <span className="ml-auto text-xs text-muted-foreground">
          {formatTanggal(submission.submitted_at, true)}
        </span>
      </div>

      <dl className="mt-2 space-y-1 text-sm text-muted-foreground">
        {submission.content && (
          <div>
            <dt className="sr-only">Catatan</dt>
            <dd>{submission.content}</dd>
          </div>
        )}
        {submission.file_url && (
          <dd>
            <button
              type="button"
              onClick={download}
              className="font-medium text-primary hover:underline"
            >
              📎 {submission.file_url}
            </button>
          </dd>
        )}
      </dl>

      {!graded ? (
        <form onSubmit={grade} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Textarea
            rows={2}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Feedback untuk mahasiswa..."
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={pending} className="sm:self-end">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Nilai
          </Button>
        </form>
      ) : (
        <div className="mt-2 rounded-md bg-emerald-50 p-3 text-sm dark:bg-emerald-950/40">
          <p className="font-medium text-emerald-700 dark:text-emerald-400">Feedback:</p>
          <p>{submission.feedback || "-"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Dinilai {formatTanggal(submission.graded_at ?? submission.submitted_at, true)}
          </p>
        </div>
      )}
    </div>
  );
}

export function SubmissionsManager({
  taskId,
  submissions,
}: {
  taskId: string;
  submissions: Submission[];
}) {
  return (
    <div className="space-y-4">
      {submissions.length === 0 && (
        <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          Belum ada mahasiswa yang mengumpulkan.
        </p>
      )}
      {submissions.map((s) => (
        <SubmissionRow key={`${taskId}-${s.id}`} submission={s} />
      ))}
    </div>
  );
}
