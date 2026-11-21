# Research: Saudação por período do dia no dashboard

Fase 0 do plano. Não restam itens `NEEDS CLARIFICATION`: as faixas, o fuso, o ritmo de atualização
e o caráter informativo foram ratificados na spec aprovada; o estilo visual é livre desde que o
contraste seja >= 4,5:1.

## D1. Regra das faixas como função pura sobre a hora inteira

- **Decision**: em `lib/domain/data-local.ts`, exportar
  `type Saudacao = "Bom dia" | "Boa tarde" | "Boa noite"` e `saudacaoPorHora(hora: number): Saudacao`
  com: `5 <= hora < 12` → "Bom dia"; `12 <= hora < 18` → "Boa tarde"; caso contrário → "Boa noite".
- **Rationale**: como os limites caem em horas cheias (05:00:00, 12:00:00, 18:00:00), basta a hora
  0..23; minutos e segundos não mudam a faixa. A função é trivialmente testável nas 24 horas e
  cobre a faixa que atravessa a meia-noite sem caso especial (o `else`). O tipo literal garante
  FR-002 no typecheck.
- **Alternatives considered**: (a) comparar minutos do dia ou `HH:mm:ss` como string: mais
  complexo sem ganho, pois os limites são horas cheias; (b) tabela/configuração de faixas: abstração
  sem demanda (Princípio VIII; faixas não configuráveis pela spec); (c) colocar a regra no
  componente: viola a preferência por lógica pura em `lib/domain/` e dificulta o teste.

## D2. Hora de Brasília obtida do texto já formatado, não de nova conversão de fuso

- **Decision**: exportar `saudacaoDaDataHoraBrasilia(texto: string): Saudacao`, que lê `HH` nas
  posições 11–12 do texto `dd/MM/aaaa HH:mm:ss` produzido por `formatarDataHoraBrasilia` e delega a
  `saudacaoPorHora`.
- **Rationale**: o texto exibido pelo relógio já está no fuso `America/Sao_Paulo` (feature 001), e o
  formato é contrato da mesma unidade de domínio. Derivar a saudação desse texto garante que ela
  nunca diverge do horário exibido (FR-006) e herda a independência de fuso do dispositivo (FR-003)
  sem uma segunda chamada a `Intl`.
- **Alternatives considered**: (a) `saudacaoBrasilia(instante: Date)` com novo `Intl.DateTimeFormat`
  só de hora: exigiria um segundo instante ou uma segunda conversão, abrindo margem de divergência
  com o texto; (b) `instante.getHours()`: usa o fuso do dispositivo, viola FR-003; (c) mudar o
  snapshot do relógio para um objeto `{texto, hora}`: `useSyncExternalStore` exige snapshot estável
  por referência, o que obrigaria memoização extra (mais complexidade).

## D3. Renderizar a saudação no próprio `RelogioBrasilia`, a partir do mesmo snapshot

- **Decision**: o componente passa a retornar um bloco vertical (`flex flex-col`, alinhado à
  direita em `sm:` e à esquerda no celular) com o `<time>` existente e, abaixo, um `<p>` com
  `saudacaoDaDataHoraBrasilia(texto)`. `page.tsx` não muda.
- **Rationale**: há uma única fonte de tempo (o snapshot do store) e um único render; saudação e
  relógio são atualizados atomicamente, cumprindo FR-005, FR-006 e SC-003 por construção. Mantém o
  `<time>` com os mesmos atributos, preservando o contrato e os testes da 001 (FR-007).
- **Alternatives considered**: (a) componente `SaudacaoDashboard` separado com outra assinatura do
  store: dois temporizadores e dois `getSnapshot` em momentos distintos podem cruzar a virada de
  segundo em renders diferentes (incoerência possível), além de quebrar o teste da 001 que espera um
  único timer; (b) elevar o estado para um provider/contexto compartilhado: abstração nova sem
  necessidade para um único consumidor; (c) temporizador próprio da saudação: vetado pela spec
  (Assumptions: sem temporizador independente).

## D4. Atualização e aba em segundo plano herdadas do relógio

- **Decision**: nenhum mecanismo novo. O tique alinhado ao segundo e o listener de
  `visibilitychange` já existentes re-renderizam o componente, e a saudação é recalculada no mesmo
  render.
- **Rationale**: atende US2 e o edge case de aba oculta sem código adicional.
- **Alternatives considered**: agendar o próximo limite de faixa (`setTimeout` até 05/12/18 h):
  segunda fonte de tempo, sujeita a deriva e ao congelamento de abas.

## D5. Primeira exibição sem saudação errada

- **Decision**: quando o snapshot é `null` (SSR e hidratação), o `<p>` da saudação é renderizado
  vazio, com altura mínima reservada (`min-h-5`) para não deslocar o layout; nenhum texto de
  saudação aparece antes de haver hora.
- **Rationale**: cumpre o edge case "não deve aparecer saudação incorreta"; o servidor não conhece o
  instante do cliente, e renderizar uma saudação no servidor causaria hydration mismatch.
- **Alternatives considered**: (a) não renderizar o `<p>` até haver hora: provoca salto de layout;
  (b) marcador textual (por exemplo "…"): ruído visual sem valor; (c) calcular no servidor: risco de
  saudação diferente da do cliente e mismatch.

## D6. Estilo e acessibilidade

- **Decision**: `<p data-testid="saudacao-dashboard" class="text-sm font-medium text-gray-700 whitespace-nowrap min-h-5">`.
  Sem `aria-live` (a mudança é informativa e anunciá-la a cada virada seria intrusivo).
- **Rationale**: `text-gray-700` (#374151) sobre `bg-gray-50` (#f9fafb, fundo do layout) e
  `bg-white` tem contraste aproximado de 10:1, acima de 4,5:1 (FR-009, SC-005). Visual discreto,
  subordinado ao relógio vermelho. O projeto não tem tema escuro (nenhuma classe `dark:` no layout
  do dashboard), então a verificação em tema escuro não se aplica.
- **Alternatives considered**: `text-gray-500` (#6b7280): contraste aproximado de 4,6:1 sobre
  `bg-gray-50`, perto do limite; `text-red-700` igual ao relógio: competiria visualmente com a hora.

## D7. Estratégia de testes

- **Decision**:
  - Unitário de domínio (estender `tests/unit/lib/domain/data-local.test.ts`): `saudacaoPorHora`
    para 0..23 (tabela); `saudacaoDaDataHoraBrasilia` com textos de limite (`04:59:59`, `05:00:00`,
    `11:59:59`, `12:00:00`, `17:59:59`, `18:00:00`, `00:00:00`); composição
    `saudacaoDaDataHoraBrasilia(formatarDataHoraBrasilia(instante))` com instantes UTC
    correspondentes aos limites. Mantém 100% de linhas e funções em `data-local.ts`.
  - Unitário de componente (novo `tests/unit/dashboard/saudacao-dashboard.test.tsx`): saudação
    presente e abaixo do `<time>`; texto coerente com a faixa do `<time>`; `TZ` trocado
    (`Asia/Tokyo`, `America/New_York`) não altera a saudação; viradas 11:59:59→12:00:00,
    17:59:59→18:00:00, 04:59:59→05:00:00 com `vi.advanceTimersByTime(1000)` mudando relógio e
    saudação no mesmo `act`; `renderToString` sem nenhuma das três saudações; volta de aba
    (`visibilitychange`) corrige a saudação; ainda um único timer.
  - Aceite (novo `tests/acceptance/dashboard-saudacao.test.tsx`): um teste por cenário de aceite
    US1 (1–4) e US2 (1–3).
  - Os testes existentes da 001 (`relogio-brasilia.test.tsx`, `dashboard-data-hora.test.tsx`)
    devem passar sem edição.
- **Rationale**: cobre FR-002..FR-006 e SC-001..SC-004 de forma determinística, sem rede nem
  Supabase (Princípio IV).
- **Alternatives considered**: testes E2E em navegador real (Playwright): dependência nova e
  ambiente autenticado com Supabase, desproporcional ao escopo; a validação visual fica no
  quickstart.

## Pendências

Nenhuma. O script de atualização de contexto do agente (`update-agent-context`) não existe em
`.specify/scripts/powershell/`; não há arquivo de contexto a atualizar nesta etapa.
