#!/usr/bin/env node
/**
 * Converte os agentes do opencode (scripts/fabrica/origem-opencode/*.md) para subagentes do Claude Code
 * (.claude/agents/*.md), reaproveitando o corpo (prompt) do professor sem reescrever.
 *
 * Só mudam: o frontmatter (outro formato), os nomes dos agentes (sem "pasta/") e
 * um bloco final "Adaptações para o Claude Code".
 *
 * Uso: node scripts/fabrica/converter-agentes.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const SRC = path.join(__dirname, "origem-opencode");
const OUT = path.join(ROOT, ".claude", "agents");

// Modelo por papel: quem verifica usa modelo diferente de quem produz (aula do professor).
// Troque livremente: sonnet | opus | haiku | inherit | id completo.
const MODELOS = {
  orquestrador: "sonnet",
  "analista-requisitos": "sonnet",
  arquiteto: "opus",
  "criador-tarefas": "sonnet",
  desenvolvedor: "sonnet",
  "revisor-codigo": "opus",
  qa: "haiku",
};

const SUBAGENTES = [
  "fabrica-analista-requisitos",
  "fabrica-arquiteto",
  "fabrica-criador-tarefas",
  "fabrica-desenvolvedor",
  "fabrica-revisor-codigo",
  "fabrica-qa",
];

// A escrita de cada papel é limitada pelo hook guard.js
const TOOLS_SUB = "Read, Write, Edit, Glob, Grep, Bash, Skill";

const NOTA_SLACK =
  "Ao encerrar, o hook `SubagentStop` (`.claude/hooks/slack-notify.js`) registra no Slack a finalização da sua tarefa a partir do bloco de status. Por isso o bloco `STATUS` precisa estar exato e ser a última coisa da sua resposta.";

function lerFrontmatter(txt) {
  const m = txt.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) throw new Error("frontmatter ausente");
  const desc = (m[1].match(/^description:\s*(.+)$/m) || [])[1];
  return { description: desc.trim(), corpo: m[2] };
}

function nomeClaude(arquivo) {
  const base = path.basename(arquivo, ".md");
  return base === "orquestrador" ? "fabrica-orquestrador" : base.replace(/^subagent-/, "fabrica-");
}

function ajustarCorpo(corpo) {
  return corpo
    .replace(/fabrica-software\/subagent-/g, "fabrica-")
    .replace(/fabrica-software\/orquestrador/g, "fabrica-orquestrador")
    .replace(
      /na permissão `task`/g,
      "em `permissions.ask` (`Agent(fabrica-arquiteto)`) do `.claude/settings.json`"
    )
    .trimStart();
}

function adaptacoes(nome) {
  if (nome === "fabrica-orquestrador") {
    return `
## Adaptações para o Claude Code

Esta versão roda no Claude Code como **agente da thread principal** (\`"agent": "fabrica-orquestrador"\` em \`.claude/settings.json\`, ou \`claude --agent fabrica-orquestrador\`). O conteúdo acima é o prompt original do professor; só o ambiente mudou:

- **Acionar subagentes:** use a ferramenta \`Agent\` com o \`subagent_type\` igual ao nome do papel (\`fabrica-analista-requisitos\`, \`fabrica-arquiteto\`, \`fabrica-criador-tarefas\`, \`fabrica-desenvolvedor\`, \`fabrica-revisor-codigo\`, \`fabrica-qa\`). Onde o texto acima diz \`fabrica-software/subagent-X\`, leia \`fabrica-X\`.
- **Um por vez e sem aninhamento:** chame um subagente, espere o retorno, valide no disco e só então chame o próximo. \`CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1\` impede que subagentes acionem outros.
- **Confirmação do Arquiteto:** a regra \`ask\` está em \`permissions.ask\` (\`Agent(fabrica-arquiteto)\`). O Claude Code pergunta ao humano antes da chamada; isso continua sendo só a segunda barreira do Checkpoint 1.
- **Permissões:** \`deny\` vale antes de \`ask\`, que vale antes de \`allow\` (no opencode valia a última regra). Merge, force push, rebase e \`reset --hard\` estão em \`deny\` e no hook \`guard.js\`. O escopo de escrita do orquestrador (\`state.json\` e \`notes/\`) é aplicado pelo hook, não só pelo prompt.
- **Skills do Spec Kit:** ficam em \`.claude/skills/speckit-*\` (\`specify init --integration claude\`). Chame-as com a ferramenta \`Skill\`. \`speckit-analyze\` é somente leitura.
- **Slack:** cada subagente tem a conclusão registrada no Slack pelo hook \`SubagentStop\`. Nos checkpoints, você mesmo diz ao humano em que ponto parou.
- **Sem \`temperature\`:** o Claude Code não expõe esse campo; a previsibilidade vem das regras acima.
`;
  }
  return `
## Adaptações para o Claude Code

- Você é um subagente do Claude Code (\`.claude/agents/${nome}.md\`). Seu contexto começa vazio: tudo o que você precisa está no handoff do orquestrador.
- Você não tem a ferramenta \`Agent\`, então não aciona outros subagentes.
- As skills do Spec Kit estão em \`.claude/skills/speckit-*\`; invoque-as com a ferramenta \`Skill\`.
- Os limites de escrita e de git/gh deste papel são aplicados pelo hook \`.claude/hooks/guard.js\`. Se uma ferramenta for recusada com a mensagem \`[Fábrica] ...\`, não tente contornar: registre o impedimento em \`BLOQUEIOS\`.
- ${NOTA_SLACK}
`;
}

function frontmatter(nome, descricao, papel) {
  const linhas = ["---", `name: ${nome}`, `description: ${JSON.stringify(descricao)}`, `model: ${MODELOS[papel]}`];
  if (nome === "fabrica-orquestrador") {
    linhas.push(`tools: Agent(${SUBAGENTES.join(", ")}), Read, Write, Edit, Glob, Grep, Bash, Skill`);
    linhas.push("maxTurns: 150");
    linhas.push("color: blue");
  } else {
    linhas.push(`tools: ${TOOLS_SUB}`);
    linhas.push("color: green");
  }
  linhas.push("---", "");
  return linhas.join("\n");
}

fs.mkdirSync(OUT, { recursive: true });
const arquivos = fs.readdirSync(SRC).filter((f) => /^(orquestrador|subagent-.*)\.md$/.test(f));
for (const f of arquivos) {
  const nome = nomeClaude(f);
  const papel = path.basename(f, ".md").replace(/^subagent-/, "");
  const { description, corpo } = lerFrontmatter(fs.readFileSync(path.join(SRC, f), "utf8"));
  const saida = frontmatter(nome, description, papel) + "\n" + ajustarCorpo(corpo).trimEnd() + "\n" + adaptacoes(nome);
  fs.writeFileSync(path.join(OUT, `${nome}.md`), saida);
  console.log(`ok  ${f}  →  .claude/agents/${nome}.md  (model: ${MODELOS[papel]})`);
}
