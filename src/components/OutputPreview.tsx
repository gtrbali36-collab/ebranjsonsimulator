import { useMemo, useState } from "react";
import { ChevronDown, ExternalLink, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ResultTable, type Row } from "@/components/ResultTable";

const KOMISI_LIST = [
  "Komisi I", "Komisi II", "Komisi III", "Komisi IV", "Komisi V",
  "Komisi VI", "Komisi VII", "Komisi VIII", "Komisi IX", "Komisi X",
  "Komisi XI", "Komisi XII", "Komisi XIII"
];

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

function NewsCardKomisi({ row }: { row: Row }) {
  const [openSource, setOpenSource] = useState(false);
  const judul = pick(row, ["judul", "title", "headline", "isu_utama"]);
  const alasan = pick(row, ["alasan_pemilihan", "alasan", "catatan", "penjelasan"]);
  const jenis = pick(row, ["jenis", "kategori"]);
  const mitra = pick(row, ["mitra", "mitra_kerja", "kementerian"]);
  const sumber = pick(row, ["sumber", "media", "publisher"]);
  const url = pick(row, ["url", "link"]);

  return (
    <article className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="default" className="bg-red-600 hover:bg-red-700 text-white text-[10px] px-2 py-0.5">SELECTED</Badge>
        {mitra && <Badge variant="outline" className="text-[10px] text-muted-foreground">{mitra}</Badge>}
      </div>

      {judul && <h3 className="font-display text-base font-semibold leading-snug text-foreground">{judul}</h3>}

      <div className="grid gap-4 md:grid-cols-2 text-xs">
        {/* Kolom Kiri: Alasan Pemilihan */}
        <div className="space-y-1">
          <p className="font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">Alasan Pemilihan</p>
          <p className="text-muted-foreground leading-relaxed">{alasan || "—"}</p>
        </div>

        {/* Kolom Kanan: Informasi Berita */}
        <div className="space-y-1.5 md:border-l md:border-border md:pl-4">
          <p className="font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">Informasi Berita</p>
          <div className="grid grid-cols-3 gap-1 text-muted-foreground">
            <span className="font-medium text-foreground">Jenis</span>
            <span className="col-span-2">{jenis || "—"}</span>
            <span className="font-medium text-foreground">Mitra</span>
            <span className="col-span-2 truncate">{mitra || "—"}</span>
            <span className="font-medium text-foreground">Sumber</span>
            <span className="col-span-2 truncate">{sumber || "—"}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end border-t border-border pt-3">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            Buka berita asli <ExternalLink className="size-3" />
          </a>
        ) : sumber ? (
          <span className="text-xs text-muted-foreground">Sumber: {sumber}</span>
        ) : null}
      </div>
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
  // State untuk melacak komisi aktif di sidebar (default ke kategori pertama atau Komisi I)
  const availableKomisi = useMemo(() => {
    if (categories && categories.length > 0) return categories;
    return KOMISI_LIST;
  }, [categories]);

  const [activeKomisi, setActiveKomisi] = useState<string>(availableKomisi[0] || "Komisi I");

  // Filter baris data berdasarkan komisi yang sedang diklik di sidebar
  const filteredRowsByKomisi = useMemo(() => {
    return rows.filter((r) => {
      const komisiField = pick(r, ["komisi", "nama_komisi", "kategori", "category"]);
      if (!komisiField) return true; // Jika data tidak punya field komisi spesifik, tampilkan semua
      return komisiField.toLowerCase() === activeKomisi.toLowerCase();
    });
  }, [rows, activeKomisi]);

  const { selected, rest } = useMemo(() => {
    const sel = filteredRowsByKomisi.filter(isSelected);
    const unsel = filteredRowsByKomisi.filter((r) => !isSelected(r));
    return { selected: sel, rest: unsel };
  }, [filteredRowsByKomisi]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
      {/* SIDEBAR KIRI: Daftar Komisi (Romawi) */}
      <div className="md:col-span-3 space-y-1.5 bg-card p-3 rounded-xl border border-border sticky top-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-2 pb-2">
          Daftar Komisi
        </p>
        <div className="space-y-1 max-h-[75vh] overflow-y-auto pr-1">
          {availableKomisi.map((komisi, idx) => {
            const romanNumeral = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII"][idx] || String(idx + 1);
            const isActive = activeKomisi === komisi;
            return (
              <button
                key={komisi}
                onClick={() => setActiveKomisi(komisi)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "hover:bg-secondary text-foreground"
                }`}
              >
                <span className={`w-6 text-center font-bold text-xs px-1.5 py-0.5 rounded ${isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                  {romanNumeral}
                </span>
                <span className="truncate">{komisi}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* KONTEN UTAMA KANAN */}
      <div className="md:col-span-9 space-y-6">
        {/* Header Komisi Aktif */}
        <header className="border-b border-border pb-4 bg-card p-5 rounded-xl border border-border">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            NEWS CHECKER{tanggal ? ` · ${tanggal}` : ""}
          </p>
          <h2 className="font-display text-2xl font-bold text-primary mt-1">
            {activeKomisi}
          </h2>
          <p className="text-xs text-muted-foreground mt-2">
            Bidang Kerja: Pertahanan, Luar Negeri, Informatika
          </p>
          <p className="text-xs text-muted-foreground">
            Mitra: Kementerian Luar Negeri, Kementerian Pertahanan, Kementerian Komunikasi dan Digital, Panglima TNI/Mabes TNI-AD, TNI-AL, TNI-AU, BIN, BSSN, Lemhannas, Bakamla, Wantannas, Dewan Pers, KPI, KIP, LSF.
          </p>
        </header>

        {/* Berita Terpilih */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-display text-lg font-semibold">Berita Terpilih</h3>
            <p className="text-sm text-muted-foreground">
              {selected.length} berita untuk {activeKomisi}
            </p>
          </div>

          {selected.length === 0 ? (
            <p className="text-sm text-muted-foreground bg-card p-6 rounded-xl border border-border text-center">
              Tidak ada berita terpilih untuk {activeKomisi}.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {selected.map((row, i) => (
                <NewsCardKomisi key={i} row={row} />
              ))}
            </div>
          )}
        </div>

        {/* Berita Tidak Terpilih */}
        {rest.length > 0 && (
          <div className="space-y-3 pt-4">
            <h3 className="font-display text-lg font-semibold">
              Berita {activeKomisi} Tidak Terpilih ({rest.length.toLocaleString("id-ID")})
            </h3>
            <ResultTable rows={rest} fields={fields} />
          </div>
        )}
      </div>
    </div>
  );
}
