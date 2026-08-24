import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFeedbacks } from "@/lib/data";
import { requireProfile } from "@/lib/auth";
import { AdminFeedbackActions, CreateFeedbackDialog } from "@/components/features/feedback-forms";
import Link from "next/link";
import { cn } from "@/lib/utils";

const STATUS_COLOR: Record<string,string> = { dikirim:"secondary", dipertimbangkan:"outline", dikerjakan:"default", selesai:"default", ditolak:"destructive" };

export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ status?: string; category?: string }> }) {
  const sp = await searchParams;
  const me = await requireProfile();
  const isAdmin = me.role === "admin";
  const all = await getFeedbacks();
  const filtered = all.filter(f=>{
    if (sp.status && f.status!==sp.status) return false;
    if (sp.category && f.category!==sp.category) return false;
    return true;
  });
  const statuses = ["", "dikirim","dipertimbangkan","dikerjakan","selesai","ditolak"];
  const cats = ["", "bug","fitur","ui","performa","saran","lainnya"];
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Feedback & Saran</h1><p className="text-sm text-muted-foreground">{isAdmin ? `${all.length} feedback` : `${filtered.length} feedback milikmu`}</p></div>
        <CreateFeedbackDialog />
      </header>
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-muted-foreground">Status:</span>
        {statuses.map(s=>(
          <Link key={s||"all"} href={`/feedback?${new URLSearchParams({...sp, ...(s?{status:s}: {status:""})}).toString()}`} className={cn("rounded-full border px-3 py-1 text-xs", (!sp.status && !s) || sp.status===s ? "bg-primary text-primary-foreground" : "bg-background")}>{s||"Semua"}</Link>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-muted-foreground">Kategori:</span>
        {cats.map(c=>(
          <Link key={c||"all"} href={`/feedback?${new URLSearchParams({...sp, ...(c?{category:c}: {category:""})}).toString()}`} className={cn("rounded-full border px-3 py-1 text-xs", (!sp.category && !c) || sp.category===c ? "bg-primary text-primary-foreground" : "bg-background")}>{c||"Semua"}</Link>
        ))}
      </div>
      {filtered.length===0 ? <Card className="py-8"><CardContent className="text-center text-sm text-muted-foreground">Belum ada feedback.</CardContent></Card> : (
        <div className="grid gap-4">
          {filtered.map(f=>{
            const showAnon = f.is_anonymous && !isAdmin && f.user_id!==me.id;
            const displayName = showAnon ? "Anonim" : (f.author_name ?? "User");
            return (
              <Card key={f.id} className="py-4">
                <CardHeader className="px-5 pb-2"><CardTitle className="text-base">{f.title}</CardTitle><p className="text-xs text-muted-foreground">{f.category} · {displayName} · {new Date(f.created_at).toLocaleDateString("id-ID")} {f.is_anonymous && isAdmin ? "(Anonim)" : ""}</p></CardHeader>
                <CardContent className="space-y-3 px-5">
                  <p className="text-sm whitespace-pre-wrap">{f.description}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={(STATUS_COLOR[f.status] as never) ?? "secondary"}>{f.status}</Badge>
                    <Badge variant="outline">{f.category}</Badge>
                    <Badge variant={f.priority==="tinggi"?"destructive": f.priority==="rendah"?"secondary":"outline"}>{f.priority}</Badge>
                    {f.is_anonymous && <Badge variant="secondary">Anonim</Badge>}
                  </div>
                  {f.admin_response && <div className="rounded-md bg-muted p-3 text-sm"><span className="font-semibold">Respons Admin:</span> {f.admin_response}</div>}
                  {isAdmin && <AdminFeedbackActions id={f.id} status={f.status} admin_response={f.admin_response} />}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
