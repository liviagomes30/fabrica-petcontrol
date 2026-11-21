# Research: Data e hora atuais no dashboard

**Feature**: `001-dashboard-data-hora-atual` | **Fase**: 0 | **Data**: 2026-11-21

Decisões técnicas tomadas pelo Arquiteto. As decisões de requisito ratificadas (FR-001..FR-007,
SC-001..SC-005, formato `dd/MM/aaaa HH:mm:ss`, fuso fixo `America/Sao_Paulo`, atualização a cada
segundo, referência = relógio do dispositivo convertido) não são reabertas aqui.

Não restam itens `NEEDS CLARIFICATION`.

---

## D1. Onde fica a lógica de data e hora (ponto único)

- **Decision**: Estender `petcontrol-next/lib/domain/data-local.ts` com:
  - a constante `FUSO_BRASILIA = "America/Sao_Paulo"`;
  - `agora(): Date`, único ponto do código novo que lê o relógio do dispositivo;
  - `formatarDataHoraBrasilia(instante: Date): string`, função pura que devolve exatamente
    `dd/MM/aaaa HH:mm:ss` no fuso `America/Sao_Paulo`;
  - `msAteProximoSegundo(instante: Date): number`, função pura usada para alinhar o tique do
    relógio à virada de segundo.
  As funções existentes (`hojeLocal`, `dataParaISOLocal`) não mudam.
- **Rationale**: a constituição (Princípio VIII) exige que código novo de data e hora use o helper de
  `lib/domain/data-local.ts`, e a spec (Assumptions) cita o "ponto único de lógica de data local".
  Funções puras recebendo `Date` são triviais de testar sem fake timers. O arquivo já existe em
  `lib/domain/`, então não há abstração nova.
- **Alternatives considered**:
  - Lógica dentro do componente: rejeitada, viola o Princípio VIII e dificulta o teste.
  - Novo arquivo `lib/domain/relogio.ts`: rejeitado; dividiria a lógica de data em dois pontos.
  - Biblioteca `date-fns-tz`/`dayjs`: rejeitada; `Intl` nativo resolve sem dependência nova.

## D2. Formatação no fuso fixo

- **Decision**: `Intl.DateTimeFormat("pt-BR", { timeZone: FUSO_BRASILIA, day: "2-digit",
  month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
  hourCycle: "h23" })`, montando a string a partir de `formatToParts()` como
  `${day}/${month}/${year} ${hour}:${minute}:${second}`. A instância do formatador é criada uma vez
  no módulo (reuso entre chamadas).
- **Rationale**: `Intl` com `timeZone` usa a base IANA do runtime (Node e navegadores modernos), que
  aplica o deslocamento vigente do fuso, inclusive horário de verão caso volte a existir (Edge Case).
  Montar a partir de `formatToParts` garante o formato exato do FR-002 independentemente de
  variações do ICU (vírgula ou não entre data e hora no `format()` de cada runtime).
  `hourCycle: "h23"` evita `24:00:00` em alguns runtimes.
- **Alternatives considered**:
  - `toLocaleString("pt-BR", { timeZone })`: separador entre data e hora varia por versão de ICU
    (`", "` vs `" "`), o que quebraria testes e o formato exigido.
  - Deslocamento fixo de -3h sobre UTC: rejeitado, falha se o horário de verão voltar.
  - `getHours()` etc. do `Date`: usam o fuso do dispositivo, viola FR-003.

## D3. Componente cliente e primeira exibição sem horário errado (hidratação)

- **Decision**: Client Component `RelogioBrasilia` em
  `petcontrol-next/app/(dashboard)/dashboard/_components/RelogioBrasilia.tsx`, lendo o valor com
  `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)`:
  - `getServerSnapshot` devolve `null`; o servidor e a hidratação renderizam um marcador neutro de
    mesma largura (`--/--/---- --:--:--`), sem nenhuma hora;
  - logo após hidratar, o React lê `getSnapshot` (string formatada do segundo atual, guardada no
    store) e re-renderiza com o horário do dispositivo convertido.
  O store é pequeno e local ao arquivo do componente (criado por uma fábrica para ser testável).
- **Rationale**: o horário depende do relógio do dispositivo (referência da spec); renderizar a hora
  do servidor causaria hydration mismatch e poderia mostrar por um instante um horário diferente do
  dispositivo, contrariando o Edge Case "primeira exibição". `useSyncExternalStore` com snapshot de
  servidor é o mecanismo oficial do React 19 para valores só do cliente, não gera aviso de
  hidratação e evita `setState` dentro de `useEffect` (regra `react-hooks/set-state-in-effect` do
  `eslint-config-next` 16, que quebraria o lint). Como o snapshot é uma string, comparações de
  igualdade são estáveis.
- **Alternatives considered**:
  - Renderizar a hora do servidor com `suppressHydrationWarning`: mostra hora do relógio do servidor
    (não a referência da spec) até o primeiro tique; rejeitada.
  - `useState` + `useEffect` com `setState` inicial: funciona, mas conflita com a regra de lint do
    React Compiler/hooks e causa render extra; rejeitada.
  - `next/dynamic` com `ssr: false`: não é permitido em Server Components no App Router e
    adicionaria indireção; rejeitada.

## D4. Atualização a cada segundo sem deriva e com aba em segundo plano

- **Decision**: no `subscribe`, agendar `setTimeout` para `msAteProximoSegundo(agora())`; a cada
  disparo, recalcular a string a partir de `agora()` (nunca incrementar um contador), notificar os
  ouvintes e reagendar. Ouvir `document` `visibilitychange`: ao voltar a `visible`, recalcular e
  notificar imediatamente e reagendar. `unsubscribe` limpa o timeout e o listener.
- **Rationale**: recalcular a partir do relógio elimina deriva acumulada (SC-004: dentro de 1 s após
  5 min). Alinhar à virada do segundo mantém a diferença sempre abaixo de 1 s (SC-001) e faz a
  virada 23:59:59 -> 00:00:00 acontecer no instante certo (US2 cenário 2). Navegadores limitam
  timers em abas ocultas; o `visibilitychange` corrige o valor de imediato ao voltar (Edge Case).
- **Alternatives considered**:
  - `setInterval(1000)` puro: acumula atraso e pode "pular" segundos visualmente; rejeitada.
  - `requestAnimationFrame`: custo de 60 execuções/s para mudar 1 vez/s; rejeitada.

## D5. Cor vermelha e contraste (FR-004, SC-005)

- **Decision**: classe Tailwind `text-red-700` (Tailwind 4: `oklch(50.5% 0.213 27.518)`, cerca de
  `#c10007`), com `font-semibold` e `tabular-nums`.
- **Rationale**: o fundo da área autenticada é `bg-gray-50` (layout do grupo `(dashboard)`) e os
  cartões são brancos; `red-700` dá contraste aproximado de 6:1 sobre ambos, acima de 4,5:1 com
  folga. `red-600` fica perto do limite (cerca de 4,6:1 sobre `gray-50`). O dashboard já usa a
  família `red` nos badges de urgência ("vermelho de destaque já usado pelo sistema").
  `tabular-nums` evita que o texto "dance" a cada segundo.
- **Tema escuro**: `globals.css` define variáveis `.dark`, mas não há `ThemeProvider` montado e o
  dashboard usa cores fixas claras (`bg-white`, `text-gray-900`); portanto não existe tema escuro
  efetivo. Não se adiciona variante `dark:` (seria código sem uso, Princípio VIII). Se um tema
  escuro for ativado no futuro, a cor deve ser revista (registrado como pendência P2 abaixo).
- **Alternatives considered**: token `text-destructive` (`oklch(0.577 0.245 27.325)`): contraste
  próximo do limite sobre `gray-50` e semântica de erro; rejeitado.

## D6. Posição, layout responsivo e acessibilidade

- **Decision**: inserir o componente no cabeçalho existente de `dashboard/page.tsx`, à direita do
  título em telas `sm+` e abaixo dele em telas pequenas (`flex flex-col sm:flex-row
  sm:items-center sm:justify-between gap-2`). Marcação: `<time dateTime={ISO}>` com rótulo
  acessível "Data e hora atuais (horário de Brasília)" e `aria-live="off"` (padrão) para leitores de
  tela não anunciarem a cada segundo. `whitespace-nowrap` impede quebra no meio da hora.
- **Rationale**: o cabeçalho fica visível sem rolagem no desktop (Assumption) e o voluntário o vê
  primeiro (SC-003). Nenhum outro bloco do dashboard muda (FR-006).
- **Alternatives considered**: colocar no `DashboardNav` (compartilhado por todos os módulos):
  ampliaria o escopo para todas as telas; a spec pede o dashboard; rejeitada.

## D7. Autenticação e efeitos colaterais (FR-006, FR-007)

- **Decision**: nenhuma Server Action, rota, tabela ou migração nova. O componente só lê o relógio do
  dispositivo. A proteção existente (layout `(dashboard)` com `getUser()` + `middleware.ts`) continua
  sendo o que restringe a tela.
- **Rationale**: o relógio não toca dados; os Princípios II, III e VII não se aplicam.

## D8. Framework de testes

- **Decision**: Vitest (última versão estável compatível com Node 20 no momento da instalação,
  registrada no `package-lock.json`) com ambiente `jsdom`, `@testing-library/react` e `@testing-library/dom`,
  `@vitejs/plugin-react` e `@vitest/coverage-v8`. Arquivo `petcontrol-next/vitest.config.mts` com
  alias `@` -> raiz de `petcontrol-next` (equivalente ao `paths` do `tsconfig.json`, sem
  dependência extra), `include: ["tests/**/*.test.{ts,tsx}"]`, imports explícitos de `vitest`
  (sem `globals`, para não mexer em `types` do `tsconfig`). Scripts novos no `package.json`:
  - `"test": "vitest run"`
  - `"test:coverage": "vitest run --coverage"` (limite de 100% de linhas e funções para
    `lib/domain/data-local.ts`, configurado em `coverage.thresholds`).
- **Rationale**: Vitest é a opção recomendada pela documentação do Next.js para testes unitários,
  roda TS/TSX nativamente via Vite/esbuild, tem fake timers (`vi.useFakeTimers`, `vi.setSystemTime`)
  e é rápido. Dependências novas justificadas (constituição, Stack): todas são `devDependencies`,
  não entram no bundle.
- **Alternatives considered**:
  - Jest + `next/jest`: configuração mais pesada (SWC transform, ESM) e mais lenta; rejeitada.
  - `node:test`: sem ambiente DOM nem integração com Testing Library; rejeitada.
  - Playwright para aceite: exigiria navegador e login real no Supabase (proibido pela
    constituição, Princípio IV); rejeitada. Aceite automatizado roda em jsdom; contraste e
    verificação visual ficam no `quickstart.md` como roteiro manual.
  - `@testing-library/jest-dom`: dispensável (asserções com `textContent`/`className`); rejeitada
    para manter o mínimo de dependências.

## D9. Estratégia de teste de fuso e tempo

- **Decision**:
  - Domínio: instantes UTC fixos -> string esperada, incluindo virada de dia
    (`2026-11-16T02:59:59Z` -> `15/11/2026 23:59:59`; `2026-11-16T03:00:00Z` -> `16/11/2026 00:00:00`)
    e horário de verão histórico (`2018-11-04T02:59:59Z` -> `03/11/2018 23:59:59`;
    `2018-11-04T03:00:00Z` -> `04/11/2018 01:00:00`), que prova o uso da base IANA.
  - Independência do fuso do dispositivo (SC-002): repetir as asserções com `process.env.TZ`
    alterado para ao menos `Asia/Tokyo` e `America/New_York` (o Node aplica a troca de `TZ` em
    tempo de execução), restaurando o valor ao final.
  - Componente: `vi.useFakeTimers()` + `vi.setSystemTime()`, `render`, `act(() =>
    vi.advanceTimersByTime(...))` para tique de 1 s, 5 min (SC-004) e virada de dia; disparo de
    `visibilitychange`; `renderToString` para provar que o HTML do servidor não contém hora.
- **Rationale**: cobre FR-002..FR-005 e SC-001, SC-002, SC-004 de forma determinística.

## D10. Variáveis de ambiente e dados de teste

- **Decision**: a feature não usa variáveis de ambiente novas. Os testes não importam
  `lib/supabase/*` nem a `page.tsx` (que chama Server Actions); testam `data-local.ts` e
  `RelogioBrasilia.tsx` isolados, portanto não precisam de mocks do Supabase nem de
  `NEXT_PUBLIC_SUPABASE_*`. Banco: não aplicável (sem migração, sem dados de teste).

## D11. Diretórios de teste

- **Decision**:
  - Testes unitários (Desenvolvedor): `petcontrol-next/tests/unit/`, espelhando o caminho do código
    (`tests/unit/lib/domain/data-local.test.ts`,
    `tests/unit/dashboard/relogio-brasilia.test.tsx`).
  - Testes de aceite (QA): `petcontrol-next/tests/acceptance/`
    (`tests/acceptance/dashboard-data-hora.test.tsx`), um bloco por cenário de aceite de US1/US2.
- **Rationale**: pastas separadas deixam claro o dono de cada teste e ficam fora de `app/` (não viram
  rotas nem entram no bundle).

---

## Pendências registradas (não bloqueiam o plano)

- **P1 (processo/CI)**: o workflow de CI em `.github/workflows/` roda lint e build, mas não roda
  `test`. A constituição proíbe alterar `.github/workflows/` sem pedido explícito; incluir
  `npm --prefix petcontrol-next run test` no CI fica para decisão do humano/orquestrador.
- **P2 (tema escuro)**: SC-005 menciona tema escuro "se existir"; hoje não existe tema escuro ativo
  (D5). Se for ativado, revisar a cor do relógio.
- **P3 (contexto do agente)**: o Spec Kit deste repositório não contém o script
  `update-agent-context` em `.specify/scripts/powershell/`; o contexto do agente (`CLAUDE.md`) não
  foi atualizado automaticamente. As informações de stack desta feature (Vitest, comando `test`)
  devem ser levadas ao `CLAUDE.md` por quem tiver permissão, se o orquestrador desejar.
- **Lacunas de requisito**: nenhuma identificada.
