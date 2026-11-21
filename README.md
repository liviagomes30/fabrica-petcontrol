# Pet Control

Sistema de gestão da ONG SalvaCão (resgates, adoções, estoque e tratamentos), reescrito em Next.js 16 e Supabase.

| Pasta | O que é |
|---|---|
| `petcontrol-next/` | O aplicativo (Next.js, Server Actions, Supabase). Setup e estrutura em [petcontrol-next/README.md](petcontrol-next/README.md) |
| `docs/` | Documentação do projeto, como backup e restauração do banco |
| `.github/workflows/` | Backup e keep-alive do Supabase (GitHub Actions) |
| `.claude/` | Agentes, hooks e configuração da fábrica |
| `scripts/fabrica/` | Conversor de agentes, testes dos hooks e verificação do ambiente |

## Rodar o app

```bash
cd petcontrol-next
npm install
npm run dev
```

Crie `petcontrol-next/.env.local` com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (detalhes no README do app).

## Desenvolver com a fábrica

Em resumo: `/fabrica nova <demanda>` gera a especificação para você aprovar, e `/fabrica implementar <spec>` leva a feature até o pull request. O merge é sempre seu.
