import { Sandbox } from "@vercel/sandbox";

type Provider = "openai" | "anthropic" | "gemini";
type Input = {
  provider: Provider;
  apiKey: string;
  model?: string;
  idea: string;
  category?: string;
  durationSeconds?: number;
  language?: string;
};

type ResponseLike = {
  status(code: number): ResponseLike;
  json(value: unknown): void;
  setHeader?(name: string, value: string): void;
};

export const config = { maxDuration: 300 };

function validate(value: unknown): Input | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (!["openai", "anthropic", "gemini"].includes(String(v.provider))) return null;
  if (typeof v.apiKey !== "string" || v.apiKey.length < 10 || v.apiKey.length > 500) return null;
  if (typeof v.idea !== "string" || !v.idea.trim() || v.idea.length > 4000) return null;
  return {
    provider: v.provider as Provider,
    apiKey: v.apiKey,
    model: typeof v.model === "string" ? v.model.slice(0, 120) : undefined,
    idea: v.idea.trim(),
    category: typeof v.category === "string" ? v.category.slice(0, 80) : "História livre",
    durationSeconds: typeof v.durationSeconds === "number" ? Math.min(90, Math.max(15, Math.round(v.durationSeconds))) : 30,
    language: typeof v.language === "string" ? v.language.slice(0, 40) : "Português brasileiro"
  };
}

async function generateSceneCode(input: Input): Promise<string> {
  const duration = input.durationSeconds ?? 30;
  const prompt = `Você é o diretor técnico audiovisual do Minimal Cinema. Escreva um único programa Python executável com Manim Community Edition para criar uma cena narrativa animada.
Ideia: ${input.idea}
Categoria: ${input.category}
Idioma de textos: ${input.language}
Duração alvo: ${duration} segundos.
Requisitos:
- Retorne somente código Python, sem markdown.
- Importe apenas manim, math, random e numpy.
- Defina uma classe MinimalCinemaScene(Scene) com método construct(self).
- Use animações reais, movimento de câmera/objetos, transições e composição cinematográfica; não faça slides.
- Visual elegante, alto contraste, tipografia legível e composição 16:9.
- Inclua textos em ${input.language}; mantenha cada texto curto para caber na tela.
- Planeje a sequência para durar aproximadamente ${duration} segundos.
- Não use arquivos externos, rede, subprocessos, sistema operacional, eval, exec, imports dinâmicos ou leitura/escrita de arquivos.
- Não dependa de fontes externas ou assets baixados.
- Configure config.pixel_width=1280, config.pixel_height=720 e config.frame_rate=30.
- Termine a cena naturalmente.`;
  const model = input.model || (input.provider === "openai" ? "gpt-4o-mini" : input.provider === "anthropic" ? "claude-haiku-4-5-20251001" : "gemini-2.5-flash");
  let url = "";
  let headers: Record<string, string> = {};
  let body: unknown;
  let read = (p: any): string => "";

  if (input.provider === "openai") {
    url = "https://api.openai.com/v1/chat/completions";
    headers = { Authorization: `Bearer ${input.apiKey}`, "Content-Type": "application/json" };
    body = { model, temperature: 0.4, messages: [{ role: "system", content: "Retorne somente código Python." }, { role: "user", content: prompt }] };
    read = p => p?.choices?.[0]?.message?.content ?? "";
  } else if (input.provider === "anthropic") {
    url = "https://api.anthropic.com/v1/messages";
    headers = { "x-api-key": input.apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" };
    body = { model, max_tokens: 7000, temperature: 0.4, messages: [{ role: "user", content: prompt }] };
    read = p => Array.isArray(p?.content) ? p.content.filter((x: any) => x.type === "text").map((x: any) => x.text).join("\n") : "";
  } else {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    headers = { "Content-Type": "application/json", "x-goog-api-key": input.apiKey };
    body = { generationConfig: { temperature: 0.4 }, contents: [{ role: "user", parts: [{ text: prompt }] }] };
    read = p => p?.candidates?.[0]?.content?.parts?.map((x: any) => x.text ?? "").join("\n") ?? "";
  }

  const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Falha no provedor de IA (${response.status}).`);
  const raw = read(payload).trim().replace(/^```(?:python)?\s*/i, "").replace(/\s*```$/, "");
  if (!raw || raw.length > 50000) throw new Error("A IA não retornou um programa válido.");
  const forbidden = /\b(subprocess|socket|requests|urllib|httpx|os\.|sys\.modules|eval\s*\(|exec\s*\(|__import__|open\s*\(|pathlib|shutil|ctypes)\b/;
  if (forbidden.test(raw) || !/class\s+MinimalCinemaScene\s*\(\s*Scene\s*\)/.test(raw) || !/def\s+construct\s*\(/.test(raw)) {
    throw new Error("O código gerado não passou pela validação de segurança.");
  }
  const imports = [...raw.matchAll(/^\s*(?:from|import)\s+([a-zA-Z0-9_.]+)/gm)].map(m => m[1].split(".")[0]);
  if (imports.some(name => !["manim", "math", "random", "numpy"].includes(name))) {
    throw new Error("O código tentou importar uma biblioteca não permitida.");
  }
  return raw;
}

async function ensureStorageBucket(): Promise<void> {
  const base = process.env.SUPABASE_URL!;\n  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;\n  const response = await fetch(`${base.replace(/\\/$/, "")}/storage/v1/bucket`, {\n    method: "POST",\n    headers: { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": "application/json" },\n    body: JSON.stringify({ id: "minimal-cinema", name: "minimal-cinema", public: false, file_size_limit: 524288000 })\n  });\n  if (!response.ok && response.status !== 409) throw new Error("Não foi possível preparar o bucket privado do Supabase Storage.");\n}\n\nasync function uploadArtifact(path: string, bytes: Buffer, contentType: string): Promise<string> {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw new Error("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY na Vercel para habilitar a entrega dos arquivos.");
  const root = base.replace(/\/$/, "");
  const headers = { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": contentType, "x-upsert": "true" };
  const upload = await fetch(`${root}/storage/v1/object/minimal-cinema/${path}`, { method: "POST", headers, body: new Uint8Array(bytes) });
  if (!upload.ok) throw new Error(`Falha ao armazenar arquivo no Supabase (${upload.status}). Crie o bucket privado 'minimal-cinema'.`);
  const signed = await fetch(`${root}/storage/v1/object/sign/minimal-cinema/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 86400 })
  });
  const result = await signed.json().catch(() => ({}));
  if (!signed.ok || typeof result.signedURL !== "string") throw new Error("O arquivo foi enviado, mas não foi possível gerar o link temporário.");
  return result.signedURL.startsWith("http") ? result.signedURL : result.signedURL.startsWith("/storage/v1") ? `${root}${result.signedURL}` : `${root}/storage/v1${result.signedURL}`;
}

export default async function handler(req: { method?: string; body?: unknown }, res: ResponseLike): Promise<void> {
  res.setHeader?.("Cache-Control", "no-store");
  res.setHeader?.("X-Content-Type-Options", "nosniff");
  if (req.method !== "POST") {
    res.setHeader?.("Allow", "POST");
    res.status(405).json({ error: "Use POST." });
    return;
  }
  const input = validate(req.body);
  if (!input) {
    res.status(400).json({ error: "Informe provider, apiKey e uma ideia válida (máximo 4.000 caracteres)." });
    return;
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    res.status(503).json({ error: "A engine de renderização precisa do Supabase Storage. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY e crie o bucket privado 'minimal-cinema'." });
    return;
  }

  let sandbox: Sandbox | undefined;
  try {
    const python = await generateSceneCode(input);
    sandbox = await Sandbox.create({ resources: { vcpus: 2 }, timeout: 300000, persistent: false, networkPolicy: "allow-all" });

    const install = await sandbox.runCommand({
      cmd: "bash",
      args: ["-lc", "apt-get update && apt-get install -y ffmpeg libcairo2-dev libpango1.0-dev pkg-config python3-dev && python3 -m pip install --break-system-packages manim"],
      sudo: true
    });
    if (install.exitCode !== 0) throw new Error("Não foi possível preparar o ambiente de renderização.");

    await sandbox.update({ networkPolicy: "deny-all" });
    await sandbox.writeFiles([
      { path: "scene.py", content: Buffer.from(python, "utf8") },
      { path: "brief.txt", content: Buffer.from(input.idea, "utf8") },
      { path: "README.txt", content: Buffer.from("Projeto gerado pelo Minimal Cinema. Inclui o código-fonte da cena e o vídeo renderizado.\n", "utf8") },
      { path: "package_project.py", content: Buffer.from([
        "from zipfile import ZipFile, ZIP_DEFLATED",
        "from pathlib import Path",
        "root=Path('/vercel/sandbox')",
        "video=next(root.glob('media/videos/scene/*/MinimalCinemaScene.mp4'))",
        "with ZipFile(root/'minimal-cinema-projeto.zip','w',ZIP_DEFLATED) as z:",
        " z.write(root/'scene.py','cenas/scene.py')",
        " z.write(root/'brief.txt','historia/ideia.txt')",
        " z.write(root/'README.txt','LEIA-ME.txt')",
        " z.write(video,'video-final.mp4')"
      ].join("\\n"), "utf8") }
    ]);

    const render = await sandbox.runCommand({
      cmd: "python3",
      args: ["-m", "manim", "-qm", "--format", "mp4", "/vercel/sandbox/scene.py", "MinimalCinemaScene"],
      cwd: "/vercel/sandbox"
    });
    if (render.exitCode !== 0) throw new Error("A renderização falhou. A engine pode tentar novamente após ajustar o código.");

    const zipResult = await sandbox.runCommand({ cmd: "python3", args: ["/vercel/sandbox/package_project.py"], cwd: "/vercel/sandbox" });
    if (zipResult.exitCode !== 0) throw new Error("O vídeo foi renderizado, mas a montagem do ZIP falhou.");

    const videoPath = "/vercel/sandbox/media/videos/scene/720p30/MinimalCinemaScene.mp4";
    const video = await sandbox.readFileToBuffer({ path: videoPath });
    const zip = await sandbox.readFileToBuffer({ path: "/vercel/sandbox/minimal-cinema-projeto.zip" });
    if (!video || !zip) throw new Error("Os arquivos finais não foram encontrados no ambiente de execução.");

    const id = crypto.randomUUID();
    const [mp4Url, zipUrl] = await Promise.all([
      uploadArtifact(`${id}/video-final.mp4`, video, "video/mp4"),
      uploadArtifact(`${id}/minimal-cinema-projeto.zip`, zip, "application/zip")
    ]);
    res.status(200).json({ ok: true, title: "Produção Minimal Cinema", videoUrl: mp4Url, projectZipUrl: zipUrl, expiresInSeconds: 86400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao produzir o vídeo.";
    res.status(500).json({ error: message });
  } finally {
    if (sandbox) await sandbox.stop().catch(() => undefined);
  }
}
