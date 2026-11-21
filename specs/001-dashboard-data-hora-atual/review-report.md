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
