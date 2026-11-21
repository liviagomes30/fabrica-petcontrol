# Contrato: extensões de `lib/domain/data-local.ts`

Interface pública (TypeScript) acrescentada ao módulo de domínio. As exportações existentes
`hojeLocal()` e `dataParaISOLocal()` permanecem inalteradas.

```ts
export const FUSO_BRASILIA: "America/Sao_Paulo";

/** Único ponto do código novo que lê o relógio do dispositivo. */
export function agora(): Date;

/** Pura. Formata o instante no fuso America/Sao_Paulo como "dd/MM/aaaa HH:mm:ss" (24 h). */
export function formatarDataHoraBrasilia(instante: Date): string;

/** Pura. Milissegundos até a próxima virada de segundo; sempre no intervalo 1..1000. */
export function msAteProximoSegundo(instante: Date): number;
```

## Garantias

| Função | Entrada | Saída esperada |
|--------|---------|----------------|
| `formatarDataHoraBrasilia` | `new Date("2026-11-15T17:35:07Z")` | `"15/11/2026 14:35:07"` |
| `formatarDataHoraBrasilia` | `new Date("2026-11-16T02:59:59Z")` | `"15/11/2026 23:59:59"` |
| `formatarDataHoraBrasilia` | `new Date("2026-11-16T03:00:00Z")` | `"16/11/2026 00:00:00"` |
| `formatarDataHoraBrasilia` | `new Date("2018-11-04T03:00:00Z")` (início do horário de verão de 2018) | `"04/11/2018 01:00:00"` |
| `msAteProximoSegundo` | instante com 250 ms | `750` |
| `msAteProximoSegundo` | instante com 0 ms | `1000` |

- O resultado de `formatarDataHoraBrasilia` não depende de `process.env.TZ` nem do fuso do
  dispositivo (FR-003, SC-002).
- Nenhuma função lança exceção para `Date` válido; comportamento com `Date` inválido não é
  requisito (o valor vem sempre de `agora()`).
