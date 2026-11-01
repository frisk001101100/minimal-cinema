import { del, list } from "@vercel/blob";

type RequestLike = { method?: string; headers?: Record<string, string | string[] | undefined> };
type ResponseLike = { status(code: number): ResponseLike; json(value: unknown): void; setHeader?(name: string, value: string): void };

export const config = { maxDuration: 60 };

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  res.setHeader?.("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader?.("Allow", "GET");
    res.status(405).json({ error: "Use GET." });
    return;
  }
  const secret = process.env.CRON_SECRET;
  const auth = req.headers?.authorization;
  const authorization = Array.isArray(auth) ? auth[0] : auth;
  if (!secret || authorization !== "Bearer " + secret) {
    res.status(401).json({ error: "Não autorizado." });
    return;
  }
  try {
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    let cursor: string | undefined;
    let deleted = 0;
    do {
      const page = await list({ prefix: "exports/", limit: 1000, cursor });
      const expired = page.blobs.filter(blob => new Date(blob.uploadedAt).getTime() < cutoff);
      if (expired.length) {
        await del(expired.map(blob => blob.url));
        deleted += expired.length;
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    res.status(200).json({ ok: true, deleted });
  } catch {
    res.status(500).json({ error: "Falha ao limpar arquivos expirados." });
  }
}
