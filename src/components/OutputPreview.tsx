import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ResultTable, type Row } from "@/components/ResultTable";

/** Renders selected/unselected output rows in the "News Checker" frontend layout. */

const SCORE_LABELS: Record<string, string> = {
  skor_dampak_nasional: "Dampak Nasional",
  skor_relevansi_dpr: "Relevansi DPR",
  skor_urgensi: "Urgensi",
  skor_kualitas: "Kualitas",
};

function pick(row: Row, candidates: string[]): string {
  for (const key of candidates) {
    const v = row[key];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v);
  }
  return "";
}

function isSelected(row: Row): boolean {
  const v = pick(row, ["status_seleksi", "status_detail", "status", "seleksi"]).toLowerCase();
  return v.includes("selected") || v.includes("terpilih");
}

function inline(text: string, keyPrefix: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={`${keyPrefix}-${i}`} className="font-semibold text-foreground">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={`${keyPrefix}-${i}`}>{part}</span>
    ),
  );
}

function Ringkasan({ text }: { text: string }) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const bullets = lines.filter((l) => l.startsWith("-") || l.startsWith("*"));
  const paras = lines.filter((l) => !l.startsWith("-") && !l.startsWith("*") && !l.startsWith("#"));
  return (
    <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
      {paras.map((p, i) => (
        <p key={`p-${i}`}>{inline(p, `p${i}`)}</p>
      ))}
      {bullets.length > 0 && (
        <ul className="list-disc space-y-2 pl-5">
          {bullets.map((b, i) => (
            <li key={`b-${i}`}>{inline(b.replace(/^[-*]\s*/, ""), `b${i}`)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ScorePanel({ row, fields }: { row: Row; fields: string[] }) {
  const scoreFields = fields.filter((f) => /^skor|^score/i.test(f) && !/total/i.test(f));
  const total = pick(row, ["skor_total", "score_total", "total_score"]);
  const alasan = pick(row, ["alasan", "reason", "catatan"]);
  const alasanParts = alasan ? alasan.split(/\n{2,}/).filter(Boolean) : [];

  if (scoreFields.length === 0 && !total && !alasan) return null;

  return (
    <div className="space-y-4 md:border-l md:border-border md:pl-6">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        Penilaian Sistem
      </p>
      {scoreFields.map((f, i) => (
        <div key={f}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium">
              {SCORE_LABELS[f] ?? f.replace(/^skor_|^score_/i, "").replace(/_/g, " ")}
            </span>
            <span className="text-sm font-semibold">{String(row[f] ?? "—")}/5</span>
          </div>
          {alasanParts[i] && (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{alasanParts[i]}</p>
          )}
        </div>
      ))}
      {alasanParts.length > 0 && scoreFields.length === 0 && (
        <p className="text-xs leading-relaxed text-muted-foreground">{alasan}</p>
      )}
      {total && (
        <div className="flex items-baseline justify-between border-t border-border pt-3">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Total Score
          </span>
          <span className="font-display text-lg font-bold text-primary">{total}</span>
        </div>
      )}
    </div>
  );
}

function NewsCard({ row, fields }: { row: Row; fields: string[] }) {
  const [openSource, setOpenSource] = useState(false);
  const judul = pick(row, ["judul", "title", "headline"]);
  const ringkasan = pick(row, ["ringkasan", "summary", "deskripsi"]);
  const peringkat = pick(row, ["peringkat", "rank"]);
  const total = pick(row, ["skor_total", "score_total", "total_score"]);
  const sumber = pick(row, ["total_sumber", "jumlah_sumber"]);
  const media = pick(row, ["media", "sumber", "publisher"]);
  const url = pick(row, ["url", "link"]);
  const published = pick(row, ["published_at", "tanggal", "date"]);

  return (
    <article className="rounded-xl border border-border border-l-4 border-l-primary bg-card p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge className="uppercase tracking-wide">Selected</Badge>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {peringkat ? `Peringkat ${peringkat}` : ""}
          {peringkat && total ? " · " : ""}
          {total ? `Score ${total}` : ""}
        </span>
      </div>

      {judul && <h3 className="font-display text-lg font-semibold leading-snug">{judul}</h3>}

      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <div>
          {ringkasan && (
            <>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Ringkasan Topik
              </p>
              <Ringkasan text={ringkasan} />
            </>
          )}
        </div>
        <ScorePanel row={row} fields={fields} />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-sm text-muted-foreground">
        <span>
          {sumber ? (
            <>
              <strong className="font-semibold text-foreground">{sumber} artikel</strong>{" "}
              dikonsolidasikan
            </>
          ) : (
            media
          )}
        </span>
        {(url || media || published) && (
          <button
            type="button"
            onClick={() => setOpenSource((v) => !v)}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-secondary"
          >
            Lihat sumber <ChevronDown className={`size-3.5 ${openSource ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>

      {openSource && (
        <div className="mt-3 space-y-1 rounded-lg bg-secondary/50 p-3 text-xs text-muted-foreground">
          {media && <p>Media: {media}</p>}
          {published && <p>Terbit: {published}</p>}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="block break-all text-primary underline"
            >
              {url}
            </a>
          )}
        </div>
      )}
    </article>
  );
}

export function OutputPreview({
  rows,
  fields,
  tanggal,
  categories,
}: {
  rows: Row[];
  fields: string[];
  tanggal?: string | null;
  categories?: string[];
}) {
  const { selected, rest } = useMemo(() => {
    const sel = rows.filter(isSelected);
    sel.sort((a, b) => Number(a["peringkat"] ?? 999) - Number(b["peringkat"] ?? 999));
    return { selected: sel, rest: rows.filter((r) => !isSelected(r)) };
  }, [rows]);

  return (
    <div className="space-y-6">
      <header className="border-b border-border pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          News Checker{tanggal ? ` · ${tanggal}` : ""}
        </p>
        <h2 className="font-display text-2xl font-bold text-primary">
          {categories?.length ? categories.join(" · ") : "Hasil Output"}
        </h2>
      </header>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-lg font-semibold">Berita Terpilih</h3>
        <p className="text-sm text-muted-foreground">
          {selected.length} berita · dikonsolidasikan dari beberapa sumber
        </p>
      </div>

      {selected.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Tidak ada item berstatus terpilih pada seleksi ini.
        </p>
      ) : (
        <div className="space-y-4">
          {selected.map((row, i) => (
            <NewsCard key={i} row={row} fields={fields} />
          ))}
        </div>
      )}

      {rest.length > 0 && (
        <div>
          <h3 className="mb-3 font-display text-lg font-semibold">
            Berita Tidak Terpilih ({rest.length.toLocaleString("id-ID")})
          </h3>
          <ResultTable rows={rest} fields={fields} />
        </div>
      )}
    </div>
  );
}
