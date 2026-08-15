import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Calendar, Database, Layers, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResultTable, type Row } from "@/components/ResultTable";
import { ExportMenu } from "@/components/ExportMenu";
import { deleteReport, listReports } from "@/lib/data.functions";

export const Route = createFileRoute("/tersimpan")({
  head: () => ({
    meta: [
      { title: "Data Tersimpan — JSON Digest Studio" },
      {
        name: "description",
        content: "Daftar hasil seleksi data JSON yang sudah disimpan ke database beserta tabelnya.",
      },
      { property: "og:title", content: "Data Tersimpan — JSON Digest Studio" },
      {
        property: "og:description",
        content: "Lihat kembali hasil seleksi data JSON yang tersimpan.",
      },
    ],
  }),
  component: SavedPage,
});

type Report = {
  id: string;
  name: string;
  tanggal: string | null;
  categories: string[];
  fields: string[];
  row_count: number;
  rows: Row[];
  created_at: string;
  kind: string;
  analysis: string | null;
  meta: { sources?: string[]; prompt?: string | null; attachment?: string | null } | null;
};

const KIND_LABEL: Record<string, string> = { compare: "Compare", input: "Data Input" };

function SavedPage() {
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "input" | "compare">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["saved_reports"],
    queryFn: async () => (await listReports()) as unknown as Report[],
  });

  async function remove(id: string) {
    try {
      await deleteReport({ data: { id } });
    } catch {
      toast.error("Gagal menghapus data.");
      return;
    }
    toast.success("Data dihapus.");
    if (openId === id) setOpenId(null);
    void queryClient.invalidateQueries({ queryKey: ["saved_reports"] });
  }

  const all = data ?? [];
  const reports = filter === "all" ? all : all.filter((r) => (r.kind ?? "input") === filter);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Data Tersimpan</h1>
        <p className="mt-1 text-muted-foreground">
          Hasil seleksi yang sudah disimpan ke database.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          ["all", `Semua (${all.length})`],
          ["input", `Data Input (${all.filter((r) => (r.kind ?? "input") === "input").length})`],
          ["compare", `Compare (${all.filter((r) => r.kind === "compare").length})`],
        ] as const).map(([value, label]) => (
          <Button
            key={value}
            size="sm"
            variant={filter === value ? "default" : "outline"}
            onClick={() => setFilter(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Memuat…</p>}
      {!isLoading && reports.length === 0 && (
        <div className="panel p-10 text-center">
          <Database className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-medium">Belum ada data tersimpan</p>
          <p className="text-sm text-muted-foreground">
            Proses sebuah file JSON di Dashboard, lalu klik Simpan ke Database.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {reports.map((report) => (
          <article key={report.id} className="panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={report.kind === "compare" ? "default" : "secondary"}>
                    {KIND_LABEL[report.kind ?? "input"] ?? "Data Input"}
                  </Badge>
                  <h2 className="font-display text-lg font-semibold">{report.name}</h2>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="size-4" /> {report.tanggal ?? "—"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Layers className="size-4" /> {report.row_count.toLocaleString("id-ID")} baris
                  </span>
                  <span>
                    Disimpan {new Date(report.created_at).toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {report.categories.map((c) => (
                    <Badge key={c} variant="secondary">
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <ExportMenu
                  payload={{
                    name: report.name,
                    tanggal: report.tanggal,
                    categories: report.categories ?? [],
                    fields: report.fields ?? [],
                    rows: (report.rows ?? []) as Record<string, unknown>[],
                    createdAt: report.created_at,
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpenId(openId === report.id ? null : report.id)}
                >
                  {openId === report.id ? "Tutup" : "Lihat Tabel"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => void remove(report.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>

            {report.kind === "compare" && report.meta?.sources?.length ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Sumber: {report.meta.sources.join(" vs ")}
                {report.meta.prompt ? ` · Prompt: ${report.meta.prompt.slice(0, 120)}` : ""}
              </p>
            ) : null}

            {openId === report.id && report.analysis && (
              <div className="mt-5 whitespace-pre-wrap rounded-lg border border-border bg-secondary/40 p-4 text-sm leading-relaxed">
                <p className="mb-2 font-semibold">Analisis AI</p>
                {report.analysis}
              </div>
            )}

            {openId === report.id && (
              <div className="mt-5">
                <ResultTable rows={report.rows ?? []} fields={report.fields ?? []} />
              </div>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}
