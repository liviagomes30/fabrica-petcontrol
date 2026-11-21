---

description: "Lista de tarefas: Saudação por período do dia no dashboard"
---

# Tasks: Saudação por período do dia no dashboard

**Input**: Documentos de projeto em `/specs/002-saudacao-dashboard/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md, contracts/saudacao-domain-api.md, contracts/saudacao-ui.md

**Tests**: Incluídos. A constituição (Princípio IV) e o plano exigem testes unitários de `lib/domain/` (100% de linhas e funções em `data-local.ts`), unitário do componente e testes de aceite por cenário de US1 e US2. Os unitários fazem parte do pronto do Desenvolvedor; os de aceite são do QA.

**Organization**: Tarefas agrupadas por história de usuário. Todos os caminhos são relativos à raiz do repositório; o app fica em `petcontrol-next/`.

**Comandos de verificação** (da raiz): `npm --prefix petcontrol-next run test` | `npm --prefix petcontrol-next run test:coverage` | `npm --prefix petcontrol-next run lint` | `npm --prefix petcontrol-next run build`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: História a que a tarefa pertence (US1, US2)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirmar a linha de base. Sem dependências novas, sem variáveis de ambiente, sem migração.

- [X] T001 Instalar dependências com `npm --prefix petcontrol-next ci` e confirmar a linha de base verde (`run test`, `run lint`, `run build` com código 0) antes de alterar qualquer arquivo
- [X] T002 [P] Ler `petcontrol-next/lib/domain/data-local.ts`, `petcontrol-next/app/(dashboard)/dashboard/_components/RelogioBrasilia.tsx`, `petcontrol-next/tests/unit/lib/domain/data-local.test.ts` e `petcontrol-next/tests/unit/dashboard/relogio-brasilia.test.tsx` para reaproveitar helpers de teste (fake timers, troca de `process.env.TZ`) e o padrão do snapshot `useSyncExternalStore`; nenhuma alteração de arquivo

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Regra pura das faixas no ponto único de data/hora, usada por US1 e US2.

**CRITICAL**: Nenhuma tarefa de história começa antes desta fase.

- [X] T003 Em `petcontrol-next/lib/domain/data-local.ts`, exportar o tipo `Saudacao = "Bom dia" | "Boa tarde" | "Boa noite"` (exatamente um dos três textos, inicial maiúscula, FR-002), sem alterar as exportações existentes
- [X] T004 Em `petcontrol-next/lib/domain/data-local.ts`, implementar `saudacaoPorHora(hora: number): Saudacao` pura com as faixas 5..11 = "Bom dia", 12..17 = "Boa tarde", 18..23 e 0..4 = "Boa noite" (FR-004); sem `any`/`as`, sem validação extra de entrada, sem ler `agora()`/`new Date()` (depende de T003)
- [X] T005 Em `petcontrol-next/lib/domain/data-local.ts`, implementar `saudacaoDaDataHoraBrasilia(texto: string): Saudacao` pura que extrai a hora `HH` do texto `dd/MM/aaaa HH:mm:ss` de `formatarDataHoraBrasilia` e delega a `saudacaoPorHora` (FR-003); sem validação adicional de formato (depende de T004)
- [X] T006 Estender `petcontrol-next/tests/unit/lib/domain/data-local.test.ts` com testes de `saudacaoPorHora` para todas as 24 horas (0..23) e de `saudacaoDaDataHoraBrasilia` para os seis textos de limite (04:59:59, 05:00:00, 11:59:59, 12:00:00, 17:59:59, 18:00:00), conforme `contracts/saudacao-domain-api.md` (depende de T005)
- [X] T007 Estender `petcontrol-next/tests/unit/lib/domain/data-local.test.ts` com a composição `saudacaoDaDataHoraBrasilia(formatarDataHoraBrasilia(new Date(...)))` para os quatro instantes UTC do contrato (14:59:59Z, 15:00:00Z, 07:59:59Z, 08:00:00Z de 2026-11-21) e com `process.env.TZ` trocado (`Asia/Tokyo`, `America/New_York`) provando independência do fuso do dispositivo (R1, FR-003, SC-004) (depende de T006, mesmo arquivo)
- [X] T008 Rodar `npm --prefix petcontrol-next run test:coverage` e confirmar 100% de linhas e funções em `petcontrol-next/lib/domain/data-local.ts`, incluindo `saudacaoPorHora` e `saudacaoDaDataHoraBrasilia` (depende de T007)

**Checkpoint**: Domínio pronto e coberto; as histórias podem começar.

---

## Phase 3: User Story 1 - Ver a saudação correta abaixo da data e hora (Priority: P1) MVP

**Goal**: O voluntário autenticado vê, imediatamente abaixo da data/hora, "Bom dia", "Boa tarde" ou "Boa noite" coerente com a hora de Brasília (FR-001..FR-004, FR-006..FR-009).

**Independent Test**: Renderizar `RelogioBrasilia` em instantes fixos (com `TZ` do dispositivo diferente) e conferir que `[data-testid=saudacao-dashboard]` é o irmão seguinte de `[data-testid=relogio-brasilia]` e mostra a faixa da hora de Brasília exibida; no servidor a saudação é vazia.

### Implementation for User Story 1

- [X] T009 [US1] Alterar `petcontrol-next/app/(dashboard)/dashboard/_components/RelogioBrasilia.tsx`: envolver o `<time>` e a saudação em `<div className="flex flex-col items-start sm:items-end ...">`, mantendo no `<time>` texto, classes, `aria-label`, `data-testid` e `dateTime` inalterados (R2, FR-007); `page.tsx` não muda (depende de T005)
- [X] T010 [US1] Em `petcontrol-next/app/(dashboard)/dashboard/_components/RelogioBrasilia.tsx`, renderizar logo após o `<time>` o `<p data-testid="saudacao-dashboard" className="text-sm font-medium text-gray-700 whitespace-nowrap min-h-5">` com `saudacaoDaDataHoraBrasilia(texto)` derivada do mesmo snapshot do `useSyncExternalStore` (sem segunda assinatura, temporizador ou `new Date()`, FR-001, FR-006, FR-009); com snapshot `null` o `<p>` fica vazio e reserva altura (depende de T009)
- [X] T011 [P] [US1] Criar `petcontrol-next/tests/unit/dashboard/saudacao-dashboard.test.tsx` com testes unitários do componente: saudação para uma hora de cada faixa; ordem no DOM (saudação é o irmão imediatamente seguinte do `<time>`); `textContent` exatamente um dos três textos; `TZ` = `Asia/Tokyo` e `America/New_York` mostram a saudação de Brasília; `renderToString` sem nenhum dos três textos (1ª exibição); classe `text-gray-700` presente (depende de T010)
- [X] T012 [P] [US1] Criar `petcontrol-next/tests/acceptance/dashboard-saudacao.test.tsx` (QA) com um bloco `describe` para US1 e um teste por cenário de aceite 1 a 4 (Bom dia 05:00–11:59, Boa tarde 12:00–17:59, Boa noite 18:00–04:59, dispositivo em outro fuso), com fake timers, sem acessar o Supabase (depende de T010)
- [X] T013 [US1] Rodar `npm --prefix petcontrol-next run test` e confirmar que `tests/unit/dashboard/relogio-brasilia.test.tsx` e `tests/acceptance/dashboard-data-hora.test.tsx` (feature 001) passam sem nenhuma edição (R2, FR-007) (depende de T011 e T012)

**Checkpoint**: US1 funcional e testável sozinha (MVP).

---

## Phase 4: User Story 2 - Saudação acompanha a mudança de período sem recarregar (Priority: P2)

**Goal**: Com o dashboard aberto, a saudação muda no mesmo render em que o relógio cruza um limite de faixa (FR-005, SC-003), inclusive ao voltar de aba oculta.

**Independent Test**: Com fake timers e relógio em 11:59:58, avançar 1 s e depois 1 s e verificar que relógio e saudação passam de 11:59:59 "Bom dia" para 12:00:00 "Boa tarde" no mesmo `act`; repetir para 17:59:59 e 04:59:59.

### Implementation for User Story 2

- [X] T014 [US2] Verificar em `petcontrol-next/app/(dashboard)/dashboard/_components/RelogioBrasilia.tsx` que a saudação deriva exclusivamente do snapshot do relógio, de modo que o tique de 1 s e o `visibilitychange` existentes já atualizam relógio e saudação no mesmo render, sem temporizador ou listener novo (D3, D4); alterar o arquivo só se houver divergência em relação a T010 (depende de T010)
- [X] T015 [P] [US2] Estender `petcontrol-next/tests/unit/dashboard/saudacao-dashboard.test.tsx` com testes das três viradas sincronizadas (11:59:59 para 12:00:00, 17:59:59 para 18:00:00, 04:59:59 para 05:00:00) afirmando relógio e saudação no mesmo `act`; `vi.getTimerCount() === 1`; `visibilitychange` com `visibilityState === "visible"` corrigindo relógio e saudação juntos; desmontagem sem timers nem listeners restantes (depende de T011, mesmo arquivo)
- [X] T016 [P] [US2] Estender `petcontrol-next/tests/acceptance/dashboard-saudacao.test.tsx` (QA) com um bloco `describe` para US2 e um teste por cenário de aceite 1 a 3 (Bom dia para Boa tarde, Boa tarde para Boa noite, Boa noite para Bom dia, sem recarregar) (depende de T012, mesmo arquivo)
- [X] T017 [US2] Rodar `npm --prefix petcontrol-next run test` e confirmar que todos os testes (001 e 002) passam (depende de T014, T015, T016)

**Checkpoint**: US1 e US2 funcionam e são testáveis independentemente.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Verificação final e cobertura de requisitos.

- [X] T018 Rodar `npm --prefix petcontrol-next run lint` e `npm --prefix petcontrol-next run build` e corrigir qualquer violação nos arquivos alterados (sem `setState` em efeito, sem `any`/`as`, sem `new Date()` novo) (depende de T017)
- [X] T019 Rodar `npm --prefix petcontrol-next run test:coverage` e confirmar 100% de linhas e funções em `petcontrol-next/lib/domain/data-local.ts` (depende de T017)
- [X] T020 Validar manualmente o roteiro de `specs/002-saudacao-dashboard/quickstart.md` (posição, faixas, fusos, tela de 360 px sem quebra de linha, contraste 4,5:1) e registrar o resultado no retorno ao orquestrador, sem editar o quickstart (depende de T018)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende do Setup; bloqueia as histórias. Cadeia sequencial no mesmo arquivo: T003 -> T004 -> T005 -> T006 -> T007 -> T008.
- **US1 (Phase 3)**: depende de T005. T009 -> T010; T011 e T012 em paralelo; T013 por último.
- **US2 (Phase 4)**: depende de US1 (mesmo componente e mesmos arquivos de teste). T014 -> T015/T016 em paralelo -> T017.
- **Polish (Phase 5)**: depende de US1 e US2.

### User Story Dependencies

- **US1 (P1)**: começa após Foundational; sem dependência de outra história.
- **US2 (P2)**: reutiliza o componente de US1 (a derivação do snapshot é o que garante a virada sincronizada); testável de forma independente com fake timers.

### Cobertura de requisitos

| Requisito | Tarefas |
|-----------|---------|
| FR-001, SC-006 | T009, T010, T011 |
| FR-002 | T003, T006, T011 |
| FR-003, SC-004 | T005, T007, T011, T012 |
| FR-004, SC-002 | T004, T006, T007, T012 |
| FR-005, SC-003 | T014, T015, T016 |
| FR-006, SC-001 | T010, T011 |
| FR-007 | T009, T013 |
| FR-008 | T009 (`page.tsx` inalterado), T020 |
| FR-009, SC-005 | T010, T011, T020 |

Todos os FR-001..FR-009 estão cobertos.

## Parallel Example

```bash
# US1, após T010:
Task: "Testes unitários do componente em petcontrol-next/tests/unit/dashboard/saudacao-dashboard.test.tsx"
Task: "Testes de aceite US1 em petcontrol-next/tests/acceptance/dashboard-saudacao.test.tsx"

# US2, após T014:
Task: "Viradas sincronizadas em petcontrol-next/tests/unit/dashboard/saudacao-dashboard.test.tsx"
Task: "Aceite US2 em petcontrol-next/tests/acceptance/dashboard-saudacao.test.tsx"
```

## Implementation Strategy

### MVP First (US1)

1. Setup (T001-T002), Foundational (T003-T008), US1 (T009-T013).
2. Parar e validar US1: saudação correta abaixo da data/hora, em qualquer fuso.

### Incremental Delivery

1. Fundação de domínio com 100% de cobertura.
2. US1 (MVP): saudação exibida.
3. US2: virada sincronizada e testes de aceite correspondentes.
4. Polish: lint, build, cobertura e quickstart.

## Notes

- [P] = arquivos diferentes e sem dependência pendente; tarefas no mesmo arquivo não levam [P] entre si.
- Sem Server Actions, schemas Zod, banco, migração ou variáveis novas; `.env.local` não é lido nem alterado.
- Não editar `.github/workflows/`; não commitar sem pedido.
