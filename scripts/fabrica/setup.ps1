# Verifica os pré-requisitos da Fábrica de Software no Claude Code (Windows / PowerShell).
# Não instala nada: mostra o que falta e o comando para corrigir.
$ErrorActionPreference = "Continue"

function Test-Tool($nome, $comando, $dica) {
    $cmd = Get-Command $comando -ErrorAction SilentlyContinue
    if ($cmd) { Write-Host "[ok]  $nome" -ForegroundColor Green }
    else      { Write-Host "[--]  $nome ausente. $dica" -ForegroundColor Yellow }
    return [bool]$cmd
}

Write-Host "== Pré-requisitos ==" -ForegroundColor Cyan
Test-Tool "Git"          "git"     "https://git-scm.com/download/win" | Out-Null
Test-Tool "Node.js 18+"  "node"    "https://nodejs.org (os hooks usam Node)" | Out-Null
Test-Tool "Claude Code"  "claude"  "https://code.claude.com/docs/en/setup" | Out-Null
$temUv = Test-Tool "uv (para o Spec Kit)" "uv" "powershell -c `"irm https://astral.sh/uv/install.ps1 | iex`""
$temGh = Test-Tool "GitHub CLI (gh)" "gh" "winget install GitHub.cli"
if (-not $temGh -and (Test-Path "C:\Program Files\GitHub CLI\gh.exe")) {
    Write-Host "      gh instalado em C:\Program Files\GitHub CLI\gh.exe (fora do PATH)" -ForegroundColor Yellow
}

Write-Host "`n== Repositório ==" -ForegroundColor Cyan
if (Test-Path ".git") {
    git remote get-url origin 2>$null | ForEach-Object { Write-Host "[ok]  origin = $_" -ForegroundColor Green }
    if (-not (git remote get-url origin 2>$null)) { Write-Host "[--]  sem remoto origin. gh repo create <nome> --private --source . --push" -ForegroundColor Yellow }
    if ($temGh) { gh auth status 2>&1 | Select-Object -First 2 }
} else {
    Write-Host "[--]  não é um repositório git. Clone o repositório do seu projeto e copie esta pasta .claude/ para dentro dele." -ForegroundColor Yellow
}

Write-Host "`n== Spec Kit ==" -ForegroundColor Cyan
if (Test-Path ".claude\skills\speckit-specify") { Write-Host "[ok]  skills speckit-* instaladas" -ForegroundColor Green }
else {
    Write-Host "[--]  skills do Spec Kit ausentes. Rode, na raiz do projeto:" -ForegroundColor Yellow
    Write-Host "      uv tool install specify-cli"
    Write-Host "      specify integration install claude     # projeto já existente"
    Write-Host "      (ou: specify init <nome> --integration claude)"
}
if (Test-Path ".specify\memory\constitution.md") { Write-Host "[ok]  constituição presente (confira se não tem placeholders)" -ForegroundColor Green }
else { Write-Host "[--]  sem constituição. No Claude Code rode /speckit-constitution" -ForegroundColor Yellow }

Write-Host "`n== Fábrica ==" -ForegroundColor Cyan
$agentes = Get-ChildItem ".claude\agents\fabrica-*.md" -ErrorAction SilentlyContinue
Write-Host "agentes encontrados: $($agentes.Count) (esperado: 7)"
if ($env:SLACK_WEBHOOK_URL -or (Select-String -Path ".claude\settings.local.json" -Pattern "SLACK_WEBHOOK_URL" -Quiet -ErrorAction SilentlyContinue)) {
    Write-Host "[ok]  SLACK_WEBHOOK_URL configurada" -ForegroundColor Green
} else {
    Write-Host "[--]  Slack: copie .claude\settings.local.json.example para .claude\settings.local.json e ponha a URL do Incoming Webhook (sem ela, o aviso só vai para .claude\logs\slack-outbox.jsonl)" -ForegroundColor Yellow
}
Write-Host "`nPara iniciar: abra o Claude Code nesta pasta (o orquestrador já é o agente padrão)."
