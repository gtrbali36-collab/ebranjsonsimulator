import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const jsonValue = z.any();

const createDatasetInput = z.object({
  name: z.string().trim().min(1).max(300),
  source_type: z.enum(["file", "url"]),
  source_url: z.string().trim().max(2000).nullable(),
  tanggal: z.string().trim().max(64).nullable(),
  total_items: z.number().int().min(0),
  categories: jsonValue,
  fields: jsonValue,
  meta: jsonValue,
  data_kind: z.enum(["input", "output", "other"]).default("input"),
});

export const createDataset = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => createDatasetInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("datasets")
      .insert(data as never)
      .select("id")
      .single();
    if (error || !row) throw new Error("Gagal menyimpan dataset.");
    return { id: row.id as string };
  });

const insertItemsInput = z.object({
  dataset_id: z.string().uuid(),
  items: z
    .array(z.object({ kategori: z.string().max(300).nullable(), data: jsonValue }))
    .max(500),
});

export const insertDatasetItems = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => insertItemsInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rows = data.items.map((it) => ({
      dataset_id: data.dataset_id,
      kategori: it.kategori,
      data: it.data,
    }));
    const { error } = await supabaseAdmin.from("dataset_items").insert(rows as never);
    if (error) throw new Error("Gagal menyimpan item dataset.");
    return { inserted: rows.length };
  });

const saveReportInput = z.object({
  dataset_id: z.string().uuid().nullable(),
  name: z.string().trim().min(1).max(300),
  tanggal: z.string().trim().max(64).nullable(),
  categories: z.array(z.string().max(300)),
  fields: z.array(z.string().max(300)),
  row_count: z.number().int().min(0),
  rows: jsonValue,
  kind: z.enum(["input", "compare"]).default("input"),
  analysis: z.string().max(100_000).nullable().default(null),
  meta: jsonValue.default({}),
  data_kind: z.enum(["input", "output", "other"]).default("input"),
});

export const saveReport = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => saveReportInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("saved_reports").insert(data as never);
    if (error) throw new Error("Gagal menyimpan hasil.");
    return { ok: true };
  });

export type SavedReportDTO = {
  id: string;
  name: string;
  tanggal: string | null;
  categories: string[];
  fields: string[];
  row_count: number;
  rows: Record<string, string | number | boolean | null>[];
  created_at: string;
  kind: string;
  data_kind: string;
  analysis: string | null;
  meta: { sources?: string[]; prompt?: string | null; attachment?: string | null } | null;
};

export const listReports = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("saved_reports")
    .select("id, name, tanggal, categories, fields, row_count, rows, created_at, kind, data_kind, analysis, meta")
    .order("created_at", { ascending: false });
  if (error) throw new Error("Gagal memuat data tersimpan.");
  return JSON.parse(JSON.stringify(data ?? [])) as SavedReportDTO[];
});


export const deleteReport = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("saved_reports").delete().eq("id", data.id);
    if (error) throw new Error("Gagal menghapus data.");
    return { ok: true };
  });
