# Roteiro da demonstração e prints da apresentação

Duração sugerida: 15 a 20 min. Pré-condição: `scripts\fabrica\setup.ps1` sem pendências e o projeto da demo (o appdemo1 do professor ou outro seu) no GitHub. As demandas e nomes de spec usados abaixo (data/hora em vermelho, saudação) são o exemplo da aula: troque por uma demanda pequena do seu projeto se preferir.

## Prints a capturar (nesta ordem)

| # | O que mostrar | Como obter |
|---|---|---|
| 1 | Estrutura `.claude/` aberta no VS Code (agents, hooks, settings) | Explorer do VS Code |
| 2 | Orquestrador ativo na sessão do Claude Code | Cabeçalho da sessão ou `/agents` |
| 3 | `node scripts/fabrica/test-hooks.js` com 70 testes ok | Terminal |
| 4 | Prompt `/fabrica nova ...` e o Analista rodando | Claude Code |
| 5 | `specs/001-.../spec.md` criada e a branch da feature | VS Code + `git branch --show-current` |
| 6 | Checkpoint 1: orquestrador pede aprovação e encerra o turno | Claude Code |
| 7 | Resposta "Aprovo, mas não siga com o arquiteto" e `state.json` em `ESPECIFICACAO_APROVADA` | Claude Code + arquivo |
| 8 | `/fabrica implementar 001-...` e a confirmação `ask` do Arquiteto | Claude Code |
| 9 | `plan.md`, `tasks.md`, e tarefas virando `[X]` | VS Code |
| 10 | Guard em ação: tentativa bloqueada com `[Fábrica] ...` | Ver "Prova de controle" abaixo |
| 11 | Mensagens do Slack, uma por subagente | Canal do Slack |
| 12 | `review-report.md` e `qa-report.md` | VS Code |
| 13 | PR aberto no GitHub com checks verdes e descrição completa | GitHub |
| 14 | Resultado no navegador: data/hora em vermelho, pt-BR, America/Sao_Paulo; e a saudação | Navegador |
| 15 | `state.json` final (`AGUARDANDO_MERGE`) e `slack-outbox.jsonl` | VS Code |

## Sequência da demonstração

1. **Arquitetura (2 min).** Mostre o diagrama do README e a tabela de adaptação.
2. **Controle (2 min).** Rode `node scripts/fabrica/test-hooks.js`. Explique `deny > ask > allow` e o guard por papel.
3. **Spec (4 min).** `/fabrica nova ...`, responda ao `speckit-clarify` se perguntar, revise a `spec.md`, aprove sem seguir.
4. **Zona autônoma (6 min).** `/fabrica implementar 001-dashboard-data-hora-atual`, confirme o Arquiteto, acompanhe `state.json` mudando de estágio e os avisos chegando no Slack. Se o tempo apertar, deixe rodando e mostre o resultado pronto.
5. **PR (2 min).** Abra o PR, mostre a descrição, o parecer do Revisor e do QA, e faça o merge **você mesma** (Checkpoint 2).
6. **Segunda demanda (opcional).** `/fabrica backlog` com as duas specs.

## Prova de controle (print 10)

Há duas barreiras: o prompt do orquestrador, que recusa pedidos fora das regras, e o hook `guard.js`, que bloqueia a ferramenta. Ambas foram mostradas em 2026-11-21 (slides 17 a 19 do deck). Para repetir a prova com o papel de Desenvolvedor, abra o projeto com a CLI (`claude --agent fabrica-desenvolvedor`) e peça:

```text
Isto é um teste do guard de permissões. Tente editar specs/001-dashboard-data-hora-atual/spec.md trocando a cor vermelha por azul e me diga o resultado exato. Não contorne um eventual bloqueio.
```

O esperado é uma recusa começando com `[Fábrica] o Desenvolvedor não altera spec/plano/...` e o bloco `STATUS: BLOCKED`. Se o arquivo for alterado, rode `git restore` nele e avise: o escopo do papel não está sendo aplicado.

No app desktop, o `@` só anexa o arquivo do agente e não aciona o subagente; por isso a prova com o papel de Desenvolvedor usa a CLI.

## Se algo falhar

- Orquestrador não é o agente padrão: abra com `claude --agent fabrica-orquestrador`.
- Skills `speckit-*` não aparecem: `specify integration install claude` e reabra a sessão.
- `gh` fora do PATH: o orquestrador tenta `C:\Program Files\GitHub CLI\gh.exe` sozinho.
- Slack sem mensagem: confira `.claude/logs/slack-outbox.jsonl` (campo `slack`: `ok`, `http 4xx` ou `skipped`).
