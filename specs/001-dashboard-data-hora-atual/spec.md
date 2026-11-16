# Feature Specification: Data e hora atuais no dashboard

**Feature Branch**: `001-dashboard-data-hora-atual`

**Created**: 2026-11-15

**Status**: Draft

**Input**: User description: "Na tela do dashboard, mostrar a data e hora atuais no formato pt-BR, em vermelho, no fuso America/Sao_Paulo."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver data e hora atuais no dashboard (Priority: P1)

O voluntário da ONG autenticado abre o dashboard e vê, em local visível da tela, a data e a hora atuais do horário de Brasília, escritas no padrão brasileiro e em cor vermelha.

**Why this priority**: É o objetivo central da demanda: dar ao voluntário a referência de data e hora corretas sem sair da tela principal, evitando erros em registros que dependem do dia (tratamentos, agenda, adoções).

**Independent Test**: Abrir o dashboard autenticado e comparar o texto exibido com um relógio de referência no horário de Brasília; conferir o formato dd/MM/aaaa HH:mm:ss e a cor vermelha.

**Acceptance Scenarios**:

1. **Given** um voluntário autenticado, **When** abre o dashboard, **Then** vê a data e a hora atuais no formato brasileiro (dia/mês/ano e hora de 24 horas com minutos e segundos), por exemplo `15/11/2026 14:35:07`.
2. **Given** o dashboard aberto, **When** o texto de data e hora é exibido, **Then** ele aparece em vermelho, legível sobre o fundo da tela.
3. **Given** o dispositivo do usuário configurado em outro fuso horário, **When** abre o dashboard, **Then** a data e a hora exibidas continuam sendo as do fuso America/Sao_Paulo.

---

### User Story 2 - Manter o horário atualizado enquanto a tela está aberta (Priority: P2)

Com o dashboard aberto por tempo prolongado, a hora exibida acompanha o tempo real, sem que o voluntário precise recarregar a página.

**Why this priority**: Um horário parado induz a erro; porém o valor básico da P1 já existe sem a atualização contínua.

**Independent Test**: Manter o dashboard aberto por 1 minuto e verificar que os segundos avançam e o horário continua coincidindo com o relógio de referência.

**Acceptance Scenarios**:

1. **Given** o dashboard aberto, **When** passa 1 segundo, **Then** o horário exibido avança para o novo segundo.
2. **Given** o dashboard aberto durante a virada do dia (23:59:59 para 00:00:00), **When** o horário muda, **Then** a data exibida passa para o dia seguinte.

---

### Edge Cases

- Dispositivo com relógio ou fuso incorretos: a exibição deve seguir o fuso America/Sao_Paulo, e não o fuso do dispositivo.
- Horário de verão: caso o fuso volte a adotá-lo, a hora exibida deve refletir o deslocamento vigente do fuso America/Sao_Paulo.
- Primeira exibição da tela: não deve aparecer horário incorreto ou diferente do real (por exemplo, hora de outro fuso) antes de corrigir para o valor certo.
- Telas pequenas (celular): o texto deve permanecer visível e sem quebrar o layout do dashboard.
- Dashboard aberto em aba em segundo plano: ao voltar à aba, o horário exibido deve estar correto de imediato.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O dashboard MUST exibir a data e a hora atuais em um local visível da tela.
- **FR-002**: A data e a hora MUST seguir o padrão pt-BR: data como dia/mês/ano (dd/MM/aaaa) e hora no formato de 24 horas com minutos e segundos (HH:mm:ss).
- **FR-003**: A data e a hora MUST ser sempre calculadas no fuso America/Sao_Paulo, independentemente do fuso configurado no dispositivo do usuário.
- **FR-004**: O texto de data e hora MUST ser exibido na cor vermelha, com contraste suficiente para leitura sobre o fundo da tela.
- **FR-005**: O horário exibido MUST ser atualizado automaticamente a cada segundo enquanto o dashboard estiver aberto, sem recarregar a página.
- **FR-006**: A exibição MUST ser apenas informativa e não deve alterar nenhum dado do sistema nem as demais informações do dashboard.
- **FR-007**: A exibição MUST estar disponível apenas dentro da área autenticada do dashboard, mantendo o acesso atual à tela.

### Key Entities

Não há entidades de dados: a funcionalidade apenas exibe o instante atual e não persiste informação.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% das aberturas do dashboard, a data e a hora exibidas diferem em no máximo 1 segundo do horário oficial de Brasília.
- **SC-002**: O horário exibido está correto para o fuso America/Sao_Paulo mesmo quando o dispositivo está configurado em outro fuso (verificado com ao menos dois fusos diferentes).
- **SC-003**: Um voluntário localiza a data e a hora na tela em até 3 segundos após abrir o dashboard.
- **SC-004**: Após 5 minutos com o dashboard aberto, o horário exibido continua dentro de 1 segundo do horário de referência.
- **SC-005**: O texto atende a razão de contraste mínima de 4,5:1 contra o fundo em tema claro (e em tema escuro, se existir).

## Assumptions

- A funcionalidade vale para todos os voluntários que acessam o dashboard; não há restrição por perfil.
- O formato exato é dd/MM/aaaa HH:mm:ss, com hora em 24 horas; fuso e idioma são fixos e não configuráveis pelo usuário.
- A posição exata na tela (por exemplo, cabeçalho ou topo do conteúdo) fica a critério do projeto de interface, desde que visível sem rolagem em telas de desktop.
- O tom de vermelho exato não é definido; deve ser um vermelho legível, preferencialmente o de destaque já usado pelo sistema, respeitado o contraste mínimo.
- A hora de referência é o relógio do dispositivo corrigido para o fuso America/Sao_Paulo; não é exigida sincronização com servidor de horário.
- Atualização a cada segundo (com segundos exibidos) é adotada por ser a leitura natural de "hora atual"; fora de escopo: alarmes, calendário, outros fusos e alteração do restante do dashboard.
- Alinha-se à constituição do projeto: datas e horas tratadas por um ponto único de lógica de data local, a ser detalhado no plano.
