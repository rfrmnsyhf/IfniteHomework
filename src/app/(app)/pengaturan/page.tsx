import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SignOutButton, UpdateNameForm } from "@/components/features/member-forms";
import { getMyClass, requireProfile } from "@/lib/auth";

const ROLE_LABEL = { admin: "Admin Kelas", mahasiswa: "Mahasiswa" } as const;

export default async function PengaturanPage() {
  const profile = await requireProfile();
  const kelas = await getMyClass();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Pengaturan</h1>
        <p className="text-sm text-muted-foreground">Kelola profil akun kamu.</p>
      </header>

      <Card className="py-5">
        <CardHeader className="px-5">
          <CardTitle>Profil</CardTitle>
          <CardDescription>Nama ditampilkan di seluruh aplikasi.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-5">
          <UpdateNameForm initialName={profile.name} />

          <Separator />

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium">{profile.email}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Role</dt>
              <dd>
                <Badge variant={profile.role === "admin" ? "default" : "secondary"}>
                  {ROLE_LABEL[profile.role]}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Kelas</dt>
              <dd className="font-medium">
                {kelas ? `${kelas.name} (${kelas.code}) • ${kelas.academic_year}` : "-"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="py-5">
        <CardHeader className="px-5">
          <CardTitle>Sesi</CardTitle>
          <CardDescription>Keluar dari akun di perangkat ini.</CardDescription>
        </CardHeader>
        <CardContent className="px-5">
          <SignOutButton />
        </CardContent>
      </Card>
    </div>
  );
}
