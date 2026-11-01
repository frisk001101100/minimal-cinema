import { generateWithProvider, validateStoryRequest } from "./_engine";

type RequestLike = { method?: string; body?: unknown; headers?: Record<string, string | string[] | undefined> };
type ResponseLike = { status: (code: number) => ResponseLike; json: (value: unknown) => void; setHeader?: (name: string, value: string) => void };

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  res.setHeader?.("Cache-Control", "no-store");
  res.setHeader?.("X-Content-Type-Options", "nosniff");
  if (req.method !== "POST") {
    res.setHeader?.("Allow", "POST");
    res.status(405).json({ error: "Método não permitido. Use POST." });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch {
      res.status(400).json({ error: "Corpo da requisição não é um JSON válido." });
      return;
    }
  }
  const validation = validateStoryRequest(body);
  if (!validation.ok) {
    res.status(400).json({ error: validation.message });
    return;
  }

  try {
    const story = await generateWithProvider(validation.data);
    res.status(200).json({ ok: true, story });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado ao gerar a história.";
    res.status(502).json({ error: message });
  }
}
