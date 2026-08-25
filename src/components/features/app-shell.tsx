"use client";
/* eslint-disable react-hooks/set-state-in-effect -- sync initialItems to state */

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import {
  Bell,
  BookOpen,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  Settings,
  Users,
  UsersRound,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { markNotificationRead } from "@/lib/actions/notifications";
import type { Notification, Profile } from "@/lib/types";
import { cn, initials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tugas", label: "Tugas", icon: ClipboardList },
  { href: "/kalender", label: "Kalender", icon: CalendarDays },
  { href: "/mata-kuliah", label: "Mata Kuliah", icon: BookOpen },
  { href: "/kelompok", label: "Kelompok", icon: Users },
  { href: "/pengumuman", label: "Pengumuman", icon: Megaphone },
  { href: "/feedback", label: "Feedback", icon: MessageSquare },
  { href: "/anggota", label: "Anggota Kelas", icon: UsersRound },
] as const;

const ROLE_LABEL: Record<Profile["role"], string> = {
  admin: "Admin",
  mahasiswa: "Mahasiswa",
};

function NavLinks({ pathname }: { pathname: string }) {
  return (
    <nav className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/dashboard" className="inline-flex items-center gap-2 px-1 text-lg font-bold tracking-tight">
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Zap className="size-4" />
      </span>
      ClassFlow
    </Link>
  );
}

function UserCard({ profile }: { profile: Profile }) {
  const router = useRouter();
  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }
  return (
    <div className="flex items-center gap-3 rounded-xl border p-3">
      <Avatar className="size-9">
        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
          {initials(profile.name ?? profile.nim)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-semibold">{profile.name}</p>
        <p className="truncate text-xs text-muted-foreground">{ROLE_LABEL[profile.role]}</p>
      </div>
      <Button variant="ghost" size="icon" onClick={signOut} title="Keluar">
        <LogOut className="size-4" />
      </Button>
    </div>
  );
}

export function NotificationBell({
  initialItems,
  initialUnread,
  userId,
}: {
  initialItems: Notification[];
  initialUnread: number;
  userId: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [unread, setUnread] = useState(initialUnread);

  // pola React "menyesuaikan state saat render" — sinkron saat data server berubah
  useEffect(() => {
    setItems(initialItems);
    setUnread(initialUnread);
  }, [initialItems, initialUnread]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const n = payload.new as Notification;
          setItems((prev) => [n, ...prev].slice(0, 30));
          setUnread((u) => u + 1);
          toast.info(n.title, {
            description: n.body ?? undefined,
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  async function markRead(id: string) {
    setUnread((u) => Math.max(0, u - 1));
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await markNotificationRead(id);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="relative" aria-label="Notifikasi" />}
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          Notifikasi
          {unread > 0 && <Badge variant="secondary">{unread} baru</Badge>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            Belum ada notifikasi.
          </p>
        )}
        {items.slice(0, 5).map((n) => (
          <DropdownMenuItem
            key={n.id}
            render={
              <Link
                href={n.link ?? "/notifikasi"}
                className={cn(
                  "flex flex-col items-start gap-0.5 py-2.5 data-highlighted:bg-accent data-highlighted:text-accent-foreground",
                  !n.read && "bg-primary/5"
                )}
              />
            }
            onClick={() => !n.read && markRead(n.id)}
          >
            <span className={cn("line-clamp-1 text-sm", !n.read && "font-semibold")}>
              {n.title}
            </span>
            {n.body && (
              <span className="line-clamp-1 text-xs text-muted-foreground">{n.body}</span>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="justify-center text-sm font-medium text-primary"
          render={<Link href="/notifikasi" />}
        >
          Lihat Semua
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({
  profile,
  notifications,
  unread,
  children,
}: {
  profile: Profile;
  notifications: Notification[];
  unread: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const current = NAV_ITEMS.find((i) => pathname.startsWith(i.href));

  return (
    <div className="min-h-svh w-full">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col gap-6 border-r bg-sidebar p-4 lg:flex">
        <Brand />
        <NavLinks pathname={pathname} />
        <div className="mt-auto">
          <UserCard profile={profile} />
        </div>
      </aside>

      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur lg:pl-64">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={<Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menu" />}
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-4">
              <SheetTitle>
                <Brand />
              </SheetTitle>
              <div className="mt-6 flex h-[calc(100%-5rem)] flex-col gap-6">
                <nav className="space-y-1">
                  {NAV_ITEMS.map((item) => {
                    const active = pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <item.icon className="size-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                  <Link
                    href="/pengaturan"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Settings className="size-4" />
                    Pengaturan
                  </Link>
                </nav>
                <div className="mt-auto">
                  <UserCard profile={profile} />
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <p className="hidden truncate text-sm font-semibold sm:block">
            {current?.label ?? "ClassFlow"}
          </p>

          <div className="ml-auto flex items-center gap-1">
            <NotificationBell
              initialItems={notifications}
              initialUnread={unread}
              userId={profile.id}
            />
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" className="gap-2 px-2" />}>
                <Avatar className="size-7">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {initials(profile.name ?? profile.nim)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium sm:block">{profile.name}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <p>{profile.name}</p>
                  <p className="text-xs font-normal text-muted-foreground">{profile.nim ?? "-"} · {ROLE_LABEL[profile.role]}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link href="/pengaturan" />}>
                  <Settings className="size-4" /> Pengaturan
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/notifikasi" />}>
                  <Bell className="size-4" /> Notifikasi
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
