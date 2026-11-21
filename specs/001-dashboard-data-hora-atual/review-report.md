# Relatório de Revisão de Código: 001-dashboard-data-hora-atual

- **Etapa**: E5, primeira rodada
- **Branch**: `001-dashboard-data-hora-atual`
- **Intervalo revisado**: `git diff main...HEAD` (commits 753a0b6..8837eb6), sem exame linha a linha do `package-lock.json`
- **Data**: 2026-11-21

## Verificações executadas

| Comando | Resultado |
|---------|-----------|
| `npm --prefix petcontrol-next run test` | saída 0; 2 arquivos, 27 testes passando |
| `npm --prefix petcontrol-next run test:coverage` | saída 0; `data-local.ts` com 100% de linhas, funções, ramos e instruções |
| `npm --prefix petcontrol-next run lint` | saída 0; nenhum aviso |
| `npm --prefix petcontrol-next run build` | saída 0; as mensagens `DYNAMIC_SERVER_USAGE` são de rotas que já existiam (`/produtos` etc.) e não vêm desta feature |

## Conformidade com a constituição

| Princípio | Situação | Evidência |
|-----------|----------|-----------|
| I. Vertical slices | Conforme | O componente fica em `app/(dashboard)/dashboard/_components/` e só `dashboard/page.tsx` o importa. A lógica pura fica em `lib/domain/data-local.ts`. Nenhum import de outro módulo. |
| II. Server Actions protegidas | Não aplicável, conforme | Nenhuma Server Action criada ou alterada. O componente não chama rede nem actions. |
| III. Validação Zod | Não aplicável | Não há entrada do cliente. |
| VI. Segredos | Conforme | Nenhum segredo no diff. `.env*` está no `.gitignore` (com exceção de `.env.example`). `/coverage` também está ignorado. |
| VII. Banco por migração | Não aplicável | Nenhuma mudança de schema nem acesso a banco. Os testes não importam `lib/supabase/*`. |
| VIII. Simplicidade e legibilidade | Conforme (ver B3) | Nenhum `any` nem `as` no código novo. `new Date()` de produção aparece só em `agora()` (`data-local.ts:22`). Os comentários explicam o porquê. O store local se justifica em research D3. |

## Requisitos funcionais

| Requisito | Situação | Evidência |
|-----------|----------|-----------|
| FR-001 | Atende | `<RelogioBrasilia />` fica no cabeçalho de `page.tsx`, com layout `flex-col` em telas pequenas e `sm:flex-row` a partir de `sm`. |
| FR-002 | Atende | `formatarDataHoraBrasilia` usa `formatToParts` com `hourCycle: "h23"`. Há testes de formato e da virada de meia-noite. |
| FR-003 | Atende | `timeZone: "America/Sao_Paulo"` está fixo no formatador. Há testes com troca de `TZ` (ver B2) e com o horário de verão de 2018. |
| FR-004 | Atende | Usa `text-red-700`, como ratificado no plano. |
| FR-005 | Atende | O tique fica alinhado com `msAteProximoSegundo(agora())`, e cada disparo relê o relógio, então não há deriva. O teste de 5 minutos e o teste de alinhamento em 750 ms passam. |
| FR-006 | Atende | O componente só lê o relógio e não escreve nada. Os demais blocos do dashboard não mudaram (o diff em `page.tsx` só envolve o cabeçalho). |
| FR-007 | Atende | O componente é renderizado só por `dashboard/page.tsx`, sob `app/(dashboard)/layout.tsx`, que redireciona quem não está autenticado. |

### Pontos específicos

- **Tique sem deriva**: `agendar()` calcula cada espera a partir de `agora()`. Se um temporizador disparar cedo, o snapshot fica igual, o React descarta a renderização e o próximo agendamento usa uma espera curta. O mecanismo se corrige sozinho.
- **Limpeza**: a função devolvida por `subscribe` limpa o temporizador e remove o mesmo listener que foi registrado, e o teste confirma isso pela referência. O handler de `visibilitychange` limpa o temporizador anterior antes de reagendar, e o teste confirma que fica um único timer.
- **Hidratação**: `getServerSnapshot` devolve `null`, então o servidor e a hidratação renderizam o marcador e `dateTime` fica `undefined` nos dois casos, sem diferença. A hora real só aparece depois da hidratação. O teste com `renderToString` cobre a saída do servidor (ver S1 sobre a hidratação em si).
- **Testes**: são determinísticos (fake timers com `setSystemTime`), restauram `TZ`, timers, mocks e `visibilityState`, e não dependem de banco nem de rede.

## Apontamentos (ordenados por severidade)

Nenhum apontamento é Crítico, e não há violação da constituição. Nenhum apontamento bloqueia.

### B1. Baixo: `dateTime` vem de uma segunda leitura do relógio e pode divergir do texto (não bloqueante)

- **Arquivo/linha**: `petcontrol-next/app/(dashboard)/dashboard/_components/RelogioBrasilia.tsx:58` (relacionado a `:42`)
- **Problema**: o texto sai de `getSnapshot` (`formatarDataHoraBrasilia(agora())`), mas o atributo `dateTime` vem de outra chamada, `agora().toISOString()`, feita no render. Se as duas leituras caírem em lados diferentes da virada do segundo, o atributo e o texto ficam com um segundo de diferença (por exemplo, texto `14:35:07` e `dateTime` `...17:35:08.000Z`). Além disso, o atributo traz milissegundos (`.250Z`) que o texto não mostra. Também, `getSnapshot` muda de valor sem notificação sempre que o segundo vira entre duas chamadas. Isso é raro e não afeta o funcionamento, mas no modo de desenvolvimento pode gerar o aviso do React sobre o resultado de `getSnapshot` não estar em cache.
- **Impacto**: inconsistência pequena na semântica do `<time>`, que leitores de tela e ferramentas podem usar. A exibição continua correta.
- **Correção sugerida**: faça o snapshot ser o segundo inteiro corrente, como número (`Math.floor(agora().getTime() / 1000)`, ou `null` no servidor). No render, derive o texto e o `dateTime` desse mesmo valor: `const instante = new Date(segundo * 1000)` dentro de um helper de `data-local.ts` (por exemplo, `instanteDoSegundo(segundo)`), para manter o Princípio VIII. Depois ajuste o teste de `datetime` se o formato mudar. Alternativa mínima: truncar os milissegundos do `dateTime`.

### B2. Baixo: os testes de troca de fuso não confirmam que a troca teve efeito (não bloqueante)

- **Arquivo/linha**: `petcontrol-next/tests/unit/lib/domain/data-local.test.ts:36-44` e `petcontrol-next/tests/unit/dashboard/relogio-brasilia.test.tsx:40-49`
- **Problema**: os testes fazem `process.env.TZ = tz` e verificam que o texto não mudou. Se o runtime ignorar a troca dinâmica de `TZ` (risco R2 do plano, no Windows), os testes continuam passando sem exercitar nada. Assim, eles podem dar falso positivo como guarda de regressão de FR-003 e SC-002: se alguém remover `timeZone` do formatador numa máquina onde a troca não pegou, nenhum teste falha.
- **Impacto**: menos confiança na verificação de FR-003 em ambientes onde `TZ` não muda em execução. O código atual está correto.
- **Correção sugerida**: logo após definir `TZ`, acrescente uma asserção que prove que a troca valeu, por exemplo `expect(new Date("2026-11-15T17:35:07Z").getHours()).toBe(tz === "Asia/Tokyo" ? 2 : 12)` ou `expect(new Date(...).getTimezoneOffset()).not.toBe(180)`. Assim o teste falha de forma explícita se o ambiente não aplicar o fuso.

### B3. Baixo: arquivos `.gitkeep` sem uso (não bloqueante)

- **Arquivo/linha**: `petcontrol-next/tests/unit/dashboard/.gitkeep` e `petcontrol-next/tests/unit/lib/domain/.gitkeep`
- **Problema**: as duas pastas já têm arquivos de teste versionados, então os `.gitkeep` criados no Setup ficaram sem função. O Princípio VIII pede que arquivos sem uso não sejam entregues.
- **Impacto**: só ruído no repositório.
- **Correção sugerida**: remover os dois arquivos.

### S1. Sugestão: falta teste da hidratação sem aviso de mismatch (não bloqueante)

- **Arquivo/linha**: `petcontrol-next/tests/unit/dashboard/relogio-brasilia.test.tsx:26-30`
- **Problema**: o contrato de UI (`contracts/relogio-brasilia-ui.md`, linha do caso de primeira exibição) exige "sem aviso de hydration mismatch". O teste atual só verifica o HTML do servidor. A garantia vem do desenho com `useSyncExternalStore` e `getServerSnapshot`, que está correto, mas nenhum teste a verifica.
- **Correção sugerida**: incluir, aqui ou no teste de aceite do QA, um caso que monte o HTML de `renderToString` num `container` e chame `hydrateRoot` dentro de `act`, com um `vi.spyOn(console, "error")`. O teste deve afirmar que não houve chamada de erro e que, depois da hidratação, o texto passa do marcador para `15/11/2026 14:35:07`.

## Pendências conhecidas (registradas, não bloqueiam)

- **P1**: o CI (`.github/workflows/`) não roda `test`, e essa pasta não pode ser alterada sem pedido explícito.
- **P2**: o projeto não tem tema escuro, então SC-005 foi verificado só no tema claro.
- **P3**: o script `update-agent-context` não existe no Spec Kit local.

## Parecer

**Aprovado com ressalvas.** Não há apontamento Crítico nem violação da constituição. Os apontamentos B1, B2, B3 e S1 não bloqueiam e devem constar na descrição do PR, ou ser corrigidos pelo Desenvolvedor se o orquestrador decidir.

---

## Revisão dos testes de aceite do QA

- **Etapa**: E6, revisão dos testes criados pelo QA (primeira rodada)
- **Escopo**: somente `petcontrol-next/tests/acceptance/dashboard-data-hora.test.tsx` (commit `dc6aeac`). O código de produção não foi revisado de novo.
- **Data**: 2026-11-21

### Verificações executadas

| Comando | Resultado |
|---------|-----------|
| `npm --prefix petcontrol-next run test` | saída 0; 3 arquivos, 56 testes passando (29 de aceite) |
| `npm --prefix petcontrol-next run lint` | saída 0; nenhum aviso |

### Avaliação por critério

| Critério | Situação | Evidência |
|----------|----------|-----------|
| Determinismo | Conforme | Relógio falso em todos os testes (`beforeEach`, linhas 112-115). Nenhum teste depende do relógio real, do fuso da máquina nem da ordem de execução. Antes de verificar o texto, os testes de fuso conferem que a troca de `TZ` teve efeito (linha 156), o que resolve o B2 no aceite. |
| Banco e rede reais | Conforme, com ressalva (T2) | `dashboard.actions` é mockado por inteiro (linhas 25-43). `dashboard.types` não importa Supabase. Nada lê `.env.local`. O espião de `fetch` deixa a implementação real ativa (ver T2). |
| `any` e `as` | Conforme | Não há `any`. Os únicos `as` são `as const` (linhas 27 e 40), que estreitam o literal `success: true` para o tipo `ActionResult` e não silenciam o compilador. |
| Código morto | Conforme | Todos os imports e helpers são usados. Há duas asserções redundantes, apontadas em T5. |
| Pertinência dos asserts | Conforme, com ressalvas (T1, T3) | O oráculo `esperadoBrasilia` (linhas 58-65) calcula o horário por UTC-3 sem usar `Intl`, ou seja, é independente do mecanismo da implementação. Os testes de US1, US2, SC-001, SC-002, SC-004, do horário de verão e da aba oculta verificam valores concretos e falhariam com uma implementação errada. O de SC-005 calcula o contraste a partir dos tokens instalados do Tailwind. |
| Limpeza de estado global | Conforme, com ressalva (T4) | `afterEach` (linhas 117-127) faz `cleanup`, restaura `TZ`, remove o `visibilityState` sobrescrito, volta aos timers reais e chama `restoreAllMocks`. No Vitest 3.2.7 instalado, `restoreAllMocks` também zera os `vi.fn` do `vi.mock` (`@vitest/spy`: `mockRestore` chama `mockReset`), e é por isso que `toHaveBeenCalledTimes(1)` (linhas 312-313) passa. |
| Princípio IV | Conforme | Os testes são automatizados, entram no comando `npm --prefix petcontrol-next run test` e usam mocks do Supabase, sem acesso ao banco real. |

### Apontamentos (ordenados por severidade)

Nenhum apontamento é Crítico e não há violação da constituição. Nenhum bloqueia.

#### T1. Baixo: o teste de SC-003 identifica o cabeçalho pela posição no DOM e pode dar falso positivo

- **Arquivo/linha**: `petcontrol-next/tests/acceptance/dashboard-data-hora.test.tsx:189-191` (o mesmo padrão aparece em `:293`)
- **Problema**: o cabeçalho é obtido como `titulo.parentElement?.parentElement`. Se o `<div>` que envolve o `<h1>` for removido numa refatoração, o "avô" do título passa a ser o contêiner da página inteira (`container mx-auto`). Nesse caso, `contains(relogio)` continua verdadeiro mesmo com o relógio no rodapé, e o teste de SC-003 passa sem garantir nada. O teste da linha 294 (`flex-col`) pegaria essa mudança, mas por acaso, e não por desenho. Além disso, `expect(cabecalho).toBeDefined()` (linha 190) aceita `null` e não verifica nada.
- **Impacto**: o teste perde força como guarda de regressão de FR-001 e SC-003.
- **Correção sugerida**: verificar que o relógio e o bloco do título são irmãos no mesmo contêiner, com `expect(relogio.parentElement).toBe(titulo.parentElement?.parentElement)`, ou usar `relogio.closest("div")?.contains(titulo)`. Trocar `toBeDefined()` por `not.toBeNull()` ou remover essa linha.

#### T2. Baixo: o espião de `fetch` não bloqueia a rede real

- **Arquivo/linha**: `petcontrol-next/tests/acceptance/dashboard-data-hora.test.tsx:301`
- **Problema**: `vi.spyOn(globalThis, "fetch")` sem implementação mantém o `fetch` real. Se uma regressão fizer o componente chamar a rede, o teste falha, mas antes disso faz uma requisição de verdade. Isso contraria a regra de que os testes não usam rede.
- **Impacto**: risco de acesso à rede real apenas no cenário de regressão. Hoje nenhum `fetch` é chamado.
- **Correção sugerida**: `vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("rede bloqueada no teste"))`, mantendo a asserção `not.toHaveBeenCalled()`.

#### T3. Sugestão: o teste de hidratação só detecta o mismatch se o React o registrar via `console.error`

- **Arquivo/linha**: `petcontrol-next/tests/acceptance/dashboard-data-hora.test.tsx:255-261`
- **Problema**: no React 19, quando a hidratação falha por diferença de texto, o React renderiza de novo no cliente e informa o erro por `onRecoverableError`, que por padrão usa `reportError`. Esse erro só chega ao espião de `console.error` se o console virtual do jsdom o repassar. Se não repassar, uma regressão que mostre a hora já no servidor passaria no teste, porque depois da renderização no cliente o texto final fica correto (linha 262).
- **Correção sugerida**: passar um espião explícito, `hydrateRoot(container, <RelogioBrasilia />, { onRecoverableError: erroRecuperavel })`, e afirmar `expect(erroRecuperavel).not.toHaveBeenCalled()`, além do espião de `console.error`.

#### T4. Sugestão: a limpeza manual do teste de hidratação e a contagem das actions dependem de detalhes do ambiente

- **Arquivo/linha**: `petcontrol-next/tests/acceptance/dashboard-data-hora.test.tsx:250-269` e `:312-313`
- **Problema**: (a) o `container` anexado ao `document.body` e a raiz hidratada só são desmontados se todas as asserções passarem. Se uma falhar, eles ficam no DOM, porque o `cleanup()` da Testing Library não os conhece, e podem afetar os `getByTestId` dos testes seguintes (erro de "múltiplos elementos"). (b) A contagem `toHaveBeenCalledTimes(1)` depende de `restoreAllMocks` zerar os `vi.fn` do `vi.mock`, o que vale no Vitest 3 mas deixa de valer no Vitest 4. Numa atualização, o teste falharia porque `DashboardPage` também é chamada nos testes das linhas 184 e 289.
- **Correção sugerida**: (a) envolver as asserções em `try { ... } finally { act(() => raiz?.unmount()); container.remove(); }`. (b) Chamar `vi.clearAllMocks()` no `beforeEach`, ou `vi.mocked(buscarEstatisticasDashboard).mockClear()` no início do teste.

#### T5. Sugestão: asserções redundantes

- **Arquivo/linha**: `petcontrol-next/tests/acceptance/dashboard-data-hora.test.tsx:236` e `:245`
- **Problema**: a linha 236 repete, com o oráculo, o valor literal já conferido na linha 235. Na linha 245, a regex já está coberta pela da linha 246, que é mais ampla.
- **Correção sugerida**: remover uma das duas asserções em cada caso. Não muda a cobertura.

### Observação sobre as inspeções estáticas

Os testes de FR-006 e FR-007 (linhas 316-343) buscam strings no código-fonte, como `getUser()` e `redirect("/login")`. Isso é aceitável como evidência estrutural, já que não há teste de navegador autenticado (qa-report, seção 5). Eles podem falhar sem que haja regressão se a guarda do layout for reescrita, por exemplo para usar `requireUser()`. Nesse caso, devem ser atualizados junto com a mudança. Isto não é um apontamento.

### Parecer dos testes de aceite

**Aprovado com ressalvas.** Os testes são determinísticos, não acessam o banco nem a rede reais nas execuções atuais, não usam `any` nem `as` para silenciar o compilador, restauram o estado global e verificam os critérios da spec com oráculo independente. T1 e T2 (Baixos) e T3 a T5 (Sugestões) não bloqueiam e devem constar na descrição do PR, ou ser corrigidos pelo QA se o orquestrador decidir.
