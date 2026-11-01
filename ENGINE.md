# Minimal Cinema — Engine v0.2

A engine possui geração narrativa e uma primeira rota de produção audiovisual executada em ambiente Linux isolado no servidor.

## Endpoints

### GET /api/health

Retorna estado básico do serviço e capacidades registradas.

### POST /api/story

Gera uma história e um roteiro estruturado usando OpenAI, Anthropic ou Gemini.

Campos: `provider`, `apiKey`, `model` (opcional), `category`, `idea`, `durationSeconds`, `format` e `language`.

### POST /api/render

Recebe `provider`, `apiKey`, `model` (opcional), `idea`, `category`, `durationSeconds` e `language`.

Fluxo atual:
1. O modelo escolhido escreve um programa Python para Manim.
2. O Minimal Cinema cria uma Vercel Sandbox (microVM Linux) no servidor.
3. Dependências audiovisuais são preparadas dentro da microVM.
4. A política de rede é bloqueada antes da execução do código gerado.
5. Manim renderiza uma primeira cena animada em MP4.
6. O servidor cria um ZIP com o MP4, o código-fonte e a ideia original.
7. MP4 e ZIP são enviados ao Supabase Storage privado e devolvidos como links temporários (24 horas).

Exemplo de corpo:
```json
{
  "provider": "openai",
  "apiKey": "SUA_CHAVE",
  "category": "Mistério",
  "idea": "Uma cidade em que todas as pessoas recebem a mesma carta.",
  "durationSeconds": 30,
  "language": "Português brasileiro"
}
```

Resposta de sucesso: `{ "ok": true, "videoUrl": "...", "projectZipUrl": "...", "expiresInSeconds": 86400 }`.

## Configuração necessária

Defina na Vercel, somente no ambiente do servidor:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

A rota cria o bucket privado `minimal-cinema` no primeiro uso. Nunca exponha a service-role key no frontend.

A execução do Sandbox usa a autenticação OIDC da Vercel quando a função está hospedada na Vercel. O projeto precisa ter o recurso Sandbox disponível.

## Segurança

- Código gerado por IA nunca é executado dentro da função principal.
- Cada produção usa uma microVM descartável.
- A rede da microVM é bloqueada antes de executar o código gerado.
- As chaves dos provedores não são enviadas para a microVM.
- A API key do provedor é recebida na requisição e encaminhada diretamente ao provedor, sem persistência intencional pelo Minimal Cinema.
- O código gerado passa por verificações básicas de imports e operações proibidas; o isolamento da microVM é a barreira principal.

## Limites desta primeira etapa

- O endpoint `/api/render` é uma prova de fluxo para uma cena Manim, não a engine cinematográfica completa.
- O padrão inicial é 30 segundos e qualidade 720p; o limite atual da requisição é 90 segundos.
- Ainda não integra ElevenLabs, música, efeitos sonoros, pesquisa factual com fontes, cenas 3D avançadas, episódios ou edição de roteiro por cenas.
- As dependências são instaladas no ambiente de execução; uma imagem pré-configurada deverá reduzir o tempo de inicialização.
- A rota é síncrona e limitada pelo tempo máximo da função Vercel. Produções longas exigirão execução em etapas e acompanhamento de progresso.
- Os links de exportação expiram após 24 horas. Retenção permanente e biblioteca de projetos ainda não foram implementadas.

## Provedores narrativos

- OpenAI: Chat Completions.
- Anthropic: Messages API.
- Google Gemini: generateContent.

## Desenvolvimento local

```bash
npm install
npm run dev
```

Para testar as funções Vercel localmente, use `vercel dev`. A execução de Sandbox requer credenciais/configuração Vercel apropriadas e as variáveis de ambiente do Supabase.
