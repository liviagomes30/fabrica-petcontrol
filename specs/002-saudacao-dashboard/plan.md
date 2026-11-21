# Implementation Plan: Saudação por período do dia no dashboard

**Branch**: `002-saudacao-dashboard` | **Date**: 2026-11-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-saudacao-dashboard/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Exibir, imediatamente abaixo da data e hora do dashboard (componente `RelogioBrasilia`, entregue na
feature 001), a saudação "Bom dia", "Boa tarde" ou "Boa noite" conforme a hora de Brasília, com as
faixas 05:00–11:59, 12:00–17:59 e 18:00–04:59, atualizada junto com o relógio e sempre coerente com
o horário exibido (US1, US2; FR-001..FR-009).

Abordagem (detalhes em [research.md](./research.md)):
- **Domínio** (`lib/domain/data-local.ts`, ponto único de data/hora): tipo `Saudacao`, função pura
  `saudacaoPorHora(hora)` com as três faixas, e `saudacaoDaDataHoraBrasilia(texto)` que lê a hora
  `HH` do texto `dd/MM/aaaa HH:mm:ss` já produzido por `formatarDataHoraBrasilia` (D1, D2).
- **UI**: o próprio `RelogioBrasilia` passa a renderizar a saudação logo abaixo do `<time>`,
  derivando-a do **mesmo snapshot** (`texto`) do `useSyncExternalStore`. Não há segunda assinatura,
  segundo temporizador nem segunda leitura de `agora()`: saudação e relógio mudam no mesmo render,
  o que garante FR-005/FR-006 e SC-003 por construção (D3, D4).
- **Primeira exibição**: no servidor/hidratação o snapshot é `null`; o relógio mostra o marcador e a
  saudação fica vazia (espaço reservado), nunca com valor errado (D5).
- **Estilo**: `text-sm text-gray-700` (contraste aproximado de 10:1 sobre `bg-white` e `bg-gray-50`;
  não há tema escuro no projeto) (D6).
- **Testes**: unitários do domínio (todas as 24 horas e os seis instantes de limite), unitários do
  componente (saudação, fusos, virada sincronizada, SSR sem saudação) e testes de aceite por
  cenário de US1 e US2, com fake timers (D7).

Sem Server Actions, sem banco, sem variáveis de ambiente novas, sem dependências novas.

## Technical Context

**Language/Version**: TypeScript 5 (modo `strict`), Node 20+

**Primary Dependencies**: Next.js 16 (App Router), React 19, Tailwind 4 (já presentes). Nenhuma
dependência nova, de runtime ou de desenvolvimento (Vitest, jsdom e Testing Library já foram
configurados na feature 001).

**Storage**: N/A (nenhuma persistência; nenhuma migração).

**Testing**: Vitest + jsdom + Testing Library, fake timers (`vi.useFakeTimers`, `vi.setSystemTime`)
e troca de `process.env.TZ`, conforme `petcontrol-next/vitest.config.mts` existente. A cobertura
exigida (100% de linhas e funções em `lib/domain/data-local.ts`) passa a abranger as novas funções
de saudação; nenhuma alteração na configuração do Vitest é necessária.

**Comandos de verificação** (critério de avanço do orquestrador; todos da raiz do repositório):

| Tipo | Comando | Situação |
|------|---------|----------|
| Instalação | `npm --prefix petcontrol-next ci` | existente |
| Teste (obrigatório) | `npm --prefix petcontrol-next run test` | existente (`vitest run`) |
| Cobertura | `npm --prefix petcontrol-next run test:coverage` | existente; exige 100% de linhas e funções em `lib/domain/data-local.ts`, incluindo as funções novas |
| Lint | `npm --prefix petcontrol-next run lint` | existente |
| Build/typecheck | `npm --prefix petcontrol-next run build` | existente (inclui checagem de tipos do Next) |

Todos devem sair com código 0 ao final da implementação.

**Diretórios de teste**:
- Unitários (Desenvolvedor): `petcontrol-next/tests/unit/`
  - `lib/domain/data-local.test.ts` (ESTENDER: `saudacaoPorHora`, `saudacaoDaDataHoraBrasilia`)
  - `dashboard/saudacao-dashboard.test.tsx` (NOVO: saudação no `RelogioBrasilia`)
  - `dashboard/relogio-brasilia.test.tsx` (existente; deve continuar passando sem alteração)
- Aceite (QA): `petcontrol-next/tests/acceptance/dashboard-saudacao.test.tsx` (NOVO; um bloco por
  cenário de aceite de US1 e US2). `dashboard-data-hora.test.tsx` (001) deve continuar passando.

**Ambiente/segredos**: nenhuma variável nova. Os testes não importam `lib/supabase/*` nem
`page.tsx`; não precisam de `NEXT_PUBLIC_SUPABASE_*` nem de mocks do Supabase. `.env.local` não é
lido nem alterado.

**Banco/migrações**: não aplicável.

**Target Platform**: navegadores modernos (desktop e celular) com `Intl` e base IANA de fusos;
renderização SSR pelo servidor Next.js.

**Project Type**: aplicação web (Next.js fullstack, pasta única `petcontrol-next/`).

**Performance Goals**: nenhum render adicional: a saudação re-renderiza no mesmo ciclo de 1 s do
relógio; nenhuma requisição de rede.

**Constraints**: saudação sempre igual à faixa da hora exibida (FR-006); troca no mesmo render da
virada do relógio (SC-003, folga de 1 s); nenhuma saudação antes da hidratação; contraste >= 4,5:1
(SC-005); sem quebra de layout em 360 px.

**Scale/Scope**: cerca de 10 voluntários; 1 tela (`/dashboard`); 1 componente existente alterado,
1 módulo de domínio estendido; `page.tsx` inalterado.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação | Resultado |
|-----------|-----------|-----------|
| I. Vertical slices | Alteração restrita a `app/(dashboard)/dashboard/_components/RelogioBrasilia.tsx`; lógica pura em `lib/domain/data-local.ts` (ponto único de data/hora já compartilhado). Nenhum import entre módulos. | PASSA |
| II. Server Actions protegidas | Nenhuma Server Action criada ou alterada; a tela continua sob o layout autenticado `(dashboard)` (FR-008). | N/A (PASSA) |
| III. Validação Zod | Não há entrada do cliente. | N/A (PASSA) |
| IV. Testes obrigatórios | Comando de teste declarado; testes unitários da lógica de `lib/domain/` (100% de cobertura mantida) e do componente; testes de aceite por cenário; sem acesso ao Supabase. Não há schemas nem actions. | PASSA |
| V. Lint e build | Comandos declarados; nenhuma regra nova de lint impactada (sem `setState` em efeito; derivação pura no render). | PASSA |
| VI. Segredos | Nenhum segredo nos artefatos; nenhuma variável nova; `.env.local` intocado. | PASSA |
| VII. Banco por migração | Sem mudança de schema. | N/A (PASSA) |
| VIII. Simplicidade | `strict` mantido; sem `any`/`as`; nenhum `new Date()` novo (a hora vem do snapshot já calculado via `agora()`); sem nova abstração, store ou temporizador; sem dependência nova. | PASSA |
| IX. Branch por spec | Trabalho na branch `002-saudacao-dashboard` (base `main`); merge humano. | PASSA |
| Stack: novas dependências justificadas | Nenhuma dependência nova. | PASSA |

**Pré-Fase 0**: PASSA. **Pós-Fase 1 (reavaliado após data-model e contracts)**: PASSA, sem
violações; Complexity Tracking vazio.

## Project Structure

### Documentation (this feature)

```text
specs/002-saudacao-dashboard/
├── plan.md              # Este arquivo
├── research.md          # Fase 0
├── data-model.md        # Fase 1 (sem persistência; valor derivado e faixas)
├── quickstart.md        # Fase 1 (roteiro de validação)
├── contracts/
│   ├── saudacao-domain-api.md   # API acrescentada a lib/domain/data-local.ts
│   └── saudacao-ui.md           # Contrato de UI da saudação no RelogioBrasilia
├── checklists/requirements.md   # E1
└── tasks.md             # Fase 2 (/speckit-tasks, NÃO criado aqui)
```

### Source Code (repository root)

```text
petcontrol-next/
├── lib/
│   └── domain/
│       └── data-local.ts                # ALTERAR: tipo Saudacao, saudacaoPorHora, saudacaoDaDataHoraBrasilia
├── app/
│   └── (dashboard)/
│       └── dashboard/
│           ├── page.tsx                 # INALTERADO (já renderiza <RelogioBrasilia /> no cabeçalho)
│           └── _components/
│               └── RelogioBrasilia.tsx  # ALTERAR: envolve <time> e saudação em um bloco vertical
└── tests/
    ├── unit/                            # Desenvolvedor
    │   ├── lib/domain/data-local.test.ts            # ESTENDER
    │   └── dashboard/saudacao-dashboard.test.tsx    # NOVO
    └── acceptance/                      # QA
        └── dashboard-saudacao.test.tsx              # NOVO
```

**Structure Decision**: aplicação Next.js única em `petcontrol-next/`, organizada por feature
(Princípio I). A saudação pertence ao módulo `dashboard` e é renderizada pelo componente que já
detém o snapshot de hora (`RelogioBrasilia`), evitando uma segunda fonte de tempo. A regra das faixas
vai para o ponto único `lib/domain/data-local.ts`. Testes em `petcontrol-next/tests/`, separados
entre `unit/` e `acceptance/`.

### Rastreabilidade

| Item da spec | Decisão (research) | Artefato de código | Verificação |
|--------------|--------------------|--------------------|-------------|
| FR-001, SC-006 | D3, D6 | `RelogioBrasilia.tsx` (saudação abaixo do `<time>`) | unitário (ordem no DOM) + quickstart 3.1 |
| FR-002 | D1 | tipo `Saudacao` | unitário domínio + typecheck |
| FR-003, SC-004 | D2 | `saudacaoDaDataHoraBrasilia` sobre texto já em Brasília | unitário com `TZ` trocado + quickstart 3.4 |
| FR-004, SC-002 | D1 | `saudacaoPorHora` | unitário 0..23 h + seis instantes de limite |
| FR-005, SC-003 | D3, D4 | mesmo snapshot do relógio | unitário/aceite com fake timers nas três viradas |
| FR-006, SC-001 | D3 | derivação no mesmo render | unitário (saudação = faixa do texto exibido) |
| FR-007 | D3 | sem rede/escrita; texto do relógio inalterado | testes da 001 sem alteração + revisão |
| FR-008 | — | uso só em `dashboard/page.tsx` (já existente) | revisão |
| FR-009, SC-005 | D6 | classe `text-gray-700` | unitário (classe) + quickstart 3.6 |
| Edge: 1ª exibição | D5 | snapshot `null` → saudação vazia | unitário `renderToString` |
| Edge: aba oculta | D4 | `visibilitychange` já existente | unitário |
| Edge: madrugada | D1 | faixa noturna 18..23 e 0..4 | unitário domínio |
| Edge: tela pequena | D6 | bloco vertical, `whitespace-nowrap` | quickstart 3.7 |
| US1 / US2 | — | — | `tests/acceptance/dashboard-saudacao.test.tsx` |

### Riscos

- **R1**: dependência do formato `dd/MM/aaaa HH:mm:ss` para extrair a hora. Mitigação: o formato é
  contrato da própria `data-local.ts` (feature 001, FR-002) e é testado; um teste unitário amarra
  `saudacaoDaDataHoraBrasilia(formatarDataHoraBrasilia(x))` aos instantes de limite, e qualquer
  mudança de formato quebra os testes.
- **R2**: alterar o JSX do `RelogioBrasilia` pode quebrar os testes da 001. Mitigação: o `<time>`
  mantém `data-testid`, classes, `aria-label` e `dateTime`; os testes existentes devem passar sem
  edição (critério de aceite da implementação).
- **R3**: o CI (`.github/workflows/`) executa lint, build e test conforme `CLAUDE.md`; nenhuma
  alteração de workflow é necessária.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Nenhuma violação. Tabela não aplicável.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
