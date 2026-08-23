"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Download,
  FileUp,
  Loader2,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteMySubmission,
  getSubmissionDownloadUrl,
  upsertSubmission,
} from "@/lib/actions/submissions";
import { SubmissionBadge } from "@/components/features/badges";
import type { Submission } from "@/lib/types";
import { formatTanggal } from "@/lib/utils";

export function SubmissionPanel({
  taskId,
  submission,
  canSubmit,
  cutoffLabel,
}: {
  taskId: string;
  submission: Submission | null;
  canSubmit: boolean;
  cutoffLabel: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState(submission?.content ?? "");
  const [pending, startTransition] = useTransition();

  const locked = !!submission && submission.status === "graded";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (locked) return;
    const file = fileRef.current?.files?.[0] ?? null;
    startTransition(async () => {
      const res = await upsertSubmission({ taskId, content, file });
      if (res.error) {
        toast.error("Gagal mengumpulkan", { description: res.error });
        return;
      }
      toast.success("Submission terkirim");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const res = await deleteMySubmission(taskId);
      if (res.error) {
        toast.error("Gagal menghapus", { description: res.error });
        return;
      }
      toast.success("Submission dihapus");
      router.refresh();
    });
  }

  function download(id: string) {
    startTransition(async () => {
      const res = await getSubmissionDownloadUrl(id);
      if ("error" in res || !res.url) {
        toast.error("Gagal membuat link unduhan");
        return;
      }
      window.open(res.url, "_blank");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 text-sm">
        <p className="text-muted-foreground">Batas pengumpulan: {cutoffLabel}</p>
        {submission && <SubmissionBadge status={submission.status} />}
      </div>

      {!submission && !canSubmit && (
        <p className="text-sm text-muted-foreground">
          Pengumpulan tidak tersedia untuk tugas ini.
        </p>
      )}

      {locked ? (
        <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground">
            Tugas sudah dinilai — revisi ditutup.
          </p>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Feedback Admin
            </p>
            <p className="text-sm">{submission.feedback || "Tidak ada feedback tertulis."}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Dinilai: {submission.graded_at ? formatTanggal(submission.graded_at, true) : "-"}
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          {submission?.file_url && (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
              <FileUp className="size-4 text-primary" />
              <span className="truncate">{submission.file_url}</span>
              {submission.storage_path && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="ml-auto size-7"
                  onClick={() => download(submission.id)}
                  aria-label="Unduh"
                >
                  <Download className="size-4" />
                </Button>
              )}
              {canSubmit && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 hover:text-destructive"
                  onClick={remove}
                  aria-label="Hapus submission"
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          )}

          <Textarea
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Catatan pengumpulan (opsional)..."
            disabled={!canSubmit}
          />

          {canSubmit && (
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm"
                aria-label="Pilih file"
              />
              <Button type="submit" disabled={pending}>
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : submission ? (
                  <RefreshCw className="size-4" />
                ) : (
                  <Send className="size-4" />
                )}
                {submission ? "Kirim Revisi" : "Kumpulkan"}
              </Button>
              <span className="text-xs text-muted-foreground">Maks. 50 MB</span>
            </div>
          )}

          {submission && canSubmit && (
            <p className="text-xs text-muted-foreground">
              Terkirim: {formatTanggal(submission.submitted_at, true)} — kamu masih bisa mengirim
              revisi sampai dinilai admin.
            </p>
          )}
        </form>
      )}
    </div>
  );
}
