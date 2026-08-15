export type FieldType = "text" | "angka" | "boolean" | "tanggal" | "objek" | "array" | "kosong";

export type FieldInfo = {
  name: string;
  types: FieldType[];
  filled: number;
  empty: number;
  uniqueCount: number;
  sample: string;
};

export type CategoryInfo = { name: string; count: number };

export type Analysis = {
  tanggal: string | null;
  total: number;
  itemCount: number;
  categories: CategoryInfo[];
  fields: FieldInfo[];
  rootKeys: string[];
  itemsPath: string;
};

export type JsonItem = Record<string, unknown>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?/;

export function detectType(value: unknown): FieldType {
  if (value === null || value === undefined || value === "") return "kosong";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number") return "angka";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "object") return "objek";
  if (typeof value === "string") return DATE_RE.test(value) ? "tanggal" : "text";
  return "text";
}

/** Find the first array of objects anywhere in the JSON tree. */
function findItems(node: unknown, path = "$"): { items: JsonItem[]; path: string } | null {
  if (Array.isArray(node)) {
    if (node.length > 0 && typeof node[0] === "object" && node[0] !== null) {
      return { items: node as JsonItem[], path };
    }
    return null;
  }
  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      const found = findItems(value, `${path}.${key}`);
      if (found) return found;
    }
  }
  return null;
}

function findDate(node: unknown, depth = 0): string | null {
  if (depth > 3 || !node || typeof node !== "object" || Array.isArray(node)) return null;
  const obj = node as Record<string, unknown>;
  for (const key of ["tanggal", "date", "tgl", "periode", "created_at"]) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v;
  }
  for (const value of Object.values(obj)) {
    const found = findDate(value, depth + 1);
    if (found) return found;
  }
  return null;
}

function findTotal(node: unknown, depth = 0): number | null {
  if (depth > 3 || !node || typeof node !== "object" || Array.isArray(node)) return null;
  const obj = node as Record<string, unknown>;
  if (typeof obj["total"] === "number") return obj["total"];
  for (const value of Object.values(obj)) {
    const found = findTotal(value, depth + 1);
    if (found !== null) return found;
  }
  return null;
}

export function categoryKeyOf(items: JsonItem[]): string | null {
  for (const key of ["kategori", "category", "kanal", "jenis", "type"]) {
    if (items.some((i) => typeof i[key] === "string" && (i[key] as string).length > 0)) return key;
  }
  return null;
}

export function analyzeJson(root: unknown): Analysis {
  const found = findItems(root);
  const items = found?.items ?? [];
  const catKey = categoryKeyOf(items);

  const catMap = new Map<string, number>();
  if (catKey) {
    for (const item of items) {
      const raw = item[catKey];
      const name = typeof raw === "string" && raw.trim() ? raw : "(tanpa kategori)";
      catMap.set(name, (catMap.get(name) ?? 0) + 1);
    }
  }

  const fieldOrder: string[] = [];
  const stats = new Map<string, { types: Set<FieldType>; filled: number; values: Set<string>; sample: string }>();
  for (const item of items) {
    for (const [key, value] of Object.entries(item)) {
      if (!stats.has(key)) {
        stats.set(key, { types: new Set(), filled: 0, values: new Set(), sample: "" });
        fieldOrder.push(key);
      }
      const s = stats.get(key)!;
      const t = detectType(value);
      if (t !== "kosong") {
        s.types.add(t);
        s.filled += 1;
        if (!s.sample) s.sample = typeof value === "object" ? JSON.stringify(value) : String(value);
      }
      if (s.values.size < 5000) s.values.add(typeof value === "object" ? JSON.stringify(value) : String(value));
    }
  }

  const fields: FieldInfo[] = fieldOrder.map((name) => {
    const s = stats.get(name)!;
    return {
      name,
      types: s.types.size ? Array.from(s.types) : ["kosong"],
      filled: s.filled,
      empty: items.length - s.filled,
      uniqueCount: s.values.size,
      sample: s.sample.slice(0, 160),
    };
  });

  return {
    tanggal: findDate(root),
    total: findTotal(root) ?? items.length,
    itemCount: items.length,
    categories: Array.from(catMap, ([name, count]) => ({ name, count })).sort((a, b) =>
      a.name.localeCompare(b.name, "id", { numeric: true }),
    ),
    fields,
    rootKeys: root && typeof root === "object" && !Array.isArray(root) ? Object.keys(root) : [],
    itemsPath: found?.path ?? "-",
  };
}

export function extractItems(root: unknown): JsonItem[] {
  return findItems(root)?.items ?? [];
}

export function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
