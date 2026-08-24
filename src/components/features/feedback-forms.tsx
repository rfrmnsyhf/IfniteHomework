"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createFeedback, updateFeedbackAdmin } from "@/lib/actions/feedback";
import type { FeedbackCategory, FeedbackPriority, FeedbackStatus } from "@/lib/types";

const CATS: FeedbackCategory[] = ["bug","fitur","ui","performa","saran","lainnya"];
const PRIO: FeedbackPriority[] = ["rendah","normal","tinggi"];
const STATUSES: FeedbackStatus[] = ["dikirim","dipertimbangkan","dikerjakan","selesai","ditolak"];

export function CreateFeedbackDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [cat, setCat] = useState<FeedbackCategory>("saran");
  const [prio, setPrio] = useState<FeedbackPriority>("normal");
  const [anon, setAnon] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await createFeedback({ category: cat, title, description: desc, priority: prio, is_anonymous: anon });
      if (res.error) { toast.error(res.error); return; }
      toast.success("Feedback terkirim");
      setOpen(false); setTitle(""); setDesc("");
      router.refresh();
    });
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)}>Beri Feedback</Button>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Feedback & Saran</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Kategori</Label><select value={cat} onChange={e=>setCat(e.target.value as FeedbackCategory)} className="w-full rounded-md border px-3 py-2 text-sm">{CATS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
            <div className="space-y-1"><Label>Prioritas</Label><select value={prio} onChange={e=>setPrio(e.target.value as FeedbackPriority)} className="w-full rounded-md border px-3 py-2 text-sm">{PRIO.map(p=><option key={p} value={p}>{p}</option>)}</select></div>
          </div>
          <div className="space-y-1"><Label>Judul</Label><Input value={title} onChange={e=>setTitle(e.target.value)} required minLength={3} maxLength={120} placeholder="Kalender tidak responsif" /></div>
          <div className="space-y-1"><Label>Deskripsi</Label><Textarea value={desc} onChange={e=>setDesc(e.target.value)} required minLength={10} rows={4} placeholder="Jelaskan bug/saran..." /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={anon} onChange={e=>setAnon(e.target.checked)} /> Kirim sebagai anonim</label>
          <Button type="submit" disabled={pending} className="w-full">{pending && <Loader2 className="size-4 animate-spin" />}Kirim</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdminFeedbackActions({ id, status, admin_response }: { id: string; status: FeedbackStatus; admin_response: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [st, setSt] = useState<FeedbackStatus>(status);
  const [resp, setResp] = useState(admin_response ?? "");
  function save() {
    start(async () => {
      const res = await updateFeedbackAdmin(id, { status: st, admin_response: resp || null });
      if (res.error) { toast.error(res.error); return; }
      toast.success("Feedback diperbarui");
      router.refresh();
    });
  }
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="grid grid-cols-2 gap-2">
        <select value={st} onChange={e=>setSt(e.target.value as FeedbackStatus)} className="rounded-md border px-2 py-1 text-sm">{STATUSES.map(s=><option key={s} value={s}>{s}</option>)}</select>
        <Button size="sm" onClick={save} disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : "Simpan"}</Button>
      </div>
      <Textarea value={resp} onChange={e=>setResp(e.target.value)} placeholder="Respons admin..." rows={2} />
    </div>
  );
}
