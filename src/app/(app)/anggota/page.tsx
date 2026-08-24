import { UsersRound } from "lucide-react";
import { getClassMembers } from "@/lib/data";
import { requireProfile } from "@/lib/auth";
import { AddMemberDialog, RemoveMemberButton, RoleSwitchButton } from "@/components/features/member-forms";
import { EmptyState } from "@/components/features/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { initials } from "@/lib/utils";

export default async function AnggotaPage() {
  const profile = await requireProfile();
  const members = await getClassMembers();
  const isAdmin = profile.role === "admin";

  const sorted = [...members].sort((a, b) => a.profile.name.localeCompare(b.profile.name));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Anggota Kelas</h1>
          <p className="text-sm text-muted-foreground">
            {members.length} orang tergabung dalam kelas.
          </p>
        </div>
        {isAdmin && <AddMemberDialog />}
      </header>

      {sorted.length === 0 ? (
        <EmptyState icon={UsersRound} title="Belum ada anggota" />
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>NIM</TableHead>
                <TableHead>Role</TableHead>
                {isAdmin && <TableHead className="w-28 text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map(({ profile: p }) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <span className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                          {initials(p.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {p.name}
                        {p.id === profile.id && (
                          <span className="ml-2 text-xs text-muted-foreground">(kamu)</span>
                        )}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.nim ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={p.role === "admin" ? "default" : "secondary"}>
                      {p.role === "admin" ? "Admin" : "Mahasiswa"}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <span className="inline-flex gap-1">
                        <RoleSwitchButton userId={p.id} currentRole={p.role as "admin" | "mahasiswa"} />
                        {p.id !== profile.id && <RemoveMemberButton userId={p.id} />}
                      </span>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
