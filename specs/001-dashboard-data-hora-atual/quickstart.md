# Quickstart: validar data e hora atuais no dashboard

**Feature**: `001-dashboard-data-hora-atual`

Roteiro de validação ponta a ponta. Detalhes de interface em
[contracts/data-local-api.md](./contracts/data-local-api.md) e
[contracts/relogio-brasilia-ui.md](./contracts/relogio-brasilia-ui.md).

## Pré-requisitos

- Node 20 ou superior; comandos executados da raiz do repositório.
- Branch `001-dashboard-data-hora-atual`.
- Para a validação manual (passo 3): `petcontrol-next/.env.local` já configurado pelo humano e um
  usuário voluntário de teste. Agentes não leem nem editam esse arquivo.

## 1. Verificações automáticas (portões da fábrica)

```bash
npm --prefix petcontrol-next ci
npm --prefix petcontrol-next run test           # unitários + aceite (Vitest, jsdom)
npm --prefix petcontrol-next run test:coverage  # cobertura de lib/domain/data-local.ts
npm --prefix petcontrol-next run lint
npm --prefix petcontrol-next run build
```

Resultado esperado: todos com código de saída 0, sem avisos novos de lint e sem aviso de
hydration no console dos testes.

## 2. Cenários cobertos pelos testes automatizados

| Cenário | Requisito | Onde |
|---------|-----------|------|
| Formato `dd/MM/aaaa HH:mm:ss`, 24 h | US1-1, FR-002 | `tests/unit/lib/domain/data-local.test.ts` |
| Mesmo resultado com `TZ=Asia/Tokyo` e `TZ=America/New_York` | US1-3, FR-003, SC-002 | idem |
| Horário de verão histórico (04/11/2018) | Edge Case DST | idem |
| Classe `text-red-700` no elemento | US1-2, FR-004 | `tests/unit/dashboard/relogio-brasilia.test.tsx` e aceite |
| HTML de servidor sem hora (marcador) | Edge Case 1ª exibição | idem |
| Avança 1 s após 1 s | US2-1, FR-005 | aceite |
| Virada 15/11/2026 23:59:59 -> 16/11/2026 00:00:00 | US2-2 | aceite |
| Após 5 min de fake timers, texto = relógio convertido | SC-001, SC-004 | aceite |
| `visibilitychange` atualiza de imediato | Edge Case aba oculta | unitário |
| Desmontagem sem timers pendentes | robustez | unitário |

Testes de aceite: `petcontrol-next/tests/acceptance/dashboard-data-hora.test.tsx`.

## 3. Validação manual (humano / QA, navegador)

1. `npm --prefix petcontrol-next run dev`, entrar com o usuário de teste e abrir `/dashboard`.
2. **SC-003**: a data e hora em vermelho aparecem no cabeçalho, ao lado (desktop) ou abaixo
   (celular) do título, sem rolagem.
3. **SC-001**: comparar com o relógio do sistema convertido para Brasília; diferença de no máximo
   1 s. O texto nunca mostra uma hora de outro fuso ao carregar (apenas o marcador por um instante).
4. **SC-002**: no DevTools (Sensors > Location > Timezone override), testar `Asia/Tokyo` e
   `Europe/London`, recarregar; a hora exibida continua a de Brasília.
5. **US2 / SC-004**: deixar a tela aberta 5 min; segundos avançam e continuam batendo com o relógio.
   Trocar de aba por 1 min e voltar: o valor já está correto ao voltar.
6. **SC-005**: no DevTools (inspecionar elemento > contraste) ou ferramenta WCAG, conferir razão
   >= 4,5:1 do texto sobre o fundo (esperado aproximadamente 6:1).
7. **Telas pequenas**: modo responsivo 360 px de largura; o texto não quebra no meio e o layout do
   dashboard permanece íntegro.
8. **FR-006**: na aba Network, nenhuma requisição nova é disparada a cada segundo.
