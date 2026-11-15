# Pet Control Constitution

Sistema de gestão da ONG SalvaCão (resgates, adoções, estoque, tratamentos; cerca de 10
voluntários). O código fica em `petcontrol-next/`.

## Core Principles

### I. Organização por Feature (Vertical Slices)

- O código de cada módulo MUST ficar em `petcontrol-next/app/`, dentro de `(dashboard)/<modulo>/`
  ou `(auth)/`, com `_actions/` (Server Actions), `_components/` (UI) e `_schemas/` (Zod) do
  próprio módulo.
- Código compartilhado MUST ir para `lib/` apenas quando usado por mais de um módulo: lógica pura
  em `lib/domain/`, autenticação em `lib/auth/`, clientes Supabase em `lib/supabase/`.
- Um módulo MUST NOT importar `_actions/`, `_components/` ou `_schemas/` de outro módulo; o que
  for comum é promovido para `lib/` ou `components/`.

Justificativa: manter cada feature localizada facilita a revisão, o teste e a manutenção por uma
equipe pequena de voluntários.

### II. Server Actions Protegidas (NÃO NEGOCIÁVEL)

- Toda Server Action MUST chamar `requireUser()` (`lib/auth/require-user.ts`) como primeira
  instrução, antes de qualquer leitura de entrada ou acesso ao banco.
- Toda Server Action MUST retornar `ActionResult<T>` (`lib/actions/result.ts`), usando os helpers
  `sucesso`, `invalido` e `falha`.
- Erros do banco MUST NOT ser propagados ao cliente; a mensagem real é logada no servidor e o
  cliente recebe mensagem genérica.
- O `middleware.ts` MUST NOT ser tratado como camada suficiente de autorização.

Justificativa: Server Actions são endpoints HTTP públicos. A guarda dentro da action é a camada de
segurança que importa.

### III. Validação de Entrada com Zod

- Toda entrada vinda do cliente (formulários, parâmetros de action, query string) MUST ser
  validada por um schema Zod definido no `_schemas/` do módulo.
- O mesmo schema MUST ser usado no formulário (react-hook-form via resolver) e na Server Action;
  a validação no servidor é obrigatória mesmo havendo validação no cliente.
- Falha de validação MUST retornar `invalido(erro)` com os erros por campo.

Justificativa: um único contrato de dados evita divergência entre UI e servidor e bloqueia entrada
malformada na fronteira.

### IV. Testes Automatizados Obrigatórios (NÃO NEGOCIÁVEL)

- Toda feature MUST entregar testes automatizados cobrindo, no mínimo, os schemas Zod, a lógica de
  `lib/domain/` e as Server Actions (incluindo o caso não autenticado e o caso de entrada inválida).
- Testes MUST NOT acessar o banco real do Supabase; o cliente Supabase MUST ser substituído por
  mocks ou stubs.
- Hoje o projeto não tem framework de testes nem script `test`. O primeiro `plan.md` MUST
  configurar o framework (sugestão, a confirmar pelo Arquiteto: Vitest), adicionar o script `test`
  ao `package.json` e declarar o comando completo (ex.: `npm --prefix petcontrol-next run test`).
  Todo plano posterior MUST declarar o comando de teste.
- Um plano sem comando de teste declarado MUST ser reprovado.

Justificativa: sem testes, a fábrica não tem como verificar automaticamente que uma feature cumpre
a especificação; mocks protegem os dados reais da ONG.

### V. Portões de Qualidade: Lint e Build

- `npm --prefix petcontrol-next run lint` e `npm --prefix petcontrol-next run build` MUST passar
  sem erros antes de qualquer pull request.
- Avisos novos de lint MUST ser corrigidos ou justificados na revisão.

Justificativa: lint e build são os verificadores que o projeto já possui; nenhuma entrega pode
regredi-los.

### VI. Segredos Fora do Repositório

- `petcontrol-next/.env.local` e qualquer arquivo com credenciais MUST NOT ser commitados, lidos
  para artefatos da fábrica ou editados por agentes.
- Apenas `petcontrol-next/.env.example`, com nomes de variáveis e sem valores reais, MAY ser
  versionado.
- Chaves, tokens e URLs privadas MUST NOT aparecer em código, specs, planos, logs ou notas.

Justificativa: o repositório é compartilhado; um segredo vazado expõe dados da ONG e dos adotantes.

### VII. Banco Só por Migração Versionada

- Toda mudança de schema MUST ser feita por arquivo de migração em
  `petcontrol-next/supabase/migrations/`, com prefixo de timestamp.
- Agentes MUST NOT executar migrações, escritas ou comandos destrutivos contra o banco real
  (Supabase, plano Free).
- Ao alterar o schema, `lib/database.types.ts` MUST ser atualizado na mesma entrega.
- Novas tabelas MUST ter RLS habilitado.

Justificativa: o banco real guarda os dados de produção da ONG; migrações versionadas tornam toda
mudança revisável e reproduzível.

### VIII. Simplicidade e Legibilidade

- TypeScript MUST rodar em modo estrito (`"strict": true`); `any` e `as` para silenciar o
  compilador MUST NOT ser usados sem justificativa na revisão.
- Código morto (funções, imports, arquivos ou trechos comentados sem uso) MUST NOT ser entregue.
- Comentários MUST explicar o porquê ou um contexto não óbvio, nunca repetir o que o código diz.
- Em código novo ou alterado, datas e horas MUST usar o helper de `lib/domain/data-local.ts`, não
  `new Date()` espalhado. Usos antigos fora do trecho alterado não obrigam refatoração.
- A solução mais simples que atende à especificação MUST ser preferida; abstrações novas exigem
  justificativa no plano.

Justificativa: a equipe é pequena e rotativa; código simples é o que sobrevive à troca de
voluntários.

### IX. Uma Branch por Especificação, Merge Humano

- Cada especificação MUST ser desenvolvida em sua própria branch, criada a partir da branch base
  registrada no `state.json` (normalmente `main`; a branch da especificação anterior, quando uma
  depende da outra).
- Todo código MUST passar por revisão de código e por QA antes da abertura do pull request.
- O merge MUST ser feito apenas por um humano. Agentes MUST NOT fazer merge, force push ou deploy.

Justificativa: a aprovação humana é o controle final sobre o que entra em produção.

## Stack e Restrições Técnicas

- Next.js 16 (App Router, Server Actions), React 19, TypeScript, Tailwind 4 e shadcn/ui.
- Supabase (`@supabase/ssr`, Postgres e Auth); react-hook-form com Zod; TanStack Query.
- Node 20 ou superior. Todo comando de projeto roda da raiz com `npm --prefix petcontrol-next ...`
  ou dentro de `petcontrol-next/`.
- `.specify/` e `specs/` ficam na raiz do repositório. Anotações de controle vão em
  `specs/<feature>/notes/`.
- `.github/workflows/` e `docs/backup-e-restauracao.md` MUST NOT ser alterados sem pedido explícito.
- Novas dependências MUST ser justificadas no plano.

## Fluxo de Desenvolvimento e Portões de Qualidade

1. Especificação (`/speckit-specify`) aprovada pelo humano (Checkpoint 1).
2. Plano técnico (`/speckit-plan`) verificado contra esta constituição, incluindo o comando de
   teste declarado.
3. Tarefas (`/speckit-tasks`) rastreáveis à especificação, com tarefas de teste.
4. Implementação na branch da especificação.
5. Revisão de código: conformidade com os princípios I, II, III, VI, VII e VIII.
6. QA: testes, lint e build passando (princípios IV e V).
7. Pull request aberto; merge feito pelo humano (Checkpoint 2).

## Governance

- Esta constituição prevalece sobre outras práticas e instruções do projeto. Em conflito, ela vence.
- Emendas MUST ser feitas via `/speckit-constitution`, com Sync Impact Report, e aprovadas pelo
  humano antes do commit.
- Versionamento semântico: MAJOR para remoção ou redefinição incompatível de princípio; MINOR para
  princípio ou seção nova, ou orientação materialmente ampliada; PATCH para esclarecimentos e
  redação.
- Todo plano MUST incluir uma verificação de conformidade com a constituição; toda revisão e todo
  QA MUST verificar os princípios aplicáveis. Exceções MUST ser justificadas por escrito no plano.
- Orientação operacional de runtime: `CLAUDE.md` e `docs/fabrica/`.

**Version**: 1.0.0 | **Ratified**: 2026-11-15 | **Last Amended**: 2026-11-15
