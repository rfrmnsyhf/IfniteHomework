import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SignOutButton, UpdateNameForm } from "@/components/features/member-forms";
import { PasswordForm } from "@/components/features/password-form";
import { getMyClass, getProfile } from "@/lib/auth";

const ROLE_LABEL = { admin: "Admin Kelas", mahasiswa: "Mahasiswa" } as const;

export default async function PengaturanPage({ searchParams }: { searchParams: Promise<{ banner?: string }> }) {
  const sp = await searchParams;
  const profile = await getProfile();
  if (!profile) return null;
  const kelas = await getMyClass();
  const showBanner = sp.banner === "password-default" || !profile.password_changed;
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header><h1 className="text-2xl font-bold tracking-tight">Pengaturan</h1><p className="text-sm text-muted-foreground">Kelola profil akun kamu.</p></header>
      {showBanner && !profile.password_changed && (
        <div className="border-l-4 border-yellow-500 bg-yellow-50 p-4"><p className="text-sm text-yellow-800">Password Anda masih menggunakan password default. Demi keamanan, segera ubah password Anda.</p></div>
      )}
      <Card className="py-5"><CardHeader className="px-5"><CardTitle>Profil</CardTitle><CardDescription>Informasi dasar akun kamu.</CardDescription></CardHeader>
        <CardContent className="space-y-4 px-5"><UpdateNameForm initialName={profile.name} /><Separator />
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-muted-foreground">Email</dt><dd className="font-medium">{profile.email}</dd></div>
            <div><dt className="text-muted-foreground">NIM</dt><dd className="font-medium">{profile.nim ?? "-"}</dd></div>
            <div><dt className="text-muted-foreground">Role</dt><dd><Badge variant={profile.role === "admin" ? "default" : "secondary"}>{ROLE_LABEL[profile.role]}</Badge></dd></div>
            <div><dt className="text-muted-foreground">Kelas</dt><dd className="font-medium">{kelas ? `${kelas.name} (${kelas.code}) • ${kelas.academic_year}` : "-"}</dd></div>
          </dl>
        </CardContent>
      </Card>
      <Card className="py-5"><CardHeader className="px-5"><CardTitle>Ubah Password</CardTitle><CardDescription>Ubah password akun kamu.</CardDescription></CardHeader><CardContent className="px-5"><PasswordForm /></CardContent></Card>
      <Card className="py-5"><CardHeader className="px-5"><CardTitle>Sesi</CardTitle><CardDescription>Keluar dari akun di perangkat ini.</CardDescription></CardHeader><CardContent className="px-5"><SignOutButton /></CardContent></Card>
    </div>
  );
}
