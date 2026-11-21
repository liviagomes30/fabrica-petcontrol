# Contrato: saudação em `lib/domain/data-local.ts`

Interface pública acrescentada ao módulo de domínio. Todas as exportações existentes (`hojeLocal`,
`dataParaISOLocal`, `FUSO_BRASILIA`, `agora`, `msAteProximoSegundo`, `formatarDataHoraBrasilia`)
permanecem inalteradas.

```ts
export type Saudacao = "Bom dia" | "Boa tarde" | "Boa noite";

/** Pura. Hora inteira 0..23 (Brasília) → saudação da faixa. */
export function saudacaoPorHora(hora: number): Saudacao;

/** Pura. Recebe o texto "dd/MM/aaaa HH:mm:ss" de formatarDataHoraBrasilia e devolve a saudação da hora HH. */
export function saudacaoDaDataHoraBrasilia(texto: string): Saudacao;
```

## Garantias

| Função | Entrada | Saída esperada |
|--------|---------|----------------|
| `saudacaoPorHora` | `0`, `4` | `"Boa noite"` |
| `saudacaoPorHora` | `5`, `11` | `"Bom dia"` |
| `saudacaoPorHora` | `12`, `17` | `"Boa tarde"` |
| `saudacaoPorHora` | `18`, `23` | `"Boa noite"` |
| `saudacaoDaDataHoraBrasilia` | `"21/11/2026 04:59:59"` | `"Boa noite"` |
| `saudacaoDaDataHoraBrasilia` | `"21/11/2026 05:00:00"` | `"Bom dia"` |
| `saudacaoDaDataHoraBrasilia` | `"21/11/2026 11:59:59"` | `"Bom dia"` |
| `saudacaoDaDataHoraBrasilia` | `"21/11/2026 12:00:00"` | `"Boa tarde"` |
| `saudacaoDaDataHoraBrasilia` | `"21/11/2026 17:59:59"` | `"Boa tarde"` |
| `saudacaoDaDataHoraBrasilia` | `"21/11/2026 18:00:00"` | `"Boa noite"` |
| composição com `formatarDataHoraBrasilia` | `new Date("2026-11-21T14:59:59Z")` | `"Bom dia"` (11:59:59 em Brasília) |
| composição com `formatarDataHoraBrasilia` | `new Date("2026-11-21T15:00:00Z")` | `"Boa tarde"` (12:00:00 em Brasília) |
| composição com `formatarDataHoraBrasilia` | `new Date("2026-11-21T07:59:59Z")` | `"Boa noite"` (04:59:59 em Brasília) |
| composição com `formatarDataHoraBrasilia` | `new Date("2026-11-21T08:00:00Z")` | `"Bom dia"` (05:00:00 em Brasília) |

- O resultado não depende de `process.env.TZ` nem do fuso do dispositivo (FR-003): a entrada já
  está em hora de Brasília.
- Entradas fora de `0..23` ou textos fora do formato não são requisito (os valores vêm sempre de
  `formatarDataHoraBrasilia`); nenhuma validação adicional deve ser criada para eles.
- Nenhuma das funções lê o relógio (`agora()`/`new Date()`).
