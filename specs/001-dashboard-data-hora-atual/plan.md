# Implementation Plan: Data e hora atuais no dashboard

**Branch**: `001-dashboard-data-hora-atual` | **Date**: 2026-11-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-dashboard-data-hora-atual/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Exibir no cabeçalho do dashboard autenticado a data e a hora atuais no formato `dd/MM/aaaa HH:mm:ss`
(24 h), em vermelho (`text-red-700`, contraste aproximado de 6:1), sempre no fuso
`America/Sao_Paulo`, atualizadas a cada segundo a partir do relógio do dispositivo (US1, US2;
FR-001..FR-007).

Abordagem (detalhes em [research.md](./research.md)):
- **Domínio** (`lib/domain/data-local.ts`, ponto único de data/hora): `FUSO_BRASILIA`, `agora()`,
  `formatarDataHoraBrasilia(instante)` via `Intl.DateTimeFormat` + `formatToParts` com `timeZone`,
  e `msAteProximoSegundo(instante)` (D1, D2).
- **UI** (`app/(dashboard)/dashboard/_components/RelogioBrasilia.tsx`, Client Component):
  `useSyncExternalStore` com snapshot de servidor nulo (marcador neutro, sem hydration mismatch e
  sem hora errada na primeira exibição), tique alinhado à virada do segundo recalculado do relógio
  (sem deriva) e correção imediata em `visibilitychange` (D3, D4, D6).
- **Testes**: configuração inicial do Vitest no projeto (exigência do Princípio IV), com testes
  unitários do domínio e do componente e testes de aceite por cenário, usando fake timers e troca
  de `TZ` (D8, D9).

Sem Server Actions, sem banco, sem variáveis de ambiente novas.

## Technical Context

**Language/Version**: TypeScript 5 (modo `strict`), Node 20+

**Primary Dependencies**: Next.js 16.1 (App Router), React 19.2, Tailwind 4. Novas
`devDependencies` (justificadas em research D8): `vitest`, `@vitest/coverage-v8`, `jsdom`,
`@testing-library/react`, `@testing-library/dom`, `@vitejs/plugin-react`. Nenhuma dependência de
runtime nova (formatação via `Intl` nativo).

**Storage**: N/A (nenhuma persistência; nenhuma migração).

**Testing**: Vitest + jsdom + Testing Library; fake timers (`vi.useFakeTimers`, `vi.setSystemTime`).
Configuração prevista nesta feature (primeira do projeto):
- `petcontrol-next/vitest.config.mts`: `environment: "jsdom"`, plugin React, alias `@` -> raiz de
  `petcontrol-next`, `include: ["tests/**/*.test.{ts,tsx}"]`, `coverage.provider: "v8"`,
  `coverage.include: ["lib/domain/data-local.ts"]`, `coverage.thresholds` 100% de linhas e funções.
- Scripts em `petcontrol-next/package.json`: `"test": "vitest run"` e
  `"test:coverage": "vitest run --coverage"`.

**Comandos de verificação** (critério de avanço do orquestrador; todos da raiz do repositório):

| Tipo | Comando | Situação |
|------|---------|----------|
| Instalação | `npm --prefix petcontrol-next ci` | existente |
| Teste (obrigatório) | `npm --prefix petcontrol-next run test` | **a criar nesta feature** |
| Cobertura | `npm --prefix petcontrol-next run test:coverage` | **a criar nesta feature** |
| Lint | `npm --prefix petcontrol-next run lint` | existente |
| Build/typecheck | `npm --prefix petcontrol-next run build` | existente (inclui checagem de tipos do Next) |

**Diretórios de teste**:
- Unitários (Desenvolvedor): `petcontrol-next/tests/unit/`
  (`lib/domain/data-local.test.ts`, `dashboard/relogio-brasilia.test.tsx`).
- Aceite (QA): `petcontrol-next/tests/acceptance/` (`dashboard-data-hora.test.tsx`, um bloco por
  cenário de aceite de US1 e US2).

**Ambiente/segredos**: nenhuma variável nova. Os testes não importam `lib/supabase/*` nem a
`page.tsx` e portanto não precisam de `NEXT_PUBLIC_SUPABASE_*` nem de mocks do Supabase (D10).
`.env.local` não é lido nem alterado.

**Banco/migrações**: não aplicável.

**Target Platform**: navegadores modernos (desktop e celular) com `Intl` e base IANA de fusos;
renderização SSR pelo servidor Next.js.

**Project Type**: aplicação web (Next.js fullstack, monorepo de pasta única `petcontrol-next/`).

**Performance Goals**: 1 re-render por segundo de um único `<time>`; nenhuma requisição de rede.

**Constraints**: diferença máxima de 1 s em relação ao relógio do dispositivo convertido (SC-001,
SC-004); nenhuma hora exibida antes da hidratação; contraste >= 4,5:1 (SC-005); sem quebra de
layout em 360 px.

**Scale/Scope**: cerca de 10 voluntários; 1 tela (`/dashboard`); 1 componente novo, 1 módulo de
domínio estendido, 1 linha de layout alterada em `page.tsx`, configuração de testes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação | Resultado |
|-----------|-----------|-----------|
| I. Vertical slices | Componente em `app/(dashboard)/dashboard/_components/`; lógica pura em `lib/domain/data-local.ts` (já compartilhado por vários módulos). Nenhum import de `_components` de outro módulo. | PASSA |
| II. Server Actions protegidas | Nenhuma Server Action criada ou alterada. Acesso continua protegido pelo layout `(dashboard)` (FR-007). | N/A (PASSA) |
| III. Validação Zod | Não há entrada do cliente. | N/A (PASSA) |
| IV. Testes obrigatórios | Configura Vitest, cria script `test` e declara o comando completo; testes da lógica de `lib/domain/` e do componente; sem acesso ao Supabase. Não há schemas nem actions a testar. | PASSA |
| V. Lint e build | Comandos declarados; decisão D3 evita a regra `react-hooks/set-state-in-effect`; arquivos de teste incluídos no `tsconfig` e no lint type-aware. | PASSA |
| VI. Segredos | Nenhum segredo nos artefatos; nenhuma variável nova; `.env.local` intocado. | PASSA |
| VII. Banco por migração | Sem mudança de schema. | N/A (PASSA) |
| VIII. Simplicidade | `strict` mantido; sem `any`/`as`; data/hora via `lib/domain/data-local.ts` (`agora()` concentra o `new Date()`); sem dependência de runtime; store mínimo local ao componente justificado em D3. | PASSA |
| IX. Branch por spec | Trabalho na branch `001-dashboard-data-hora-atual`; merge humano. | PASSA |
| Stack: novas dependências justificadas | Apenas `devDependencies` de teste, justificadas em research D8. | PASSA |

**Pré-Fase 0**: PASSA. **Pós-Fase 1 (reavaliado após data-model e contracts)**: PASSA, sem
violações; Complexity Tracking vazio.

## Project Structure

### Documentation (this feature)

```text
specs/001-dashboard-data-hora-atual/
├── plan.md              # Este arquivo
├── research.md          # Fase 0
├── data-model.md        # Fase 1 (sem persistência; valores em memória e estados do componente)
├── quickstart.md        # Fase 1 (roteiro de validação)
├── contracts/
│   ├── data-local-api.md        # API pública acrescentada a lib/domain/data-local.ts
│   └── relogio-brasilia-ui.md   # Contrato de UI do componente
├── checklists/requirements.md   # E1
└── tasks.md             # Fase 2 (/speckit-tasks, NÃO criado aqui)
```

### Source Code (repository root)

```text
petcontrol-next/
├── package.json                         # ALTERAR: scripts test e test:coverage; devDependencies de teste
├── package-lock.json                    # ALTERAR: gerado pelo npm install das devDependencies
├── vitest.config.mts                    # NOVO: configuração do Vitest
├── lib/
│   └── domain/
│       └── data-local.ts                # ALTERAR: FUSO_BRASILIA, agora, formatarDataHoraBrasilia, msAteProximoSegundo
├── app/
│   └── (dashboard)/
│       └── dashboard/
│           ├── page.tsx                 # ALTERAR: cabeçalho passa a conter <RelogioBrasilia />
│           └── _components/
│               └── RelogioBrasilia.tsx  # NOVO: Client Component do relógio
└── tests/
    ├── unit/                            # Desenvolvedor
    │   ├── lib/domain/data-local.test.ts
    │   └── dashboard/relogio-brasilia.test.tsx
    └── acceptance/                      # QA
        └── dashboard-data-hora.test.tsx
```

**Structure Decision**: aplicação Next.js única em `petcontrol-next/`, organizada por feature
(Princípio I). O relógio pertence ao módulo `dashboard` e fica em seu `_components/`; a lógica de
data e hora vai para o ponto único existente `lib/domain/data-local.ts`. Testes ficam em
`petcontrol-next/tests/` (fora de `app/`, para não virarem rotas), separados entre `unit/` e
`acceptance/`.

### Rastreabilidade

| Item da spec | Decisão (research) | Artefato de código | Verificação |
|--------------|--------------------|--------------------|-------------|
| FR-001, SC-003 | D6 | `page.tsx`, `RelogioBrasilia.tsx` | aceite + quickstart 3.2 |
| FR-002 | D2 | `data-local.ts` | unitário domínio |
| FR-003, SC-002 | D2, D9 | `data-local.ts` | unitário com `TZ` trocado + quickstart 3.4 |
| FR-004, SC-005 | D5 | `RelogioBrasilia.tsx` | unitário (classe) + quickstart 3.6 |
| FR-005, SC-001, SC-004 | D4 | `RelogioBrasilia.tsx`, `msAteProximoSegundo` | aceite com fake timers |
| FR-006 | D7 | sem rede/escrita | quickstart 3.8 + revisão |
| FR-007 | D7 | uso só em `dashboard/page.tsx` | revisão |
| Edge: 1ª exibição | D3 | `useSyncExternalStore` + marcador | unitário `renderToString` |
| Edge: aba oculta | D4 | listener `visibilitychange` | unitário |
| Edge: horário de verão | D2 | `Intl` + IANA | unitário (2018-11-04) |
| Edge: tela pequena | D6 | classes responsivas | quickstart 3.7 |
| US1 / US2 | — | — | `tests/acceptance/` |

### Riscos

- **R1**: ICU reduzido no runtime sem dados de `America/Sao_Paulo`. Mitigação: Node 20 e
  navegadores modernos trazem ICU completo; o teste de domínio falha cedo se faltar.
- **R2**: troca de `process.env.TZ` em tempo de execução no Windows. Mitigação: suportada pelo Node
  20; se o teste se mostrar instável, executar o arquivo com `TZ` definido por projeto/`poolOptions`
  do Vitest (decisão do Desenvolvedor, sem mudar o critério).
- **R3**: o CI (`.github/workflows/`) não executa `test`; alteração depende de pedido explícito
  (pendência P1 em research).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Nenhuma violação. Tabela não aplicável.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
