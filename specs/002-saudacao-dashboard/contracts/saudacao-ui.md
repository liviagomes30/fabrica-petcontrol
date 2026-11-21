# Contrato de UI: saudação no componente `RelogioBrasilia`

**Arquivo**: `petcontrol-next/app/(dashboard)/dashboard/_components/RelogioBrasilia.tsx`
(Client Component existente, feature 001). Uso exclusivo do módulo `dashboard` (Princípio I).
`page.tsx` continua renderizando `<RelogioBrasilia />` no cabeçalho, sem alteração.

## Props

Nenhuma (inalterado).

## DOM renderizado (cliente, com hora)

```html
<div class="flex flex-col items-start sm:items-end ...">
  <time
    dateTime="2026-11-21T17:35:07.000Z"
    aria-label="Data e hora atuais (horário de Brasília)"
    data-testid="relogio-brasilia"
    class="... text-red-700 font-semibold tabular-nums whitespace-nowrap ...">
    21/11/2026 14:35:07
  </time>
  <p data-testid="saudacao-dashboard" class="... text-sm font-medium text-gray-700 whitespace-nowrap min-h-5 ...">
    Boa tarde
  </p>
</div>
```

No servidor e na hidratação, o `<time>` mostra `--/--/---- --:--:--` e o `<p>` fica vazio.

| Requisito | Garantia observável |
|-----------|--------------------|
| FR-001 | `[data-testid=saudacao-dashboard]` é o elemento irmão imediatamente seguinte ao `[data-testid=relogio-brasilia]`. |
| FR-002 | `textContent` da saudação, após hidratar, é exatamente `Bom dia`, `Boa tarde` ou `Boa noite`. |
| FR-003 / SC-004 | Com `TZ` = `Asia/Tokyo` ou `America/New_York`, a saudação é a da hora de Brasília. |
| FR-004 / SC-002 | Nos instantes de limite, a saudação segue a tabela do [data-model](../data-model.md). |
| FR-005 / SC-003 | Ao avançar o relógio de `11:59:59` para `12:00:00` (e nas outras duas viradas), relógio e saudação mudam no mesmo `act`; nenhum temporizador adicional (`vi.getTimerCount() === 1`). |
| FR-006 / SC-001 | Em qualquer render, saudação = `saudacaoDaDataHoraBrasilia(textContent do <time>)`. |
| FR-007 | O `<time>` mantém texto, classes, `aria-label`, `data-testid` e `dateTime` do contrato da 001; sem rede, Server Action ou escrita. |
| FR-008 | Renderizado apenas via `app/(dashboard)/dashboard/page.tsx`, sob o layout autenticado. |
| FR-009 / SC-005 | Classe `text-gray-700` (contraste aproximado de 10:1 sobre `bg-white` e `bg-gray-50`). |
| Edge 1ª exibição | HTML de `renderToString` não contém `Bom dia`, `Boa tarde` nem `Boa noite`. |
| Edge aba oculta | `visibilitychange` com `visibilityState === "visible"` corrige relógio e saudação juntos. |
| Edge tela pequena | Em 360 px, saudação visível abaixo da hora, sem quebra de linha nem rolagem horizontal. |
| Limpeza | Ao desmontar, não restam timers nem listeners (inalterado). |
