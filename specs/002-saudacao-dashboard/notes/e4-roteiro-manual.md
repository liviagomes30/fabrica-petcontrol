# E4 - Roteiro manual (T020): o que foi e o que nao foi verificado

Executado por agente em 2026-11-21, sem navegador e sem `.env.local`.

## Verificado de forma automatizada
- 3.1 / 3.2 / 3.3 / 3.5 / 3.8 (logica): cobertos por testes Vitest (116 passando), incluindo faixas e viradas 11:59:59->12:00:00, 17:59:59->18:00:00, 04:59:59->05:00:00, linha vazia antes da hidratacao e revalidacao ao voltar a aba visivel.
- 3.4 (logica): saudacao deriva do texto de `formatarDataHoraBrasilia` (fuso America/Sao_Paulo fixo), nao do fuso do SO.
- 3.6 (contraste, calculado pela formula WCAG): `text-gray-700` (#374151) sobre `bg-white` = 10,31:1; sobre `bg-gray-50` (fundo do layout do dashboard) = 9,86:1. Ambos >= 4,5:1.
- 3.7 (estrutura): `<p>` com `whitespace-nowrap`, abaixo do `<time>` em `flex-col`; textos curtos (max. "Boa tarde"), sem risco de quebra por classes.
- 3.9: `page.tsx` inalterado; guarda de autenticacao existente nao foi tocada.

## NAO verificado (requer humano/QA com navegador)
- 3.1 renderizacao real e localizacao em ate 3 s.
- 3.3 observacao visual do carregamento (sem flash).
- 3.4 troca real do fuso do SO (Toquio / Nova York).
- 3.5 ajuste real do relogio do SO.
- 3.6 leitura do contraste no DevTools.
- 3.7 emulacao visual de 360 px.
- 3.8 troca real de aba por minutos.
- 3.9 fluxo real de logout/redirecionamento (depende de Supabase).
