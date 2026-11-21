# Relatório de Revisão de Código: 002-saudacao-dashboard

- **Etapa**: E5, revisão de código (primeira rodada)
- **Branch**: `002-saudacao-dashboard` (base `main`)
- **Intervalo revisado**: `main...HEAD` (commits `40b75e6`..`ba30c8e`, E4 Setup a Polish)
- **Data**: 2026-11-21
- **Arquivos de código revisados**:
  - `petcontrol-next/lib/domain/data-local.ts`
  - `petcontrol-next/app/(dashboard)/dashboard/_components/RelogioBrasilia.tsx`
  - `petcontrol-next/tests/unit/lib/domain/data-local.test.ts` (estendido, como o plano prevê)
  - `petcontrol-next/tests/unit/dashboard/saudacao-dashboard.test.tsx` (novo)
  - `petcontrol-next/tests/acceptance/dashboard-saudacao.test.tsx` (novo)
- **Referências**: `spec.md`, `plan.md`, `tasks.md`, `contracts/saudacao-domain-api.md`, `contracts/saudacao-ui.md`, `notes/e4-roteiro-manual.md`, `.specify/memory/constitution.md`

## Parecer

**Aprovado com ressalvas.** Não há apontamentos Críticos nem violações da constituição. Os quatro apontamentos (todos Baixo ou Sugestão) não bloqueiam e vão para a descrição do PR.

## Verificações realizadas

| Item | Resultado |
|------|-----------|
| Aderência a FR-001..FR-009 | OK. A saudação é o irmão imediatamente seguinte do `<time>` (FR-001); o tipo `Saudacao` restringe aos três textos (FR-002); a hora vem do texto já formatado em `America/Sao_Paulo` (FR-003); as faixas 5-11, 12-17 e 18-4 estão corretas, inclusive nos seis limites (FR-004); a saudação deriva do mesmo snapshot do `useSyncExternalStore`, então muda no mesmo render do relógio (FR-005, FR-006); o `<time>` manteve texto, classes, `aria-label`, `data-testid` e `dateTime` (FR-007); `page.tsx` não mudou e continua sob o layout autenticado (FR-008); `text-gray-700` dá cerca de 10:1 sobre branco e `gray-50` (FR-009). |
| Contratos (`saudacao-domain-api.md`, `saudacao-ui.md`) | OK. As assinaturas e o DOM batem com o contrato, e as exportações anteriores não mudaram. |
| Fonte única de tempo | OK. Nenhum temporizador, listener, assinatura ou leitura de `agora()`/`new Date()` novos. `vi.getTimerCount() === 1` está coberto por teste. |
| Hidratação | OK. `getServerSnapshot` devolve `null`, e com ele o `<p>` fica vazio (`""`) e reserva altura com `min-h-5`, o mesmo que a linha de `text-sm`. O HTML do servidor e o render de hidratação coincidem. Isso é verificado com `renderToString`. |
| Constituição VIII | OK. Modo strict; sem `any` e sem `as` de silenciamento (o único `as const`, no teste, é literal de tupla, não um cast); sem `new Date()` novo no código de produção; sem código morto; os comentários JSDoc dão contexto (entrada em hora de Brasília; dependência do formato `dd/MM/aaaa HH:mm:ss`). |
| Segurança e desempenho | OK. A feature só exibe dados: sem entrada do usuário, rede, Server Action, banco ou segredos. Não há render adicional, porque a saudação usa o ciclo de 1 s que já existia. |
| Testes da feature 001 | OK. `tests/unit/dashboard/relogio-brasilia.test.tsx` e `tests/acceptance/dashboard-data-hora.test.tsx` estão fora do diff (não foram editados). `data-local.test.ts` só recebeu blocos novos no fim (linhas 94 em diante) e dois imports, como o plano prevê (T006/T007); nenhum caso existente mudou. |
| Migrações, `.env` | Não aplicável. Nenhum arquivo de ambiente ou migração foi tocado. |
| Execução | `npm --prefix petcontrol-next run test` saiu com código 0: 5 arquivos, 116 testes passando. |

## Apontamentos (ordenados por severidade)

### 1. [Baixo] Oráculo do teste das 24 horas repete a regra da implementação

- **Arquivo/linha**: `petcontrol-next/tests/unit/lib/domain/data-local.test.ts:94-108`
- **Problema**: o valor esperado de `saudacaoPorHora` para cada hora é calculado no próprio teste, com um ternário equivalente à implementação (`hora >= 5 && hora <= 11 ? ...`). Se a regra das faixas for mal entendida, o mesmo engano vai para os dois lados e o teste continua passando. O risco hoje é baixo, porque os seis limites explícitos em `saudacaoDaDataHoraBrasilia` (linhas 110 em diante) amarram a regra ao contrato.
- **Correção sugerida**: trocar o cálculo por uma tabela literal de 24 entradas (ou por três listas fixas, `[5..11]`, `[12..17]` e `[0..4, 18..23]`, com o texto esperado escrito à mão), seguindo a tabela de `contracts/saudacao-domain-api.md`.

### 2. [Baixo] Testes de aceite escritos pelo Desenvolvedor na E4

- **Arquivo/linha**: `petcontrol-next/tests/acceptance/dashboard-saudacao.test.tsx` (arquivo inteiro, commits `11e14d5` e `51bd0d7`)
- **Problema**: o plano e as tarefas T012/T016 atribuem os testes de aceite ao QA. O arquivo foi criado nos commits da E4, então hoje quem implementou também verificou o aceite. O conteúdo está correto: um teste por cenário de US1 (1 a 4) e de US2 (1 a 3), com fake timers e sem Supabase. Falta só a validação independente prevista no processo.
- **Correção sugerida**: nenhuma alteração de código pelo Desenvolvedor. O QA deve revisar e assumir esse arquivo na etapa de aceite. Fica registrado para o orquestrador.

### 3. [Sugestão] Teste unitário redundante

- **Arquivo/linha**: `petcontrol-next/tests/unit/dashboard/saudacao-dashboard.test.tsx:64-68`
- **Problema**: `"mostra exatamente um dos três textos"` só verifica que o texto está na lista. O `it.each` das linhas 45-55 já confere o texto exato em cada faixa, então esse teste não pega nenhuma falha que os outros deixariam passar.
- **Correção sugerida**: remover o teste ou trocá-lo pela garantia FR-006 do contrato de UI (`saudacao.textContent === saudacaoDaDataHoraBrasilia(relogio.textContent)`). Essa troca dá uma checagem de coerência que não depende de um instante específico.

### 4. [Sugestão] Fatiamento posicional do texto formatado

- **Arquivo/linha**: `petcontrol-next/lib/domain/data-local.ts:61`
- **Problema**: `texto.slice(11, 13)` depende da posição fixa de `HH` em `dd/MM/aaaa HH:mm:ss`. Esse risco foi aceito no plano (R1) e está documentado no JSDoc da linha 59. O teste de composição (`data-local.test.ts`, bloco das linhas 110 em diante) quebra se o formato mudar, então não há defeito atual.
- **Correção sugerida**: nenhuma é obrigatória. Se o formato de `formatarDataHoraBrasilia` mudar no futuro, reavaliar a extração junto com ele.

## Observações sem ação do Desenvolvedor

- O `dateTime={... agora().toISOString()}` do `<time>` (`RelogioBrasilia.tsx:60`) faz uma segunda leitura do relógio no render, mas vem da feature 001 e não foi introduzido aqui. A saudação não depende dele, então FR-006 não é afetado.
- **Pendência T020**: o roteiro manual foi verificado por agente só em parte (`notes/e4-roteiro-manual.md`). Ainda faltam, para o QA ou o humano com navegador: render real e localização em até 3 s (3.1), ausência de flash no carregamento (3.3), troca real do fuso do SO (3.4), ajuste real do relógio do SO (3.5), contraste no DevTools (3.6), emulação de 360 px (3.7), troca real de aba por minutos (3.8) e fluxo de logout/redirecionamento (3.9).

## Revisão dos testes do QA (E6)

- **Escopo**: somente `petcontrol-next/tests/acceptance/dashboard-saudacao.test.tsx`, intervalo `4b89f8b..HEAD` (commit `f1a101d`).
- **Parecer desta rodada**: **aprovado com ressalvas** (nenhum apontamento Crítico; dois Baixos e uma Sugestão, nenhum bloqueante).
- **Execução**: `npm --prefix petcontrol-next run test` saiu com código 0 (5 arquivos, 138 testes, 30 deles neste arquivo).

### Verificações realizadas

- **Cobertura da spec**: US1 cenários 1 a 4 (FR-001 a FR-004, FR-006), US2 cenários 1 a 3 (FR-005, SC-003), SC-001 (varredura de 48 h a cada 15 min, mais as 24 horas), SC-002 (seis limites), SC-004 (Tóquio e Nova York), SC-005/FR-009 (contraste WCAG calculado a partir dos tokens do Tailwind), SC-006, FR-007, FR-008 e os edge cases (SSR/hidratação, aba em segundo plano, tela pequena estrutural). O apontamento 2 da revisão anterior (aceite escrito pelo Desenvolvedor) foi resolvido: o QA reescreveu e assumiu o arquivo.
- **Oráculo**: a saudação esperada vem de uma tabela literal de 24 entradas (`ESPERADA_POR_HORA`, linhas 57-82) e de strings fixas por cenário. Nenhum teste chama `saudacaoDaDataHoraBrasilia` nem repete a regra da implementação, então não há oráculo circular para a saudação.
- **Sensibilidade (os testes falham se o comportamento quebrar)**: o teste da aba em segundo plano (linhas 361-376) só passa se o ouvinte de `visibilitychange` existir, porque `setSystemTime` não dispara os temporizadores falsos. A virada de US2 confere o estado 1 ms antes do tique e no próprio tique, mantendo o mesmo nó DOM. O teste de hidratação detecta divergência: o jsdom 29 não tem `window.reportError`, então o React 19 manda o erro recuperável para `console.error`, que está espionado.
- **Isolamento**: o Supabase não é acessado (as actions do dashboard estão mockadas com `vi.mock`, o componente não as importa e nada lê `.env.local`). `fetch` é espionado no teste de FR-007.
- **Instabilidade**: há fake timers em todos os testes. O `afterEach` restaura `TZ`, a propriedade `visibilityState` sobrescrita na instância de `document`, os timers reais e os spies (`restoreAllMocks`, que no Vitest 3 não afeta os `vi.fn` da factory do `vi.mock`). O componente remove seus próprios ouvintes no `unmount` e o RTL `cleanup()` roda a cada teste. A suíte passou de forma determinística.
- **Testes da 001**: não foram alterados. O intervalo só toca este arquivo, `qa-report.md` e `state.json`.
- **Código morto**: nenhum import ou helper sem uso.

### Apontamentos (ordenados por severidade)

#### E6-1. [Baixo] Teste de hidratação não libera a raiz se uma asserção falhar

- **Arquivo/linha**: `petcontrol-next/tests/acceptance/dashboard-saudacao.test.tsx:337-353`
- **Problema**: o `container` é anexado manualmente a `document.body` e a raiz criada por `hydrateRoot` só é desmontada no fim do teste. Se a asserção da linha 346 ou da 347 falhar, `raiz.unmount()` e `container.remove()` não rodam. O RTL `cleanup()` não conhece esse container, então ele fica no DOM e o ouvinte de `visibilitychange` continua registrado. Os testes seguintes que usam `screen.getByTestId` passam a falhar com "Found multiple elements", o que esconde a falha original atrás de uma cascata.
- **Correção sugerida**: colocar as asserções em `try { ... } finally { act(() => raiz?.unmount()); container.remove(); }`, ou registrar a limpeza em uma variável de módulo que o `afterEach` consome.

#### E6-2. [Baixo] JSDoc incorreto e oráculo de hora que compartilha dependência com a implementação

- **Arquivo/linha**: `petcontrol-next/tests/acceptance/dashboard-saudacao.test.tsx:130-139` (uso na linha 291)
- **Problema**: o JSDoc de `horaBrasilia` diz "Oráculo de texto de `dd/MM/aaaa HH:mm:ss` em Brasília, a partir do instante com -03:00", mas a função devolve apenas a hora (número) e não depende do deslocamento -03:00. Além disso, ela usa `Intl.DateTimeFormat` com `America/Sao_Paulo`, o mesmo mecanismo da implementação. Um erro na base de fusos do ICU (por exemplo, um horário de verão indevido) apareceria nos dois lados. O impacto é pequeno: a saudação continua amarrada à tabela literal, e os demais testes usam horas escritas à mão.
- **Correção sugerida**: corrigir o JSDoc (por exemplo, "Hora (0-23) de Brasília do instante") e, de preferência, calcular a hora de forma independente, já que a premissa do arquivo é UTC-3 fixo: `((instante.getUTCHours() + 21) % 24)`.

#### E6-3. [Sugestão] Testes estruturais e de inspeção estática acoplados à implementação

- **Arquivo/linha**: `petcontrol-next/tests/acceptance/dashboard-saudacao.test.tsx:378-384` (classes `whitespace-nowrap`/`flex-col`), `408-418` (regex sobre o fonte), `431-435` (regex sobre `layout.tsx`) e `464` (leitura de `node_modules/tailwindcss/theme.css`)
- **Problema**: esses testes conferem nomes de classes, trechos de código-fonte e um arquivo interno do Tailwind, não o comportamento observável. Uma refatoração equivalente (outra classe utilitária, `supabase` em comentário, `redirect('/login')` com aspas simples, ou uma mudança no caminho do tema numa atualização do Tailwind) quebra o teste sem regressão real. Na direção contrária, eles não provam o layout real em 360 px, que continua com o humano (T020).
- **Correção sugerida**: nenhuma é obrigatória nesta feature, porque são verificações auxiliares aceitáveis sem navegador. Se ficarem frágeis, troque as regex de `layout.tsx` por um teste que renderize o layout com `getUser` mockado retornando `null` e verifique a chamada a `redirect("/login")`.
