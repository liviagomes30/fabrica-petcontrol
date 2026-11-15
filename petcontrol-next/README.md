# petcontrol-next

Reescrita do sistema de gestão da ONG SalvaCão (Pet Control) em Next.js 16 (App Router + Server Actions), React 19 e Supabase (Postgres + Auth).

## Stack

- Next.js 16 / React 19 (Server Components + Server Actions)
- Supabase (Postgres, Auth) via `@supabase/ssr`
- react-hook-form + Zod para validação de formulários
- shadcn/ui + Tailwind CSS
- TanStack Query (client-side, quando necessário)

## Requisitos

- Node.js 20+
- Um projeto Supabase (URL + chave anônima)

## Setup

```bash
npm install
```

Crie `.env.local` na raiz de `petcontrol-next` com:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<seu-projeto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<chave-anonima>
```

```bash
npm run dev      # ambiente de desenvolvimento
npm run build    # build de produção
npm run lint     # ESLint
```

## Estrutura

Organização por feature (vertical slices) dentro de `app/`:

```
app/(auth)/login/           # autenticação
app/(dashboard)/            # área autenticada — layout.tsx checa sessão
  animais/_actions/         # Server Actions do módulo
  animais/_components/
  animais/_schemas/         # validação Zod
lib/auth/require-user.ts    # guarda de autenticação para toda Server Action
lib/actions/result.ts       # contrato único de retorno (ActionResult<T>)
lib/domain/                 # lógica de domínio pura (datas locais, etc.)
```

Toda Server Action de leitura/escrita começa chamando `requireUser()` (definido
em `lib/auth/require-user.ts`) e retorna `ActionResult<T>` (`lib/actions/result.ts`).
O `middleware.ts` na raiz cobre a navegação, mas a guarda na action é a camada
que realmente importa — Server Actions são endpoints HTTP públicos.

## Schema do banco

O schema está versionado em `supabase/migrations/`, a partir do `supabase db pull`
contra o projeto real (25 tabelas em `public`, incluindo `agendamedicacao`,
`posologia_customizada` e `protocolo_vacinal`):

| Migração | O que traz |
|---|---|
| `20260809183009_remote_schema.sql` | Schema remoto completo |
| `20260809183626_enable_rls_remaining_tables.sql` | Habilita Row Level Security nas tabelas que estavam sem ela |
| `20260810115659_remote_schema.sql` | Sincronização posterior com o schema remoto |

Para trazer mudanças feitas no painel do Supabase, rode `npm run db:pull` (precisa de
`npm run db:login` e `npm run db:link` na primeira vez) e commite o resultado.

O sistema legado em Java, que era a origem do schema, foi removido deste repositório.

### Limitação conhecida: tipos do banco

`lib/database.types.ts` ainda é o arquivo escrito à mão a partir do SQL legado
(última atualização em 2026-01-26). Ele **não** contém as tabelas `agendamedicacao`,
`posologia_customizada` nem `protocolo_vacinal`, então use-o com cautela. O caminho
é regerá-lo a partir do banco com `supabase gen types typescript` (por exemplo,
`npx supabase gen types typescript --linked > lib/database.types.ts`, com o projeto
já vinculado por `npm run db:link`) e revisar o diff antes de commitar. Esse
comando ainda não foi executado neste projeto.

## Banco de dados, backup e keep-alive

Decisão registrada: continuar no **Supabase, plano Free**, para o perfil desta
ONG (~10 voluntários, uso esporádico, volume de dados pequeno) — trocar de
banco neste estágio custaria semanas de retrabalho (151 chamadas PostgREST,
auth, RLS planejado) para resolver um problema que este projeto não tem.

Os dois riscos reais do Free tier (pausa por inatividade e ausência de backup
automático) são cobertos por duas GitHub Actions já configuradas
(`.github/workflows/backup-supabase.yml` e `keepalive-supabase.yml`).
Setup dos secrets, teste de restauração e migrations: **[`docs/backup-e-restauracao.md`](../docs/backup-e-restauracao.md)**.
