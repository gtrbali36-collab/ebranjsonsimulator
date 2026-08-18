import { FileJson } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ResultTable, type Row } from "@/components/ResultTable";
import { SourceOutputPreview } from "@/components/OutputPreview";

export type SourceResult = { name: string; rows: Row[] };

export function CompareCards({
  sources,
  fields,
}: {
  sources: SourceResult[];
  fields: string[];
}) {
  // Urutan: JSON 1 di kanan, JSON 2 di kiri (dan seterusnya terbalik untuk 3 sumber)
  const reversed = [...sources].reverse();

  return (
    <div className="space-y-8">
      <div
        className={`grid items-start gap-6 ${
          sources.length >= 3 ? "xl:grid-cols-3" : "lg:grid-cols-2"
        }`}
      >
        {reversed.map((s, i) => {
          // Label posisi: Kanan / Tengah / Kiri
          const positionLabel =
            sources.length === 2
              ? i === 0
                ? "Kiri"
                : "Kanan"
              : sources.length === 3
                ? i === 0
                  ? "Kiri"
                  : i === 1
                    ? "Tengah"
                    : "Kanan"
                : "";
          return (
            <div key={`${s.name}-${i}`} className="min-w-0 space-y-3">
              <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <FileJson className="size-4 shrink-0 text-primary" />
                  <h3 className="truncate font-display text-base font-semibold">{s.name}</h3>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {positionLabel && (
                    <Badge variant="outline" className="text-[10px]">
                      {positionLabel}
                    </Badge>
                  )}
                  <Badge variant="secondary">{s.rows.length} item</Badge>
                </div>
              </header>

              <SourceOutputPreview
                rows={s.rows}
                fields={fields}
                sourceName={s.name}
              />
            </div>
          );
        })}
      </div>

      {/* Tabel gabungan per sumber (alternatif ringkas) */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Tabel per sumber
        </h4>
        <div
          className={`grid gap-6 ${
            sources.length >= 3 ? "xl:grid-cols-3" : "lg:grid-cols-2"
          }`}
        >
          {reversed.map((s, i) => (
            <div key={`table-${s.name}-${i}`} className="min-w-0 space-y-2">
              <p className="text-sm font-medium">{s.name}</p>
              <ResultTable rows={s.rows} fields={fields} emptyLabel="Tidak ada data." />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
