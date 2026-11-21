## Resumo

Exibe a data e a hora atuais no cabeçalho do dashboard, no formato pt-BR `dd/MM/aaaa HH:mm:ss`, em vermelho, sempre no fuso `America/Sao_Paulo`, atualizadas a cada segundo. Feature somente informativa: sem Server Action, banco, migração ou variável de ambiente nova.

- Spec: [`specs/001-dashboard-data-hora-atual/spec.md`](../spec.md)
- Plano: [`plan.md`](../plan.md) · Tarefas: [`tasks.md`](../tasks.md) (T001-T018 concluídas)
- Revisão: [`review-report.md`](../review-report.md) · QA: [`qa-report.md`](../qa-report.md)

## Implementação

- `lib/domain/data-local.ts`: `FUSO_BRASILIA`, `agora()` (único `new Date()` novo), `formatarDataHoraBrasilia()` (Intl + `formatToParts`, independente do fuso do dispositivo) e `msAteProximoSegundo()`.
- `app/(dashboard)/dashboard/_components/RelogioBrasilia.tsx`: Client Component com `useSyncExternalStore`; servidor e hidratação mostram o marcador `--/--/---- --:--:--` (sem hora errada na primeira exibição); tique alinhado à virada do segundo, sem deriva; correção imediata ao voltar à aba (`visibilitychange`); `text-red-700` (contraste ~6,1:1 a 6,4:1).
- `app/(dashboard)/dashboard/page.tsx`: relógio inserido no cabeçalho, responsivo.
- Primeira configuração de testes do projeto: Vitest 3 + jsdom + Testing Library (apenas `devDependencies`). `package-lock.json` com diff grande por deduplicação do npm.

## Requisitos cobertos

FR-001 a FR-007 e SC-001 a SC-005 (ver tabela de cobertura em `tasks.md` e matriz em `qa-report.md`).

## Testes executados (todos com código de saída 0)

| Comando | Resultado |
|---|---|
| `npm --prefix petcontrol-next run test` | 56 testes passando (16 de domínio, 11 de componente, 29 de aceite) |
| `npm --prefix petcontrol-next run test:coverage` | 100% de linhas, funções, ramos e instruções em `lib/domain/data-local.ts` |
| `npm --prefix petcontrol-next run lint` | zero avisos |
| `npm --prefix petcontrol-next run build` | sucesso (log `DYNAMIC_SERVER_USAGE` de `/produtos` é pré-existente) |

## Parecer do Revisor (aprovado com ressalvas)

Nenhum achado bloqueante; princípios I, II, III, VI, VII e VIII conformes ou não aplicáveis. Ressalvas não bloqueantes:

- B1 (baixo): `dateTime` do `<time>` vem de segunda leitura do relógio e pode diferir do texto em até 1 s.
- B2 (baixo): testes unitários que trocam `TZ` não afirmam que a troca teve efeito (mitigado nos testes de aceite).
- B3 (baixo): `.gitkeep` sem uso em `tests/unit/dashboard/` e `tests/unit/lib/domain/`.
- S1 (sugestão): hidratação sem mismatch, coberta depois pelo QA.
- Testes do QA (T1-T5, baixo/sugestão): seletor de cabeçalho frágil no teste de SC-003, `fetch` espiado sem implementação, hidratação via `onRecoverableError`, limpeza sem `try/finally`, asserções redundantes.

## Parecer do QA (aprovado com ressalvas)

Nenhum defeito Crítico, Alto ou Médio. Não verificável no ambiente de agentes (executar manualmente antes do merge, ver seção 5 do `qa-report.md`): login real e `/dashboard` com Supabase, SC-003 visual (3 s), layout em 360 px, comparação no navegador com fuso alterado no DevTools, aba Network.

## Premissas assumidas pela fábrica

- Vitest 3.2.7 e `@vitejs/plugin-react` 4.7 (Vitest 4/5 incompatíveis com o npm local e `@types/node` 20).
- `coverage/**` adicionado aos ignores do ESLint (relatório gerado por `test:coverage`).
- Referência de hora é o relógio do dispositivo convertido para `America/Sao_Paulo` (esclarecimento de 15/11).

## Dependências novas (somente dev)

`vitest`, `@vitest/coverage-v8`, `jsdom`, `@testing-library/react`, `@testing-library/dom`, `@vitejs/plugin-react`.

## Pendências e riscos

- **P1:** o CI (`.github/workflows/ci.yml`) roda lint e build, mas não roda `test`. Não alterado por restrição do projeto; recomenda-se incluir `npm run test` em PR separado com pedido explícito.
- **P2:** não há tema escuro ativo; revisar a cor se for ativado.
- **P3:** script `update-agent-context` ausente; `CLAUDE.md` não registra o Vitest.
- Itens manuais acima não verificados por agente.

Checkpoint 2: o merge é decisão humana.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
