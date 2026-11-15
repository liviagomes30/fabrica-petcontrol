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

- Verificado: sintaxe dos agentes e dos settings conforme a documentação do Claude Code; os 70 casos de `scripts/fabrica/test-hooks.js` passam (`node scripts/fabrica/test-hooks.js`).
- **Ainda não executado de ponta a ponta.** O fluxo completo (E0 a E7) precisa de um projeto num repositório do GitHub (qualquer um, como o appdemo1 do exemplo), do Spec Kit, do `gh` autenticado e de uma sessão real do Claude Code, e é o que a demonstração em sala deve mostrar. O `guard.js` assume que o `PreToolUse` informa `agent_type` dentro de subagentes; confirme na primeira execução tentando, como Desenvolvedor, editar `spec.md` (deve vir `[Fábrica] ... recusado`). Se vier sem papel, o log `.claude/guard-error.log` e o `slack-outbox.jsonl` ajudam a diagnosticar.
- **Escritas feitas pelo shell.** Além das ferramentas Write/Edit, o guard analisa os comandos Bash dos papéis com escopo: redirecionamentos (`>`, `>>`), `tee`, `sed -i`, `rm`, `mv`, `cp`, `touch`, `mkdir` e cmdlets de escrita do PowerShell passam pelo mesmo escopo do papel (aspas e corpo de heredoc são ignorados). **Limite conhecido:** interpretadores (`node -e`, `python -c`, `powershell -Command`) e scripts que gravam arquivos por conta própria não são analisados. O guard reduz o risco, mas não é um sandbox.
- **Falso positivo conhecido do guard:** as regras globais de Bash olham o texto do comando inteiro. Um comando que apenas *cita* `git push --force` (num script, heredoc ou mensagem) também é bloqueado. Isso aconteceu de fato durante a montagem deste projeto, o que mostra que o hook de projeto está ativo. Contorno: grave o texto num arquivo com a ferramenta Write em vez de passá-lo na linha de comando.
- O QA usa o modelo `haiku` para diferir do Desenvolvedor (`sonnet`) e do Revisor (`opus`). Se os testes do QA ficarem fracos, troque em `scripts/fabrica/converter-agentes.js` (tabela `MODELOS`) e rode o conversor.

## Material de apoio

- [docs/ROTEIRO-DEMO.md](ROTEIRO-DEMO.md): passo a passo da demonstração e lista de prints para a apresentação.
- [docs/LINKEDIN.md](LINKEDIN.md): rascunho do post de portfólio.
- [docs/apresentacao-fabrica-claude-code.pptx](apresentacao-fabrica-claude-code.pptx): deck de 14 slides (arquitetura, conversão, permissões, fluxo, Slack). Os slides 10 a 12 têm molduras tracejadas "INSERIR PRINT N", numeradas como a tabela do roteiro; substitua pelas capturas reais da sua execução. Nos slides 1 e 14, troque `<link do repositório>` e `@<nome do professor>`.
- `scripts/fabrica/origem-opencode/README-professor.md`: material original da aula.
