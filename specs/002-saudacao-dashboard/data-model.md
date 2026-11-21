# Data Model: Saudação por período do dia no dashboard

Não há entidades persistidas, tabelas, migrações nem alterações em `lib/database.types.ts`
(spec, Key Entities). O modelo abaixo descreve apenas os valores em memória.

## Valor: `Saudacao`

| Campo | Tipo | Regras |
|-------|------|--------|
| (valor) | `"Bom dia" \| "Boa tarde" \| "Boa noite"` | Exatamente um dos três textos, com inicial maiúscula (FR-002). |

## Regra de derivação: hora de Brasília → `Saudacao`

Entrada: hora inteira `0..23` no fuso `America/Sao_Paulo`, extraída do texto exibido pelo relógio
(`dd/MM/aaaa HH:mm:ss`).

| Faixa de hora (inclusiva) | Intervalo de horário | Saudação |
|---------------------------|----------------------|----------|
| 5..11 | 05:00:00–11:59:59 | Bom dia |
| 12..17 | 12:00:00–17:59:59 | Boa tarde |
| 18..23 e 0..4 | 18:00:00–04:59:59 (atravessa a meia-noite) | Boa noite |

Validação: as três faixas são disjuntas e cobrem as 24 horas; minutos e segundos não influenciam
a faixa porque todos os limites são horas cheias (FR-004).

## Estados de exibição do componente

| Estado | Snapshot do relógio | `<time>` | Saudação |
|--------|---------------------|----------|----------|
| Servidor / hidratação | `null` | marcador `--/--/---- --:--:--` | vazia (espaço reservado) |
| Cliente com hora | `"dd/MM/aaaa HH:mm:ss"` | texto do snapshot | `saudacaoDaDataHoraBrasilia(snapshot)` |

Transição: `null` → texto ocorre uma vez, após a hidratação; depois, cada tique (ou volta de aba)
substitui o texto, e a saudação é recalculada no mesmo render (FR-005, FR-006).
