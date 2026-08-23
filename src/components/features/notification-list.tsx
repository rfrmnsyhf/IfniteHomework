"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/actions/notifications";
import type { Notification } from "@/lib/types";
import { cn } from "@/lib/utils";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Baru saja";
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Kemarin";
  if (d < 30) return `${d} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" });
}

export function NotificationList({ initial }: { initial: Notification[] }) {
  const [items, setItems] = useState(initial);
  const [, startTransition] = useTransition();

  // sinkron dengan data server saat refresh/navigasi
  const [lastInitial, setLastInitial] = useState(initial);
  if (lastInitial !== initial) {
    setLastInitial(initial);
    setItems(initial);
  }

  useEffect(() => {
    document.title = items.some((n) => !n.read)
      ? `(${items.filter((n) => !n.read).length}) Notifikasi — ClassFlow`
      : "Notifikasi — ClassFlow";
    return () => {
      document.title = "ClassFlow — Manajemen Tugas Kelas";
    };
  }, [items]);

  async function markOne(n: Notification) {
    if (n.read) return;
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    await startTransition(async () => {
      await markNotificationRead(n.id);
    });
  }

  function markAll() {
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    startTransition(async () => {
      await markAllNotificationsRead();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={markAll} disabled={!items.some((n) => !n.read)}>
          <CheckCheck className="size-4" /> Tandai Semua Dibaca
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="py-5">
          <CardContent className="flex flex-col items-center gap-2 px-5 py-10 text-center">
            <Bell className="size-8 text-muted-foreground" />
            <p className="font-medium">Belum ada notifikasi</p>
            <p className="text-sm text-muted-foreground">
              Notifikasi deadline dan pengumuman akan muncul di sini.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2.5">
          {items.map((n) => (
            <li key={n.id}>
              <Link
                href={n.link ?? "#"}
                onClick={() => markOne(n)}
                className={cn(
                  "block rounded-xl border p-4 transition-colors hover:bg-muted/40",
                  !n.read && "border-primary/30 bg-primary/5"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className={cn("text-sm leading-snug", !n.read && "font-semibold")}>
                    {!n.read && (
                      <span className="mr-2 inline-block size-1.5 -translate-y-0.5 rounded-full bg-primary align-middle" />
                    )}
                    {n.title}
                  </p>
                  <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(n.created_at)}</span>
                </div>
                {n.body && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
