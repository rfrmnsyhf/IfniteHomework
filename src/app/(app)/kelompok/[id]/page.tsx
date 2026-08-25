import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardList, Users } from "lucide-react";
import { getClassMembers, getGroup, getTasksInRange } from "@/lib/data";
import { requireProfile } from "@/lib/auth";
import { StatusBadge } from "@/components/features/badges";
import { GroupFormDialog, DeleteGroupButton, GroupMembersManager } from "@/components/features/group-forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatTanggalPendek, initials } from "@/lib/utils";

export default async function GroupDetailPage({
  params,
}: PageProps<"/kelompok/[id]">) {
  const { id } = await params;
  const profile = await requireProfile();
  const group = await getGroup(id);
  if (!group) notFound();

  const isAdmin = profile.role === "admin";
  const members = await getClassMembers();
  const candidates = members.map((m) => m.profile);

  // tugas kelompok: task bertipe kelompok dalam rentang semester berjalan
  const now = new Date();
  const startIso = new Date(now.getFullYear(), now.getMonth() - 4, 1).toISOString();
  const endIso = new Date(now.getFullYear(), now.getMonth() + 3, 0, 23, 59).toISOString();
  const allTasks = await getTasksInRange(startIso, endIso);
  const groupTasks = allTasks.filter((t) => t.type === "kelompok").slice(0, 8);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/kelompok"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Kembali ke Kelompok
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Kelompok</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{group.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Proyek: <span className="font-medium text-foreground">{group.project_title ?? "-"}</span>
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <GroupFormDialog
              group={{
                id: group.id,
                name: group.name,
                project_title: group.project_title,
                description: group.description,
              }}
            />
            <DeleteGroupButton groupId={group.id} groupName={group.name} />
          </div>
        )}
      </header>

      {group.description && (
        <p className="rounded-lg border bg-muted/30 p-4 text-sm">{group.description}</p>
      )}

      {/* Progress anggota terhadap tugas kelompok */}
      {groupTasks.length > 0 && (
        <Card className="gap-2 py-5">
          <CardHeader className="px-5">
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wide text-muted-foreground">
              <ClipboardList className="size-4" /> Tugas Kelompok Berjalan
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5">
            <ul className="divide-y">
              {groupTasks.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <Link href={`/tugas/${t.id}`} className="truncate text-sm font-medium hover:text-primary">
                        {t.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">{t.course_name}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatTanggalPendek(t.deadline)}
                    </span>
                    <StatusBadge status={t.my_status} />
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Anggota */}
      <Card className="gap-2 py-5">
        <CardHeader className="px-5">
          <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wide text-muted-foreground">
            <Users className="size-4" /> Anggota ({group.members.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-5">
          {!isAdmin ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {group.members.map((m) => (
                <li key={m.user_id} className="flex items-center gap-3 rounded-lg border p-3">
                  <Avatar className="size-9">
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                      {initials(m.profile.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-sm font-semibold">{m.profile.name}</p>
                    <p className="text-xs text-muted-foreground">{m.role_in_group ?? "Anggota"}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <GroupMembersManager
              groupId={group.id}
              current={group.members.map((m) => ({
                user_id: m.user_id,
                role_in_group: m.role_in_group,
              }))}
              candidates={candidates}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
