import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EXPORT_FORMATS, exportReport, type ExportFormat, type ExportPayload } from "@/lib/export";

type Props = {
  payload: ExportPayload;
  label?: string;
  size?: "sm" | "default";
  variant?: "default" | "outline" | "secondary" | "ghost";
};

export function ExportMenu({ payload, label = "Export", size = "sm", variant = "outline" }: Props) {
  const [busy, setBusy] = useState<ExportFormat | null>(null);

  async function run(format: ExportFormat) {
    if (!payload.rows.length) {
      toast.error("Tidak ada data untuk diexport.");
      return;
    }
    setBusy(format);
    try {
      await exportReport(payload, format);
      toast.success(`Export ${format.toUpperCase()} berhasil diunduh.`);
    } catch (error) {
      console.error(error);
      toast.error("Gagal membuat file export.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={busy !== null}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Pilih format export</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {EXPORT_FORMATS.map((f) => (
          <DropdownMenuItem key={f.id} onSelect={() => void run(f.id)}>
            <span className="flex w-full items-center justify-between gap-3">
              <span className="font-medium">{f.label}</span>
              <span className="text-xs text-muted-foreground">{f.hint}</span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
