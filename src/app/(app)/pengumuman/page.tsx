import { Megaphone } from "lucide-react";
import { getAnnouncements } from "@/lib/data";
import { requireProfile } from "@/lib/auth";
import {
  AnnouncementFormDialog,
  DeleteAnnouncementButton,
} from "@/components/features/announcement-form";
import { EmptyState } from "@/components/features/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { formatTanggal } from "@/lib/utils";

export default async function PengumumanPage() {
  const profile = await requireProfile();
  const announcements = await getAnnouncements();
  const isAdmin = profile.role === "admin";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengumuman</h1>
          <p className="text-sm text-muted-foreground">
            Informasi penting kelas — tidak tenggelam di antara chat.
          </p>
        </div>
        {isAdmin && <AnnouncementFormDialog />}
      </header>

      {announcements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Belum ada pengumuman"
          description={isAdmin ? "Buat pengumuman pertama untuk kelas." : "Pengumuman dari admin akan muncul di sini."}
        />
      ) : (
        <div className="mx-auto max-w-2xl space-y-4">
          {announcements.map((a) => (
            <Card key={a.id} className="py-5">
              <CardContent className="space-y-2 px-5">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="flex items-center gap-2 font-bold leading-snug">
                    <Megaphone className="size-4 shrink-0 text-primary" />
                    {a.title}
                  </h2>
                  {isAdmin && <DeleteAnnouncementButton id={a.id} />}
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {a.content}
                </p>
                <p className="pt-1 text-xs text-muted-foreground">
                  {formatTanggal(a.created_at)} • oleh {a.author_name ?? "Admin"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
