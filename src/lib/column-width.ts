/** Shared column sizing so the on-screen table and every export stay consistent. */

const WEIGHTS: { test: RegExp; weight: number }[] = [
  { test: /^(no|#|index|id)$/i, weight: 4 },
  { test: /ringkasan|summary|deskripsi|description|isi|konten|content|body/i, weight: 30 },
  { test: /judul|title|headline|nama|name/i, weight: 22 },
  { test: /url|link|permalink|href/i, weight: 20 },
  { test: /media|sumber|source|penerbit|publisher|domain/i, weight: 13 },
  { test: /tanggal|date|time|waktu|published|created|updated/i, weight: 11 },
  { test: /kategori|category|kanal|topik|topic|tag|label/i, weight: 11 },
  { test: /total|jumlah|count|score|nilai|angka|jenis|type|status/i, weight: 8 },
];

function weightFor(field: string): number {
  for (const rule of WEIGHTS) if (rule.test.test(field)) return rule.weight;
  return 14;
}

/** Percentage width per field (sums to 100), sized by field meaning. */
export function columnPercents(fields: string[]): number[] {
  if (fields.length === 0) return [];
  const raw = fields.map(weightFor);
  const total = raw.reduce((a, b) => a + b, 0);
  return raw.map((w) => (w / total) * 100);
}

/** Minimum pixel width so narrow columns stay readable when the table scrolls. */
export function columnMinPx(field: string): number {
  const w = weightFor(field);
  if (w <= 8) return 90;
  if (w <= 13) return 130;
  if (w <= 22) return 200;
  return 260;
}
