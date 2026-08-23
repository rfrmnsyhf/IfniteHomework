import { AppShell } from "@/components/features/app-shell";
import { requireProfile } from "@/lib/auth";
import { getNotifications } from "@/lib/data";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  const { items, unread } = await getNotifications(10);

  return (
    <AppShell profile={profile} notifications={items} unread={unread}>
      {children}
    </AppShell>
  );
}
