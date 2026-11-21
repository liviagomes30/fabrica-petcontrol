# Relatório de QA (E6): Data e hora atuais no dashboard

- **Feature**: `001-dashboard-data-hora-atual`
- **Branch**: `001-dashboard-data-hora-atual` (verificada com `git branch --show-current`)
- **Etapa**: E6, teste e aceite
- **Data**: 2026-11-21
- **Parecer**: **aprovado com ressalvas**

Não há defeito Crítico, Alto ou Médio, nem teste falhando. As ressalvas são: (a) cinco itens que exigem navegador autenticado ou layout real, não verificáveis neste ambiente e listados na seção 5; (b) os apontamentos B1, B2 e B3 e as pendências P1 a P3 da revisão E5, todos de severidade Baixa ou pendências já registradas.

---

## 1. Plano de testes e rastreabilidade

Escopo: US1 (P1), US2 (P2), os edge cases da spec, FR-001 a FR-007, SC-001 a SC-005. Métodos: **A** automatizado de aceite (`petcontrol-next/tests/acceptance/dashboard-data-hora.test.tsx`), **U** teste unitário do Desenvolvedor (existente, executado na suíte), **I** inspeção estática (leitura de código ou de arquivos, feita por teste ou por revisão), **N** não verificável neste ambiente (navegador autenticado ou layout real).

Oráculo usado nos testes de aceite: horário de Brasília calculado como UTC-3 fixo (o Brasil não adota horário de verão desde 17/02/2019) e, para 2018/2019, UTC-2 no intervalo do horário de verão histórico. O oráculo é independente de `Intl`, que é o mecanismo usado pela implementação.

### 1.1 Matriz de rastreabilidade

| Requisito / cenário | Método | Caso de teste (describe > it) | Resultado |
|---|---|---|---|
| US1-1 (formato dd/MM/aaaa HH:mm:ss, exemplo 15/11/2026 14:35:07) | A | US1 > cenário 1 | Aprovado |
| US1-2 (vermelho, legível) | A | US1 > cenário 2 (`text-red-700`, `<time>`) | Aprovado |
| US1-2 contraste (SC-005) | A | SC-005 > razão >= 4,5:1 sobre gray-50 e branco | Aprovado (ver 1.3) |
| US1-3 e SC-002 (dispositivo em outro fuso) | A | US1 > cenário 3 (Tóquio, Nova York, Londres, Auckland, Kolkata; prova o efeito da troca de TZ) | Aprovado |
| SC-001 (coincide com o relógio convertido) | A | SC-001/SC-002 (5 instantes x 2 fusos, incluindo 31/12 e 29/02/2028) | Aprovado |
| SC-003 (localizar em até 3 s) | A (estrutural) + N (visual) | US1 > SC-003: relógio no mesmo cabeçalho do título | Estrutural aprovado; visual N |
| US2-1 (avança a cada segundo) | A | US2 > cenário 1 (1 s e 2 s) | Aprovado |
| US2-2 (virada de dia) | A | US2 > cenário 2 (15/11 23:59:59 para 16/11 00:00:00) | Aprovado |
| SC-004 (5 min, dentro de 1 s) | A | US2 > SC-004 (300 tiques, comparação a cada segundo) | Aprovado |
| FR-005 (sem recarregar) | A + U | US2 cenário 1; unitário de `subscribe` | Aprovado |
| Edge: aba em segundo plano | A + U | US2 > aba em segundo plano (`visibilitychange`) | Aprovado |
| Edge: 1ª exibição sem hora errada | A | Edge > HTML do servidor com marcador; hidratação sem `console.error` e com hora correta após hidratar | Aprovado |
| Edge: horário de verão | A + U | Edge > 04/11/2018 (pula de 00:00 para 01:00); 01/12/2018 (UTC-2) | Aprovado |
| Edge: tela pequena (360 px) | A (estrutural) + N (visual) | Edge > tela pequena: `whitespace-nowrap`, `flex-col` e `sm:flex-row` | Estrutural aprovado; visual N |
| FR-001 (local visível) | A (estrutural) | SC-003 (dentro do cabeçalho do `page.tsx`) | Aprovado |
| FR-002 (formato pt-BR) | A + U | US1 > cenário 1; U de `formatarDataHoraBrasilia` | Aprovado |
| FR-003 (fuso fixo America/Sao_Paulo) | A + U | US1 > cenário 3; U com `TZ` trocado | Aprovado |
| FR-004 (vermelho, contraste) | A + U | US1 > cenário 2; SC-005 | Aprovado |
| FR-006 (apenas informativo, sem rede/escrita) | A + I | FR-006: sem `fetch` em 5 min; `buscarEstatisticasDashboard` chamada 1 vez em 5 min; componente sem `fetch`, `"use server"`, `_actions`, Supabase nem storage | Aprovado |
| FR-007 (só na área autenticada) | I | FR-007: só `dashboard/page.tsx` importa o componente; `layout.tsx` do grupo `(dashboard)` exige `getUser()` e redireciona para `/login` | Aprovado |
| Limpeza (sem timers ou listeners) | U | Unitário: `vi.getTimerCount() === 0` após `unmount` | Aprovado |

### 1.2 Cobertura de cenários de exceção e valores-limite

- Valores-limite de segundo: 0 ms (espera de 1000 ms), 250 ms (750 ms), 999 ms (1 ms) e 1 ms (999 ms), cobertos em U.
- Virada de dia, mês e ano: 15/11 para 16/11 (A), 31/12/2026 23:59:59 (SC-001, A), 29/02/2028 (SC-001, A).
- Entradas inválidas: não se aplicam. A feature não recebe entrada do usuário (spec, Key Entities).
- Dispositivo com relógio ou fuso incorretos: a exibição segue o fuso fixo, conforme os testes de troca de `TZ` (A e U).

### 1.3 Cálculo do contraste (SC-005)

Método: os valores são lidos de `node_modules/tailwindcss/theme.css` (Tailwind 4.1.18, versão instalada), convertidos de OKLCH para sRGB linear via OKLab e avaliados pela fórmula de luminância relativa WCAG 2.x. O teste automatizado faz o mesmo cálculo.

| Par | Valor | Luminância relativa | Razão | Mínimo | Situação |
|---|---|---|---|---|---|
| `text-red-700` (`oklch(50.5% 0.213 27.518)`, aprox. `#c10007`) sobre `bg-gray-50` (`oklch(98.5% 0.002 247.839)`, fundo do layout) | | 0,1135 | **6,15:1** | 4,5:1 | Aprovado |
| `text-red-700` sobre `bg-white` (`#fff`, cartões) | | 0,1135 | **6,42:1** | 4,5:1 | Aprovado |

Tema escuro: não se aplica. Não há `ThemeProvider` do `next-themes` na árvore de `app/`, `lib/` ou `components/` (só o componente `sonner.tsx` importa `useTheme`), então o tema claro é o único ativo. Confirma a pendência P2.

---

## 2. Testes automatizados criados

Arquivo criado: `petcontrol-next/tests/acceptance/dashboard-data-hora.test.tsx` (29 testes).

- Usa Vitest e Testing Library, com relógio falso (`vi.useFakeTimers`, `vi.setSystemTime`) e troca controlada de `TZ`.
- Mocka as actions de `dashboard.actions` por `vi.mock`. Não acessa Supabase real, não lê `.env.local`, não faz rede.
- Não altera nenhum teste unitário do Desenvolvedor. Não foi necessário ajustar `vitest.config.mts`: o `include` já cobre `tests/**/*.test.{ts,tsx}`.
- A raiz da inspeção estática é `process.cwd()`, com guarda que falha cedo se o teste não rodar em `petcontrol-next/`. Os scripts npm já executam a partir dessa pasta.

Nenhum arquivo de produção foi alterado. Nenhum arquivo do Spec Kit foi alterado.

---

## 3. Relatório de execução

Todos os comandos foram executados na branch `001-dashboard-data-hora-atual`, a partir da raiz do repositório.

| # | Comando | Código de saída | Resultado |
|---|---------|-----------------|-----------|
| 0 | `git switch 001-dashboard-data-hora-atual` e `git branch --show-current` | 0 | Branch confirmada |
| 1 | Linha de base, antes de criar o aceite: `npm --prefix petcontrol-next run test` | 0 | 2 arquivos, **27 aprovados** |
| 2 | `npx vitest run tests/acceptance` (após criar o aceite, antes do ajuste do import) | 1 | Falha de infraestrutura: `import.meta.url` não é `file:` no jsdom. Corrigido trocando para `process.cwd()` com guarda |
| 3 | `npx vitest run tests/acceptance` (após a correção) | 0 | 1 arquivo, **29 aprovados** |
| 4 | `npm --prefix petcontrol-next run test` (suíte completa, final) | 0 | 3 arquivos, **56 aprovados, 0 reprovados** (16 domínio + 11 componente unitário + 29 aceite) |
| 5 | `npm --prefix petcontrol-next run test:coverage` | 0 | 56 aprovados. `lib/domain/data-local.ts`: **100%** de linhas, funções, ramos e instruções |
| 6 | `npm --prefix petcontrol-next run lint` | 0 | Sem erros nem avisos |
| 7 | `npm --prefix petcontrol-next run build` | 0 | Compilação e checagem de tipos OK. As mensagens `DYNAMIC_SERVER_USAGE` no console são as mesmas registradas no E5 (rotas e actions pré-existentes que usam cookies), não vêm desta feature |

Totais finais: **56 executados, 56 aprovados, 0 reprovados**. Cobertura de 100% no módulo de domínio alterado. A cobertura de `RelogioBrasilia.tsx` não entra no threshold, que foi definido só para `data-local.ts`.

Observação sobre o item 2: a falha foi do próprio arquivo de teste de aceite, não de código de produção. Foi corrigida no teste.

---

## 4. Defeitos

Nenhum defeito Crítico, Alto ou Médio foi reproduzido. Nenhum teste falha. Os itens abaixo são observações do QA sobre os apontamentos da revisão E5, com o tratamento dado neste ciclo.

| ID | Título | Severidade | Requisito | Situação |
|---|---|---|---|---|
| B1 (E5) | `dateTime` calculado em segunda leitura do relógio | **Baixa** | FR-002 (sem impacto no texto exibido) | Não reproduzido com impacto nos critérios. A janela de divergência é de milissegundos e não é reproduzível com relógio falso. O texto mostrado está correto em todos os testes. Ressalva mantida para o PR. |
| B2 (E5) | Testes de troca de `TZ` não confirmavam o efeito | **Baixa** | FR-003, SC-002 | Mitigado no aceite: o teste de cada fuso verifica `getTimezoneOffset()` diferente de 180 antes de checar o texto. Confirmado no Node 22: a troca de `TZ` em runtime tem efeito. Os testes unitários do Desenvolvedor não foram alterados. |
| B3 (E5) | Arquivos `.gitkeep` sem uso | **Baixa** | Princípio VIII (conformidade) | Não corrigido, pois está fora do escopo do QA (são arquivos do Desenvolvedor). Persistem `tests/unit/dashboard/.gitkeep` e `tests/unit/lib/domain/.gitkeep`. Recomenda-se remover antes do merge. |
| S1 (E5) | Falta teste de hidratação sem aviso de mismatch | Sugestão (resolvido) | Edge 1ª exibição | Coberto pelo teste de aceite "hidratação não gera aviso de mismatch e troca o marcador pela hora correta". |
| P1 | CI não roda `test` | Pendência | Processo | Registrada, não resolvida. `.github/workflows/` não foi alterado. |
| P2 | Sem tema escuro | Pendência | SC-005 | Registrada. Confirmado: sem `ThemeProvider`, só tema claro. |
| P3 | `update-agent-context` ausente | Pendência | Processo | Registrada, não resolvida. |

Defeitos bloqueantes (Crítica ou Alta, ou teste falhando): **nenhum**.

---

## 5. Itens não verificáveis neste ambiente

Estes itens exigem navegador com sessão autenticada, Supabase real ou inspeção visual. Não foram executados e não recebem resultado inventado. Cada um tem cobertura parcial por teste automatizado, indicada abaixo.

| Item (quickstart) | Motivo | Cobertura automatizada |
|---|---|---|
| 3.1 Login e abertura de `/dashboard` com usuário de teste | Exige Supabase real e sessão. Não é permitido usar o banco real. | Layout de guarda verificado por inspeção (FR-007). |
| 3.2 / SC-003 Localizar o relógio em até 3 s, sem rolagem | Posição visual e tempo de leitura humana. | Estrutural: o relógio está no mesmo cabeçalho do título. |
| 3.3 SC-001 comparação com o relógio do sistema no navegador | Depende do relógio real do navegador. | Oráculo de UTC-3 com relógio falso, em 5 instantes e 2 fusos. |
| 3.4 SC-002 override de fuso no DevTools | Depende do DevTools do navegador. | Troca de `TZ` em 5 fusos, com verificação de offset. |
| 3.7 Layout em 360 px sem quebra | Layout real não é calculado em jsdom. | Estrutural: `whitespace-nowrap`, `flex-col`, `sm:flex-row`. |
| 3.6 Conferência do contraste com ferramenta de navegador | Ferramenta externa. | Cálculo WCAG reproduzido em teste (6,15:1 e 6,42:1). |
| 3.8 Aba Network sem requisições a cada segundo | Inspeção do navegador. | Teste com `fetch` espião e contagem das actions. |

Recomendação ao humano: executar os itens da tabela no navegador antes do merge (Checkpoint 2), especialmente 360 px e o comportamento real de aba oculta.

---

## 6. Arquivos de teste criados ou alterados (para revisão do Revisor)

- `petcontrol-next/tests/acceptance/dashboard-data-hora.test.tsx` (criado; 29 testes de aceite)
- `specs/001-dashboard-data-hora-atual/qa-report.md` (criado; este relatório)

Nenhum outro arquivo foi criado ou alterado por esta etapa. `specs/001-dashboard-data-hora-atual/state.json` já estava modificado antes do início desta etapa e não foi tocado.

---

## 7. Parecer

**Aprovado com ressalvas.**

- Critérios de aceite de US1 e US2 e edge cases cobertos por 29 testes de aceite, todos aprovados.
- SC-001, SC-002, SC-004 e SC-005 verificados por teste automatizado (cálculo WCAG para SC-005).
- SC-003 e o layout de 360 px verificados apenas de forma estrutural; a verificação visual cabe ao humano (seção 5).
- Suíte completa: 56 aprovados, 0 reprovados. Cobertura de 100% no domínio. Lint e build com código 0.
- Ressalvas não bloqueantes: B1, B2 (mitigado no aceite), B3 e pendências P1 a P3.
