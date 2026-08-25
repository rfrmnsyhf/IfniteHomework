"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setMyTaskStatus } from "@/lib/actions/task-status";
import { STATUS_LABELS, type PersonalTaskStatus } from "@/lib/types";

const STATUSES = Object.keys(STATUS_LABELS) as PersonalTaskStatus[];

export function StatusSelect({
  taskId,
  current,
}: {
  taskId: string;
  current: PersonalTaskStatus;
}) {
  const [pending, startTransition] = useTransition();

  function change(value: PersonalTaskStatus | null) {
    if (!value) return;
    startTransition(async () => {
      const res = await setMyTaskStatus(taskId, value);
      if (res.error) toast.error("Gagal mengubah status", { description: res.error });
      else toast.success(`Status: ${STATUS_LABELS[value]}`);
    });
  }

  return (
    <Select value={current} onValueChange={change} disabled={pending}>
      <SelectTrigger size="sm" className="min-w-[130px] max-w-[160px] flex-1" aria-label="Status tugas">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {STATUS_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
