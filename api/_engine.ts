export type Provider = "openai" | "anthropic" | "gemini";

export interface StoryRequest {
  provider: Provider;
  apiKey: string;
  model?: string;
  category: string;
  idea: string;
  durationSeconds?: number;
  format?: "short" | "series" | "documentary";
  language?: string;
}

export interface StoryScene {
  number: number;
  durationSeconds: number;
  visual: string;
  narration: string;
  dialogue: Array<{ character: string; line: string }>;
  sound: string;
}

export interface StoryResult {
  title: string;
  logline: string;
  synopsis: string;
  characters: Array<{ name: string; description: string; visualIdentity: string }>;
  scenes: StoryScene[];
  totalDurationSeconds: number;
  researchNotes: string[];
}

const categoryGuidance: Record<string, string> = {
  "E se…?": "Explore uma hipótese contrafactual com consequências plausíveis. Diferencie fatos de especulação.",
  "Escolha o final": "Construa uma narrativa com dilema claro e duas opções de final que possam ser votadas.",
  "Mistério": "Distribua pistas verificáveis ao longo da narrativa e conclua com uma revelação coerente.",
  "Glow Up": "Conte uma transformação respeitosa, focada em escolhas, aprendizado e evolução pessoal.",
  "Documentário": "Use tom documental. Não invente fatos, datas, citações ou fontes. Sinalize o que precisa de pesquisa externa.",
  "Você escolhe": "Inclua ao menos uma decisão explícita entre opções X e Y que altere o rumo da história.",
  "História livre": "Desenvolva a ideia livremente, com começo, desenvolvimento e conclusão.",
  "Personalizado": "Siga as características e restrições descritas na ideia do usuário."
};

export function validateStoryRequest(value: unknown): { ok: true; data: StoryRequest } | { ok: false; message: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, message: "Envie um objeto JSON válido." };
  const input = value as Record<string, unknown>;
  const provider = input.provider;
  if (provider !== "openai" && provider !== "anthropic" && provider !== "gemini") {
    return { ok: false, message: "Provedor inválido. Use openai, anthropic ou gemini." };
  }
  if (typeof input.apiKey !== "string" || input.apiKey.trim().length < 10 || input.apiKey.length > 500) {
    return { ok: false, message: "Informe uma API key válida." };
  }
  if (typeof input.idea !== "string" || !input.idea.trim() || input.idea.length > 4000) {
    return { ok: false, message: "A ideia deve ter entre 1 e 4.000 caracteres." };
  }
  const category = typeof input.category === "string" ? input.category.slice(0, 80) : "História livre";
  const duration = typeof input.durationSeconds === "number" && Number.isFinite(input.durationSeconds)
    ? Math.min(600, Math.max(15, Math.round(input.durationSeconds))) : 90;
  const format = input.format === "series" || input.format === "documentary" ? input.format : "short";
  const language = typeof input.language === "string" ? input.language.slice(0, 40) : "Português brasileiro";
  const model = typeof input.model === "string" && input.model.trim() ? input.model.trim().slice(0, 120) : undefined;
  return { ok: true, data: { provider, apiKey: input.apiKey.trim(), model, category, idea: input.idea.trim(), durationSeconds: duration, format, language } };
}

export function buildStoryPrompt(input: StoryRequest): string {
  const guidance = categoryGuidance[input.category] ?? categoryGuidance["História livre"];
  return `Você é o motor narrativo do Minimal Cinema. Crie um roteiro audiovisual original e pronto para produção.
Idioma: ${input.language}
Categoria: ${input.category}
Orientação da categoria: ${guidance}
Formato: ${input.format}
Duração total desejada: ${input.durationSeconds} segundos.
Ideia inicial do usuário:
${input.idea}

Retorne SOMENTE um objeto JSON válido, sem markdown, com este formato:
{
 "title": "título",
 "logline": "premissa em uma frase",
 "synopsis": "sinopse curta",
 "characters": [{"name":"nome","description":"papel e personalidade","visualIdentity":"descrição visual consistente para reutilizar em todas as cenas"}],
 "scenes": [{"number":1,"durationSeconds":12,"visual":"descrição da ação, cenário, enquadramento e movimento de câmera; uma cena animável, nunca um slide","narration":"texto do narrador","dialogue":[{"character":"nome","line":"fala"}],"sound":"ambiente e desenho sonoro"}],
 "totalDurationSeconds":90,
 "researchNotes": ["fatos ou afirmações que exigem checagem; lista vazia se não houver"]
}
Regras:
- Distribua a duração entre cenas e mantenha a soma próxima da duração solicitada.
- Cada cena deve descrever ação contínua, movimento, composição e transição visual.
- Mantenha nomes, aparência, roupas e características dos personagens consistentes em todas as cenas.
- A narração conduz a história; falas de personagens ficam separadas e identificadas pelo nome.
- Escreva diálogos naturais, curtos e interpretáveis por voz.
- Evite instruções vagas como "mostrar uma imagem"; descreva o que efetivamente acontece.
- Em conteúdo factual/histórico, não fabrique fontes nem apresente hipótese como fato. Registre em researchNotes o que precisa de verificação.
- Não inclua conteúdo sexual explícito, violência gráfica ou instruções para atividades perigosas.`;
}

function extractJson(text: string): unknown {
  const cleaned = text.trim().replace(/^\u0060\u0060\u0060(?:json)?\s*/i, "").replace(/\s*\u0060\u0060\u0060$/, "");
  try { return JSON.parse(cleaned); } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("O modelo não retornou JSON válido. Tente novamente.");
  }
}

export function normalizeStory(raw: unknown, requestedDuration: number): StoryResult {
  if (!raw || typeof raw !== "object") throw new Error("Resposta narrativa inválida.");
  const item = raw as Record<string, unknown>;
  if (typeof item.title !== "string" || !Array.isArray(item.scenes) || item.scenes.length === 0) {
    throw new Error("A resposta não contém título e cenas suficientes.");
  }
  const characters = Array.isArray(item.characters) ? item.characters.map((c: any) => ({
    name: String(c?.name ?? "Personagem"),
    description: String(c?.description ?? ""),
    visualIdentity: String(c?.visualIdentity ?? "")
  })) : [];
  const scenes = item.scenes.map((s: any, index: number) => ({
    number: Number.isFinite(Number(s?.number)) ? Number(s.number) : index + 1,
    durationSeconds: Math.max(1, Math.min(180, Number(s?.durationSeconds) || Math.round(requestedDuration / item.scenes.length))),
    visual: String(s?.visual ?? ""),
    narration: String(s?.narration ?? ""),
    dialogue: Array.isArray(s?.dialogue) ? s.dialogue.map((d: any) => ({ character: String(d?.character ?? "Personagem"), line: String(d?.line ?? "") })) : [],
    sound: String(s?.sound ?? "")
  }));
  return {
    title: item.title.slice(0, 180),
    logline: String(item.logline ?? ""),
    synopsis: String(item.synopsis ?? ""),
    characters,
    scenes,
    totalDurationSeconds: scenes.reduce((sum: number, scene: StoryScene) => sum + scene.durationSeconds, 0),
    researchNotes: Array.isArray(item.researchNotes) ? item.researchNotes.map(String) : []
  };
}

export async function generateWithProvider(input: StoryRequest): Promise<StoryResult> {
  const prompt = buildStoryPrompt(input);
  const model = input.model || (input.provider === "openai" ? "gpt-4o-mini" : input.provider === "anthropic" ? "claude-haiku-4-5-20251001" : "gemini-2.5-flash");
  let endpoint: string;
  let headers: Record<string, string>;
  let body: unknown;
  let readText: (payload: any) => string;

  if (input.provider === "openai") {
    endpoint = "https://api.openai.com/v1/chat/completions";
    headers = { Authorization: `Bearer ${input.apiKey}`, "Content-Type": "application/json" };
    body = { model, temperature: 0.7, response_format: { type: "json_object" }, messages: [{ role: "system", content: "Responda apenas JSON válido." }, { role: "user", content: prompt }] };
    readText = (p) => p?.choices?.[0]?.message?.content ?? "";
  } else if (input.provider === "anthropic") {
    endpoint = "https://api.anthropic.com/v1/messages";
    headers = { "x-api-key": input.apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" };
    body = { model, max_tokens: 5000, temperature: 0.7, messages: [{ role: "user", content: prompt }] };
    readText = (p) => Array.isArray(p?.content) ? p.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n") : "";
  } else {
    endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(input.apiKey)}`;
    headers = { "Content-Type": "application/json" };
    body = { generationConfig: { temperature: 0.7, responseMimeType: "application/json" }, contents: [{ role: "user", parts: [{ text: prompt }] }] };
    readText = (p) => p?.candidates?.[0]?.content?.parts?.map((part: any) => part.text ?? "").join("\n") ?? "";
  }

  const response = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const providerMessage = String(payload?.error?.message ?? payload?.message ?? "Falha no provedor de IA").slice(0, 350);
    throw new Error(`O provedor ${input.provider} retornou erro (${response.status}): ${providerMessage}`);
  }
  const text = readText(payload);
  if (!text) throw new Error("O provedor retornou uma resposta vazia.");
  return normalizeStory(extractJson(text), input.durationSeconds ?? 90);
}
