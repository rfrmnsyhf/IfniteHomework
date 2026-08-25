import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { getGroups } from "@/lib/data";
import { requireProfile } from "@/lib/auth";
import { EmptyState } from "@/components/features/empty-state";
import { DeleteGroupButton, GroupFormDialog } from "@/components/features/group-forms";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";

export default async function KelompokPage() {
  const profile = await requireProfile();
  const groups = await getGroups();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kelompok</h1>
          <p className="text-sm text-muted-foreground">
            Tim kerja tugas kelompok dan proyek kelas.
          </p>
        </div>
        {profile.role === "admin" && <GroupFormDialog />}
      </header>

      {groups.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Belum ada kelompok"
          description={
            profile.role === "admin"
              ? "Buat kelompok pertama untuk tugas kelompok."
              : "Menunggu admin membentuk kelompok."
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((g) => (
            <Card key={g.id} className="group gap-0 py-0 transition-shadow hover:shadow-md">
              <CardContent className="space-y-4 p-5">
                <div>
                  <h2 className="font-bold group-hover:text-primary">{g.name}</h2>
                  <p className="text-sm text-muted-foreground">{g.project_title ?? "-"}</p>
                </div>

                <div className="flex items-center gap-1.5">
                  {g.members.map((m) => (
                    <Avatar key={m.user_id} className="size-7 ring-2 ring-background">
                      <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                        {initials(m.profile.name)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  <span className="ml-1 text-xs text-muted-foreground">
                    {g.members.length} anggota
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <Link
                    href={`/kelompok/${g.id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    Buka Kelompok <ArrowRight className="size-4" />
                  </Link>
                  {profile.role === "admin" && (
                    <DeleteGroupButton groupId={g.id} groupName={g.name} />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
