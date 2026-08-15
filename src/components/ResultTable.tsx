import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCell } from "@/lib/analyze";

export type Row = Record<string, unknown>;

const PAGE_SIZE = 25;

export function ResultTable({
  rows,
  fields,
  emptyLabel = "Belum ada data.",
}: {
  rows: Row[];
  fields: string[];
  emptyLabel?: string;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      fields.some((f) => formatCell(row[f]).toLowerCase().includes(q)),
    );
  }, [rows, fields, query]);

  const percents = useMemo(() => columnPercents(fields), [fields]);
  const tableMinWidth = useMemo(
    () => 48 + fields.reduce((sum, f) => sum + columnMinPx(f), 0),
    [fields],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const slice = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Cari di semua kolom…"
            className="pl-9"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {filtered.length.toLocaleString("id-ID")} baris
          {query ? ` (dari ${rows.length.toLocaleString("id-ID")})` : ""}
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table className="w-full table-fixed" style={{ minWidth: `${tableMinWidth}px` }}>
          <colgroup>
            <col style={{ width: "3rem" }} />
            {fields.map((f, i) => (
              <col key={f} style={{ width: `${percents[i]}%` }} />
            ))}
          </colgroup>
          <TableHeader>
            <TableRow className="bg-secondary/70">
              <TableHead className="text-xs">#</TableHead>
              {fields.map((f) => (
                <TableHead key={f} className="truncate text-xs font-semibold uppercase tracking-wide">
                  {f}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {slice.length === 0 ? (
              <TableRow>
                <TableCell colSpan={fields.length + 1} className="py-10 text-center text-sm text-muted-foreground">
                  {emptyLabel}
                </TableCell>
              </TableRow>
            ) : (
              slice.map((row, i) => (
                <TableRow key={current * PAGE_SIZE + i} className="align-top">
                  <TableCell className="text-xs text-muted-foreground">
                    {current * PAGE_SIZE + i + 1}
                  </TableCell>
                  {fields.map((f) => {
                    const value = formatCell(row[f]);
                    const isUrl = /^https?:\/\//.test(value);
                    return (
                      <TableCell key={f} className="text-sm">
                        {isUrl ? (
                          <a
                            href={value}
                            target="_blank"
                            rel="noreferrer"
                            title={value}
                            className="block truncate text-primary underline underline-offset-2"
                          >
                            {value}
                          </a>
                        ) : (
                          <span
                            title={value}
                            className="line-clamp-4 whitespace-pre-wrap [overflow-wrap:anywhere]"
                          >
                            {value}
                          </span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>


      {pageCount > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={current === 0} onClick={() => setPage(current - 1)}>
            Sebelumnya
          </Button>
          <span className="text-sm text-muted-foreground">
            Halaman {current + 1} / {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={current >= pageCount - 1}
            onClick={() => setPage(current + 1)}
          >
            Berikutnya
          </Button>
        </div>
      )}
    </div>
  );
}
