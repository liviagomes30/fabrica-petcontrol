## Resumo

Exibe, logo abaixo da data/hora do dashboard, a saudação "Bom dia", "Boa tarde" ou "Boa noite" conforme a hora de Brasília (`America/Sao_Paulo`), atualizada junto com o relógio. Feature somente informativa: sem Server Action, banco, migração, dependência ou variável de ambiente nova. Construída sobre o relógio da feature 001 (já na `main`).

- Spec: [`specs/002-saudacao-dashboard/spec.md`](specs/002-saudacao-dashboard/spec.md)
- Plano: [`plan.md`](specs/002-saudacao-dashboard/plan.md) · Tarefas: [`tasks.md`](specs/002-saudacao-dashboard/tasks.md) (T001-T020 concluídas)
- Revisão: [`review-report.md`](specs/002-saudacao-dashboard/review-report.md) · QA: [`qa-report.md`](specs/002-saudacao-dashboard/qa-report.md)

## Implementação

- `lib/domain/data-local.ts`: tipo `Saudacao`, `saudacaoPorHora(hora)` (05-11 Bom dia, 12-17 Boa tarde, demais Boa noite) e `saudacaoDaDataHoraBrasilia(texto)`, que lê a hora do texto já formatado em horário de Brasília.
- `app/(dashboard)/dashboard/_components/RelogioBrasilia.tsx`: `<p data-testid="saudacao-dashboard">` abaixo do `<time>`, derivado do mesmo snapshot do `useSyncExternalStore` (sem segundo timer, listener ou `new Date()`); no servidor e na hidratação o texto fica vazio com altura reservada; `text-gray-700` (contraste ~10:1). `page.tsx` e os testes da 001 não foram alterados.

## Requisitos cobertos

FR-001 a FR-009 e SC-001 a SC-006 (tabela em `tasks.md`, matriz em `qa-report.md`).

## Testes executados (todos com código de saída 0, inclusive após sincronizar com a `main`)

| Comando | Resultado |
|---|---|
| `npm --prefix petcontrol-next run test` | 138 testes passando em 5 arquivos |
| `npm --prefix petcontrol-next run test:coverage` | 100% de linhas, funções, ramos e instruções em `lib/domain/data-local.ts` |
| `npm --prefix petcontrol-next run lint` | sem erros |
| `npm --prefix petcontrol-next run build` | sucesso (aviso `DYNAMIC_SERVER_USAGE` em `/produtos` é pré-existente, fora do escopo) |

## Parecer do Revisor (aprovado com ressalvas), sem achado bloqueante

- Baixo: oráculo do teste das 24 horas repete a regra da implementação (`data-local.test.ts`).
- Sugestão: teste "exatamente um dos três textos" redundante.
- Sugestão: hora extraída por posição fixa (`slice(11,13)`), risco R1 aceito no plano.
- Testes do QA: E6-1 (baixo) teste de hidratação sem `try/finally`; E6-2 (baixo) JSDoc de `horaBrasilia` incorreto e uso de `Intl` como a implementação; E6-3 (sugestão) alguns testes acoplados a classes CSS/código-fonte.

## Parecer do QA (aprovado com ressalvas)

Nenhum defeito Crítico, Alto, Médio ou Baixo. 30 testes de aceite (US1 1-4, US2 1-3, SC-001..SC-006, bordas). Não verificado por agente (executar manualmente antes do merge, ver `notes/e4-roteiro-manual.md` e `qa-report.md`): renderização real e localização em 3 s (3.1), ausência de flash (3.3), troca real do fuso do SO (3.4), relógio do SO (3.5), contraste no DevTools (3.6), layout em 360 px (3.7), aba oculta real (3.8), redirecionamento real para /login com Supabase (3.9).

## Premissas assumidas

- Faixas aprovadas pelo humano no Checkpoint 1: Bom dia 05:00-11:59, Boa tarde 12:00-17:59, Boa noite 18:00-04:59.
- Saudação como função pura em `lib/domain/data-local.ts`; estilo `text-sm font-medium text-gray-700`.
- Testes de aceite criados pelo Desenvolvedor em E4 e assumidos/reescritos pelo QA em E6.

## Dependências novas

Nenhuma.

## Pendências e riscos

- Itens manuais de navegador acima.
- `update-agent-context` ausente; arquivo de contexto do agente não atualizado.
- Nenhum workflow foi alterado; a CI (lint, build e testes) deve rodar neste PR.

Checkpoint 2: o merge é decisão humana.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
