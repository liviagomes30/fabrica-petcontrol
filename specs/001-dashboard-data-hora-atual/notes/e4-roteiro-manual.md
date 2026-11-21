# E4 - Roteiro manual (T018) - quickstart secao 3

Executado por agente, sem navegador autenticado e sem Supabase real.

| Item | Resultado |
|------|-----------|
| 3.1 Abrir /dashboard autenticado | Nao verificado por agente - a cargo do QA/humano (exige login e Supabase real). Build confirma a rota `/dashboard` compilada (ƒ). |
| 3.2 SC-003 posicao no cabecalho sem rolagem | Nao verificado por agente - QA/humano. Por codigo: `<RelogioBrasilia />` fica ao lado do titulo no cabecalho de `dashboard/page.tsx`. |
| 3.3 SC-001 diferenca <= 1 s | Nao verificado em navegador. Coberto por testes automatizados (27 passam). |
| 3.4 SC-002 fuso do dispositivo | Nao verificado em navegador. Coberto por testes unitarios com TZ=Asia/Tokyo e America/New_York. |
| 3.5 US2/SC-004 5 min e troca de aba | Nao verificado em navegador. Coberto por testes de aceite/unitarios com fake timers e visibilitychange. |
| 3.6 SC-005 contraste | Verificado por calculo WCAG: `text-red-700` (oklch 50,5% 0,213 27,518; aprox. #c10007 em sRGB; referencia Tailwind v3 #b91c1c) = ~6,4:1 sobre `bg-white` e ~6,2:1 sobre `bg-gray-50` (>= 4,5:1). Confirmar com ferramenta no navegador (QA). |
| 3.7 Tela de 360 px | Nao verificado por agente - QA/humano. Por codigo: classe `whitespace-nowrap` no componente. |
| 3.8 FR-006 sem requisicoes por segundo | Nao verificado na aba Network. Por revisao de codigo (T017): componente sem fetch/Server Action. |

Pendencias de pesquisa registradas (nao resolvidas): research P1, P2, P3.
