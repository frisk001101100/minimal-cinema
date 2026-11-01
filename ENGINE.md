# Minimal Cinema — Engine v0.1

A primeira entrega do backend prioriza fazer a geração narrativa funcionar antes de expandir a interface.

## Endpoints

### GET /api/health
Retorna o estado básico do serviço, versão e capacidades registradas.

### POST /api/story
Recebe JSON:
```json
{
  "provider": "openai",
  "apiKey": "SUA_CHAVE",
  "model": "gpt-4o-mini",
  "category": "Mistério",
  "idea": "Uma cidade em que todas as pessoas recebem a mesma carta.",
  "durationSeconds": 90,
  "format": "short",
  "language": "Português brasileiro"
}
```

Retorna `{ "ok": true, "story": ... }` com título, premissa, sinopse, personagens, identidade visual consistente, cenas, narração, diálogos separados, som e notas de pesquisa.

## Provedores

- OpenAI: Chat Completions com saída JSON.
- Anthropic: Messages API.
- Google Gemini: generateContent com resposta JSON.

A API key é recebida apenas no corpo da requisição e encaminhada ao provedor escolhido. Ela não é gravada em banco, arquivo, log ou variável de ambiente pelo Minimal Cinema. O cliente deve usar HTTPS e não persistir a chave sem consentimento explícito.

## Limites da primeira versão

- Gera roteiro estruturado; ainda não renderiza vídeo nem gera áudio.
- Pesquisa factual ainda não está conectada; afirmações que exigem verificação são listadas em `researchNotes`.
- Autenticação, quotas por usuário, rate limiting distribuído, persistência e fila de renderização são etapas seguintes.
- Modelos padrão podem mudar conforme disponibilidade dos provedores; o campo `model` permite escolher outro modelo compatível.

## Teste local

```bash
npm install
npm run dev
```

O Vite atende a interface; para testar funções Vercel localmente, use `vercel dev`. Consulte `GET /api/health` e envie um `POST /api/story`.
