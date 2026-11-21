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
