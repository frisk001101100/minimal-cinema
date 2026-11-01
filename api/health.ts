type ResponseLike = { status: (code: number) => ResponseLike; json: (value: unknown) => void; setHeader?: (name: string, value: string) => void };

export default function handler(_req: unknown, res: ResponseLike): void {
  res.setHeader?.("Cache-Control", "no-store");
  res.status(200).json({
    ok: true,
    service: "minimal-cinema-engine",
    version: "0.2.0",
    capabilities: [
      "story-generation",
      "openai",
      "anthropic",
      "gemini",
      "isolated-ai-code-execution",
      "manim-video-rendering",
      "mp4-export",
      "project-zip-export",
      "supabase-storage"
    ],
    timestamp: new Date().toISOString()
  });
}
