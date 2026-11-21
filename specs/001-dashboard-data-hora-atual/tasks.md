---

description: "Lista de tarefas: Data e hora atuais no dashboard"
---

# Tasks: Data e hora atuais no dashboard

**Input**: Documentos de `specs/001-dashboard-data-hora-atual/` (spec.md, plan.md, research.md, data-model.md, contracts/, quickstart.md)

**Prerequisites**: plan.md, spec.md (presentes); constituição em `.specify/memory/constitution.md`

**Tests**: A constituição (Princípio IV) exige testes e o plano prevê testes unitários do domínio e do componente em `petcontrol-next/tests/unit/`. Eles estão nas tarefas abaixo. Os testes de aceite (`petcontrol-next/tests/acceptance/`) pertencem ao QA e não têm tarefa aqui.

**Organization**: Tarefas agrupadas por história de usuário (US1 P1, US2 P2).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: história de usuário (US1, US2)
- Todos os caminhos são relativos à raiz do repositório. Comandos rodam da raiz com `npm --prefix petcontrol-next ...`.

## Comandos de verificação

- Teste: `npm --prefix petcontrol-next run test`
- Cobertura: `npm --prefix petcontrol-next run test:coverage`
- Lint: `npm --prefix petcontrol-next run lint`
- Build: `npm --prefix petcontrol-next run build`

## Restrições transversais

- Não alterar `.github/workflows/` nem ler/editar `petcontrol-next/.env.local`.
- Sem `any`/`as`; `strict` mantido. Imports explícitos de `vitest` (sem `globals`).
- Data/hora somente via `petcontrol-next/lib/domain/data-local.ts` (`agora()` concentra o `new Date()`).
- Sem Server Actions, sem banco, sem dependência de runtime nova.

---

## Phase 1: Setup (Infraestrutura de testes)

**Purpose**: Configurar o Vitest (primeiro framework de testes do projeto; lacuna registrada na constituição).

- [X] T001 Instalar as `devDependencies` `vitest`, `@vitest/coverage-v8`, `jsdom`, `@testing-library/react`, `@testing-library/dom` e `@vitejs/plugin-react` em `petcontrol-next/package.json` (atualizando `petcontrol-next/package-lock.json` via `npm --prefix petcontrol-next install -D ...`); nenhuma dependência de runtime nova
- [X] T002 Adicionar os scripts `"test": "vitest run"` e `"test:coverage": "vitest run --coverage"` em `petcontrol-next/package.json` (mesmo arquivo de T001, executar depois dele)
- [X] T003 [P] Criar `petcontrol-next/vitest.config.mts` com `environment: "jsdom"`, plugin `@vitejs/plugin-react`, alias `@` apontando para a raiz de `petcontrol-next`, `include: ["tests/**/*.test.{ts,tsx}"]`, sem `globals`, `coverage.provider: "v8"`, `coverage.include: ["lib/domain/data-local.ts"]` e `coverage.thresholds` de 100% para linhas e funções
- [X] T004 Confirmar que os arquivos de teste em `petcontrol-next/tests/` entram no `include` de `petcontrol-next/tsconfig.json` e no lint (`petcontrol-next/eslint.config.mjs`), ajustando somente se necessário; criar as pastas `petcontrol-next/tests/unit/lib/domain/` e `petcontrol-next/tests/unit/dashboard/`

**Checkpoint**: `npm --prefix petcontrol-next run test` executa o Vitest (pode terminar sem testes ainda).

---

## Phase 2: Foundational (Pré-requisitos bloqueantes)

**Purpose**: Base do domínio de data/hora compartilhada por US1 e US2.

**CRITICAL**: nenhuma história começa antes desta fase.

- [ ] T005 Em `petcontrol-next/lib/domain/data-local.ts`, acrescentar `export const FUSO_BRASILIA = "America/Sao_Paulo"` e `export function agora(): Date` (único ponto novo que lê o relógio do dispositivo), mantendo `hojeLocal()` e `dataParaISOLocal()` inalteradas (contrato `contracts/data-local-api.md`)

**Checkpoint**: base pronta; US1 pode iniciar.

---

## Phase 3: User Story 1 - Ver data e hora atuais no dashboard (Priority: P1) MVP

**Goal**: O voluntário autenticado vê no cabeçalho do dashboard a data e a hora atuais em `dd/MM/aaaa HH:mm:ss`, em vermelho, no fuso America/Sao_Paulo, sem hora errada na primeira exibição.

**Independent Test**: Abrir `/dashboard` autenticado e comparar o texto com o relógio do dispositivo convertido para America/Sao_Paulo; conferir formato, cor vermelha e fuso com o dispositivo em outro fuso (quickstart seções 3.1 a 3.6).

Cobre: FR-001, FR-002, FR-003, FR-004, FR-006, FR-007 (SC-002, SC-003, SC-005).

- [ ] T006 [US1] Em `petcontrol-next/lib/domain/data-local.ts`, implementar `export function formatarDataHoraBrasilia(instante: Date): string` usando um `Intl.DateTimeFormat("pt-BR", { timeZone: FUSO_BRASILIA, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })` criado uma vez no módulo, montando `${day}/${month}/${year} ${hour}:${minute}:${second}` a partir de `formatToParts()` (FR-002, FR-003; pura, independente de `process.env.TZ`)
- [ ] T007 [P] [US1] Criar `petcontrol-next/tests/unit/lib/domain/data-local.test.ts` cobrindo `formatarDataHoraBrasilia` com as garantias de `contracts/data-local-api.md` (`2026-11-15T17:35:07Z` -> `15/11/2026 14:35:07`; `2026-11-16T02:59:59Z` -> `15/11/2026 23:59:59`; `2026-11-16T03:00:00Z` -> `16/11/2026 00:00:00`; `2018-11-04T02:59:59Z` -> `03/11/2018 23:59:59`; `2018-11-04T03:00:00Z` -> `04/11/2018 01:00:00`), repetindo com `process.env.TZ` em `Asia/Tokyo` e `America/New_York` (restaurando ao final), e cobrindo `FUSO_BRASILIA` e `agora()` com `vi.useFakeTimers()`/`vi.setSystemTime()`
- [ ] T008 [US1] Criar `petcontrol-next/app/(dashboard)/dashboard/_components/RelogioBrasilia.tsx` (`"use client"`, sem props): `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)` com store mínimo criado por fábrica no arquivo; `getServerSnapshot` devolve `null` e renderiza o marcador `--/--/---- --:--:--`; `getSnapshot` devolve `formatarDataHoraBrasilia(agora())` (string, para estabilidade de igualdade); `subscribe` por ora apenas registra/remove o ouvinte (o tique entra em T013); renderiza `<time dateTime={ISO} aria-label="Data e hora atuais (horário de Brasília)" data-testid="relogio-brasilia" className="text-red-700 font-semibold tabular-nums whitespace-nowrap">` conforme `contracts/relogio-brasilia-ui.md`; sem `setState` em `useEffect`; sem rede nem Server Actions (FR-004, FR-006)
- [ ] T009 [US1] Em `petcontrol-next/app/(dashboard)/dashboard/page.tsx`, inserir `<RelogioBrasilia />` no cabeçalho existente com layout `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2` (à direita do título em `sm+`, abaixo em telas pequenas), sem alterar os demais blocos do dashboard nem a proteção do layout `(dashboard)` (FR-001, FR-006, FR-007)
- [ ] T010 [P] [US1] Criar `petcontrol-next/tests/unit/dashboard/relogio-brasilia.test.tsx` cobrindo: HTML de `renderToString` contém o marcador `--/--/---- --:--:--` e nenhuma hora; após `render` com `vi.setSystemTime`, `textContent` casa `^\d{2}/\d{2}/\d{4} \d{2}:\d{2}:\d{2}$` e iguala `formatarDataHoraBrasilia(agora())`; fuso do dispositivo trocado via `TZ` não altera o texto; elemento tem a classe `text-red-700`, `data-testid="relogio-brasilia"` e `aria-label` do contrato (importar apenas o componente e `data-local.ts`, nunca `lib/supabase/*` nem `page.tsx`)

**Checkpoint**: US1 funcional e testável sozinha (MVP). O texto aparece correto e em vermelho; ainda sem atualização contínua.

---

## Phase 4: User Story 2 - Manter o horário atualizado enquanto a tela está aberta (Priority: P2)

**Goal**: Com o dashboard aberto, o horário avança a cada segundo sem recarregar, sem deriva, vira o dia corretamente e se corrige ao voltar de aba oculta.

**Independent Test**: Manter o dashboard aberto por 1 minuto e verificar que os segundos avançam e coincidem com o relógio do dispositivo convertido (quickstart seções 3.3 e 3.5).

Cobre: FR-005 (SC-001, SC-004) e as bordas de virada de dia e aba em segundo plano.

- [ ] T011 [US2] Em `petcontrol-next/lib/domain/data-local.ts`, implementar `export function msAteProximoSegundo(instante: Date): number` (pura; resultado sempre em `1..1000`; instante com 250 ms -> `750`; com 0 ms -> `1000`)
- [ ] T012 [P] [US2] Em `petcontrol-next/tests/unit/lib/domain/data-local.test.ts`, acrescentar testes de `msAteProximoSegundo` (250 ms -> 750; 0 ms -> 1000; 999 ms -> 1; limites do intervalo `1..1000`) mantendo a cobertura de 100% de linhas e funções do arquivo (editar depois de T007 e T011)
- [ ] T013 [US2] Em `petcontrol-next/app/(dashboard)/dashboard/_components/RelogioBrasilia.tsx`, completar o `subscribe`: agendar `setTimeout` para `msAteProximoSegundo(agora())`; a cada disparo recalcular a string a partir de `agora()` (nunca incrementar contador), notificar os ouvintes e reagendar; ouvir `visibilitychange` em `document` e, ao voltar a `visible`, recalcular, notificar de imediato e reagendar; o unsubscribe limpa o timeout e o listener (FR-005; editar depois de T008)
- [ ] T014 [US2] Em `petcontrol-next/tests/unit/dashboard/relogio-brasilia.test.tsx`, acrescentar testes com `vi.useFakeTimers()`, `vi.setSystemTime()` e `act(() => vi.advanceTimersByTime(...))`: avanço de 1 s atualiza o texto; 5 min depois continua igual a `formatarDataHoraBrasilia(agora())` (SC-004); virada `23:59:59` -> `00:00:00` muda a data para o dia seguinte; `visibilitychange` com `document.visibilityState === "visible"` atualiza o texto imediatamente; após `unmount`, `vi.getTimerCount() === 0` e nenhum listener restante (editar depois de T010 e T013)

**Checkpoint**: US1 e US2 funcionam; relógio contínuo e sem deriva.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Verificação final e conformidade com a constituição.

- [ ] T015 Rodar `npm --prefix petcontrol-next run test` e `npm --prefix petcontrol-next run test:coverage`; corrigir falhas e garantir 100% de linhas e funções em `petcontrol-next/lib/domain/data-local.ts` (se a troca de `TZ` for instável no Windows, aplicar a mitigação R2 do plano sem alterar o critério)
- [ ] T016 Rodar `npm --prefix petcontrol-next run lint` e `npm --prefix petcontrol-next run build` e corrigir apontamentos nos arquivos desta feature (inclui checagem de tipos e a regra `react-hooks/set-state-in-effect`)
- [ ] T017 [P] Revisar o diff para garantir: nenhuma chamada de rede/Server Action/escrita no componente (FR-006), `RelogioBrasilia` usado apenas em `petcontrol-next/app/(dashboard)/dashboard/page.tsx` (FR-007), nenhum `new Date()` novo fora de `petcontrol-next/lib/domain/data-local.ts`, `.github/workflows/` e `.env.local` intocados
- [ ] T018 Executar o roteiro manual de `specs/001-dashboard-data-hora-atual/quickstart.md` (seções 3.1 a 3.8, incluindo contraste >= 4,5:1 sobre `bg-gray-50` e `bg-white`, tela de 360 px e dispositivo em outro fuso) e registrar o resultado no retorno ao orquestrador

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências. T001 -> T002 (mesmo arquivo); T003 [P] independente de T001/T002; T004 depois de T003.
- **Foundational (Phase 2)**: depende do Setup (T005 não precisa do Vitest, mas os testes sim); bloqueia US1 e US2.
- **US1 (Phase 3)**: depende de T005. T006 -> T008 (o componente importa a função) -> T009. T007 e T010 são [P] entre si (arquivos diferentes), mas T007 depende de T006 e T010 de T008.
- **US2 (Phase 4)**: depende de T005 e do componente de US1 (T008, mesmo arquivo em T013). T011 -> T012; T013 depende de T008 e T011; T014 depende de T010 e T013.
- **Polish (Phase 5)**: depende de US1 e US2 concluídas.

### User Story Dependencies

- **US1 (P1)**: independente de US2; entrega o MVP.
- **US2 (P2)**: estende o componente e o módulo de domínio de US1 (mesmos arquivos); não é independente em código, mas é testável sozinha pelo critério acima.

### Within Each Story

- Domínio (`data-local.ts`) -> componente -> página -> testes do componente.

### Parallel Opportunities

- T003 em paralelo com T001/T002 (arquivos diferentes).
- T007 e T010 em paralelo (arquivos de teste distintos), cada um após sua dependência.
- T012 pode ser escrita em paralelo a T013 (arquivos diferentes) após T011.
- T017 em paralelo com T015/T016 (leitura/revisão).

---

## Parallel Example: User Story 1

```text
# Após T006 e T008 concluídas:
Task: "T007 [P] [US1] tests/unit/lib/domain/data-local.test.ts"
Task: "T010 [P] [US1] tests/unit/dashboard/relogio-brasilia.test.tsx"
```

## Parallel Example: User Story 2

```text
# Após T011 concluída:
Task: "T012 [P] [US2] acrescentar testes de msAteProximoSegundo"
Task: "T013 [US2] completar subscribe/visibilitychange em RelogioBrasilia.tsx"
```

---

## Cobertura de requisitos

| Requisito | Tarefas |
|-----------|---------|
| FR-001 | T008, T009, T018 |
| FR-002 | T006, T007, T010 |
| FR-003 | T005, T006, T007, T010 |
| FR-004 | T008, T010, T018 |
| FR-005 | T011, T012, T013, T014 |
| FR-006 | T008, T009, T017 |
| FR-007 | T009, T017 |

SC-001..SC-005 são verificados por T007, T010, T014 e T018 (contraste e layout em 360 px no roteiro manual); a automação de aceite é do QA.

## Implementation Strategy

### MVP First (US1)

1. Phase 1 (Setup) e Phase 2 (Foundational).
2. Phase 3 (US1): domínio, componente, cabeçalho e testes unitários.
3. Validar US1 isolada (texto correto, vermelho, fuso fixo, sem hora errada na 1ª exibição).

### Entrega incremental

1. Entregar o MVP (US1).
2. Adicionar US2 (tique alinhado ao segundo, virada do dia, `visibilitychange`).
3. Polish: cobertura 100% do domínio, lint, build, roteiro manual.

## Notes

- Pendências do plano, fora do escopo destas tarefas e sem tarefa: P1 (CI em `.github/workflows/` não roda `test`; só altera com pedido explícito), P2 (sem tema escuro ativo; revisar a cor se for ativado) e P3 (script `update-agent-context` ausente; `CLAUDE.md` não atualizado automaticamente).
- Testes de aceite em `petcontrol-next/tests/acceptance/dashboard-data-hora.test.tsx` são responsabilidade do QA.
- Fazer commit somente quando o orquestrador/humano solicitar.
