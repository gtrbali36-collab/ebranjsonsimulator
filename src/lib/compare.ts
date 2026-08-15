import { formatCell, type JsonItem } from "@/lib/analyze";

export type CompareSource = {
  name: string;
  items: JsonItem[];
};

export type CompareRow = Record<string, unknown>;

export type CompareSummary = {
  sources: { name: string; total: number; matched: number; unique: number }[];
  totalRows: number;
  sameCount: number;
  diffCount: number;
  keyField: string;
};

const KEY_CANDIDATES = ["url", "link", "permalink", "id", "judul", "title"];

export function pickKeyField(sources: CompareSource[], fields: string[]): string {
  for (const cand of KEY_CANDIDATES) {
    const match = fields.find((f) => f.toLowerCase() === cand);
    if (match && sources.some((s) => s.items.some((i) => formatCell(i[match]).trim()))) return match;
  }
  return fields[0] ?? "";
}

function keyOf(item: JsonItem, keyField: string): string {
  return formatCell(item[keyField]).trim().toLowerCase();
}

/** Build one union table across 2-3 sources, marking presence and value differences. */
export function buildCompare(
  sources: CompareSource[],
  fields: string[],
  keyField: string,
): { rows: CompareRow[]; fields: string[]; summary: CompareSummary } {
  const maps = sources.map((s) => {
    const m = new Map<string, JsonItem>();
    for (const item of s.items) {
      const k = keyOf(item, keyField);
      if (k && !m.has(k)) m.set(k, item);
    }
    return m;
  });

  const allKeys: string[] = [];
  const seen = new Set<string>();
  for (const m of maps) {
    for (const k of m.keys()) {
      if (!seen.has(k)) {
        seen.add(k);
        allKeys.push(k);
      }
    }
  }

  const outFields = ["status", "ada_di", ...fields];
  const rows: CompareRow[] = [];
  let sameCount = 0;
  let diffCount = 0;

  for (const k of allKeys) {
    const present = maps.map((m) => m.get(k));
    const names = sources.filter((_, i) => present[i]).map((s) => s.name);
    const first = present.find(Boolean)!;

    const differing: string[] = [];
    for (const f of fields) {
      const values = new Set(present.filter(Boolean).map((it) => formatCell(it![f])));
      if (values.size > 1) differing.push(f);
    }

    let status: string;
    if (names.length === sources.length) {
      status = differing.length ? `Berbeda (${differing.join(", ")})` : "Sama";
      if (differing.length) diffCount += 1;
      else sameCount += 1;
    } else {
      status = `Hanya di ${names.join(" & ")}`;
      diffCount += 1;
    }

    const row: CompareRow = { status, ada_di: names.join(", ") };
    for (const f of fields) {
      const vals = present.map((it) => (it ? formatCell(it[f]) : ""));
      const uniq = Array.from(new Set(vals.filter(Boolean)));
      row[f] = uniq.length > 1 ? vals.map((v, i) => `${sources[i]!.name}: ${v || "—"}`).join(" | ") : (uniq[0] ?? "");
    }
    rows.push(row);
  }

  const summary: CompareSummary = {
    keyField,
    totalRows: rows.length,
    sameCount,
    diffCount,
    sources: sources.map((s, i) => {
      const m = maps[i]!;
      let matched = 0;
      let unique = 0;
      for (const k of m.keys()) {
        const inOthers = maps.some((other, j) => j !== i && other.has(k));
        if (inOthers) matched += 1;
        else unique += 1;
      }
      return { name: s.name, total: m.size, matched, unique };
    }),
  };

  return { rows, fields: outFields, summary };
}
