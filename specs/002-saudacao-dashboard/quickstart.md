# Quickstart: validar a saudação no dashboard

Roteiro de validação ponta a ponta. Detalhes de interface em
[contracts/saudacao-domain-api.md](./contracts/saudacao-domain-api.md) e
[contracts/saudacao-ui.md](./contracts/saudacao-ui.md); regras das faixas em
[data-model.md](./data-model.md).

## 1. Pré-requisitos

- Node 20+; branch `002-saudacao-dashboard`.
- Para a validação manual (seção 3): `petcontrol-next/.env.local` já configurado pelo responsável
  humano e um usuário voluntário de teste. Agentes não leem nem editam esse arquivo; a seção 2 não
  depende dele.

## 2. Verificação automatizada (critério de avanço)

Da raiz do repositório:

```bash
npm --prefix petcontrol-next ci
npm --prefix petcontrol-next run test            # unitários + aceite; inclui os testes da 001
npm --prefix petcontrol-next run test:coverage   # 100% de linhas e funções em lib/domain/data-local.ts
npm --prefix petcontrol-next run lint
npm --prefix petcontrol-next run build
```

Resultado esperado: todos saem com código 0. Os arquivos de teste esperados:
- `petcontrol-next/tests/unit/lib/domain/data-local.test.ts` (inclui casos de saudação)
- `petcontrol-next/tests/unit/dashboard/saudacao-dashboard.test.tsx`
- `petcontrol-next/tests/acceptance/dashboard-saudacao.test.tsx`

## 3. Validação manual (humano)

`npm --prefix petcontrol-next run dev`, entrar com o voluntário de teste e abrir `/dashboard`.

| # | Passo | Resultado esperado | Rastreio |
|---|-------|--------------------|----------|
| 3.1 | Abrir o dashboard | Abaixo da data/hora vermelha aparece "Bom dia", "Boa tarde" ou "Boa noite", localizável em até 3 s | FR-001, SC-006 |
| 3.2 | Comparar a saudação com a hora exibida | Saudação corresponde à faixa da hora mostrada (05–11 Bom dia, 12–17 Boa tarde, 18–04 Boa noite) | FR-004, FR-006, SC-001 |
| 3.3 | Recarregar a página e observar o carregamento | Nunca aparece saudação diferente da final; antes da hora aparecer, a linha fica vazia | Edge 1ª exibição |
| 3.4 | Mudar o fuso do sistema operacional (por exemplo, Tóquio e Nova York) e recarregar | Hora e saudação continuam as de Brasília | FR-003, SC-004 |
| 3.5 | Ajustar o relógio do sistema para 11:59:50 (Brasília) e aguardar | Na virada para 12:00:00 a saudação muda para "Boa tarde" junto com o relógio; repetir em 17:59:50 e 04:59:50 | FR-005, SC-003 |
| 3.6 | Conferir o contraste do texto da saudação (DevTools, painel de acessibilidade) | Razão >= 4,5:1 (esperado cerca de 10:1) | FR-009, SC-005 |
| 3.7 | Emular largura de 360 px | Saudação visível abaixo da hora, sem quebra de layout | Edge tela pequena |
| 3.8 | Trocar de aba por alguns minutos e voltar | Relógio e saudação corretos de imediato | Edge aba oculta |
| 3.9 | Sair da sessão e acessar `/dashboard` | Redireciona ao login; saudação não é exibida | FR-008 |
