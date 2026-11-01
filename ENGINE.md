# Minimal Cinema — Engine v0.3

A engine combina geração de roteiro por IA com uma primeira etapa experimental de renderização audiovisual executada no servidor.

## Endpoints

### GET /api/health
Retorna o estado básico do serviço e as capacidades registradas.

### POST /api/story
Gera história, personagens e roteiro estruturado usando OpenAI, Anthropic ou Gemini. Campos: `provider`, `apiKey`, `model`, `category`, `idea`, `durationSeconds`, `format` e `language`.

### POST /api/render
Recebe `provider`, `apiKey`, `model`, `idea`, `category`, `durationSeconds` e `language`. A interface envia um resumo da história e das cenas editadas no campo `idea`.

Fluxo experimental atual:
1. O modelo escolhido escreve um programa Python Manim a partir do roteiro e das cenas.
2. A API cria uma Vercel Sandbox (microVM Firecracker) no servidor.
3. Dependências audiovisuais são preparadas dentro da microVM.
4. A política de rede da microVM é bloqueada antes de executar o código gerado.
5. Manim renderiza uma animação visual em MP4.
6. A API cria um ZIP com o MP4, o código-fonte e a ideia/brief.
7. MP4 e ZIP são enviados para um Vercel Blob privado.
8. A API devolve URLs assinadas para download, válidas por 24 horas.

Limites atuais: duração de renderização limitada a 90 segundos por solicitação e execução síncrona sujeita ao limite da Vercel Function. O renderizador atual ainda produz uma animação única a partir do roteiro completo; a renderização isolada de cada cena e sua regeneração individual serão etapas seguintes. A versão atual não inclui narração em áudio, música nem efeitos sonoros finais.

## Armazenamento

O projeto usa um Vercel Blob privado, na região São Paulo (`gru1`). Não usa Supabase. A Vercel provisionou `BLOB_READ_WRITE_TOKEN` no projeto ao criar o Blob Store.

Os links assinados expiram após 24 horas. A rotina `GET /api/cleanup`, agendada diariamente, remove blobs com mais de 48 horas. A rotina é protegida por `CRON_SECRET`.

## Segurança

- A chave de IA é encaminhada ao provedor escolhido e não é enviada para a microVM.
- O código gerado é executado somente em microVM descartável.
- A rede da microVM é bloqueada antes de executar código gerado.
- Imports e operações perigosas são rejeitados antes da execução; o isolamento da microVM é a barreira principal.
- A rota de renderização aplica uma limitação best-effort por IP. Isso não substitui autenticação nem rate limiting distribuído antes de um lançamento público.

## Desenvolvimento

```bash
npm install
npm run build
vercel dev
```

A renderização requer Vercel Sandbox e Vercel Blob habilitados no projeto.
