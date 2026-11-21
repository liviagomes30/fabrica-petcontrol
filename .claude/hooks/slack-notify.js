#!/usr/bin/env node
/**
 * SubagentStop → registra no Slack a finalização da tarefa de cada subagente.
 *
 * - Sempre grava uma linha em .claude/logs/slack-outbox.jsonl (evidência para a demo).
 * - Se SLACK_WEBHOOK_URL estiver definida (Incoming Webhook), envia a mensagem.
 *   A URL fica no ambiente / .claude/settings.local.json, nunca no repositório.
 * - Nunca bloqueia o subagente: qualquer falha vira log e exit 0.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const LOG_DIR = path.join(ROOT, ".claude", "logs");

const LABEL = {
  "fabrica-analista-requisitos": "Analista de Requisitos",
  "fabrica-arquiteto": "Arquiteto",
  "fabrica-criador-tarefas": "Criador de Tarefas",
  "fabrica-desenvolvedor": "Desenvolvedor",
  "fabrica-revisor-codigo": "Revisor de Código",
  "fabrica-qa": "QA",
};

function field(text, name) {
  // Tolera markdown no bloco de retorno: "**STATUS:** x", "- STATUS: x", "`STATUS: x`"
  const re = new RegExp(`^[\\s>*_\`#-]*${name}[*_\`]*:[*_\`]*[\\s]*(.+)$`, "mi");
  const m = text.match(re);
  return m ? m[1].replace(/[*_\`]+$/g, "").trim() : null;
}

function escaparSlack(t) {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function git(cmd) {
  try {
    return execSync(`git ${cmd}`, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

function buildMessage(input) {
  const text = String(input.last_assistant_message || "");
  const agent = input.agent_type || "subagente";
  const status = field(text, "STATUS") || "sem bloco STATUS";
  const parecer = field(text, "PARECER");
  const bloqueios = field(text, "BLOQUEIOS");
  const proximo = field(text, "PRÓXIMO") || field(text, "PROXIMO");
  const ok = /^DONE|^HUMAN_REVIEW_REQUIRED/i.test(status) && !/reprovado/i.test(parecer || "");
  const semStatus = !field(text, "STATUS");
  const icon = semStatus ? ":speech_balloon:" : ok ? ":white_check_mark:" : /BLOCKED|NEEDS/i.test(status) ? ":no_entry:" : ":warning:";
  const branch = git("branch --show-current");

  const lines = [
    `${icon} *Fábrica de Software* · ${LABEL[agent] || agent} concluiu a tarefa`,
    `• STATUS: \`${status}\`${parecer ? ` · PARECER: \`${parecer}\`` : ""}`,
  ];
  if (semStatus) {
    const bruto = text.replace(/\s+/g, " ").trim();
    const resumo = escaparSlack(bruto.length > 280 ? bruto.slice(0, 280) + "…" : bruto);
    lines[1] = resumo
      ? "• Resumo: " + resumo
      : "• Sem mensagem final do subagente (confira o resultado no Claude Code)";
  }
  if (branch) lines.push(`• Branch: \`${branch}\``);
  if (bloqueios && !/^nenhum$/i.test(bloqueios)) lines.push(`• Bloqueios: ${bloqueios}`);
  if (proximo) lines.push(`• Próximo: ${proximo}`);
  const diag = { chaves: Object.keys(input), tamanho_msg: text.length }; return { agent, status, parecer, branch, diag, text: lines.join("\n") };
}

async function main(input) {
  if (input.agent_type === "fabrica-orquestrador") return; // não é subagente e não devolve bloco STATUS
  const msg = buildMessage(input);
  const webhook = process.env.SLACK_WEBHOOK_URL;
  let sent = "skipped (SLACK_WEBHOOK_URL ausente)";

  if (webhook) {
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: msg.text }),
        signal: AbortSignal.timeout(8000),
      });
      sent = res.ok ? "ok" : `http ${res.status}`;
    } catch (e) {
      sent = `erro: ${e.message}`;
    }
  }

  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.appendFileSync(
    path.join(LOG_DIR, "slack-outbox.jsonl"),
    JSON.stringify({ at: new Date().toISOString(), agent: msg.agent, status: msg.status, parecer: msg.parecer, branch: msg.branch, diag: msg.diag, slack: sent, text: msg.text }) + "\n"
  );
}

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (d) => (raw += d));
process.stdin.on("end", async () => {
  try {
    await main(JSON.parse(raw || "{}"));
  } catch (e) {
    try {
      fs.mkdirSync(LOG_DIR, { recursive: true });
      fs.appendFileSync(path.join(LOG_DIR, "slack-error.log"), `${new Date().toISOString()} ${e.stack}\n`);
    } catch {}
  }
  process.exit(0);
});
