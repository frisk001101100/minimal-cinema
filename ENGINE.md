# Minimal Cinema — Engine v0.3

A engine combina geração de roteiro e um protótipo de renderização por cenas em ambiente isolado no servidor.

## Endpoints

### GET /api/health
Retorna o estado básico do serviço e as capacidades registradas.

### POST /api/story
Gera história, personagens e roteiro estruturado usando OpenAI, Anthropic ou Gemini. Campos: `provider`, `apiKey`, `model`, `category`, `idea`, `durationSeconds`, `format` e `language`.

### POST /api/render
Recebe `provider`, `apiKey`, `model`, `category`, `language` e o objeto `story` retornado por `/api/story` (incluindo personagens e cenas editadas).

Fluxo:
1. O modelo escolhido gera um programa Manim independente para cada cena.
2. A API cria uma Vercel Sandbox (microVM Firecracker) no servidor.
3. Instala as dependências audiovisuais dentro da microVM.
4. Bloqueia a rede da microVM antes de executar qualquer código gerado.
5. Renderiza cada cena separadamente.
6. O FFmpeg junta as cenas em um MP4.
7. A API cria um ZIP com o roteiro, os programas das cenas e o MP4.
8. MP4 e ZIP são enviados a um Vercel Blob privado; a API devolve URLs assinadas de download válidas por 24 horas.

Limites experimentais atuais: até 8 cenas e 90 segundos no total. A renderização é síncrona e sujeita ao limite de duração da Vercel Function. A versão atual produz animações vetoriais Manim sem narração em áudio; a integração de voz, música e efeitos será adicionada separadamente.

## Armazenamento

O projeto usa Vercel Blob privado, na região São Paulo (`gru1`). Não usa Supabase. A variável `BLOB_READ_WRITE_TOKEN` é provisionada pela Vercel ao conectar o Blob Store ao projeto.

Links assinados expiram após 24 horas. A rotina `GET /api/cleanup`, agendada diariamente, remove blobs com mais de 48 horas. A rotina exige `CRON_SECRET` no ambiente de produção.

## Segurança

- A chave de IA é encaminhada ao provedor escolhido e não é enviada para a microVM.
- O código gerado é executado somente em microVM descartável.
- A rede da microVM é bloqueada antes de executar código gerado.
- Imports e operações perigosas são rejeitados antes da execução; o isolamento da microVM continua sendo a barreira principal.
- A rota de renderização aplica uma limitação best-effort por IP. Isso não substitui autenticação e rate limiting distribuído antes de um lançamento público.

## Desenvolvimento

```bash
npm install
npm run build
vercel dev
```

A execução da renderização requer Vercel Sandbox e Vercel Blob habilitados no projeto.
