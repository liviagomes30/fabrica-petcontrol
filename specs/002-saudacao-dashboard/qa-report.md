# Relatório de QA: 002-saudacao-dashboard

- **Etapa**: E6, teste e aceite (primeira rodada)
- **Branch**: `002-saudacao-dashboard` (base `main`); `git branch --show-current` confirmou `002-saudacao-dashboard`
- **Data**: 2026-11-21
- **Entradas**: `.specify/memory/constitution.md`, `spec.md` (US1, US2, FR-001..009, SC-001..006), `plan.md`, `tasks.md`, `review-report.md` (E5, aprovado com ressalvas), `notes/e4-roteiro-manual.md`, `quickstart.md`
- **Ambiente**: local, jsdom com Vitest 3.2.7 e Testing Library; relógio falso; mock das Server Actions do dashboard; sem Supabase real; sem leitura de `.env.local`; sem navegador real

## Parecer

**Aprovado com ressalvas.**

- Nenhum defeito Crítico, Alto ou Médio foi encontrado.
- Nenhum teste falhou na execução final: 138 de 138 aprovados em todas as suítes.
- Ressalva: 8 itens do roteiro manual (T020) dependem de navegador real e do ambiente do humano e não foram verificados por agente. Estão listados na seção 6 como risco para o humano.

---

## 1. Plano de testes e rastreabilidade

Os testes automatizados ficam em `petcontrol-next/tests/`. A lógica de domínio (`lib/domain/data-local.ts`) é coberta pelos testes unitários do Desenvolvedor; a lista abaixo considera os testes de aceite (QA), que são a verificação independente desta rodada. Os testes unitários da feature (`tests/unit/lib/domain/data-local.test.ts` e `tests/unit/dashboard/saudacao-dashboard.test.tsx`) foram executados junto na suíte completa.

| Requisito | Caso de teste (`tests/acceptance/dashboard-saudacao.test.tsx`) | Situação |
|---|---|---|
| US1 cenário 1 (Bom dia 05:00–11:59) | `US1 ... cenário 1` (05:00:00 e 11:59:59 de Brasília) | Aprovado |
| US1 cenário 2 (Boa tarde 12:00–17:59) | `US1 ... cenário 2` (12:00:00 e 17:59:59) | Aprovado |
| US1 cenário 3 (Boa noite 18:00–04:59) | `US1 ... cenário 3` (18:00:00, 00:00:00, 04:59:59) | Aprovado |
| US1 cenário 4 (fuso do dispositivo) | `US1 ... cenário 4` com `Asia/Tokyo` e `America/New_York` (prova de que o fuso do dispositivo mudou antes da asserção) | Aprovado |
| US2 cenário 1 (11:59:59 → 12:00:00) | `US2 ... cenário 1`: 999 ms sem mudança, 1000 ms com mudança simultânea do relógio e da saudação, mesmo nó DOM | Aprovado |
| US2 cenário 2 (17:59:59 → 18:00:00) | `US2 ... cenário 2` | Aprovado |
| US2 cenário 3 (04:59:59 → 05:00:00) | `US2 ... cenário 3` | Aprovado |
| FR-001 (abaixo da data/hora) | `US1 ... cenário 1/2` (irmão imediatamente seguinte do `<time>`); `Integração na página do dashboard` (`DashboardPage` renderizada) | Aprovado |
| FR-002 (exatamente um dos três textos) | Coberto pelos cenários de US1 e pela varredura SC-001 (texto exato comparado com a tabela) | Aprovado |
| FR-003 (hora de Brasília) | `US1 ... cenário 4`; `SC-004` (dois fusos) | Aprovado |
| FR-004 (faixas e meia-noite) | `SC-002` (seis limites); `cobre as 24 horas` (tabela literal de 24 horas) | Aprovado |
| FR-005 (atualização sem recarregar) | `US2` (mesmo nó DOM antes e depois da virada) | Aprovado |
| FR-006 (coerência com a hora exibida) | `SC-001 ... 48 h, em intervalos de 15 min` (192 instantes; hora lida do relógio, saudação comparada com a tabela literal) | Aprovado |
| FR-007 (apenas informativa) | `FR-007 ... não dispara rede nem escrita durante 5 minutos`; inspeção estática do componente (sem `fetch`, `"use server"`, `_actions`, `supabase`, storage) | Aprovado |
| FR-008 (somente área autenticada) | `FR-008`: só `dashboard/page.tsx` importa o componente; o layout `(dashboard)` mantém `getUser()` e `redirect("/login")` | Aprovado (estrutural); redirecionamento real não verificado (ver seção 6) |
| FR-009 / SC-005 (contraste) | `FR-009 / SC-005`: `text-gray-700` sobre `bg-white` e sobre `bg-gray-50`, razão calculada a partir dos tokens do Tailwind (OKLCH → luminância WCAG) | Aprovado (cálculo sobre tokens; ver seção 6) |
| SC-001 (100% das aberturas) | Varredura de 192 instantes e tabela de 24 horas | Aprovado |
| SC-002 (seis limites) | `SC-002 - seis limites de faixa` (04:59:59, 05:00:00, 11:59:59, 12:00:00, 17:59:59, 18:00:00) | Aprovado |
| SC-003 (até 1 s após o relógio) | `US2`: a mudança ocorre no tique do relógio, não depois | Aprovado |
| SC-004 (dois fusos) | `SC-004` com `Asia/Tokyo` e `America/New_York` nos limites 11:59:59, 12:00:00 e 18:00:00 | Aprovado |
| SC-006 (localização em até 3 s) | `saudação aparece já na primeira renderização no cliente` (sem temporizador); a localização visual em 3 s não é automatizável | Parcial (ver seção 6) |
| Edge: 1ª exibição | `1ª exibição: o HTML do servidor não traz saudação e a hidratação não gera aviso` (`renderToString` + `hydrateRoot`, sem `console.error`) | Aprovado |
| Edge: aba em segundo plano | `aba em segundo plano: ao voltar, relógio e saudação estão corretos de imediato` (11:59:50 → 12:30:00) | Aprovado |
| Edge: telas pequenas | `tela pequena (estrutural)`: `whitespace-nowrap`, saudação como irmão do relógio em coluna | Aprovado (estrutural; visual não verificado) |

Os cenários de US1 e US2 usam horários com deslocamento explícito `-03:00`. Não há horário de verão em Brasília desde 17/02/2019, então o deslocamento é fixo.

---

## 2. Testes automatizados criados ou alterados nesta rodada

- **Alterado**: `petcontrol-next/tests/acceptance/dashboard-saudacao.test.tsx`. A versão inicial do Desenvolvedor (8 testes) foi revisada e assumida pelo QA. Foi reescrita para cobrir um teste por cenário de US1 (1 a 4) e US2 (1 a 3), SC-001 (varredura), SC-002 (seis limites), SC-004 (dois fusos), edge cases, FR-007 a FR-009 e integração com `DashboardPage`. Total: 30 testes.
- **Correção do próprio QA durante a execução**: a primeira execução do arquivo reescrito teve 1 falha, causada por um erro do próprio teste (horário escrito como 14:59:50 em vez de 11:59:50 em Brasília). Corrigido no teste; o código de produção não foi alterado.
- **Não alterados**: `tests/unit/...`, `tests/acceptance/dashboard-data-hora.test.tsx` (feature 001). Verificado com `git diff --quiet`.
- **Não alterado**: qualquer arquivo de produção.

---

## 3. Execução

| # | Comando | Código de saída | Resultado |
|---|---|---|---|
| 0 | `git switch 002-saudacao-dashboard` e `git branch --show-current` | 0 | `002-saudacao-dashboard` |
| 1 | `npm --prefix petcontrol-next run test` (linha de base antes da reescrita do aceite) | 0 | 5 arquivos; 116 aprovados, 0 reprovados |
| 2 | `npx vitest run tests/acceptance/dashboard-saudacao.test.tsx` (primeira execução do aceite reescrito) | 1 | 29 aprovados, 1 reprovado (erro do teste, corrigido; ver seção 2) |
| 3 | `npm --prefix petcontrol-next run test` (suíte completa, final) | 0 | 5 arquivos; **138 aprovados, 0 reprovados** |
| 4 | `npm --prefix petcontrol-next run test:coverage` | 0 | 138 aprovados; `lib/domain/data-local.ts` com 100% de linhas, funções, ramos e instruções |
| 5 | `npm --prefix petcontrol-next run lint` | 0 | sem erros nem avisos |
| 6 | `npm --prefix petcontrol-next run build` | 0 | build concluído; rotas `/dashboard`, `/` e demais geradas |

Observação sobre a etapa 6: o build imprime um aviso `DYNAMIC_SERVER_USAGE` para a rota `/produtos` (uso de `cookies` em renderização estática). Não derruba o build (código 0) e a rota é do módulo de produtos, fora do escopo da 002. Não foi verificado se o aviso já existia na `main`.

Totais de testes na execução final: 138 executados, 138 aprovados, 0 reprovados. Cobertura: 100% de linhas e funções em `lib/domain/data-local.ts` (exigido pelo CI).

---

## 4. Defeitos

**Nenhum defeito aberto.** Nenhum comportamento divergente da spec foi observado nos testes automatizados. Não há defeito Crítico, Alto, Médio ou Baixo em aberto para a feature 002.

Observações não classificadas como defeito (para registro e para a descrição do PR):

1. **Atributo `dateTime` do `<time>`** (`RelogioBrasilia.tsx`, linha 60): chama `agora()` uma segunda vez no render, fora do texto exibido. Origem na feature 001; não afeta a saudação (FR-006) porque ela deriva do mesmo texto formatado que o relógio. Observação para o backlog, sem ação nesta feature.
2. **Testes de aceite não substituem o navegador**: o ambiente é jsdom. Contraste e layout são verificados sobre tokens e classes, não sobre estilos computados do navegador.

---

## 5. Requisitos não funcionais

- **Segurança básica**: a feature só exibe texto derivado do relógio. Sem entrada do usuário, rede, Server Action, escrita ou armazenamento local. Verificado por teste estático e por teste de rede (`fetch` espionado durante 5 minutos sem chamadas).
- **Desempenho**: não há temporizador novo; a saudação reutiliza o tique de 1 s existente. O teste de aba oculta e o de temporizador único (`vi.getTimerCount()`, coberto na revisão E5) confirmam ausência de vazamento.
- **Acessibilidade**: `text-gray-700` atinge 10,3:1 sobre `bg-white` e cerca de 9,9:1 sobre `bg-gray-50`, acima de 4,5:1 (SC-005). Não foi medido em navegador.
- **Usabilidade**: a saudação aparece no primeiro render do cliente e fica abaixo do relógio (FR-001). A localização visual em 3 s depende de inspeção humana.

---

## 6. Itens sem verificação automatizada (riscos para o humano)

Estes itens do `quickstart.md` (seção 3, roteiro manual T020) não foram executados com navegador real. Foram cobertos de forma parcial ou estrutural quando possível.

| Item | Cobertura pelo agente | Risco residual |
|---|---|---|
| 3.1 Abrir o dashboard e localizar a saudação em até 3 s | Renderização da `DashboardPage` em jsdom e posição relativa ao relógio | Visual real e tempo de localização não verificados |
| 3.3 Recarregar sem flash de saudação errada | SSR sem saudação, hidratação sem aviso e linha vazia antes da hora | Flash visual no navegador real não observado |
| 3.4 Trocar o fuso do sistema operacional (Tóquio, Nova York) | Testes com `process.env.TZ` (efeito comprovado pelo `getHours()` do dispositivo) | Troca real do SO não feita |
| 3.5 Relógio do sistema em 11:59:50 com a aba aberta | Viradas com relógio falso (999 ms e 1000 ms) | Temporizador real do navegador não observado |
| 3.6 Contraste no DevTools | Cálculo WCAG sobre tokens | Estilo computado não lido no navegador |
| 3.7 Largura de 360 px | Estrutura e classes (`whitespace-nowrap`, `flex-col`) | Quebra de layout real não observada |
| 3.8 Aba oculta por minutos | Evento `visibilitychange` com relógio falso | Comportamento real de congelamento de temporizador não observado |
| 3.9 Logout e redirecionamento a `/login` | Inspeção estática do `layout.tsx` (`getUser()` e `redirect("/login")`) | Fluxo real com Supabase não executado (proibido pelas regras de QA) |

Recomendação ao humano: executar o roteiro manual 3.1 a 3.9 no navegador com o voluntário de teste antes do merge (Checkpoint 2). Os itens de maior risco são 3.7 (layout em 360 px) e 3.9 (redirecionamento real).

---

## 7. Arquivos criados ou alterados nesta rodada

- `petcontrol-next/tests/acceptance/dashboard-saudacao.test.tsx` (alterado; revisão para o Revisor de Código)
- `specs/002-saudacao-dashboard/qa-report.md` (criado)
