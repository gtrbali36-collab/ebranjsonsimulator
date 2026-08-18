import { useMemo, useState } from "react";
import { ChevronDown, ExternalLink, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ResultTable, type Row } from "@/components/ResultTable";

// --- HELPER FUNCTIONS ---

export function pick(row: Row, candidates: string[]): string {
  for (const key of candidates) {
    const v = row[key];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v);
  }
  return "";
}

export function isSelected(row: Row): boolean {
  // 1. Cek apakah record memiliki field "peringkat" dan tidak kosong
  const p = row["peringkat"];
  const hasPeringkat = p !== undefined && p !== null && String(p).trim() !== "";

  // 2. Cek status bawaan (seperti sebelumnya)
  const v = pick(row, ["status_seleksi", "status_detail", "status", "seleksi"]).toLowerCase();
  const isStatusSelected = v.includes("selected") || v.includes("terpilih");

  // HANYA masuk ke Berita Terpilih jika data memiliki status terpilih DAN memiliki peringkat
  return isStatusSelected && hasPeringkat;
}

// Komponen teks yang bisa di-expand (Selengkapnya / Lebih sedikit)
export function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return <span className="text-muted-foreground">—</span>;

  const isLong = text.length > 80;

  return (
    <div className="space-y-1">
      <p className={`text-xs leading-relaxed text-muted-foreground ${!expanded && isLong ? "line-clamp-2" : ""}`}>
        {text}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] text-primary flex items-center gap-1 font-medium hover:underline"
        >
          {expanded ? "Lebih sedikit" : "Selengkapnya"}
          <ChevronDown className={`size-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      )}
    </div>
  );
}

// ==========================================
// 1. VIEW UNTUK DAPIL (Tabel Grouping Nested)
// ==========================================
function DapilView({ selected, rest, fields, tanggal }: { selected: Row[], rest: Row[], fields: string[], tanggal?: string | null | undefined }) {
  const [searchDapil, setSearchDapil] = useState("");
  const [searchAnggota, setSearchAnggota] = useState("");

  // Grouping data berdasarkan Dapil & Anggota
  const groupedData = useMemo(() => {
    const map = new Map<string, { dapil: string, anggota: string, wilayah: string, news: Row[] }>();

    selected.forEach(row => {
      const dapil = pick(row, ["dapil", "nama_dapil", "daerah_pemilihan"]) || "Dapil Tidak Diketahui";
      const anggota = pick(row, ["anggota", "nama_anggota", "tokoh"]) || "—";
      const wilayah = pick(row, ["kabupaten", "kota", "kabupaten_kota", "wilayah"]) || "—";

      const key = `${dapil}-${anggota}`;
      if (!map.has(key)) {
        map.set(key, { dapil, anggota, wilayah, news: [] });
      }
      map.get(key)!.news.push(row);
    });

    return Array.from(map.values());
  }, [selected]);

  // Filter hasil grouping berdasarkan input pencarian
  const filteredData = groupedData.filter(g =>
    g.dapil.toLowerCase().includes(searchDapil.toLowerCase()) &&
    g.anggota.toLowerCase().includes(searchAnggota.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <header className="border-b border-border pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          NEWS CHECKER {tanggal ? `· ${tanggal}` : ""}
        </p>
        <h2 className="font-display text-3xl font-bold text-primary mt-1">Berita Dapil</h2>
        <p className="text-sm text-muted-foreground mt-2">
          {groupedData.length} daerah pemilihan · {selected.length} berita terpilih. Hanya berita terpilih yang ditampilkan.
        </p>
      </header>

      {/* Filter Inputs */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Filter nama dapil..."
            className="pl-9 bg-card"
            value={searchDapil}
            onChange={(e) => setSearchDapil(e.target.value)}
          />
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Filter nama anggota..."
            className="pl-9 bg-card"
            value={searchAnggota}
            onChange={(e) => setSearchAnggota(e.target.value)}
          />
        </div>
      </div>

      <p className="text-xs text-right text-muted-foreground font-medium">{filteredData.length} dapil ditampilkan</p>

      {/* Tabel Utama Dapil */}
      <div className="rounded-xl border border-border bg-card overflow-x-auto shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-secondary/50 text-xs font-semibold text-foreground border-b border-border">
            <tr>
              <th className="p-4 w-12 text-center">No.</th>
              <th className="p-4 w-48">Nama Dapil</th>
              <th className="p-4 w-48">Anggota</th>
              <th className="p-4 w-48">Kabupaten/Kota</th>
              <th className="p-4">Berita Terpilih</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">Tidak ada data yang sesuai filter.</td>
              </tr>
            ) : (
              filteredData.map((group, i) => (
                <tr key={i} className="align-top hover:bg-secondary/10 transition-colors">
                  <td className="p-4 text-center text-muted-foreground">{i + 1}</td>
                  <td className="p-4 font-bold text-foreground">{group.dapil}</td>
                  <td className="p-4 text-xs font-medium">{group.anggota}</td>
                  <td className="p-4 text-xs text-muted-foreground"><ExpandableText text={group.wilayah} /></td>
                  <td className="p-0 align-top">
                    {/* Nested Table untuk Berita Terpilih */}
                    <table className="w-full text-xs">
                      <thead className="text-[10px] uppercase text-muted-foreground border-b border-border bg-secondary/20">
                        <tr>
                          <th className="px-4 py-3 w-2/5 font-semibold">Judul</th>
                          <th className="px-4 py-3 w-1/5 font-semibold">Kota/Kab</th>
                          <th className="px-4 py-3 w-1/3 font-semibold">Alasan</th>
                          <th className="px-4 py-3 w-24 text-right font-semibold">Link</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {group.news.map((news, idx) => {
                          const judul = pick(news, ["judul", "title", "headline", "isu_utama"]);
                          const kotaBerita = pick(news, ["kota", "kabupaten", "lokasi", "tempat"]);
                          const alasan = pick(news, ["alasan_pemilihan", "alasan", "catatan", "ringkasan"]);
                          const url = pick(news, ["url", "link"]);

                          return (
                            <tr key={idx} className="hover:bg-secondary/30 transition-colors">
                              <td className="px-4 py-3">
                                <p className="font-semibold text-foreground mb-1 leading-snug">{judul || "Tanpa Judul"}</p>
                                <ExpandableText text={pick(news, ["ringkasan", "uraian"]) || ""} />
                              </td>
                              <td className="px-4 py-3 text-muted-foreground align-top">{kotaBerita || "—"}</td>
                              <td className="px-4 py-3 align-top"><ExpandableText text={alasan} /></td>
                              <td className="px-4 py-3 text-right align-top">
                                {url ? (
                                  <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline font-medium">
                                    Sumber <ExternalLink className="size-3" />
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {rest.length > 0 && (
        <div className="pt-6 space-y-3">
          <h3 className="font-display text-lg font-semibold">Berita Tidak Terpilih ({rest.length})</h3>
          <ResultTable rows={rest} fields={fields} />
        </div>
      )}
    </div>
  );
}


// ==========================================
// 2. VIEW UNTUK KOMISI (Sidebar Kiri)
// ==========================================
const KOMISI_LIST = ["Komisi I", "Komisi II", "Komisi III", "Komisi IV", "Komisi V", "Komisi VI", "Komisi VII", "Komisi VIII", "Komisi IX", "Komisi X", "Komisi XI", "Komisi XII", "Komisi XIII"];

function KomisiView({ selected, rest, fields, tanggal, categories }: { selected: Row[], rest: Row[], fields: string[], tanggal?: string | null | undefined, categories?: string[] | undefined }) {
  const availableKomisi = useMemo(() => categories && categories.length > 0 ? categories : KOMISI_LIST, [categories]);
  const [activeKomisi, setActiveKomisi] = useState<string>(availableKomisi[0] || "Komisi I");

  const filteredSelected = useMemo(() => selected.filter(r => (pick(r, ["komisi", "nama_komisi", "kategori"]) || "").toLowerCase() === activeKomisi.toLowerCase()), [selected, activeKomisi]);
  const filteredRest = useMemo(() => rest.filter(r => (pick(r, ["komisi", "nama_komisi", "kategori"]) || "").toLowerCase() === activeKomisi.toLowerCase()), [rest, activeKomisi]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
      <div className="md:col-span-3 space-y-1.5 bg-card p-3 rounded-xl border border-border sticky top-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-2 pb-2">Daftar Komisi</p>
        <div className="space-y-1 max-h-[75vh] overflow-y-auto pr-1">
          {availableKomisi.map((komisi, idx) => {
            const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII"][idx] || String(idx + 1);
            const isActive = activeKomisi === komisi;
            return (
              <button key={komisi} onClick={() => setActiveKomisi(komisi)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-secondary text-foreground"}`}>
                <span className={`w-6 text-center font-bold text-xs px-1.5 py-0.5 rounded ${isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{roman}</span>
                <span className="truncate">{komisi}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="md:col-span-9 space-y-6">
        <header className="border-b border-border pb-4 bg-card p-5 rounded-xl border border-border">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">NEWS CHECKER {tanggal ? `· ${tanggal}` : ""}</p>
          <h2 className="font-display text-2xl font-bold text-primary mt-1">{activeKomisi}</h2>
        </header>

        <div className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-display text-lg font-semibold">Berita Terpilih</h3>
            <p className="text-sm text-muted-foreground">{filteredSelected.length} berita untuk {activeKomisi}</p>
          </div>
          {filteredSelected.length === 0 ? (
            <p className="text-sm text-muted-foreground bg-card p-6 rounded-xl border border-border text-center">Tidak ada berita terpilih.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredSelected.map((row, i) => {
                const judul = pick(row, ["judul", "title", "headline", "isu_utama"]);
                const alasan = pick(row, ["alasan_pemilihan", "alasan", "catatan", "penjelasan"]);
                const jenis = pick(row, ["jenis", "kategori"]);
                const mitra = pick(row, ["mitra", "mitra_kerja"]);
                const sumber = pick(row, ["sumber", "media"]);
                const url = pick(row, ["url", "link"]);

                return (
                  <article key={i} className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="bg-red-600 hover:bg-red-700 text-white text-[10px] px-2 py-0.5">SELECTED</Badge>
                      {mitra && <Badge variant="outline" className="text-[10px] text-muted-foreground truncate max-w-[150px]">{mitra}</Badge>}
                    </div>
                    {judul && <h3 className="font-display text-base font-semibold leading-snug text-foreground">{judul}</h3>}
                    <div className="grid gap-4 md:grid-cols-2 text-xs">
                      <div className="space-y-1">
                        <p className="font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">Alasan Pemilihan</p>
                        <ExpandableText text={alasan} />
                      </div>
                      <div className="space-y-1.5 md:border-l md:border-border md:pl-4">
                        <p className="font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">Informasi</p>
                        <div className="grid grid-cols-3 gap-1 text-muted-foreground">
                          <span className="font-medium text-foreground">Jenis</span><span className="col-span-2">{jenis || "—"}</span>
                          <span className="font-medium text-foreground">Mitra</span><span className="col-span-2 truncate">{mitra || "—"}</span>
                          <span className="font-medium text-foreground">Sumber</span><span className="col-span-2 truncate">{sumber || "—"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end border-t border-border pt-3">
                      {url ? <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">Buka berita <ExternalLink className="size-3" /></a> : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {filteredRest.length > 0 && (
          <div className="space-y-3 pt-4">
            <h3 className="font-display text-lg font-semibold">Berita Tidak Terpilih ({filteredRest.length})</h3>
            <ResultTable rows={filteredRest} fields={fields} />
          </div>
        )}
      </div>
    </div>
  );
}


// ==========================================
// 3. VIEW UNTUK NASIONAL (Card Grid)
// ==========================================
function NasionalView({ selected, rest, fields, tanggal, categories, sourceName }: { selected: Row[], rest: Row[], fields: string[], tanggal?: string | null | undefined, categories?: string[] | undefined, sourceName?: string | undefined }) {
  return (
    <div className="space-y-6">
      <header className="border-b border-border pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          News Checker{tanggal ? ` · ${tanggal}` : ""}
        </p>
        <h2 className="font-display text-2xl font-bold text-primary">
          {categories?.length ? categories.join(" · ") : "Hasil Output Nasional"}
        </h2>
        {sourceName && <p className="text-sm text-muted-foreground mt-1">{sourceName}</p>}
      </header>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-lg font-semibold">Berita Terpilih</h3>
        <p className="text-sm text-muted-foreground">{selected.length} berita dikonsolidasikan</p>
      </div>

      {selected.length === 0 ? (
        <p className="text-sm text-muted-foreground">Tidak ada item terpilih.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {selected.map((row, i) => (
             <article key={i} className="rounded-xl border border-border border-l-4 border-l-primary bg-card p-5 shadow-sm space-y-3">
               <Badge>SELECTED</Badge>
               <h3 className="font-display text-lg font-semibold">{pick(row, ["judul", "title"])}</h3>
               <ExpandableText text={pick(row, ["ringkasan", "alasan", "deskripsi"])} />
             </article>
          ))}
        </div>
      )}

      {rest.length > 0 && (
        <div className="pt-6">
          <h3 className="mb-3 font-display text-lg font-semibold">Berita Tidak Terpilih ({rest.length})</h3>
          <ResultTable rows={rest} fields={fields} />
        </div>
      )}
    </div>
  );
}


// ==========================================
// 4. KOMPONEN RENDER PER SUMBER
// ==========================================
export function SourceOutputPreview({
  rows,
  fields,
  tanggal,
  categories,
  sourceName,
}: {
  rows: Row[];
  fields: string[];
  tanggal?: string | null | undefined;
  categories?: string[] | undefined;
  sourceName?: string | undefined;
}) {
  const { selected, rest } = useMemo(() => {
    const sel = rows.filter(isSelected);
    // Urutkan default by peringkat kalau ada
    sel.sort((a, b) => Number(a["peringkat"] ?? 999) - Number(b["peringkat"] ?? 999));
    return { selected: sel, rest: rows.filter((r) => !isSelected(r)) };
  }, [rows]);

  // AUTO-DETECT STRUKTUR DATA
  const isDapilData = useMemo(() => selected.some(r => pick(r, ["dapil", "nama_dapil", "daerah_pemilihan"])), [selected]);
  const isKomisiData = useMemo(() => selected.some(r => pick(r, ["komisi", "nama_komisi"])), [selected]);

  // Jika terdeteksi Dapil, render tabel Dapil (Desain Gambar 2)
  if (isDapilData) {
    return <DapilView selected={selected} rest={rest} fields={fields} tanggal={tanggal} />;
  }

  // Jika terdeteksi Komisi, render sidebar Komisi (Desain Gambar 1)
  if (isKomisiData) {
    return <KomisiView selected={selected} rest={rest} fields={fields} tanggal={tanggal} categories={categories} />;
  }

  // Jika tidak keduanya (Data Nasional/Standar), render Card standar
  return <NasionalView selected={selected} rest={rest} fields={fields} tanggal={tanggal} categories={categories} sourceName={sourceName} />;
}


// ==========================================
// 5. KOMPONEN UTAMA (Multi-sumber / Single)
// ==========================================
export function OutputPreview({
  rows,
  fields,
  tanggal,
  categories,
}: {
  rows: Row[];
  fields: string[];
  tanggal?: string | null | undefined;
  categories?: string[] | undefined;
}) {
  return <SourceOutputPreview rows={rows} fields={fields} tanggal={tanggal} categories={categories} />;
}
