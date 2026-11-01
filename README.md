# Minimal Cinema

Estúdio minimalista para transformar ideias em histórias narrativas com IA.

## Stack

- React + TypeScript
- Vite
- CSS próprio (interface sem dependência de framework visual)
- Lucide React

## Desenvolvimento local

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Deploy

O projeto está preparado para Vercel. O deploy de produção é acionado automaticamente após atualizações na branch `main`.

## Estado atual

Primeira fundação da interface: dashboard, navegação lateral, seleção de formato narrativo e campo inicial de ideia. As integrações com provedores de IA, pesquisa, áudio e renderização serão adicionadas em etapas próprias.

Nunca exponha chaves de API no frontend. Integrações com credenciais devem passar por funções server-side e variáveis de ambiente.
