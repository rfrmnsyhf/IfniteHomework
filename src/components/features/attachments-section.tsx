import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Attachment } from "@/lib/types";

export async function AttachmentsSection({ attachments }: { attachments: Attachment[] }) {
  if (attachments.length === 0) {
    return <p className="text-sm text-muted-foreground">Tidak ada lampiran.</p>;
  }

  const supabase = await createClient();
  const links = await Promise.all(
    attachments.map(async (a) => {
      const { data } = await supabase.storage
        .from("attachments")
        .createSignedUrl(a.storage_path, 600);
      return { ...a, url: data?.signedUrl ?? null };
    })
  );

  return (
    <ul className="space-y-2">
      {links.map((a) => (
        <li key={a.id} className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2">
          <FileText className="size-4 shrink-0 text-primary" />
          {a.url ? (
            <a
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-sm font-medium hover:underline"
            >
              {a.filename}
            </a>
          ) : (
            <span className="truncate text-sm">{a.filename}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
