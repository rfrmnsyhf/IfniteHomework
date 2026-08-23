import { getNotifications } from "@/lib/data";
import { requireProfile } from "@/lib/auth";
import { NotificationList } from "@/components/features/notification-list";

export default async function NotifikasiPage() {
  await requireProfile();
  const { items } = await getNotifications(50);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Notifikasi</h1>
        <p className="text-sm text-muted-foreground">
          Update deadline, tugas baru, dan feedback.
        </p>
      </header>
      <NotificationList initial={items} />
    </div>
  );
}
