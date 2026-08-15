import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Database,
  FileJson,
  Link2,
  Loader2,
  RefreshCw,
  Save,
  Table2,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ResultTable, type Row } from "@/components/ResultTable";
import { createDataset, insertDatasetItems, saveReport } from "@/lib/data.functions";
import { fetchRemoteJson } from "@/lib/remote-json.functions";
import {
  analyzeJson,
  categoryKeyOf,
  extractItems,
  type Analysis,
  type JsonItem,
} from "@/lib/analyze";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard Baca JSON — JSON Digest Studio" },
      {
        name: "description",
        content:
          "Unggah file JSON atau tempel link, baca seluruh isinya, lihat pemetaan data, lalu seleksi kategori dan field untuk disimpan ke database.",
      },
      { property: "og:title", content: "Dashboard Baca JSON — JSON Digest Studio" },
      {
        property: "og:description",
        content: "Baca, petakan, seleksi, dan simpan data JSON digest berita.",
      },
    ],
  }),
  component: Dashboard,
});

type Stage = {
  analysis: Analysis;
  items: JsonItem[];
  datasetId: string | null;
  sourceName: string;
};

function Section({
  step,
  title,
  desc,
  children,
  icon,
}: {
  step: number;
  title: string;
  desc: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="panel p-5 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-md bg-secondary text-primary">
          {icon}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Langkah {step}
          </p>
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{desc}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Dashboard() {
  const fetchRemote = useServerFn(fetchRemoteJson);
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [reading, setReading] = useState(false);
  const [stage, setStage] = useState<Stage | null>(null);

  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ rows: Row[]; fields: string[]; cats: string[] } | null>(null);

  const catKey = useMemo(() => (stage ? categoryKeyOf(stage.items) : null), [stage]);

  const availableFields = useMemo(() => {
    if (!stage) return [];
    if (selectedCats.length === 0) return stage.analysis.fields.map((f) => f.name);
    const set = new Set<string>();
    for (const item of stage.items) {
      if (catKey && selectedCats.includes(String(item[catKey] ?? ""))) {
        Object.keys(item).forEach((k) => set.add(k));
      }
    }
    return stage.analysis.fields.map((f) => f.name).filter((n) => set.has(n));
  }, [stage, selectedCats, catKey]);

  async function ingest(json: unknown, sourceName: string, sourceType: string, sourceUrl: string | null) {
    const analysis = analyzeJson(json);
    const items = extractItems(json);
    if (items.length === 0) {
      toast.error("Tidak ditemukan daftar item di dalam JSON ini.");
      return;
    }
    setStage({ analysis, items, datasetId: null, sourceName });
    setSelectedCats([]);
    setSelectedFields([]);
    setResult(null);

    let datasetId: string;
    try {
      const created = await createDataset({
        data: {
          name: sourceName,
          source_type: sourceType === "url" ? "url" : "file",
          source_url: sourceUrl,
          tanggal: analysis.tanggal,
          total_items: analysis.itemCount,
          categories: analysis.categories,
          fields: analysis.fields,
          meta: { rootKeys: analysis.rootKeys, itemsPath: analysis.itemsPath, total: analysis.total },
        },
      });
      datasetId = created.id;
    } catch {
      toast.error("Pemetaan berhasil, tapi gagal menyimpan ke database.");
      return;
    }

    const key = categoryKeyOf(items);
    const payload = items.map((item) => ({
      kategori: key ? String(item[key] ?? "") : null,
      data: item,
    }));
    for (let i = 0; i < payload.length; i += 400) {
      try {
        await insertDatasetItems({ data: { dataset_id: datasetId, items: payload.slice(i, i + 400) } });
      } catch {
        toast.error("Sebagian item gagal disimpan ke database.");
        break;
      }
    }
    setStage({ analysis, items, datasetId, sourceName });
    toast.success(`Berhasil membaca ${items.length.toLocaleString("id-ID")} item & menyimpan ke database.`);
  }

  async function handleProcessSource() {
    setReading(true);
    try {
      if (file) {
        const text = await file.text();
        await ingest(JSON.parse(text), file.name, "file", null);
      } else if (url.trim()) {
        const res = await fetchRemote({ data: { url: url.trim() } });
        await ingest(JSON.parse(res.text), url.trim().split("/").pop() || url.trim(), "url", url.trim());
      } else {
        toast.error("Pilih file JSON atau isi link terlebih dahulu.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memproses sumber data.");
    } finally {
      setReading(false);
    }
  }

  function toggle(list: string[], value: string, setter: (v: string[]) => void) {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function buildResult() {
    if (!stage) return;
    setProcessing(true);
    const cats = selectedCats;
    const fields = selectedFields.filter((f) => availableFields.includes(f));
    if (cats.length === 0 || fields.length === 0) {
      toast.error("Centang minimal satu kategori dan satu field.");
      setProcessing(false);
      return;
    }
    const rows: Row[] = stage.items
      .filter((item) => (catKey ? cats.includes(String(item[catKey] ?? "")) : true))
      .map((item) => {
        const row: Row = {};
        for (const f of fields) row[f] = item[f] ?? "";
        return row;
      });
    setResult({ rows, fields, cats });
    setProcessing(false);
    toast.success(`${rows.length.toLocaleString("id-ID")} baris berhasil diproses.`);
  }

  async function saveResult() {
    if (!stage || !result) return;
    setSaving(true);
    try {
      await saveReport({
        data: {
          dataset_id: stage.datasetId,
          name: `${stage.sourceName} — ${result.cats.join(", ").slice(0, 80)}`,
          tanggal: stage.analysis.tanggal,
          categories: result.cats,
          fields: result.fields,
          row_count: result.rows.length,
          rows: result.rows,
        },
      });
      toast.success("Hasil tersimpan. Lihat di halaman Data Tersimpan.");
    } catch {
      toast.error("Gagal menyimpan hasil.");
    } finally {
      setSaving(false);
    }
  }

  const analysis = stage?.analysis;

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Dashboard Pembaca JSON</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Unggah file JSON atau tempel link, sistem membaca seluruh isinya, memetakan struktur data,
          lalu Anda bisa menyeleksi kategori dan field yang dibutuhkan.
        </p>
      </div>

      <Section
        step={1}
        icon={<Upload className="size-5" />}
        title="Sumber Data"
        desc="Pilih file JSON dari perangkat atau masukkan link file JSON."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="file">Upload File JSON</Label>
            <div className="flex items-center gap-2">
              <Input
                id="file"
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setUrl("");
                }}
                className="file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-sm"
              />
            </div>
            {file && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileJson className="size-4" /> {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="url">Atau Input Link JSON</Label>
            <div className="relative">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="url"
                value={url}
                placeholder="https://contoh.com/data.json"
                className="pl-9"
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (e.target.value) {
                    setFile(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }
                }}
              />
            </div>
          </div>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <Button onClick={handleProcessSource} disabled={reading}>
            {reading ? <Loader2 className="size-4 animate-spin" /> : <Database className="size-4" />}
            {reading ? "Memproses…" : "Proses & Baca Data"}
          </Button>
          {stage?.datasetId && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CheckCircle2 className="size-4 text-primary" /> Tersimpan di database
            </span>
          )}
        </div>
      </Section>

      {analysis && (
        <Section
          step={2}
          icon={<Table2 className="size-5" />}
          title="Hasil Pemetaan Data"
          desc="Ringkasan struktur, jumlah, kategori, dan jenis data dari file yang dibaca."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Tanggal Data" value={analysis.tanggal ?? "—"} />
            <Stat label="Total (dari file)" value={analysis.total.toLocaleString("id-ID")} />
            <Stat label="Item Terbaca" value={analysis.itemCount.toLocaleString("id-ID")} />
            <Stat label="Jumlah Field" value={String(analysis.fields.length)} />
          </div>

          <Separator className="my-6" />

          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Kategori terdeteksi ({analysis.categories.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {analysis.categories.length === 0 && (
              <p className="text-sm text-muted-foreground">Tidak ada field kategori pada data ini.</p>
            )}
            {analysis.categories.map((c) => (
              <Badge key={c.name} variant="secondary" className="gap-1.5 py-1 text-sm">
                {c.name}
                <span className="rounded bg-primary/10 px-1.5 text-xs font-semibold text-primary">
                  {c.count}
                </span>
              </Badge>
            ))}
          </div>

          <Separator className="my-6" />

          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Field & jenis data
          </h3>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Field</th>
                  <th className="px-3 py-2">Jenis Data</th>
                  <th className="px-3 py-2">Terisi</th>
                  <th className="px-3 py-2">Kosong</th>
                  <th className="px-3 py-2">Nilai Unik</th>
                  <th className="px-3 py-2">Contoh</th>
                </tr>
              </thead>
              <tbody>
                {analysis.fields.map((f) => (
                  <tr key={f.name} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{f.name}</td>
                    <td className="px-3 py-2">
                      <span className="flex flex-wrap gap-1">
                        {f.types.map((t) => (
                          <Badge key={t} variant="outline" className="text-xs capitalize">
                            {t}
                          </Badge>
                        ))}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{f.filled}</td>
                    <td className="px-3 py-2 text-muted-foreground">{f.empty}</td>
                    <td className="px-3 py-2 text-muted-foreground">{f.uniqueCount}</td>
                    <td className="max-w-sm truncate px-3 py-2 text-muted-foreground">{f.sample}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {stage && analysis && (
        <Section
          step={3}
          icon={<CheckCircle2 className="size-5" />}
          title="Seleksi Data"
          desc="Centang kategori yang dibutuhkan, lalu centang field yang ingin ditampilkan."
        >
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Kategori
            </h3>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCats(analysis.categories.map((c) => c.name))}
              >
                Pilih semua
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedCats([])}>
                Kosongkan
              </Button>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {analysis.categories.map((c) => (
              <label
                key={c.name}
                className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-card p-3 transition-colors hover:bg-secondary/60"
              >
                <Checkbox
                  checked={selectedCats.includes(c.name)}
                  onCheckedChange={() => toggle(selectedCats, c.name, setSelectedCats)}
                />
                <span className="flex-1 text-sm font-medium">{c.name}</span>
                <span className="text-xs text-muted-foreground">{c.count} item</span>
              </label>
            ))}
          </div>

          {selectedCats.length > 0 && (
            <>
              <Separator className="my-6" />
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Field pada kategori terpilih
                </h3>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedFields(availableFields)}>
                    Pilih semua
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedFields([])}>
                    Kosongkan
                  </Button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {availableFields.map((f) => (
                  <label
                    key={f}
                    className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-card p-3 transition-colors hover:bg-secondary/60"
                  >
                    <Checkbox
                      checked={selectedFields.includes(f)}
                      onCheckedChange={() => toggle(selectedFields, f, setSelectedFields)}
                    />
                    <span className="text-sm font-medium">{f}</span>
                  </label>
                ))}
              </div>

              <div className="mt-5 rounded-lg border border-border bg-secondary/40 p-4 text-sm">
                <p className="font-medium">Ringkasan seleksi</p>
                <ul className="mt-1 space-y-0.5 text-muted-foreground">
                  <li>Tanggal data: {analysis.tanggal ?? "—"}</li>
                  <li>Total seluruh item: {analysis.itemCount.toLocaleString("id-ID")}</li>
                  <li>
                    Total item kategori terpilih:{" "}
                    {analysis.categories
                      .filter((c) => selectedCats.includes(c.name))
                      .reduce((a, c) => a + c.count, 0)
                      .toLocaleString("id-ID")}
                  </li>
                  <li>Field dipilih: {selectedFields.length ? selectedFields.join(", ") : "—"}</li>
                </ul>
              </div>

              <Button className="mt-5" onClick={buildResult} disabled={processing}>
                {processing ? <Loader2 className="size-4 animate-spin" /> : <Table2 className="size-4" />}
                Proses Seleksi
              </Button>
            </>
          )}
        </Section>
      )}

      {result && (
        <Section
          step={4}
          icon={<Table2 className="size-5" />}
          title="Hasil Seleksi"
          desc="Tabel hasil lengkap dengan pencarian. Simpan ke database atau proses ulang."
        >
          <div className="mb-4 flex flex-wrap gap-2">
            <Button onClick={saveResult} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Simpan ke Database
            </Button>
            <Button variant="outline" onClick={buildResult}>
              <RefreshCw className="size-4" /> Reproses
            </Button>
          </div>
          <ResultTable rows={result.rows} fields={result.fields} />
        </Section>
      )}
    </main>
  );
}
