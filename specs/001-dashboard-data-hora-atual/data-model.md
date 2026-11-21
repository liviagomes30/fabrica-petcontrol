# Data Model: Data e hora atuais no dashboard

**Feature**: `001-dashboard-data-hora-atual` | **Fase**: 1

## Persistência

Nenhuma. A spec (Key Entities) declara que não há entidades de dados. Não há tabela, coluna,
migração em `petcontrol-next/supabase/migrations/` nem alteração em `lib/database.types.ts`.

## Valores em memória (cliente)

### InstanteAtual (não persistido)

| Campo | Tipo | Origem | Regra |
|-------|------|--------|-------|
| `instante` | `Date` | `agora()` em `lib/domain/data-local.ts` (relógio do dispositivo) | Lido a cada tique; nunca incrementado manualmente (sem deriva). |
| `texto` | `string` | `formatarDataHoraBrasilia(instante)` | Exatamente `dd/MM/aaaa HH:mm:ss`, 19 caracteres, regex `^\d{2}/\d{2}/\d{4} \d{2}:\d{2}:\d{2}$`, hora 00-23, fuso `America/Sao_Paulo` (FR-002, FR-003). |
| `iso` | `string` | `instante.toISOString()` | Valor do atributo `dateTime` do elemento `<time>` (acessibilidade). |

### Estados do componente `RelogioBrasilia`

```text
[Servidor/Hidratação] --(hidratou)--> [Exibindo texto]
       marcador "--/--/---- --:--:--"         |
                                               +--(virada de segundo)--> [Exibindo texto] (novo valor)
                                               +--(aba volta a visível)--> [Exibindo texto] (recalculado)
                                               +--(desmontagem)--> timers e listeners removidos
```

- No estado de servidor/hidratação nenhuma hora é exibida (Edge Case "primeira exibição").
- Não há estado de erro: `Intl` com `America/Sao_Paulo` é suportado pelos runtimes-alvo.
