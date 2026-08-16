import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Bot,
  CheckCircle2,
  FileJson,
  GitCompare,
  Loader2,
  Paperclip,
  RefreshCw,
  Save,
  Sparkles,
  Table2,
  Trash2,
  Upload,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ResultTable, type Row } from "@/components/ResultTable";
import { analyzeJson, categoryKeyOf, extractItems, type Analysis, type JsonItem } from "@/lib/analyze";
import { buildCompare, pickKeyField, type CompareSummary } from "@/lib/compare";
import { buildInitialMap, guessField, normalizeItems, type FieldMap } from "@/lib/normalize";
import { analyzeComparison } from "@/lib/ai.functions";
import { saveReport } from "@/lib/data.functions";
import { fetchRemoteJson } from "@/lib/remote-json.functions";

export const Route = createFileRoute("/kompare")({
  head: () => ({
    meta: [
      { title: "Kompare JSON — Bandingkan 2–3 File" },
      {
        name: "description",
        content:
          "Bandingkan dua atau tiga file JSON, seleksi kategori dan field yang dibutuhkan, lihat perbedaannya dalam tabel, lalu analisis dengan AI.",
      },
      { property: "og:title", content: "Kompare JSON — Bandingkan 2–3 File" },
      {
        property: "og:description",
        content: "Bandingkan file JSON, seleksi data, dan analisis perbedaannya dengan AI.",
      },
    ],
  }),
  component: ComparePage,
});

type Source = { name: string; analysis: Analysis; items: JsonItem[] };

function Section({
  step,
  title,
  desc,
  icon,
  children,
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

function ComparePage() {
  const fetchRemote = useServerFn(fetchRemoteJson);
  const runAi = useServerFn(analyzeComparison);

  const [sources, setSources] = useState<Source[]>([]);
  const [url, setUrl] = useState("");
  const [reading, setReading] = useState(false);

  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [fieldMaps, setFieldMaps] = useState<FieldMap[]>([]);
  const [result, setResult] = useState<
    { rows: Row[]; fields: string[]; summary: CompareSummary } | null
  >(null);

  const [prompt, setPrompt] = useState("");
  const [attachment, setAttachment] = useState<{ name: string; text: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sources) {
      for (const c of s.analysis.categories) map.set(c.name, (map.get(c.name) ?? 0) + c.count);
    }
    return Array.from(map, ([name, count]) => ({ name, count })).sort((a, b) =>
      a.name.localeCompare(b.name, "id", { numeric: true }),
    );
  }, [sources]);

  const allFields = useMemo(() => {
    const set = new Set<string>();
    for (const s of sources) for (const f of s.analysis.fields) set.add(f.name);
    return Array.from(set);
  }, [sources]);

  const sourceFields = useMemo(
    () => sources.map((s) => s.analysis.fields.map((f) => f.name)),
    [sources],
  );

  useEffect(() => {
    setFieldMaps((prev) =>
      sources.map((_, i) => {
        const available = sourceFields[i] ?? [];
        const existing = prev[i] ?? {};
        const next: FieldMap = {};
        for (const c of selectedFields) {
          next[c] = c in existing ? existing[c]! : guessField(c, available);
        }
        return next;
      }),
    );
  }, [sources, sourceFields, selectedFields]);


  function addSource(json: unknown, name: string) {
    const items = extractItems(json);
    if (items.length === 0) {
      toast.error(`Tidak ditemukan daftar item di ${name}.`);
      return;
    }
    setSources((prev) => {
      if (prev.length >= 3) {
        toast.error("Maksimal 3 file untuk dibandingkan.");
        return prev;
      }
      return [...prev, { name, analysis: analyzeJson(json), items }];
    });
    setResult(null);
    setAiText(null);
    toast.success(`${name} ditambahkan (${items.length.toLocaleString("id-ID")} item).`);
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setReading(true);
    try {
      for (const file of Array.from(files).slice(0, 3)) {
        addSource(JSON.parse(await file.text()), file.name);
      }
    } catch {
      toast.error("Ada file yang bukan JSON valid.");
    } finally {
      setReading(false);
    }
  }

  async function addFromUrl() {
    if (!url.trim()) return;
    setReading(true);
    try {
      const res = await fetchRemote({ data: { url: url.trim() } });
      addSource(JSON.parse(res.text), url.trim().split("/").pop() || url.trim());
      setUrl("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengambil file dari link.");
    } finally {
      setReading(false);
    }
  }

  function toggle(list: string[], value: string, setter: (v: string[]) => void) {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function buildResult() {
    if (sources.length < 2) {
      toast.error("Tambahkan minimal 2 file JSON.");
      return;
    }
    if (selectedFields.length === 0) {
      toast.error("Centang minimal satu field.");
      return;
    }
    const filtered = sources.map((s, i) => {
      const key = categoryKeyOf(s.items);
      const items =
        key && selectedCats.length
          ? s.items.filter((it) => selectedCats.includes(String(it[key] ?? "")))
          : s.items;
      const map = fieldMaps[i] ?? buildInitialMap(selectedFields, sourceFields[i] ?? []);
      return { name: s.name, items: normalizeItems(items, selectedFields, map) };
    });
    const keyField = pickKeyField(filtered, selectedFields);
    const built = buildCompare(filtered, selectedFields, keyField);
    setResult(built);
    setAiText(null);
    toast.success(`${built.rows.length.toLocaleString("id-ID")} baris perbandingan siap.`);
  }

  async function onAttach(file: File | null) {
    if (!file) {
      setAttachment(null);
      return;
    }
    if (file.size > 2_000_000) {
      toast.error("Lampiran maksimal 2MB.");
      return;
    }
    setAttachment({ name: file.name, text: await file.text() });
  }

  async function runAnalysis() {
    if (!result) return;
    setAiLoading(true);
    try {
      const summary = [
        `Field kunci: ${result.summary.keyField}`,
        `Total baris gabungan: ${result.summary.totalRows}`,
        `Identik: ${result.summary.sameCount} | Berbeda/unik: ${result.summary.diffCount}`,
        `Kategori terpilih: ${selectedCats.join(", ") || "semua"}`,
        `Field terpilih: ${selectedFields.join(", ")}`,
        ...result.summary.sources.map(
          (s) => `Sumber ${s.name}: ${s.total} item, ${s.matched} cocok di sumber lain, ${s.unique} unik`,
        ),
      ].join("\n");
      const sample = JSON.stringify(result.rows.slice(0, 60));
      const res = await runAi({
        data: {
          prompt,
          attachmentName: attachment?.name ?? null,
          attachmentText: attachment?.text.slice(0, 150_000) ?? null,
          summary,
          sample,
        },
      });
      setAiText(res.text);
      toast.success("Analisis AI selesai.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analisis AI gagal.");
    } finally {
      setAiLoading(false);
    }
  }

  async function save() {
    if (!result) return;
    setSaving(true);
    try {
      await saveReport({
        data: {
          dataset_id: null,
          name: `Kompare: ${sources.map((s) => s.name).join(" vs ").slice(0, 200)}`,
          tanggal: sources[0]?.analysis.tanggal ?? null,
          categories: selectedCats,
          fields: result.fields,
          row_count: result.rows.length,
          rows: result.rows,
          kind: "compare",
          analysis: aiText,
          meta: {
            sources: sources.map((s) => s.name),
            prompt: prompt || null,
            attachment: attachment?.name ?? null,
          },
        },
      });
      toast.success("Hasil perbandingan tersimpan di Data Tersimpan.");
    } catch {
      toast.error("Gagal menyimpan hasil.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Kompare JSON</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Bandingkan 2–3 file JSON, seleksi kategori & field yang dibutuhkan, lihat perbedaannya,
          lalu minta AI menganalisis dan menilai berdasarkan kriteria Anda.
        </p>
      </div>

      <Section
        step={1}
        icon={<Upload className="size-5" />}
        title="Sumber Perbandingan"
        desc="Tambahkan 2 sampai 3 file JSON dari perangkat atau link."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cmp-file">Upload File JSON (bisa pilih beberapa)</Label>
            <Input
              id="cmp-file"
              type="file"
              multiple
              accept="application/json,.json"
              disabled={reading || sources.length >= 3}
              onChange={(e) => void onFiles(e.target.files)}
              className="file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cmp-url">Atau tempel link JSON</Label>
            <div className="flex gap-2">
              <Input
                id="cmp-url"
                placeholder="https://contoh.com/data.json"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <Button variant="outline" onClick={() => void addFromUrl()} disabled={reading || sources.length >= 3}>
                {reading ? <Loader2 className="size-4 animate-spin" /> : "Tambah"}
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {sources.length === 0 && (
            <p className="text-sm text-muted-foreground">Belum ada file. Tambahkan minimal 2 file.</p>
          )}
          {sources.map((s, i) => (
            <div
              key={`${s.name}-${i}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-secondary/40 p-3"
            >
              <div className="flex min-w-0 items-center gap-2">
                <FileJson className="size-4 shrink-0 text-primary" />
                <span className="truncate text-sm font-medium">{s.name}</span>
                <Badge variant="secondary">{s.items.length.toLocaleString("id-ID")} item</Badge>
                <Badge variant="outline">{s.analysis.categories.length} kategori</Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSources((prev) => prev.filter((_, idx) => idx !== i));
                  setResult(null);
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </Section>

      {sources.length >= 2 && (
        <Section
          step={2}
          icon={<CheckCircle2 className="size-5" />}
          title="Seleksi Data"
          desc="Centang kategori dan field yang ingin dibandingkan."
        >
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Kategori
            </h3>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedCats(categories.map((c) => c.name))}>
                Pilih semua
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedCats([])}>
                Kosongkan
              </Button>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
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

          <Separator className="my-6" />
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Field
            </h3>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedFields(allFields)}>
                Pilih semua
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedFields([])}>
                Kosongkan
              </Button>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {allFields.map((f) => (
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

          <Button className="mt-5" onClick={buildResult}>
            <GitCompare className="size-4" /> Proses Perbandingan
          </Button>
        </Section>
      )}

      {result && (
        <Section
          step={3}
          icon={<Table2 className="size-5" />}
          title="Hasil Perbandingan"
          desc="Kolom status menandai baris identik, berbeda, atau hanya ada di salah satu file."
        >
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-secondary/50 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total baris</p>
              <p className="mt-1 font-display text-2xl font-semibold">
                {result.summary.totalRows.toLocaleString("id-ID")}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/50 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Identik</p>
              <p className="mt-1 font-display text-2xl font-semibold">
                {result.summary.sameCount.toLocaleString("id-ID")}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/50 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Berbeda / unik</p>
              <p className="mt-1 font-display text-2xl font-semibold">
                {result.summary.diffCount.toLocaleString("id-ID")}
              </p>
            </div>
          </div>

          <div className="mb-4 space-y-1 rounded-lg border border-border bg-card p-4 text-sm">
            <p className="font-medium">Kunci pencocokan: {result.summary.keyField || "—"}</p>
            {result.summary.sources.map((s) => (
              <p key={s.name} className="text-muted-foreground">
                {s.name}: {s.total.toLocaleString("id-ID")} item · {s.matched.toLocaleString("id-ID")} cocok ·{" "}
                {s.unique.toLocaleString("id-ID")} unik
              </p>
            ))}
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <Button onClick={() => void save()} disabled={saving}>
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

      {result && (
        <Section
          step={4}
          icon={<Bot className="size-5" />}
          title="Analisis AI"
          desc="Tulis instruksi atau kriteria penilaian, lampirkan file pendukung bila perlu."
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ai-prompt">Prompt / kriteria penilaian</Label>
              <Textarea
                id="ai-prompt"
                rows={4}
                placeholder="Contoh: Nilai kelengkapan liputan tiap file, soroti berita yang hilang di file kedua, dan beri skor 1–10 untuk kualitas ringkasan."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ai-file">Attach file pendukung (teks/JSON/CSV/MD, maks 2MB)</Label>
              <Input
                id="ai-file"
                type="file"
                accept=".txt,.json,.csv,.md,.log,text/*,application/json"
                onChange={(e) => void onAttach(e.target.files?.[0] ?? null)}
                className="file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-sm"
              />
              {attachment && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Paperclip className="size-4" /> {attachment.name}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void runAnalysis()} disabled={aiLoading}>
                {aiLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Analisis dengan AI
              </Button>
              {aiText && (
                <Button variant="outline" onClick={() => void runAnalysis()} disabled={aiLoading}>
                  <RefreshCw className="size-4" /> Analisis Ulang
                </Button>
              )}
              {aiText && (
                <Button variant="outline" onClick={() => void save()} disabled={saving}>
                  <Save className="size-4" /> Simpan Hasil + Analisis
                </Button>
              )}
            </div>
            {aiText && (
              <div className="whitespace-pre-wrap rounded-lg border border-border bg-secondary/40 p-4 text-sm leading-relaxed">
                {aiText}
              </div>
            )}
          </div>
        </Section>
      )}
    </main>
  );
}
