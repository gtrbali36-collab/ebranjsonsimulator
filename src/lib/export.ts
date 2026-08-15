import { columnPercents } from "@/lib/column-width";

export type ExportRow = Record<string, unknown>;

export type ExportFormat =
  | "json"
  | "ndjson"
  | "csv"
  | "tsv"
  | "xlsx"
  | "html"
  | "md"
  | "txt"
  | "xml"
  | "docx"
  | "pdf";

export type ExportPayload = {
  name: string;
  tanggal?: string | null;
  categories?: string[];
  fields: string[];
  rows: ExportRow[];
  createdAt?: string;
};

export const EXPORT_FORMATS: { id: ExportFormat; label: string; hint: string }[] = [
  { id: "json", label: "JSON", hint: "Bisa diproses ulang" },
  { id: "ndjson", label: "NDJSON", hint: "1 baris = 1 objek" },
  { id: "csv", label: "CSV", hint: "Excel / Spreadsheet" },
  { id: "tsv", label: "TSV", hint: "Tab separated" },
  { id: "xlsx", label: "Excel (.xlsx)", hint: "Spreadsheet" },
  { id: "html", label: "HTML", hint: "Tabel siap buka" },
  { id: "md", label: "Markdown", hint: "Tabel teks" },
  { id: "txt", label: "Text", hint: "Plain text" },
  { id: "xml", label: "XML", hint: "Struktur data" },
  { id: "docx", label: "Word (.docx)", hint: "Dokumen" },
  { id: "pdf", label: "PDF", hint: "Siap cetak" },
];

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "data"
  );
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function delimited(payload: ExportPayload, sep: string): string {
  const esc = (v: string) => {
    const needs = v.includes(sep) || v.includes('"') || v.includes("\n");
    const q = v.replace(/"/g, '""');
    return needs ? `"${q}"` : q;
  };
  const lines = [payload.fields.map(esc).join(sep)];
  for (const row of payload.rows) {
    lines.push(payload.fields.map((f) => esc(cell(row[f]))).join(sep));
  }
  // BOM-friendly newline for Excel
  return lines.join("\r\n");
}

function toMatrix(payload: ExportPayload): string[][] {
  return [payload.fields, ...payload.rows.map((r) => payload.fields.map((f) => cell(r[f])))];
}

function meta(payload: ExportPayload) {
  return {
    name: payload.name,
    tanggal: payload.tanggal ?? null,
    categories: payload.categories ?? [],
    fields: payload.fields,
    total_items: payload.rows.length,
    exported_at: new Date().toISOString(),
    created_at: payload.createdAt ?? null,
  };
}

export async function exportReport(payload: ExportPayload, format: ExportFormat) {
  const base = slug(payload.name);

  if (format === "json") {
    const doc = { ...meta(payload), data: payload.rows };
    download(
      new Blob([JSON.stringify(doc, null, 2)], { type: "application/json;charset=utf-8" }),
      `${base}.json`,
    );
    return;
  }

  if (format === "ndjson") {
    const body = payload.rows.map((r) => JSON.stringify(r)).join("\n");
    download(new Blob([body], { type: "application/x-ndjson;charset=utf-8" }), `${base}.ndjson`);
    return;
  }

  if (format === "csv" || format === "tsv") {
    const sep = format === "csv" ? "," : "\t";
    const body = "\uFEFF" + delimited(payload, sep);
    download(
      new Blob([body], {
        type: format === "csv" ? "text/csv;charset=utf-8" : "text/tab-separated-values;charset=utf-8",
      }),
      `${base}.${format}`,
    );
    return;
  }

  if (format === "xlsx") {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(toMatrix(payload));
    ws["!cols"] = columnPercents(payload.fields).map((p) => ({
      wch: Math.max(10, Math.min(70, Math.round(p * 1.6))),
    }));
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    const info = XLSX.utils.json_to_sheet(
      Object.entries(meta(payload)).map(([key, value]) => ({
        key,
        value: Array.isArray(value) ? value.join(", ") : cell(value),
      })),
    );
    XLSX.utils.book_append_sheet(wb, info, "Info");
    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
    download(
      new Blob([out], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `${base}.xlsx`,
    );
    return;
  }

  if (format === "html") {
    const pcts = columnPercents(payload.fields);
    const cols = pcts.map((p) => `<col style="width:${p.toFixed(2)}%">`).join("");
    const head = payload.fields.map((f) => `<th>${escapeHtml(f)}</th>`).join("");
    const body = payload.rows
      .map(
        (r) =>
          `<tr>${payload.fields.map((f) => `<td>${escapeHtml(cell(r[f]))}</td>`).join("")}</tr>`,
      )
      .join("\n");
    const html = `<!doctype html>
<html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(payload.name)}</title>
<style>
body{font-family:system-ui,sans-serif;margin:24px;color:#14213d}
h1{font-size:20px;margin:0 0 4px}
p.meta{color:#5b6478;font-size:13px;margin:0 0 16px}
.wrap{overflow-x:auto}
table{border-collapse:collapse;width:100%;min-width:1100px;table-layout:fixed;font-size:13px}
th,td{border:1px solid #d9dee8;padding:6px 8px;text-align:left;vertical-align:top;overflow-wrap:anywhere;word-break:normal}
th{background:#f2f5f9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
tr:nth-child(even) td{background:#fafbfd}
@media print{body{margin:10mm}table{min-width:0;font-size:9px}@page{size:A4 landscape;margin:10mm}}
</style></head>
<body>
<h1>${escapeHtml(payload.name)}</h1>
<p class="meta">Tanggal: ${escapeHtml(payload.tanggal ?? "—")} · ${payload.rows.length} baris · Kategori: ${escapeHtml((payload.categories ?? []).join(", ") || "—")}</p>
<div class="wrap"><table><colgroup>${cols}</colgroup><thead><tr>${head}</tr></thead><tbody>
${body}
</tbody></table></div>
<script type="application/json" id="dataset">${JSON.stringify({ ...meta(payload), data: payload.rows }).replace(/</g, "\\u003c")}</script>
</body></html>`;
    download(new Blob([html], { type: "text/html;charset=utf-8" }), `${base}.html`);
    return;
  }

  if (format === "md") {
    const esc = (v: string) => v.replace(/\|/g, "\\|").replace(/\n/g, " ");
    const lines = [
      `# ${payload.name}`,
      "",
      `- Tanggal: ${payload.tanggal ?? "—"}`,
      `- Total baris: ${payload.rows.length}`,
      `- Kategori: ${(payload.categories ?? []).join(", ") || "—"}`,
      "",
      `| ${payload.fields.map(esc).join(" | ")} |`,
      `| ${payload.fields.map(() => "---").join(" | ")} |`,
      ...payload.rows.map((r) => `| ${payload.fields.map((f) => esc(cell(r[f]))).join(" | ")} |`),
    ];
    download(new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" }), `${base}.md`);
    return;
  }

  if (format === "txt") {
    const blocks = payload.rows.map((r, i) =>
      [`# Item ${i + 1}`, ...payload.fields.map((f) => `${f}: ${cell(r[f])}`)].join("\n"),
    );
    const text = [
      payload.name,
      `Tanggal: ${payload.tanggal ?? "—"}`,
      `Total baris: ${payload.rows.length}`,
      `Kategori: ${(payload.categories ?? []).join(", ") || "—"}`,
      "",
      blocks.join("\n\n"),
    ].join("\n");
    download(new Blob([text], { type: "text/plain;charset=utf-8" }), `${base}.txt`);
    return;
  }

  if (format === "xml") {
    const tag = (f: string) => f.replace(/[^A-Za-z0-9_.-]/g, "_").replace(/^[^A-Za-z_]/, "_$&");
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<dataset name="${escapeHtml(payload.name)}" tanggal="${escapeHtml(payload.tanggal ?? "")}" total="${payload.rows.length}">
${payload.rows
  .map(
    (r) =>
      `  <item>\n${payload.fields
        .map((f) => `    <${tag(f)}>${escapeHtml(cell(r[f]))}</${tag(f)}>`)
        .join("\n")}\n  </item>`,
  )
  .join("\n")}
</dataset>`;
    download(new Blob([xml], { type: "application/xml;charset=utf-8" }), `${base}.xml`);
    return;
  }

  if (format === "docx") {
    const { Document, Packer, Paragraph, HeadingLevel, Table, TableRow, TableCell, TextRun, WidthType } =
      await import("docx");
    // A4 landscape usable width ≈ 14000 dxa (twips)
    const USABLE_DXA = 14000;
    const widths = columnPercents(payload.fields).map((p) => Math.round((p / 100) * USABLE_DXA));
    const headerRow = new TableRow({
      tableHeader: true,
      children: payload.fields.map(
        (f, i) =>
          new TableCell({
            width: { size: widths[i] ?? 1000, type: WidthType.DXA },
            children: [new Paragraph({ children: [new TextRun({ text: f, bold: true })] })],
          }),
      ),
    });
    const dataRows = payload.rows.map(
      (r) =>
        new TableRow({
          children: payload.fields.map(
            (f, i) =>
              new TableCell({
                width: { size: widths[i] ?? 1000, type: WidthType.DXA },
                children: [new Paragraph(cell(r[f]).slice(0, 2000))],
              }),
          ),
        }),
    );
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              size: { orientation: "landscape" as never },
              margin: { top: 567, bottom: 567, left: 567, right: 567 },
            },
          },
          children: [
            new Paragraph({ text: payload.name, heading: HeadingLevel.HEADING_1 }),
            new Paragraph(
              `Tanggal: ${payload.tanggal ?? "—"} · ${payload.rows.length} baris · Kategori: ${(payload.categories ?? []).join(", ") || "—"}`,
            ),
            new Paragraph(""),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              columnWidths: widths,
              layout: "fixed" as never,
              rows: [headerRow, ...dataRows],
            }),
          ],
        },
      ],
    });
    const blob = await Packer.toBlob(doc);
    download(blob, `${base}.docx`);
    return;
  }

  if (format === "pdf") {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const margin = 30;
    const usable = doc.internal.pageSize.getWidth() - margin * 2;
    const pcts = columnPercents(payload.fields);
    const columnStyles: Record<number, { cellWidth: number }> = {};
    pcts.forEach((p, i) => {
      columnStyles[i] = { cellWidth: (p / 100) * usable };
    });
    doc.setFontSize(14);
    doc.text(payload.name, margin, 40);
    doc.setFontSize(9);
    doc.text(
      `Tanggal: ${payload.tanggal ?? "-"} | ${payload.rows.length} baris | Kategori: ${(payload.categories ?? []).join(", ") || "-"}`,
      margin,
      56,
    );
    autoTable(doc, {
      startY: 70,
      head: [payload.fields],
      body: payload.rows.map((r) => payload.fields.map((f) => cell(r[f]).slice(0, 600))),
      tableWidth: usable,
      styles: {
        fontSize: 7,
        cellPadding: 3,
        overflow: "linebreak",
        valign: "top",
        minCellHeight: 0,
      },
      headStyles: { fillColor: [20, 33, 61], fontSize: 7, halign: "left" },
      alternateRowStyles: { fillColor: [246, 248, 251] },
      columnStyles,
      margin: { left: margin, right: margin, top: 40, bottom: 30 },
    });
    download(doc.output("blob"), `${base}.pdf`);
    return;
  }

}
