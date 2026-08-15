import { createServerFn } from "@tanstack/react-start";

export const fetchRemoteJson = createServerFn({ method: "POST" })
  .inputValidator((input: { url: string }) => {
    const url = String(input?.url ?? "").trim();
    if (!/^https?:\/\//i.test(url)) throw new Error("Link harus diawali http:// atau https://");
    if (url.length > 2000) throw new Error("Link terlalu panjang");
    return { url };
  })
  .handler(async ({ data }) => {
    const res = await fetch(data.url, { headers: { accept: "application/json,*/*" } });
    if (!res.ok) throw new Error(`Gagal mengambil file (HTTP ${res.status})`);
    const text = await res.text();
    if (text.length > 20_000_000) throw new Error("File terlalu besar (maks 20MB)");
    try {
      return { json: JSON.parse(text) as unknown, size: text.length };
    } catch {
      throw new Error("Isi link bukan JSON yang valid");
    }
  });
