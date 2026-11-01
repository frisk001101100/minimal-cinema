type ResponseLike = { status: (code: number) => ResponseLike; json: (value: unknown) => void; setHeader?: (name: string, value: string) => void };

export default function handler(_req: unknown, res: ResponseLike): void {
  res.setHeader?.("Cache-Control", "no-store");
  res.status(200).json({
    ok: true,
    service: "minimal-cinema-engine",
    version: "0.3.0",
    capabilities: [
      "story-generation",
      "openai",
      "anthropic",
      "gemini",
      "isolated-ai-code-execution",
      "manim-video-rendering",
      "mp4-export",
      "project-zip-export",
      "private-vercel-blob-storage",
      "temporary-download-links"
    ],
    storageConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    timestamp: new Date().toISOString()
  });
}
    ],
    timestamp: new Date().toISOString()
  });
}
