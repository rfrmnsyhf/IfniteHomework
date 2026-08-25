import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyUsers } from "@/lib/notify";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const horizon = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const { data: tasks, error: taskErr } = await admin
    .from("tasks")
    .select("id, title, deadline, course_id")
    .gte("deadline", now.toISOString())
    .lte("deadline", horizon.toISOString());

  if (taskErr) {
    return NextResponse.json({ error: taskErr.message }, { status: 500 });
  }
  if (!tasks || tasks.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  let totalSent = 0;

  for (const task of tasks) {
    const { data: course } = await admin
      .from("courses")
      .select("class_id")
      .eq("id", task.course_id)
      .maybeSingle();
    if (!course?.class_id) continue;

    const { data: members } = await admin
      .from("class_members")
      .select("user_id, profile:profiles!inner(role)")
      .eq("class_id", course.class_id);
    if (!members || members.length === 0) continue;

    const studentIds: string[] = (members as { user_id: string; profile: unknown }[])
      .filter((m) => (m.profile as { role: string }).role === "mahasiswa")
      .map((m) => m.user_id);
    if (studentIds.length === 0) continue;

    const { data: existing } = await admin
      .from("notifications")
      .select("user_id")
      .eq("metadata->>type", "deadline_reminder")
      .eq("metadata->>task_id", task.id)
      .eq("metadata->>deadline", task.deadline)
      .in("user_id", studentIds) as { data: { user_id: string }[] | null };

    const notified = new Set(existing?.map((n) => n.user_id) ?? []);
    const toNotify = studentIds.filter((id) => !notified.has(id));
    if (toNotify.length === 0) continue;

    const hoursLeft = Math.round(
      (new Date(task.deadline).getTime() - now.getTime()) / (1000 * 60 * 60)
    );

    await notifyUsers(toNotify, {
      title: `Deadline mendekat: ${task.title}`,
      body: `Deadline dalam ${hoursLeft} jam.`,
      link: `/tugas/${task.id}`,
      metadata: {
        type: "deadline_reminder",
        task_id: task.id,
        deadline: task.deadline,
      },
    });

    totalSent += toNotify.length;
  }

  return NextResponse.json({ sent: totalSent });
}
