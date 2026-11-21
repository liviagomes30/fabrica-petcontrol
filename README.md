# Pet Control

[![CI](https://github.com/liviagomes30/fabrica-petcontrol/actions/workflows/ci.yml/badge.svg)](https://github.com/liviagomes30/fabrica-petcontrol/actions/workflows/ci.yml)

Sistema de gestão da **ONG SalvaCão** (proteção animal): resgates, adoções, estoque e tratamentos. É a reescrita de um sistema legado em Java e HTML/JS para **Next.js 16 e Supabase**, desenvolvida com uma **fábrica de software agêntica** no Claude Code (veja [a seção da fábrica](#fábrica-de-software-agêntica-claude-code)).

## O que o sistema faz

Área autenticada (login pelo Supabase Auth) com os módulos:

| Módulo | Para que serve |
|---|---|
| **Dashboard** | Totais de animais (para adoção, adotados, em tratamento), próximos compromissos, resumo de saúde e ações rápidas |
| **Animais** | Cadastro e ficha de cada animal, com medicação e vacinação |
| **Adoções** | Registro e acompanhamento das adoções |
| **Agenda** | Compromissos de saúde, como doses e vacinas |
| **Produtos** | Estoque de produtos e medicamentos |

## Stack

| Camada | Tecnologia |
|---|---|
| Aplicativo | Next.js 16 (App Router, Server Actions), React 19, TypeScript |
| Interface | Tailwind CSS 4, shadcn/ui, Radix UI |
| Formulários | react-hook-form com Zod |
| Dados | Supabase (Postgres, Auth e `@supabase/ssr`), TanStack Query |
| Testes | Vitest, jsdom e Testing Library |
| CI | GitHub Actions |

## Estrutura do repositório

```text
.
├── petcontrol-next/        # o aplicativo Next.js
│   ├── app/                # rotas, organizadas por feature: (auth), (dashboard)/<módulo>
│   ├── components/ui/      # componentes shadcn/ui
│   ├── lib/                # auth, actions, domain (lógica pura) e supabase
│   ├── supabase/           # configuração e migrações do banco
│   └── tests/              # Vitest: unit/ e acceptance/
├── specs/                  # uma pasta por feature: spec, plano, tarefas e relatórios (Spec Kit)
├── .specify/               # Spec Kit: constituição do projeto, templates e scripts
├── .claude/                # fábrica: agentes, comando /fabrica, hooks e skills
├── scripts/fabrica/        # conversor de agentes, testes dos hooks e verificação do ambiente
├── .github/workflows/      # CI, backup e keep-alive do Supabase
└── docs/                   # backup-e-restauracao.md
```

## Começando

**Pré-requisitos:** Node.js 20 ou superior (o CI usa a versão 22) e um projeto no Supabase.

```bash
cd petcontrol-next
npm install
```

Crie `petcontrol-next/.env.local` (o arquivo é ignorado pelo git) a partir de `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<seu-projeto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<chave-anônima>
```

Depois, `npm run dev` e abra http://localhost:3000. Comandos úteis, todos dentro de `petcontrol-next/`:

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run lint` | ESLint |
| `npm run test` | Testes (Vitest) |
| `npm run test:coverage` | Testes com cobertura (exige 100% de linhas e funções em `lib/domain/data-local.ts`) |
| `npm run db:login`, `db:link`, `db:pull`, `db:diff` | CLI do Supabase |

O guia do aplicativo, com a arquitetura por feature e as regras das Server Actions, está em [petcontrol-next/README.md](petcontrol-next/README.md).

## Banco de dados

O schema está versionado em `petcontrol-next/supabase/migrations/` (extraído do projeto real com `supabase db pull`). Uma das migrações habilita Row Level Security nas tabelas que estavam sem ela. Mudanças de schema só entram por migração versionada. O arquivo `lib/database.types.ts` ainda é escrito à mão e não tem todas as tabelas; o caminho é regerá-lo com `supabase gen types typescript`.

## Qualidade

- **CI** (`.github/workflows/ci.yml`): em todo pull request para `main`, roda `npm ci`, lint, build e testes.
- **Constituição do projeto** (`.specify/memory/constitution.md`): nove princípios que valem para toda feature, entre eles Server Actions sempre protegidas por `requireUser()`, validação de entrada com Zod, testes obrigatórios sem acessar o banco real, segredos fora do repositório e merge sempre feito por uma pessoa.

## Backup e keep-alive do Supabase

Dois workflows agendados cobrem as lacunas do plano gratuito do Supabase (sem backup automático e pausa por inatividade). O passo a passo, os secrets e a restauração estão em [docs/backup-e-restauracao.md](docs/backup-e-restauracao.md).

> **Atenção:** o backup semanal contém dados pessoais de adotantes e voluntários e é publicado como **Release do repositório**, mesmo que criptografado. Só configure os secrets do backup num repositório **privado**. Sem os secrets, os dois workflows agendados falham, o que é esperado.

## Fábrica de Software Agêntica (Claude Code)

As features são desenvolvidas por um **orquestrador** que aciona seis subagentes, um de cada vez, sobre o [GitHub Spec Kit](https://github.com/github/spec-kit): Analista de Requisitos, Arquiteto, Criador de Tarefas, Desenvolvedor, Revisor de Código e QA. A pessoa entra em dois pontos: **aprovar a especificação** e **fazer o merge**. O resto é verificado no disco, com testes rodando de verdade.

```text
/fabrica nova <demanda>        gera a spec para você aprovar (Checkpoint 1)
/fabrica implementar <spec>    plano, tarefas, código, revisão, QA e PR com CI verde
/fabrica retomar <spec>        continua de onde parou; registra a entrega depois do merge
/fabrica backlog <spec1> ...   várias specs em sequência
```

- **Onde fica:** agentes, comando e hooks em `.claude/`; cada feature em `specs/<feature>/`, com `spec.md`, `plan.md`, `tasks.md`, `review-report.md`, `qa-report.md` e o `state.json` do andamento. As instruções gerais estão em [CLAUDE.md](CLAUDE.md).
- **Como usar:** abra o projeto no Claude Code; o orquestrador já é o agente padrão (`.claude/settings.json`). É preciso ter o `git` e a CLI `gh` autenticada. Os scripts do Spec Kit instalados são em PowerShell.
- **Controles:** o hook `guard.js` limita onde cada papel pode escrever e bloqueia `commit`, `push`, `gh`, merge e force push para os subagentes. Para testá-lo sem o Claude Code: `node scripts/fabrica/test-hooks.js`.
- **Slack (opcional):** para receber um aviso a cada subagente que termina, copie `.claude/settings.local.json.example` para `.claude/settings.local.json` e ponha a URL de um Incoming Webhook. Esse arquivo é ignorado pelo git; sem ele, os avisos ficam só em `.claude/logs/`.
- **Origem:** a fábrica adapta para o Claude Code o projeto da disciplina (opencode e Spec Kit) do professor André Augusto Menegassi. Os prompts originais estão em `scripts/fabrica/origem-opencode/`, e `node scripts/fabrica/converter-agentes.js` gera os agentes do Claude Code a partir deles.

## Fluxo de trabalho

1. Uma branch por especificação, criada a partir da branch base.
2. Todo código passa por revisão de código e QA antes do pull request.
3. O CI precisa passar. O merge é feito por uma pessoa, nunca pela fábrica.

## Segurança

- `petcontrol-next/.env.local` e qualquer arquivo com credenciais nunca vão para o git; só o `.env.example`, sem valores, é versionado.
- Server Actions são endpoints HTTP públicos: toda ação começa com `requireUser()`, e o `middleware.ts` não é a única barreira.
- Os testes usam mocks do Supabase e nunca o banco real.
