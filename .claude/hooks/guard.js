#!/usr/bin/env node
/**
 * PreToolUse guard da Fábrica de Software (Claude Code).
 *
 * No opencode, as permissões de edit/bash ficavam no frontmatter de cada agente.
 * No Claude Code o `settings.json` vale para todos os agentes, então a regra por
 * papel é aplicada aqui: o papel vem de `agent_type` (ex.: "fabrica-qa").
 *
 * Bloqueio: JSON permissionDecision=deny, exit 0.
 * Sem papel conhecido (sessão comum) só valem as regras globais de Bash.
 */
const fs = require("fs");
const path = require("path");

const ROLE_PREFIX = "fabrica-";

// ---------- regras globais (valem para todos, inclusive o orquestrador) ----------
const GLOBAL_BASH = [
  [/\bgit\s+push\b[^\n]*(--force\b|--force-with-lease|\s-f\b)/, "force push é proibido à fábrica"],
  [/\bgit\s+rebase\b/, "git rebase é proibido (use merge)"],
  [/\bgit\s+reset\s+--hard\b/, "git reset --hard é proibido"],
  [/\bgh(\.exe)?["']?\s+pr\s+merge\b/, "o merge do PR é o Checkpoint 2 e pertence ao humano"],
  [/\bgh(\.exe)?["']?\s+[^\n]*--auto\b/, "auto-merge é proibido"],
];

// ---------- regras extras dos subagentes (nunca commitam, nunca usam gh) ----------
const SUBAGENT_BASH = [
  [/\bgit\s+(commit|push|merge|rebase|reset|stash|cherry-pick|tag)\b/, "subagentes não fazem commit/push/merge/reset/stash; isso é do orquestrador"],
  [/\bgit\s+(switch\s+-c|switch\s+--create|checkout\s+-b)\b/, "subagentes não criam branches"],
  [/\bgit\s+branch\s+(?!-{1,2}(show-current|list|a|r|v|vv|all|remotes)\b)[^\s-]/, "subagentes não criam branches"],
  [/\bgh(\.exe)?["']?\s/, "subagentes não usam a CLI gh"],
];

// ---------- escopo de escrita por papel ----------
const NOTES = /^specs\/[^/]+\/notes\//;
const QA_TEST_PATH = [
  /(^|\/)(tests?|__tests__|e2e|cypress|playwright|acceptance|acceptance-tests)\//i,
  /\.(test|spec)\.[cm]?[jt]sx?$/i,
  /(^|\/)test_[^/]+\.py$/i,
  /_test\.(py|go)$/i,
];

const EDIT_SCOPE = {
  orquestrador: {
    ok: (p) => /^specs\/[^/]+\/state\.json$/.test(p) || NOTES.test(p),
    msg: "o orquestrador só escreve state.json e notes/ (código é do Desenvolvedor)",
  },
  "analista-requisitos": {
    ok: (p) => /^specs\//.test(p),
    msg: "o Analista só escreve em specs/**",
  },
  arquiteto: {
    ok: (p) => /^specs\//.test(p) || p === "AGENTS.md" || p === "CLAUDE.md",
    msg: "o Arquiteto só escreve em specs/** e no arquivo de contexto (AGENTS.md/CLAUDE.md)",
  },
  "criador-tarefas": {
    ok: (p) => /^specs\/[^/]+\/tasks\.md$/.test(p) || NOTES.test(p),
    msg: "o Criador de Tarefas só escreve tasks.md e notes/",
  },
  revisor: {
    ok: (p) => /^specs\/[^/]+\/review-report\.md$/.test(p) || NOTES.test(p),
    msg: "o Revisor só escreve review-report.md e notes/",
  },
  "revisor-codigo": {
    ok: (p) => /^specs\/[^/]+\/review-report\.md$/.test(p) || NOTES.test(p),
    msg: "o Revisor só escreve review-report.md e notes/",
  },
  desenvolvedor: {
    // Reforça no cabeçalho o que no opencode era só regra de prompt.
    ok: (p) =>
      !/^\.specify\//.test(p) &&
      !/(^|\/)\.env(\.(?!example$)[^/]+)?$/.test(p) &&
      (!/^specs\//.test(p) || /^specs\/[^/]+\/tasks\.md$/.test(p) || NOTES.test(p)),
    msg: "o Desenvolvedor não altera spec/plano/relatórios/.specify nem .env/.env.local (só .env.example); em specs/ só marca [X] em tasks.md",
  },
  qa: {
    ok: (p) =>
      /^specs\/[^/]+\/qa-report\.md$/.test(p) || NOTES.test(p) || QA_TEST_PATH.some((r) => r.test(p)),
    msg: "o QA só escreve testes e qa-report.md (se o diretório de testes do plan.md for outro, ajuste QA_TEST_PATH em .claude/hooks/guard.js)",
  },
};

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: `[Fábrica] ${reason}`,
      },
    })
  );
  process.exit(0);
}

function relPath(filePath, cwd) {
  const root = process.env.CLAUDE_PROJECT_DIR || cwd || process.cwd();
  const fp = toNative(filePath);
  const abs = path.isAbsolute(fp) ? fp : path.resolve(cwd || root, fp);
  return path.relative(root, abs).split(path.sep).join("/");
}

function normalizeGit(cmd) {
  // "git -C dir push", "git -c k=v commit" → "git push", "git commit"
  return cmd.replace(/\bgit\s+((-C|-c)\s+("[^"]*"|'[^']*'|\S+)\s+)+/g, "git ");
}

// ---------- escritas feitas pelo shell (redirecionamento, tee, sed -i, rm, mv, cp...) ----------
// Limite conhecido: interpretadores (node -e, python -c, powershell -Command) e scripts
// que gravam arquivos por conta própria não são analisados.
function toNative(p) {
  if (process.platform !== "win32") return p;
  const m = p.match(/^\/([a-zA-Z])\/(.*)$/); // caminho estilo Git Bash: /c/pasta
  return m ? `${m[1].toUpperCase()}:/${m[2]}` : p;
}

function parseShell(cmd) {
  const kept = [];
  let end = null;
  for (const line of cmd.split("\n")) {
    if (end !== null) {
      if (line.trim() === end) end = null;
      continue;
    }
    kept.push(line);
    const m = line.match(/<<-?\s*['"]?([A-Za-z0-9_]+)['"]?/);
    if (m) end = m[1]; // corpo do heredoc não é comando
  }
  const s = kept.join("\n");
  const segs = [];
  let seg = { words: [], redirs: [] };
  let pending = null; // "w" = alvo de redirecionamento de escrita; "skip" = alvo a ignorar
  let w = "";
  let inW = false;
  let q = null;
  const pushWord = () => {
    if (!inW) return;
    const word = w;
    w = "";
    inW = false;
    if (pending === "w") seg.redirs.push({ path: word, dir: false });
    else if (pending !== "skip") seg.words.push(word);
    pending = null;
  };
  const endSeg = () => {
    pushWord();
    pending = null;
    if (seg.words.length || seg.redirs.length) segs.push(seg);
    seg = { words: [], redirs: [] };
  };
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === q) q = null;
      else w += c;
      continue;
    }
    if (c === '"' || c === "'") {
      q = c;
      inW = true;
      continue;
    }
    if (c === " " || c === "\t" || c === "\r") {
      pushWord();
      continue;
    }
    if (c === "\n" || c === ";") {
      endSeg();
      continue;
    }
    if (c === "|" || c === "&" || c === ">" || c === "<") {
      pushWord();
      let op = c;
      while (i + 1 < s.length && "|&<>".includes(s[i + 1]) && op.length < 3) op += s[++i];
      if (op === "|" || op === "&&" || op === "||" || op === "&" || op === "|&") endSeg();
      else if (op.endsWith("&") && op.includes(">")) pending = "skip"; // duplicação de fd, ex.: 2>&1
      else if (op.includes(">")) pending = "w";
      else pending = "skip"; // <, <<, <<<
      continue;
    }
    w += c;
    inW = true;
  }
  endSeg();
  return segs;
}

const SHELL_WRITE_ALL = new Set(["rm", "rmdir", "touch", "mkdir", "truncate", "mv", "tee", "move-item", "remove-item"]);
const SHELL_WRITE_LAST = new Set(["cp", "install", "ln", "copy-item"]);
const SHELL_WRITE_FIRST = new Set(["set-content", "add-content", "out-file", "new-item", "clear-content"]);

function checkShellWrites(cmd, scope, cwd) {
  let cur = cwd || process.cwd();
  for (const seg of parseShell(cmd)) {
    let words = seg.words.slice();
    while (words.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[0])) words.shift();
    let list = [];
    if (words.length) {
      const name = path.basename(words[0]).toLowerCase().replace(/\.exe$/, "");
      const rest = words.slice(1);
      const flags = rest.filter((a) => a.startsWith("-"));
      const args = rest.filter((a) => !a.startsWith("-"));
      const dir = name === "mkdir" || name === "rmdir";
      if (name === "cd" && args[0]) cur = path.resolve(cur, toNative(args[0]));
      else if (SHELL_WRITE_ALL.has(name)) list = args.map((p) => ({ path: p, dir }));
      else if (SHELL_WRITE_LAST.has(name)) list = args.slice(-1).map((p) => ({ path: p, dir }));
      else if (SHELL_WRITE_FIRST.has(name)) list = args.slice(0, 1).map((p) => ({ path: p, dir }));
      else if (name === "sed") {
        const inPlace = flags.some((f) => f.startsWith("--in-place") || (!f.startsWith("--") && /^-[a-zA-Z]*i/.test(f)));
        if (inPlace) {
          const scriptFlag = flags.some((f) => /^-[a-zA-Z]*[ef]/.test(f) || f.startsWith("--expression") || f.startsWith("--file"));
          list = (scriptFlag ? args : args.slice(1)).map((p) => ({ path: p, dir: false }));
        }
      }
    }
    for (const t of seg.redirs.concat(list)) {
      if (!t.path || /^(\/dev\/|nul$)/i.test(t.path)) continue;
      const rel = relPath(t.path, cur);
      if (rel === ".." || rel.startsWith("../")) continue; // fora do projeto: não é escopo da fábrica
      if (!scope.ok(rel) && !(t.dir && scope.ok(rel + "/"))) {
        return `${scope.msg}. Escrita via shell recusada: ${rel} (use as ferramentas Edit/Write)`;
      }
    }
  }
  return null;
}

function main(input) {
  const tool = input.tool_name;
  const ti = input.tool_input || {};
  const agentType = input.agent_type || "";
  const role = agentType.startsWith(ROLE_PREFIX) ? agentType.slice(ROLE_PREFIX.length) : "";

  if (tool === "Bash") {
    const cmd = normalizeGit(String(ti.command || ""));
    for (const [re, why] of GLOBAL_BASH) if (re.test(cmd)) deny(why);
    if (role && role !== "orquestrador") {
      for (const [re, why] of SUBAGENT_BASH) if (re.test(cmd)) deny(why);
    }
    const scope = EDIT_SCOPE[role];
    if (scope) {
      const why = checkShellWrites(String(ti.command || ""), scope, input.cwd);
      if (why) deny(why);
    }
    return;
  }

  if (["Write", "Edit", "MultiEdit", "NotebookEdit"].includes(tool)) {
    const scope = EDIT_SCOPE[role];
    if (!scope) return;
    const target = ti.file_path || ti.notebook_path;
    if (!target) return;
    const rel = relPath(String(target), input.cwd);
    if (rel.startsWith("../")) deny(`escrita fora do projeto bloqueada: ${rel}`);
    if (!scope.ok(rel)) deny(`${scope.msg}. Arquivo recusado: ${rel}`);
  }
}

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (d) => (raw += d));
process.stdin.on("end", () => {
  let input = {};
  try {
    input = JSON.parse(raw || "{}");
  } catch {
    process.exit(0); // entrada ilegível: não bloqueia
  }
  try {
    main(input);
  } catch (e) {
    fs.appendFileSync(path.join(__dirname, "..", "guard-error.log"), `${new Date().toISOString()} ${e.stack}\n`);
  }
  process.exit(0);
});
