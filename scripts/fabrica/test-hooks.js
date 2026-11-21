#!/usr/bin/env node
/**
 * Testa guard.js e slack-notify.js com entradas sintéticas (sem precisar do Claude Code).
 * Uso: node scripts/fabrica/test-hooks.js
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const GUARD = path.join(ROOT, ".claude", "hooks", "guard.js");
const SLACK = path.join(ROOT, ".claude", "hooks", "slack-notify.js");
const env = { ...process.env, CLAUDE_PROJECT_DIR: ROOT, SLACK_WEBHOOK_URL: "" };

function run(script, input) {
  return spawnSync("node", [script], { input: JSON.stringify(input), encoding: "utf8", env });
}

function bloqueado(r) {
  return r.stdout.includes('"permissionDecision":"deny"');
}

const bash = (agent, command) => ({ tool_name: "Bash", agent_type: agent, cwd: ROOT, tool_input: { command } });
const edit = (agent, file) => ({ tool_name: "Write", agent_type: agent, cwd: ROOT, tool_input: { file_path: path.join(ROOT, file) } });

const casos = [
  // [descrição, entrada, esperado: "deny" | "allow"]
  ["orquestrador: git commit", bash("fabrica-orquestrador", "git commit -m x"), "allow"],
  ["orquestrador: git push normal", bash("fabrica-orquestrador", "git push -u origin 001-x"), "allow"],
  ["orquestrador: git push --force", bash("fabrica-orquestrador", "git push --force origin main"), "deny"],
  ["orquestrador: git push -f", bash("fabrica-orquestrador", "git push -f origin main"), "deny"],
  ["orquestrador: git -C . push --force", bash("fabrica-orquestrador", "git -C . push --force"), "deny"],
  ["orquestrador: gh pr merge", bash("fabrica-orquestrador", "gh pr merge 3 --squash"), "deny"],
  ["orquestrador: gh.exe pr merge", bash("fabrica-orquestrador", '"C:\\Program Files\\GitHub CLI\\gh.exe" pr merge 3'), "deny"],
  ["orquestrador: git rebase", bash("fabrica-orquestrador", "git rebase main"), "deny"],
  ["orquestrador: git reset --hard", bash("fabrica-orquestrador", "git reset --hard HEAD~1"), "deny"],
  ["orquestrador: gh pr create", bash("fabrica-orquestrador", "gh pr create --fill"), "allow"],
  ["dev: git commit", bash("fabrica-desenvolvedor", "git commit -m x"), "deny"],
  ["dev: git push", bash("fabrica-desenvolvedor", "git push"), "deny"],
  ["dev: git switch -c", bash("fabrica-desenvolvedor", "git switch -c outra"), "deny"],
  ["dev: git switch feature", bash("fabrica-desenvolvedor", "git switch 001-x"), "allow"],
  ["dev: git branch --show-current", bash("fabrica-desenvolvedor", "git branch --show-current"), "allow"],
  ["dev: git branch nova", bash("fabrica-desenvolvedor", "git branch nova"), "deny"],
  ["dev: gh pr view", bash("fabrica-desenvolvedor", "gh pr view 1"), "deny"],
  ["dev: npm test", bash("fabrica-desenvolvedor", "npm test"), "allow"],
  ["qa: git stash", bash("fabrica-qa", "git stash"), "deny"],
  ["sessão comum: git commit", bash("", "git commit -m x"), "allow"],
  ["orquestrador: edita state.json", edit("fabrica-orquestrador", "specs/001-x/state.json"), "allow"],
  ["orquestrador: edita código", edit("fabrica-orquestrador", "src/app.js"), "deny"],
  ["orquestrador: edita spec.md", edit("fabrica-orquestrador", "specs/001-x/spec.md"), "deny"],
  ["analista: edita spec.md", edit("fabrica-analista-requisitos", "specs/001-x/spec.md"), "allow"],
  ["analista: edita código", edit("fabrica-analista-requisitos", "src/app.js"), "deny"],
  ["arquiteto: edita plan.md", edit("fabrica-arquiteto", "specs/001-x/plan.md"), "allow"],
  ["arquiteto: edita AGENTS.md", edit("fabrica-arquiteto", "AGENTS.md"), "allow"],
  ["arquiteto: edita código", edit("fabrica-arquiteto", "src/app.js"), "deny"],
  ["criador: edita tasks.md", edit("fabrica-criador-tarefas", "specs/001-x/tasks.md"), "allow"],
  ["criador: edita plan.md", edit("fabrica-criador-tarefas", "specs/001-x/plan.md"), "deny"],
  ["revisor: edita review-report.md", edit("fabrica-revisor-codigo", "specs/001-x/review-report.md"), "allow"],
  ["revisor: edita código", edit("fabrica-revisor-codigo", "src/app.js"), "deny"],
  ["dev: edita código", edit("fabrica-desenvolvedor", "src/app.js"), "allow"],
  ["dev: marca tasks.md", edit("fabrica-desenvolvedor", "specs/001-x/tasks.md"), "allow"],
  ["dev: edita spec.md", edit("fabrica-desenvolvedor", "specs/001-x/spec.md"), "deny"],
  ["dev: edita .env", edit("fabrica-desenvolvedor", ".env"), "deny"],
  ["dev: edita .env.example", edit("fabrica-desenvolvedor", ".env.example"), "allow"],
  ["dev: edita fora do projeto", { tool_name: "Write", agent_type: "fabrica-desenvolvedor", cwd: ROOT, tool_input: { file_path: path.resolve(ROOT, "..", "x.js") } }, "deny"],
  ["qa: edita qa-report.md", edit("fabrica-qa", "specs/001-x/qa-report.md"), "allow"],
  ["qa: edita tests/e2e.test.js", edit("fabrica-qa", "tests/acceptance/e2e.test.js"), "allow"],
  ["qa: edita código de produção", edit("fabrica-qa", "src/app.js"), "deny"],

  // ---- escritas via shell ----
  ["shell dev: redireciona p/ spec.md", bash("fabrica-desenvolvedor", "echo x > specs/001-x/spec.md"), "deny"],
  ["shell dev: append em plan.md", bash("fabrica-desenvolvedor", "echo x >> specs/001-x/plan.md"), "deny"],
  ["shell dev: redireciona p/ código do app", bash("fabrica-desenvolvedor", "echo x > petcontrol-next/app/a.ts"), "allow"],
  ["shell dev: sed -i em plan.md", bash("fabrica-desenvolvedor", "sed -i 's/a/b/' specs/001-x/plan.md"), "deny"],
  ["shell dev: sed -i em código", bash("fabrica-desenvolvedor", "sed -i 's/a/b/' petcontrol-next/app/page.tsx"), "allow"],
  ["shell dev: rm spec.md", bash("fabrica-desenvolvedor", "rm specs/001-x/spec.md"), "deny"],
  ["shell dev: cp para spec.md", bash("fabrica-desenvolvedor", "cp a.txt specs/001-x/spec.md"), "deny"],
  ["shell dev: tee em .env.local", bash("fabrica-desenvolvedor", "echo x | tee petcontrol-next/.env.local"), "deny"],
  ["shell dev: npm test com 2>&1 e /dev/null", bash("fabrica-desenvolvedor", "npm test > /dev/null 2>&1"), "allow"],
  ["shell dev: caminho Git Bash (/c/...) p/ spec.md", bash("fabrica-desenvolvedor", "echo x > " + ROOT.split(path.sep).join("/").replace(/^([A-Za-z]):/, (m, d) => "/" + d.toLowerCase()) + "/specs/001-x/spec.md"), "deny"],
  ["shell dev: escrita fora do projeto", bash("fabrica-desenvolvedor", "echo x > /tmp/a.txt"), "allow"],
  ["shell dev: cd + redirect relativo", bash("fabrica-desenvolvedor", "cd specs/001-x && echo x > spec.md"), "deny"],
  ["shell dev: PowerShell Set-Content spec.md", bash("fabrica-desenvolvedor", "Set-Content specs/001-x/spec.md foo"), "deny"],
  ["shell dev: '>' dentro de aspas não é redirect", bash("fabrica-desenvolvedor", 'echo "a > specs/001-x/spec.md"'), "allow"],
  ["shell dev: heredoc p/ código", bash("fabrica-desenvolvedor", "cat > petcontrol-next/lib/a.ts <<'EOF'\nx > y\nEOF"), "allow"],
  ["shell dev: heredoc p/ spec.md", bash("fabrica-desenvolvedor", "cat > specs/001-x/spec.md <<'EOF'\nx\nEOF"), "deny"],
  ["shell qa: redireciona p/ código de produção", bash("fabrica-qa", "echo x > petcontrol-next/lib/a.ts"), "deny"],
  ["shell qa: heredoc p/ teste", bash("fabrica-qa", "cat > petcontrol-next/tests/a.test.ts <<'EOF'\nx\nEOF"), "allow"],
  ["shell qa: mkdir de pasta de testes", bash("fabrica-qa", "mkdir -p petcontrol-next/tests"), "allow"],
  ["shell qa: mkdir fora de testes", bash("fabrica-qa", "mkdir -p petcontrol-next/lib/novo"), "deny"],
  ["shell criador: tee em plan.md", bash("fabrica-criador-tarefas", "echo x | tee specs/001-x/plan.md"), "deny"],
  ["shell criador: redirect p/ tasks.md", bash("fabrica-criador-tarefas", "echo x > specs/001-x/tasks.md"), "allow"],
  ["shell analista: redirect p/ spec.md", bash("fabrica-analista-requisitos", "echo x > specs/001-x/spec.md"), "allow"],
  ["shell revisor: mkdir em src", bash("fabrica-revisor-codigo", "mkdir -p src"), "deny"],
  ["shell orquestrador: redirect p/ código", bash("fabrica-orquestrador", "echo x > petcontrol-next/app/a.ts"), "deny"],
  ["shell orquestrador: redirect p/ state.json", bash("fabrica-orquestrador", "echo x > specs/001-x/state.json"), "allow"],
  ["shell orquestrador: commit com '>' na mensagem", bash("fabrica-orquestrador", 'git commit -m "a > b"'), "allow"],
  ["shell sessão comum: redirect livre", bash("", "echo x > specs/001-x/spec.md"), "allow"],
];

let falhas = 0;
for (const [nome, entrada, esperado] of casos) {
  const r = run(GUARD, entrada);
  const obtido = r.status === 0 && bloqueado(r) ? "deny" : "allow";
  const ok = obtido === esperado && r.status === 0;
  if (!ok) falhas++;
  console.log(`${ok ? "ok  " : "FAIL"} ${nome} → ${obtido}${ok ? "" : ` (esperado ${esperado})`}`);
}

// slack-notify: deve gravar no outbox mesmo sem webhook
const outbox = path.join(ROOT, ".claude", "logs", "slack-outbox.jsonl");
const antes = fs.existsSync(outbox) ? fs.readFileSync(outbox, "utf8").split("\n").length : 0;
const r = run(SLACK, {
  hook_event_name: "SubagentStop",
  agent_type: "fabrica-qa",
  last_assistant_message: "Resumo...\nSTATUS: DONE\nPARECER: aprovado com ressalvas\nARTEFATOS: specs/001-x/qa-report.md\nTESTES: npm test (0)\nBLOQUEIOS: nenhum\nPRÓXIMO: E7",
});
const depois = fs.existsSync(outbox) ? fs.readFileSync(outbox, "utf8").split("\n").length : 0;
const slackOk = r.status === 0 && depois > antes;
if (!slackOk) falhas++;
const antes2 = fs.readFileSync(outbox, "utf8").split("\n").length;
run(SLACK, { hook_event_name: "SubagentStop", agent_type: "fabrica-orquestrador", last_assistant_message: "x" });
const depois2 = fs.readFileSync(outbox, "utf8").split("\n").length;
const ignoraOrq = antes2 === depois2;
if (!ignoraOrq) falhas++;
console.log((ignoraOrq ? "ok   " : "FAIL ") + "slack-notify ignora o orquestrador");
const antes3 = fs.readFileSync(outbox, "utf8").split("\n").length;
run(SLACK, { hook_event_name: "SubagentStop", agent_type: "fabrica-revisor-codigo", last_assistant_message: "Resumo.\n\n**STATUS:** DONE\n- **PARECER:** aprovado com ressalvas\n`BLOQUEIOS: nenhum`" });
const ultimo = JSON.parse(fs.readFileSync(outbox, "utf8").trim().split("\n").pop());
const mdOk = ultimo.status === "DONE" && ultimo.parecer === "aprovado com ressalvas" && fs.readFileSync(outbox, "utf8").split("\n").length > antes3;
if (!mdOk) falhas++;
console.log((mdOk ? "ok   " : "FAIL ") + "slack-notify lê STATUS e PARECER em markdown (obtido: " + ultimo.status + " / " + ultimo.parecer + ")");
console.log(`${slackOk ? "ok  " : "FAIL"} slack-notify grava no outbox`);

console.log(falhas ? `\n${falhas} falha(s)` : `\nTodos os ${casos.length + 3} testes passaram`);
process.exit(falhas ? 1 : 0);
