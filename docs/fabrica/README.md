# Fábrica de Software Agêntica no Claude Code

Adaptação da Fábrica de Software Agêntica (opencode + GitHub Spec Kit) para o **Claude Code**. Os prompts do professor foram reaproveitados sem reescrita; mudaram só o formato dos agentes, o modelo de permissões e a forma de acionar o fluxo.

```
Humano ──► fabrica-orquestrador (agente principal) ──► 6 subagentes, um de cada vez
              │                                          analista · arquiteto · criador de tarefas
              │                                          desenvolvedor · revisor · QA
              └─ state.json, commit, push, PR            └─ Slack avisa cada conclusão (SubagentStop)
```

## O que foi adaptado

| Fábrica (opencode) | Claude Code | Onde |
|---|---|---|
| `orquestrador.md` (`mode: primary`) | Agente da thread principal (`"agent"` no settings) | `.claude/agents/fabrica-orquestrador.md` |
| `subagent-*.md` (`mode: subagent`) | Subagentes de projeto | `.claude/agents/fabrica-*.md` |
| `permission.task` (`allow`/`ask`) | `tools: Agent(...)` no orquestrador + `permissions.ask` | `.claude/settings.json` |
| `permission.bash` (`deny` de `git push --force`, `gh pr merge`...) | `permissions.deny` + hook `guard.js` | `.claude/settings.json`, `.claude/hooks/guard.js` |
| `permission.edit` por caminho, por agente | Hook `PreToolUse` que lê `agent_type` | `.claude/hooks/guard.js` |
| `model` só no orquestrador | `model` em cada papel (modelos diferentes para quem verifica) | frontmatter dos agentes |
| `steps: 150` | `maxTurns: 150` | orquestrador |
| `temperature: 0.1` | não existe no Claude Code | removido |
| `/schedule` (plugin) | execução manual (`/fabrica`) ou agendador do SO com `claude -p` | `.claude/commands/fabrica.md` |
| Skills `speckit-*` | `.claude/skills/speckit-*` (`specify integration install claude`) | gerado pelo Spec Kit |
| (novo) aviso no Slack | Hook `SubagentStop` | `.claude/hooks/slack-notify.js` |

Três diferenças que valem discussão em aula:

1. **Precedência de permissões.** No opencode vale a *última* regra da lista. No Claude Code vale `deny`, depois `ask`, depois `allow`: a ordem no arquivo não importa e um `allow` nunca abre exceção para um `deny`.
2. **Regra de prompt virou regra aplicada.** No opencode, o limite de escrita do Desenvolvedor e do QA estava só no prompt. Aqui o `guard.js` recusa a edição: o Desenvolvedor não mexe em `spec.md`/`plan.md`/`.specify/`/`.env`, e o QA só escreve testes e `qa-report.md`.
3. **Subagentes podem aninhar por padrão** no Claude Code. A fábrica exige "subagentes nunca acionam outros", então há três travas: os subagentes não têm a ferramenta `Agent`, `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1` e a regra no prompt.

## Estrutura

```
.claude/
  settings.json           agente padrão, permissões, hooks
  settings.local.json     (você cria) URL do webhook do Slack, fora do git
  agents/                 7 agentes (gerados de scripts/fabrica/origem-opencode/)
  commands/fabrica.md     /fabrica nova | implementar | retomar | backlog
  hooks/guard.js          escopo de escrita e git/gh por papel
  hooks/slack-notify.js   aviso de conclusão de cada subagente
  skills/speckit-*/       (Spec Kit instala)
scripts/fabrica/
  converter-agentes.js    opencode → Claude Code (reaproveita os corpos)
  origem-opencode/        prompts originais do professor, intactos
  setup.ps1               confere pré-requisitos
  test-hooks.js           testes dos hooks, sem precisar do Claude Code
docs/fabrica/             esta documentação, roteiro da demo, post e deck
```

## Configuração do ambiente

1. Rode `powershell -ExecutionPolicy Bypass -File scripts\setup.ps1` para ver o que falta.
2. Use **qualquer projeto seu** que esteja num repositório do GitHub e clonado (a fábrica é genérica; o appdemo1 do professor é só um exemplo de demonstração). Copie para a raiz do clone: `.claude/`, `CLAUDE.md`, `.gitignore` (mesclando), e `scripts/fabrica/`.
3. No clone, instale o Spec Kit para o Claude Code e crie a constituição:
   ```bash
   uv tool install specify-cli
   specify integration install claude
   ```
   Depois, no Claude Code, rode `/speckit-constitution` e faça commit na branch base.
4. `gh auth login` e confirme `gh auth status`. O orquestrador exige `origin` configurado e árvore limpa.
5. **Slack:** crie um Incoming Webhook no app do Slack, copie `.claude/settings.local.json.example` para `.claude/settings.local.json` e cole a URL. Sem a URL, cada aviso é gravado só em `.claude/logs/slack-outbox.jsonl`.
6. Abra o Claude Code na pasta do projeto. Aceite a confiança na pasta (os hooks só rodam em pasta confiável). O orquestrador já é o agente padrão; para forçar: `claude --agent fabrica-orquestrador`.

Para regenerar os agentes depois de editar `scripts/fabrica/origem-opencode/` ou os modelos: `node scripts/fabrica/converter-agentes.js`.

## Como usar

Primeira demanda (equivalente ao prompt do professor):

```text
/fabrica nova No frontend a data/hora do servidor deve aparecer no formato pt-br e em cor vermelha. Não precisa ser atualizada e deve usar a timezone America/Sao_Paulo.
```

Ajuste opcional: `Preciso clarificar um requisito na feature. A cor vermelha deve ser em tom escuro.`

Checkpoint 1: `Aprovo a especificação, mas não siga com o arquiteto.` (a spec fica commitada e o `state.json` em `ESPECIFICACAO_APROVADA`).

Segunda demanda, em nova sessão: `/fabrica nova No frontend, abaixo da data/hora, apresentar bom dia, boa tarde ou boa noite, de acordo com o momento do dia. Criar uma nova branch a partir da atual.`

Implementar o backlog:

```text
/fabrica implementar 001-servidor-timestamp-pt-br
/fabrica backlog 001-servidor-timestamp-pt-br 002-saudacao-horario
```

O Claude Code pede confirmação antes de acionar o Arquiteto (`ask`). Ao fim, o PR fica aberto aguardando o merge do humano (Checkpoint 2).

**Execução agendada.** Dá para agendar `claude -p "/fabrica backlog ..."` no Agendador de Tarefas do Windows. Em modo não interativo o `ask` do Arquiteto não tem quem responda; para uma execução agendada, mova `Agent(fabrica-arquiteto)` de `ask` para `allow` num `settings.local.json` só dessa máquina e saiba que isso retira a segunda barreira do Checkpoint 1 (a primeira, a aprovação por mensagem do humano, continua valendo). Não testei esse caminho.

## O que foi verificado e o que não foi

- Linha de base do projeto verificada em 2026-11-21: `npm ci`, `npm run lint` e `npm run build` saem com código 0, mesmo sem variáveis do Supabase. É o estado inicial dos portões de qualidade da constituição.
- **CI.** `.github/workflows/ci.yml` roda lint, build e, quando existir, `npm run test` em pull requests para `main`. A fábrica não cria CI sozinha (regra do orquestrador); este workflow foi adicionado à mão. Sem ele o PR abriria sem nenhum check.
- Verificado: sintaxe dos agentes e dos settings conforme a documentação do Claude Code; os 72 casos de `scripts/fabrica/test-hooks.js` passam (`node scripts/fabrica/test-hooks.js`).
- **Execução de ponta a ponta (2026-11-21).** A feature `001-dashboard-data-hora-atual` (relógio de data e hora no dashboard) percorreu E0 a E7 em sessão real: spec aprovada pelo humano (Checkpoint 1), plano e 18 tarefas, implementação em 5 fases, revisão e QA aprovados com ressalvas, PR #1 aberto com CI verde e **merge feito pelo humano** (Checkpoint 2). Conferido de forma independente fora da fábrica: 56 testes passando, lint e build com código 0 e 100% de cobertura em `lib/domain/data-local.ts`; o `state.json` terminou sem bloqueios registrados. O resultado foi visto no dashboard autenticado (relógio vermelho, pt-BR, America/Sao_Paulo); as demais verificações manuais estão na seção 5 do `qa-report.md` da feature.
- **Contrato de retorno só parcialmente cumprido.** Nos 16 avisos de Slack dessa execução, nenhum subagente devolveu um bloco `STATUS` que o hook reconhecesse, e o orquestrador aceitou as etapas mesmo assim, validando pelo disco e pelos testes. O hook passou a usar o resumo do subagente nesses casos e a registrar o que recebe (campo `diag` do log) para descobrir a causa, que ainda não está determinada.
- **Guard comprovado em sessão real, com uma ressalva (2026-11-21).** O hook `PreToolUse` bloqueou uma edição de `spec.md` com `[Fábrica] o orquestrador só escreve state.json e notes/ ... Arquivo recusado: spec.md`, antes de qualquer escrita em disco (slide 18 do deck). Foi o **orquestrador** que tentou a edição, não o subagente Desenvolvedor: no app desktop o `@` anexa o arquivo do agente e não aciona o subagente. Isso comprova que o `agent_type` chega ao `PreToolUse` do agente principal e que o hook funciona. **Ainda não confirmado:** o mesmo bloqueio com um subagente agindo. Antes disso, o orquestrador já havia recusado o pedido no próprio prompt (barreira 1, slide 17).
- **Lacuna encontrada e corrigida (2026-11-21):** o escopo do Desenvolvedor não protegia `.claude/` nem `.github/workflows/`, então ele poderia editar o próprio guard e as permissões. Passou a ser bloqueado (78 casos de teste agora).
- **Escritas feitas pelo shell.** Além das ferramentas Write/Edit, o guard analisa os comandos Bash dos papéis com escopo: redirecionamentos (`>`, `>>`), `tee`, `sed -i`, `rm`, `mv`, `cp`, `touch`, `mkdir` e cmdlets de escrita do PowerShell passam pelo mesmo escopo do papel (aspas e corpo de heredoc são ignorados). **Limite conhecido:** interpretadores (`node -e`, `python -c`, `powershell -Command`) e scripts que gravam arquivos por conta própria não são analisados. O guard reduz o risco, mas não é um sandbox.
- **Scripts do Spec Kit em PowerShell.** O Spec Kit foi instalado com scripts .ps1 (.specify/scripts/powershell/). Como os subagentes só têm a ferramenta Bash, o settings.json libera em permissions.allow apenas a execução de scripts dessa pasta (powershell/pwsh ou chamada direta). Sem isso o Claude Code nega o create-new-feature.ps1 e a etapa E1 trava. Descoberto na primeira execução real.
- **Falso positivo conhecido do guard:** as regras globais de Bash olham o texto do comando inteiro. Um comando que apenas *cita* `git push --force` (num script, heredoc ou mensagem) também é bloqueado. Isso aconteceu de fato durante a montagem deste projeto, o que mostra que o hook de projeto está ativo. Contorno: grave o texto num arquivo com a ferramenta Write em vez de passá-lo na linha de comando.
- O QA usa o modelo `haiku` para diferir do Desenvolvedor (`sonnet`) e do Revisor (`opus`). Se os testes do QA ficarem fracos, troque em `scripts/fabrica/converter-agentes.js` (tabela `MODELOS`) e rode o conversor.

## Material de apoio

- [docs/ROTEIRO-DEMO.md](ROTEIRO-DEMO.md): passo a passo da demonstração e lista de prints para a apresentação.
- [docs/LINKEDIN.md](LINKEDIN.md): rascunho do post de portfólio.
- [apresentacao-fabrica-claude-code.pptx](apresentacao-fabrica-claude-code.pptx): deck de 23 slides (arquitetura, conversão, permissões, fluxo, Slack, evidências reais, controle em duas barreiras e resultado). Os prints reais ficam em `img/`. Só o slide 19 ainda tem moldura tracejada ("INSERIR PRINT 8"): a confirmação do Arquiteto, que depende de uma execução nova.
- `scripts/fabrica/origem-opencode/README-professor.md`: material original da aula.
