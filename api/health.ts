type ResponseLike = { status: (code: number) => ResponseLike; json: (value: unknown) => void; setHeader?: (name: string, value: string) => void };

export default function handler(_req: unknown, res: ResponseLike): void {
  res.setHeader?.("Cache-Control", "no-store");
  res.status(200).json({
    ok: true,
    service: "minimal-cinema-engine",
    version: "0.1.0",
    capabilities: ["story-generation", "openai", "anthropic", "gemini"],
    timestamp: new Date().toISOString()
  });
}
