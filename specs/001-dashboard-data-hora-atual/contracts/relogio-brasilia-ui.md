# Contrato de UI: componente `RelogioBrasilia`

**Arquivo**: `petcontrol-next/app/(dashboard)/dashboard/_components/RelogioBrasilia.tsx`
(Client Component, `"use client"`). Uso exclusivo do módulo `dashboard` (Princípio I).

## Props

Nenhuma. Fuso, idioma e formato são fixos (spec, Assumptions).

## DOM renderizado

```html
<time
  dateTime="2026-11-15T17:35:07.000Z"
  aria-label="Data e hora atuais (horário de Brasília)"
  data-testid="relogio-brasilia"
  class="... text-red-700 font-semibold tabular-nums whitespace-nowrap ...">
  15/11/2026 14:35:07
</time>
```

| Requisito | Garantia observável |
|-----------|--------------------|
| FR-001 | Elemento presente no cabeçalho de `/dashboard`, visível sem rolagem no desktop. |
| FR-002 | `textContent` casa `^\d{2}/\d{2}/\d{4} \d{2}:\d{2}:\d{2}$` após hidratar. |
| FR-003 | `textContent` igual a `formatarDataHoraBrasilia(agora())`, qualquer que seja o fuso do dispositivo. |
| FR-004 / SC-005 | Classe `text-red-700`; contraste >= 4,5:1 sobre `bg-gray-50` e `bg-white`. |
| FR-005 | `textContent` muda na virada de cada segundo sem recarregar. |
| FR-006 | Sem chamadas de rede, Server Actions ou escrita; demais blocos do dashboard inalterados. |
| FR-007 | Renderizado apenas por `app/(dashboard)/dashboard/page.tsx`, sob o layout autenticado. |
| Edge Case 1ª exibição | HTML do servidor (e a hidratação) contém o marcador `--/--/---- --:--:--`, nunca uma hora; sem aviso de hydration mismatch. |
| Edge Case aba oculta | Evento `visibilitychange` com `document.visibilityState === "visible"` atualiza o texto imediatamente. |
| Limpeza | Ao desmontar, não restam timers nem listeners (`vi.getTimerCount() === 0`). |
