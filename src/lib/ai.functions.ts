import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const input = z.object({
  prompt: z.string().trim().max(8000).default(""),
  attachmentName: z.string().trim().max(300).nullable().default(null),
  attachmentText: z.string().max(200_000).nullable().default(null),
  summary: z.string().max(20_000),
  sample: z.string().max(200_000),
});

export const analyzeComparison = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => input.parse(raw))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Layanan AI belum tersedia.");

    const userParts = [
      `RINGKASAN PERBANDINGAN:\n${data.summary}`,
      `CONTOH BARIS DATA (JSON):\n${data.sample}`,
      data.attachmentText
        ? `LAMPIRAN (${data.attachmentName ?? "file"}):\n${data.attachmentText.slice(0, 100_000)}`
        : "",
      data.prompt
        ? `INSTRUKSI / KRITERIA PENILAIAN DARI PENGGUNA:\n${data.prompt}`
        : "INSTRUKSI: Analisis perbedaan utama antar sumber data ini.",
    ].filter(Boolean);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          {
            role: "system",
            content:
              "Anda analis data berbahasa Indonesia. Analisis perbandingan beberapa file JSON berita/digest. " +
              "Jawab ringkas dan terstruktur dengan heading markdown: Ringkasan, Perbedaan Utama, Temuan Penting, Penilaian, Rekomendasi. " +
              "Gunakan angka konkret dari data yang diberikan, jangan mengarang.",
          },
          { role: "user", content: userParts.join("\n\n") },
        ],
      }),
    });

    if (res.status === 429) throw new Error("Batas penggunaan AI tercapai, coba lagi nanti.");
    if (res.status === 402) throw new Error("Kredit AI habis. Silakan isi ulang di Settings.");
    if (!res.ok) throw new Error(`Analisis AI gagal (HTTP ${res.status}).`);

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = json.choices?.[0]?.message?.content ?? "";
    if (!text) throw new Error("AI tidak mengembalikan hasil.");
    return { text };
  });
