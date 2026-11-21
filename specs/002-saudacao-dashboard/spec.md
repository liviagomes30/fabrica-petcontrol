# Feature Specification: Saudação por período do dia no dashboard

**Feature Branch**: `002-saudacao-dashboard`

**Created**: 2026-11-21

**Status**: Draft

**Input**: User description: "No frontend, abaixo da data/hora, apresentar bom dia, boa tarde ou boa noite, de acordo com o momento do dia."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver a saudação correta abaixo da data e hora (Priority: P1)

O voluntário da ONG autenticado abre o dashboard e vê, logo abaixo da data e hora atuais já exibidas, uma saudação ("Bom dia", "Boa tarde" ou "Boa noite") coerente com o horário de Brasília.

**Why this priority**: É o objetivo central da demanda: tornar a tela principal mais acolhedora e coerente com o momento do dia, usando a mesma referência de horário já exibida.

**Independent Test**: Abrir o dashboard autenticado e conferir que a saudação aparece abaixo da data/hora e corresponde à faixa do horário de Brasília exibido.

**Acceptance Scenarios**:

1. **Given** um voluntário autenticado e o horário de Brasília entre 05:00:00 e 11:59:59, **When** abre o dashboard, **Then** vê "Bom dia" abaixo da data e hora.
2. **Given** o horário de Brasília entre 12:00:00 e 17:59:59, **When** abre o dashboard, **Then** vê "Boa tarde" abaixo da data e hora.
3. **Given** o horário de Brasília entre 18:00:00 e 04:59:59, **When** abre o dashboard, **Then** vê "Boa noite" abaixo da data e hora.
4. **Given** o dispositivo configurado em outro fuso horário, **When** abre o dashboard, **Then** a saudação segue o horário de Brasília, e não o do dispositivo.

---

### User Story 2 - Saudação acompanha a mudança de período sem recarregar (Priority: P2)

Com o dashboard aberto por tempo prolongado, a saudação muda sozinha quando o horário cruza o limite de uma faixa, junto com a atualização do relógio.

**Why this priority**: Uma saudação desatualizada (por exemplo, "Bom dia" à tarde) contradiz o relógio exibido; porém o valor básico da P1 já existe sem a atualização contínua.

**Independent Test**: Com o dashboard aberto próximo de um limite de faixa (por exemplo, 11:59:55), aguardar a virada e verificar que a saudação muda no mesmo instante em que o relógio passa de 11:59:59 para 12:00:00.

**Acceptance Scenarios**:

1. **Given** o dashboard aberto às 11:59:59, **When** o relógio passa para 12:00:00, **Then** a saudação muda de "Bom dia" para "Boa tarde" sem recarregar a página.
2. **Given** o dashboard aberto às 17:59:59, **When** o relógio passa para 18:00:00, **Then** a saudação muda de "Boa tarde" para "Boa noite".
3. **Given** o dashboard aberto às 04:59:59, **When** o relógio passa para 05:00:00, **Then** a saudação muda de "Boa noite" para "Bom dia".

---

### Edge Cases

- Limites exatos das faixas: 05:00:00 é "Bom dia", 12:00:00 é "Boa tarde", 18:00:00 é "Boa noite"; 11:59:59, 17:59:59 e 04:59:59 pertencem à faixa anterior ao limite.
- Madrugada (00:00 a 04:59): a saudação é "Boa noite", pois a faixa noturna atravessa a meia-noite.
- Dispositivo com fuso incorreto: a saudação segue o fuso de Brasília, como o relógio.
- Primeira exibição da tela: não deve aparecer saudação incorreta (de outro fuso ou faixa) antes de corrigir para a certa; enquanto o horário não estiver disponível, a saudação não deve exibir valor errado.
- Dashboard em aba em segundo plano: ao voltar à aba, a saudação deve estar correta de imediato, coerente com o relógio.
- Telas pequenas (celular): a saudação deve permanecer visível, abaixo da data/hora, sem quebrar o layout.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O dashboard MUST exibir uma saudação imediatamente abaixo da data e hora atuais, em local visível da tela.
- **FR-002**: A saudação MUST ser exatamente um dos três textos: "Bom dia", "Boa tarde" ou "Boa noite".
- **FR-003**: A saudação MUST ser determinada pela hora de Brasília (mesma referência de fuso da data/hora do dashboard), independentemente do fuso do dispositivo.
- **FR-004**: A saudação MUST seguir as faixas: "Bom dia" das 05:00:00 às 11:59:59; "Boa tarde" das 12:00:00 às 17:59:59; "Boa noite" das 18:00:00 às 04:59:59 (faixa que atravessa a meia-noite).
- **FR-005**: A saudação MUST ser atualizada automaticamente junto com o relógio, mudando no mesmo instante em que o horário exibido cruza o limite de uma faixa, sem recarregar a página.
- **FR-006**: A saudação MUST ser sempre coerente com o horário exibido na data/hora: nunca MUST mostrar uma faixa diferente da correspondente à hora exibida.
- **FR-007**: A exibição MUST ser apenas informativa, sem alterar dados do sistema nem as demais informações do dashboard, inclusive o relógio já existente.
- **FR-008**: A saudação MUST estar disponível apenas dentro da área autenticada do dashboard, mantendo o acesso atual à tela.
- **FR-009**: A saudação MUST ter contraste suficiente para leitura sobre o fundo da tela.

### Key Entities

Não há entidades de dados: a funcionalidade apenas exibe um texto derivado do instante atual e não persiste informação.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% das aberturas do dashboard, a saudação exibida corresponde à faixa da hora de Brasília exibida na data/hora.
- **SC-002**: Nos seis limites de faixa (04:59:59/05:00:00, 11:59:59/12:00:00, 17:59:59/18:00:00) a saudação é a esperada em 100% dos casos verificados.
- **SC-003**: Com o dashboard aberto durante uma virada de faixa, a saudação muda em até 1 segundo após o relógio exibir o novo horário, sem ação do voluntário.
- **SC-004**: A saudação está correta para o horário de Brasília mesmo com o dispositivo em outro fuso (verificado com ao menos dois fusos diferentes).
- **SC-005**: O texto atende a razão de contraste mínima de 4,5:1 contra o fundo em tema claro (e em tema escuro, se existir).
- **SC-006**: Um voluntário localiza a saudação na tela em até 3 segundos após abrir o dashboard.

## Assumptions

- Feature independente da 001, construída sobre o relógio de data/hora do dashboard já existente; as regras de data/hora da 001 (hora de Brasília, fuso America/Sao_Paulo, atualização a cada segundo, relógio do dispositivo convertido como referência) valem como base e não são reabertas.
- As faixas de horário não constavam na demanda; foi adotada a convenção usual: bom dia 05:00–11:59, boa tarde 12:00–17:59, boa noite 18:00–04:59. Podem ser ajustadas pelo humano na revisão.
- Os textos são fixos em português do Brasil, com inicial maiúscula ("Bom dia", "Boa tarde", "Boa noite"), sem nome do usuário nem outras variações; o idioma não é configurável.
- A saudação vale para todos os voluntários autenticados; não há restrição por perfil.
- O estilo visual (cor, tamanho) não é definido; deve ser legível, discreto e coerente com o visual do relógio existente, respeitado o contraste mínimo.
- A mudança de faixa acompanha o ritmo de atualização do relógio, não havendo temporizador independente que possa divergir da hora exibida.
- Fora de escopo: personalização por usuário, mensagens além das três saudações, outros fusos, alarmes e alteração do restante do dashboard.
- Alinha-se à constituição do projeto: datas e horas tratadas pelo ponto único de lógica de data local (`lib/domain`), a ser detalhado no plano; a entrega inclui testes automatizados.
