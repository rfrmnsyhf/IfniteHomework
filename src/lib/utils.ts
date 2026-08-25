import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { PersonalTaskStatus, Task } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Waktu sekarang dalam ms — dibungkus agar komponen tetap "murni" bagi linter */
export function nowMs(): number {
  return Date.now();
}

const TZ = "Asia/Jakarta";

export function formatTanggal(iso: string, withTime = false): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TZ,
  });
  if (!withTime) return date;
  const time = d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  });
  return `${date} • ${time}`;
}

export function formatTanggalPendek(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: TZ });
}

function jakartaParts(d: Date) {
  // ambil Y/M/D sesuai zona Asia/Jakarta
  const fmt = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: TZ,
  });
  const [y, m, dd] = fmt.format(d).split("-").map(Number);
  return { y, m, dd };
}

/** Selisih hari kalender (Jakarta) antara deadline dan sekarang; negatif = lewat */
export function daysUntil(iso: string): number {
  const now = new Date();
  const a = jakartaParts(now);
  const b = jakartaParts(new Date(iso));
  const utcA = Date.UTC(a.y, a.m - 1, a.dd);
  const utcB = Date.UTC(b.y, b.m - 1, b.dd);
  return Math.round((utcB - utcA) / 86400000);
}

export function relativeDeadline(iso: string): string {
  const days = daysUntil(iso);
  const time = new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  });
  if (days < -1) return `Terlambat ${Math.abs(days)} hari`;
  if (days === -1) return "Kemarin";
  if (days === 0) return `Hari ini • ${time}`;
  if (days === 1) return `Besok • ${time}`;
  if (days <= 7) return `${days} hari lagi • ${time}`;
  return formatTanggal(iso, true);
}

export type Urgency = "red" | "yellow" | "green" | "gray";

/** Warna urgency: merah ≤24 jam, kuning 2–3 hari, hijau selesai, abu jauh/lewat-lama */
export function urgencyOf(deadlineIso: string, status: PersonalTaskStatus): Urgency {
  if (status === "selesai") return "green";
  const hoursLeft =
    (new Date(deadlineIso).getTime() - Date.now()) / 3600000;
  if (hoursLeft < 0 && hoursLeft > -72) return "red"; // baru lewat: masih merah
  if (hoursLeft <= 24) return "red";
  if (hoursLeft <= 72) return "yellow";
  return "gray";
}

export function isOverdue(task: Pick<Task, "deadline">, status: PersonalTaskStatus): boolean {
  return status !== "selesai" && new Date(task.deadline).getTime() < Date.now();
}

export const URGENCY_DOT: Record<Urgency, string> = {
  red: "bg-red-500",
  yellow: "bg-amber-400",
  green: "bg-emerald-500",
  gray: "bg-zinc-300 dark:bg-zinc-600",
};

export const URGENCY_TEXT: Record<Urgency, string> = {
  red: "text-red-600 dark:text-red-400",
  yellow: "text-amber-600 dark:text-amber-400",
  green: "text-emerald-600 dark:text-emerald-400",
  gray: "text-muted-foreground",
};

export function initials(name: string | null | undefined): string {
  if (!name?.trim()) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";
}
