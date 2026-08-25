import { CalendarDays } from "lucide-react";
import { getTasksInRange } from "@/lib/data";
import { requireProfile } from "@/lib/auth";
import { CalendarMonth } from "@/components/features/calendar-month";
import { EmptyState } from "@/components/features/empty-state";

function parseMonthParam(m: string | undefined): { year: number; month: number } {
  const now = new Date();
  const def = { year: now.getFullYear(), month: now.getMonth() + 1 };
  if (!m) return def;
  const match = m.match(/^(\d{4})-(\d{2})$/);
  if (!match) return def;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return def;
  return { year, month };
}

export default async function KalenderPage({ searchParams }: PageProps<"/kalender">) {
  await requireProfile();
  const sp = await searchParams;
  const { year, month } = parseMonthParam(typeof sp.m === "string" ? sp.m : undefined);

  // rentang bulan dalam offset Jakarta (UTC+7)
  const startIso = new Date(`${year}-${String(month).padStart(2, "0")}T00:00:00+07:00`).toISOString();
  const endDate = new Date(year, month, 0); // hari terakhir bulan (lokal server)
  const endIso = new Date(
    `${year}-${String(month).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}T23:59:59+07:00`
  ).toISOString();

  const tasks = await getTasksInRange(startIso, endIso);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold tracking-tight">Kalender Akademik</h1>
        <p className="text-sm text-muted-foreground">
          Klik tanggal untuk melihat deadline di hari tersebut.
        </p>
      </header>

      {tasks.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Belum ada tugas"
          description="Kalender akan menampilkan titik warna sesuai urgency deadline."
        />
      ) : null}

      <CalendarMonth
        tasks={tasks.map((t) => ({
          id: t.id,
          title: t.title,
          deadline: t.deadline,
          my_status: t.my_status,
          course_name: t.course_name,
        }))}
        year={year}
        month={month}
      />
    </div>
  );
}
