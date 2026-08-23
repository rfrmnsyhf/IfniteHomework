"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TaskWithMeta } from "@/lib/types";
import {
  cn,
  formatTanggalPendek,
  URGENCY_DOT,
  urgencyOf,
} from "@/lib/utils";

interface DayCell {
  day: number;
  iso: string | null;
}

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function buildGrid(year: number, month0: number): DayCell[] {
  const first = new Date(Date.UTC(year, month0, 1));
  const startOffset = (first.getUTCDay() + 6) % 7; // Senin = 0
  const daysInMonth = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();

  const cells: DayCell[] = Array.from({ length: startOffset }, () => ({
    day: 0,
    iso: null,
  }));
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      iso: `${year}-${String(month0 + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    });
  }
  while (cells.length % 7 !== 0) cells.push({ day: 0, iso: null });
  return cells;
}

function jakartaDayKey(iso: string): string {
  // deadline ISO UTC → tanggal (Y-M-D) di zona Jakarta
  const fmt = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Jakarta",
  });
  return fmt.format(new Date(iso));
}

export type CalendarTask = Pick<
  TaskWithMeta,
  "id" | "title" | "deadline" | "my_status" | "course_name"
>;

export function CalendarMonth({
  tasks,
  year,
  month,
}: {
  tasks: CalendarTask[];
  year: number;
  /** 1-12 */
  month: number;
}) {
  const grid = useMemo(() => buildGrid(year, month - 1), [year, month]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarTask[]>();
    for (const t of tasks) {
      const key = jakartaDayKey(t.deadline);
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    return map;
  }, [tasks]);

  const todayKey = jakartaDayKey(new Date().toISOString());
  const [selected, setSelected] = useState<string>(todayKey);

  const selectedTasks = byDay.get(selected) ?? [];

  function prevMonth() {
    const m = month - 1;
    window.location.href =
      m < 1 ? `/kalender?m=${year - 1}-12` : `/kalender?m=${year}-${String(m).padStart(2, "0")}`;
  }
  function nextMonth() {
    const m = month + 1;
    window.location.href =
      m > 12 ? `/kalender?m=${year + 1}-01` : `/kalender?m=${year}-${String(m).padStart(2, "0")}`;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Grid kalender */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {MONTHS[month - 1]} {year}
          </h2>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" onClick={prevMonth} aria-label="Bulan sebelumnya">
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth} aria-label="Bulan berikutnya">
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {grid.map((cell, idx) => {
            if (!cell.iso) return <div key={idx} className="aspect-square" />;
            const dayTasks = byDay.get(cell.iso) ?? [];
            const urgencies = [...new Set(dayTasks.map((t) => urgencyOf(t.deadline, t.my_status)))];
            const isToday = cell.iso === todayKey;
            const isSelected = cell.iso === selected;
            return (
              <button
                key={cell.iso}
                onClick={() => setSelected(cell.iso!)}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border p-1 text-sm transition-colors hover:bg-muted",
                  isSelected && "border-primary bg-primary/5 ring-1 ring-primary"
                )}
              >
                <span
                  className={cn(
                    "grid size-6 place-items-center rounded-full",
                    isToday && "bg-primary font-bold text-primary-foreground"
                  )}
                >
                  {cell.day}
                </span>
                {dayTasks.length > 0 && (
                  <span className="flex gap-0.5">
                    {(urgencies.length > 3 ? urgencies.slice(0, 3) : urgencies).map((u) => (
                      <span key={u} className={cn("size-1.5 rounded-full", URGENCY_DOT[u])} />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", URGENCY_DOT.red)} /> ≤24 jam
          </span>
          <span className="flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", URGENCY_DOT.yellow)} /> 2–3 hari
          </span>
          <span className="flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", URGENCY_DOT.green)} /> Selesai
          </span>
          <span className="flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", URGENCY_DOT.gray)} /> Masih jauh
          </span>
        </div>
      </div>

      {/* Panel tanggal terpilih */}
      <aside className="rounded-xl border p-4">
        <h3 className="mb-3 font-semibold">{formatTanggalPendek(`${selected}T00:00:00+07:00`)} {year}</h3>
        {selectedTasks.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Tidak ada deadline di tanggal ini.
          </p>
        ) : (
          <ul className="space-y-3">
            {selectedTasks.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/tugas/${t.id}`}
                  className="block rounded-lg border p-3 transition-colors hover:border-primary/40 hover:bg-muted/40"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t.course_name}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold leading-snug">{t.title}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        URGENCY_DOT[urgencyOf(t.deadline, t.my_status)]
                      )}
                    />
                    {new Date(t.deadline).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                      timeZone: "Asia/Jakarta",
                    })}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
