import { useMemo, useState } from "react";
import { ExternalLink, FileJson, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ResultTable, type Row } from "@/components/ResultTable";
import { formatCell } from "@/lib/analyze";

export type SourceResult = { name: string; rows: Row[] };

const CARDS_PER_PAGE = 10;

function find(fields: string[], ...cands: string[]) {
  for (const c of cands) {
    const hit = fields.find((f) => f.toLowerCase() === c);
    if (hit) return hit;
  }
  return fields.find((f) => cands.some((c) => f.toLowerCase().includes(c)));
}

function isSelected(row: Row, statusField?: string) {
  if (!statusField) return false;
  return formatCell(row[statusField]).toLowerCase().includes("terpilih");
}

function NewsCard({
  row,
  fields,
  index,
}: {
  row: Row;
  fields: string[];
  index: number;
}) {
  const titleF = find(fields, "judul", "title");
  const summaryF = find(fields, "ringkasan", "summary", "deskripsi");
  const mediaF = find(fields, "media", "sumber", "source");
  const urlF = find(fields, "url", "link", "permalink");
  const dateF = find(fields, "published_at", "tanggal", "date");
  const statusF = find(fields, "status", "status_deteksi");
  const reasonF = find(fields, "alasan", "reason", "catatan");

  const scoreFields = fields.filter((f) => /^skor|score/i.test(f));
  const contentFields = new Set(
    [titleF, summaryF, mediaF, urlF, dateF, statusF, reasonF, ...scoreFields].filter(
      Boolean,
    ) as string[],
  );
  const restFields = fields.filter((f) => !contentFields.has(f));

  const url = urlF ? formatCell(row[urlF]) : "";
  const status = statusF ? formatCell(row[statusF]) : "";

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-2 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded bg-secondary px-1.5 py-0.5 font-medium">#{index}</span>
            {mediaF && <span className="truncate">{formatCell(row[mediaF])}</span>}
            {dateF && <span className="shrink-0">· {formatCell(row[dateF])}</span>}
          </div>
          <h4 className="font-display text-base font-semibold leading-snug [overflow-wrap:anywhere]">
            {titleF ? formatCell(row[titleF]) : "(tanpa judul)"}
          </h4>
          {summaryF && (
            <p className="text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
              {formatCell(row[summaryF])}
            </p>
          )}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-full items-center gap-1 text-xs text-primary underline underline-offset-2"
            >
              <ExternalLink className="size-3 shrink-0" />
              <span className="truncate">{url}</span>
            </a>
          )}
          {restFields.length > 0 && (
            <dl className="grid gap-x-4 gap-y-1 pt-1 text-xs sm:grid-cols-2">
              {restFields.map((f) => (
                <div key={f} className="min-w-0">
                  <dt className="uppercase tracking-wide text-muted-foreground">{f}</dt>
                  <dd className="[overflow-wrap:anywhere]">{formatCell(row[f]) || "—"}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <aside className="min-w-0 border-t border-border bg-secondary/40 p-4 lg:border-l lg:border-t-0">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Penilaian Sistem
          </p>
          {status && (
            <Badge variant={status.toLowerCase().includes("terpilih") ? "default" : "secondary"}>
              {status}
            </Badge>
          )}
          <dl className="mt-3 space-y-2">
            {scoreFields.map((f) => (
              <div key={f} className="flex items-start justify-between gap-3">
                <dt className="text-xs text-muted-foreground [overflow-wrap:anywhere]">{f}</dt>
                <dd className="shrink-0 font-display text-sm font-semibold">
                  {formatCell(row[f]) || "—"}
                </dd>
              </div>
            ))}
          </dl>
          {reasonF && (
            <div className="mt-3 border-t border-border pt-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Alasan</p>
              <p className="mt-1 text-sm leading-relaxed [overflow-wrap:anywhere]">
                {formatCell(row[reasonF]) || "—"}
              </p>
            </div>
          )}
        </aside>
      </div>
    </article>
  );
}

function SourceColumn({ source, fields }: { source: SourceResult; fields: string[] }) {
  const statusF = useMemo(() => find(fields, "status", "status_deteksi"), [fields]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const selected = useMemo(
    () => source.rows.filter((r) => isSelected(r, statusF)),
    [source.rows, statusF],
  );
  const rest = useMemo(
    () => source.rows.filter((r) => !isSelected(r, statusF)),
    [source.rows, statusF],
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return selected;
    return selected.filter((r) => fields.some((f) => formatCell(r[f]).toLowerCase().includes(q)));
  }, [selected, fields, query]);

  const pageCount = Math.max(1, Math.ceil(shown.length / CARDS_PER_PAGE));
  const current = Math.min(page, pageCount - 1);
  const slice = shown.slice(current * CARDS_PER_PAGE, current * CARDS_PER_PAGE + CARDS_PER_PAGE);

  return (
    <div className="min-w-0 space-y-4">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex min-w-0 items-center gap-2">
          <FileJson className="size-4 shrink-0 text-primary" />
          <h3 className="truncate font-display text-base font-semibold">{source.name}</h3>
        </div>
        <div className="flex shrink-0 gap-2">
          <Badge variant="default">{selected.length} terpilih</Badge>
          <Badge variant="secondary">{rest.length} tidak</Badge>
        </div>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          placeholder={`Cari di ${source.name}…`}
          className="pl-9"
        />
      </div>

      <div className="space-y-4">
        {slice.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {statusF
              ? "Tidak ada berita terpilih pada file ini."
              : "Field status tidak ditemukan — semua baris tampil di tabel bawah."}
          </p>
        ) : (
          slice.map((row, i) => (
            <NewsCard
              key={current * CARDS_PER_PAGE + i}
              row={row}
              fields={fields}
              index={current * CARDS_PER_PAGE + i + 1}
            />
          ))
        )}
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={current === 0} onClick={() => setPage(current - 1)}>
            Sebelumnya
          </Button>
          <span className="text-sm text-muted-foreground">
            Halaman {current + 1} / {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={current >= pageCount - 1}
            onClick={() => setPage(current + 1)}
          >
            Berikutnya
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Berita tidak terpilih — {source.name}
        </h4>
        <ResultTable rows={rest} fields={fields} emptyLabel="Semua berita terpilih." />
      </div>
    </div>
  );
}

export function CompareCards({
  sources,
  fields,
}: {
  sources: SourceResult[];
  fields: string[];
}) {
  return (
    <div
      className={`grid gap-6 ${sources.length >= 3 ? "xl:grid-cols-3" : "lg:grid-cols-2"}`}
    >
      {sources.map((s, i) => (
        <SourceColumn key={`${s.name}-${i}`} source={s} fields={fields} />
      ))}
    </div>
  );
}
