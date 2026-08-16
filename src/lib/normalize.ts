import type { JsonItem } from "@/lib/analyze";

/** canonical field name -> source field name ("" = tidak ada di file ini) */
export type FieldMap = Record<string, string>;

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const ALIASES: Record<string, string[]> = {
  judul: ["title", "headline", "nama"],
  ringkasan: ["summary", "abstract", "deskripsi", "description", "isi"],
  url: ["link", "permalink", "tautan", "href"],
  media: ["sumber", "source", "publisher", "outlet"],
  published_at: ["tanggal", "date", "publishedat", "pubdate", "created_at", "waktu"],
  kategori: ["category", "kanal", "jenis", "type"],
  total_sumber: ["totalsumber", "jumlah_sumber", "count", "total"],
};

/** Tebak field pada satu file yang paling cocok dengan nama kanonikal. */
export function guessField(canonical: string, available: string[]): string {
  const target = slug(canonical);
  const exact = available.find((f) => slug(f) === target);
  if (exact) return exact;

  const aliases = [
    ...(ALIASES[canonical.toLowerCase()] ?? []),
    ...Object.entries(ALIASES)
      .filter(([, list]) => list.some((a) => slug(a) === target))
      .map(([key]) => key),
  ].map(slug);

  const byAlias = available.find((f) => aliases.includes(slug(f)));
  if (byAlias) return byAlias;

  const partial = available.find((f) => slug(f).includes(target) || target.includes(slug(f)));
  return partial ?? "";
}

/** Buat pemetaan awal untuk satu file dari daftar nama kanonikal. */
export function buildInitialMap(canonicals: string[], available: string[]): FieldMap {
  const map: FieldMap = {};
  for (const c of canonicals) map[c] = guessField(c, available);
  return map;
}

/** Tulis ulang item satu file agar memakai nama field kanonikal. */
export function normalizeItems(items: JsonItem[], canonicals: string[], map: FieldMap): JsonItem[] {
  return items.map((item) => {
    const out: JsonItem = {};
    for (const c of canonicals) {
      const from = map[c];
      out[c] = from ? item[from] : undefined;
    }
    return out;
  });
}
