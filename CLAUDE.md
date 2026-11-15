2# Regra de Alternância de Modelos Claude

> Objetivo: usar o modelo certo para cada tipo de tarefa, otimizando custo, velocidade e qualidade — sem desperdiçar poder de raciocínio em execução mecânica, nem economizar em tarefas que exigem julgamento.

---

## 1. Princípio geral

Modelos maiores (Opus) raciocinam melhor em ambiguidade, trade-offs e decisões com múltiplas variáveis, mas custam mais e são mais lentos. Modelos menores (Sonnet/Haiku) executam tarefas bem definidas com quase a mesma qualidade, por uma fração do custo/tempo.


**Regra de ouro:** o modelo é escolhido pela *natureza da decisão a ser tomada*, não pelo tamanho da tarefa.

- Se a tarefa exige **decidir "o quê" e "como"** → modelo maior (Opus).
- Se a tarefa exige apenas **executar um "o quê" já decidido** → modelo menor (Sonnet/Haiku).

---

## 2. Quando usar **Opus**

Use Opus quando a tarefa envolver pelo menos um destes critérios:

| Critério | Exemplo no contexto do trabalho |
|---|---|
| Decisões arquiteturais ou de design | Escolher como estruturar um novo microserviço no SIGAE, decidir padrão de comunicação entre serviços |
| Planejamento com múltiplas etapas dependentes | Planejar a migração do ambiente DEV01 para DEV02, definir ordem de execução de uma investigação SQL complexa |
| Ambiguidade real (múltiplos caminhos válidos) | Investigar a discrepância de contagem de escolas entre SIGAE e banco, onde a causa raiz não é óbvia |
| Trade-offs com impacto relevante | Decidir entre reescrever um endpoint vs. adicionar camada de compatibilidade |
| Diagnóstico de bugs não triviais | Bug que atravessa múltiplos serviços/repositórios sem causa evidente |
| Revisão crítica de plano ou arquitetura já escrita | Validar se um plano de implementação tem lacunas antes de executar |
| Escrita que exige julgamento fino | Documento estratégico, proposta técnica, mensagem sensível a stakeholder |

**Regra prática:** se a pergunta certa é "qual é a melhor abordagem?" → Opus.

---

## 3. Quando usar **Sonnet**

Sonnet é o padrão para a maior parte do trabalho do dia a dia — bom equilíbrio entre qualidade e custo.

Use Sonnet quando:

- O plano já existe e a tarefa é implementá-lo (ex: escrever o código de um endpoint já especificado).
- Refatoração ou correção de bugs com escopo claro e contido.
- Escrever queries SQL, scripts PowerShell, configs (Docker Compose, YAML) a partir de uma especificação clara.
- Revisão de código (code review) de rotina.
- Conversão/tradução de documentação técnica.
- Testes de QA, casos de teste, scripts de automação.

**Regra prática:** se a pergunta certa é "implemente isso da forma X" → Sonnet.

---

## 4. Quando usar **Haiku**

Use Haiku para tarefas repetitivas, mecânicas ou de altíssimo volume, onde a variação de qualidade entre modelos é irrelevante:

- Formatação de texto/código já correto (indentação, nomes de variáveis, padronização).
- Geração de boilerplate repetitivo (ex: gerar 20 arquivos de configuração seguindo o mesmo template).
- Conversões simples de formato (CSV → JSON, snake_case → camelCase).
- Resumos curtos e diretos de logs ou outputs.
- Respostas de triagem rápida (sim/não, extrair um valor de um arquivo).

**Regra prática:** se a tarefa não exige nenhuma decisão, apenas transformação mecânica → Haiku.

---

## 5. Fluxo recomendado (planejar → executar)

Para tarefas médias/grandes, dividir explicitamente em duas fases e trocar de modelo entre elas:

```
1. FASE DE PLANEJAMENTO (Opus)
   - Definir escopo, riscos, ordem de execução, decisões de design
   - Produzir um plano escrito (passos numerados, decisões já tomadas)

2. FASE DE EXECUÇÃO (Sonnet ou Haiku)
   - Seguir o plano literalmente
   - Não redecidir arquitetura — só implementar
   - Se surgir uma decisão não prevista no plano → voltar para Opus antes de continuar
```

**Sinal de alerta:** se durante a execução com Sonnet/Haiku surgir uma pergunta do tipo "e se eu fizesse diferente?", isso é sinal de que a tarefa saiu do escopo de execução e deveria voltar para Opus.

---

## 6. Tabela de decisão rápida

| Situação | Modelo |
|---|---|
| "Como devo estruturar X?" | Opus |
| "Investigue por que X está acontecendo" (causa desconhecida) | Opus |
| "Implemente X seguindo o padrão Y já definido" | Sonnet |
| "Corrija esse bug pontual no arquivo Z" | Sonnet |
| "Escreva a query SQL para buscar X" | Sonnet |
| "Formate/converta esse arquivo" | Haiku |
| "Gere N arquivos repetitivos a partir deste template" | Haiku |
| "Esse plano está completo? Falta algo?" | Opus |
| "Revise esse texto/PR sem mudar a abordagem" | Sonnet |

---

## 7. Observação sobre custo x confiabilidade

- Em tarefas críticas para produção (SIGAE em ambiente que afeta dados reais/HMG), prefira subir um nível de modelo mesmo que a tarefa pareça simples — o custo de um erro supera a economia.
- Em exploração pessoal, estudo, ou rascunho descartável, prefira o modelo mais barato que resolva.

---

## 8. Aplicação prática (Claude Code / Cowork)

Ao iniciar uma tarefa, perguntar primeiro:

> "Isso exige que eu decida algo, ou apenas que eu execute algo já decidido?"

- **Decidir** → trocar para Opus, planejar, documentar o plano.
- **Executar** → manter/trocar para Sonnet (ou Haiku se for puramente mecânico) e seguir o plano.


---

# Fábrica de Software Agêntica (Claude Code)

Este repositório roda a Fábrica de Software da disciplina no Claude Code. O agente principal da sessão é o `fabrica-orquestrador` (definido em `.claude/settings.json`); ele aciona seis subagentes de `.claude/agents/`, um de cada vez, sobre o GitHub Spec Kit (`.claude/skills/speckit-*`).

- Prompts originais do professor: `scripts/fabrica/origem-opencode/`. Os agentes do Claude Code são gerados deles por `node scripts/fabrica/converter-agentes.js`; para mudar o comportamento de um papel, edite o original e gere de novo (ou edite `.claude/agents/` e registre a diferença).
- Escopo de escrita e restrições de git/gh por papel: `.claude/hooks/guard.js` (testes: `node scripts/fabrica/test-hooks.js`). Aviso no Slack por subagente: `.claude/hooks/slack-notify.js`.
- Só o humano aprova a spec (Checkpoint 1) e faz o merge (Checkpoint 2). Nunca faça merge, force push ou deploy.
- Anotações de controle vão em `specs/<feature>/notes/`, nunca na raiz.
- `.specify/` e `specs/` ficam na **raiz do repositório**, não dentro de `petcontrol-next/`.
- Documentação da fábrica: `docs/fabrica/`.

## Projeto: Pet Control (ONG SalvaCão)

Reescrita do sistema de gestão da ONG (resgates, adoções, estoque, tratamentos; cerca de 10 voluntários). O sistema legado em Java foi removido deste repositório; o histórico do git o preserva.

**Onde está o código.** O app fica em `petcontrol-next/`, não na raiz. Todo comando de projeto roda da raiz com `npm --prefix petcontrol-next ...` ou dentro dessa pasta.

**Stack** (conforme `petcontrol-next/package.json`): Next.js 16 (App Router, Server Actions), React 19, TypeScript, Tailwind 4 e shadcn/ui, Supabase (`@supabase/ssr`, Postgres e Auth), react-hook-form com Zod, TanStack Query. Node 20 ou superior.

**Organização por feature** (vertical slices) dentro de `petcontrol-next/app/`:
- `(auth)/login/` para autenticação e `(dashboard)/` para a área autenticada; cada módulo (`animais`, `adocoes`, `agenda`, `produtos`, `dashboard`) pode ter `_actions/`, `_components/` e `_schemas/` (Zod).
- `lib/auth/require-user.ts`, `lib/actions/result.ts` (contrato `ActionResult<T>`), `lib/domain/` (lógica pura, como datas locais) e `lib/supabase/`.

**Regras do código existente que toda feature deve seguir:**
- Toda Server Action começa chamando `requireUser()` e retorna `ActionResult<T>`. Server Actions são endpoints HTTP públicos: a guarda na action é a camada que importa, o `middleware.ts` não basta.
- Validação de entrada com Zod, no `_schemas/` do módulo.
- Datas e horas pelo helper de `lib/domain/data-local.ts`, não por `new Date()` espalhado.

**Comandos de verificação.** Existem `lint` e `build`; **não existe framework de testes nem script `test`**.
```bash
npm --prefix petcontrol-next ci
npm --prefix petcontrol-next run lint
npm --prefix petcontrol-next run build
```
O comando de teste é obrigatório para a fábrica (o orquestrador reprova o plano sem ele). Portanto o primeiro `plan.md` precisa prever a configuração de um framework de testes (sugestão, a confirmar pelo Arquiteto: Vitest) e declarar o comando completo. A constituição deve registrar essa lacuna.

**Segredos e ambiente.** `petcontrol-next/.env.local` guarda `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Nunca commitar, ler para os artefatos ou editar: só `.env.example` (sem valores reais) é versionado. Testes usam mocks ou stubs do Supabase, nunca o banco real.

**Banco.** O schema real vive no Supabase (plano Free); as migrações versionadas ficam em `petcontrol-next/supabase/migrations/`. `lib/database.types.ts` foi escrito à mão e pode estar desatualizado. Não execute migração nem escrita contra o banco real.

**Não alterar sem pedido explícito:** `.github/workflows/` (backup e keep-alive do Supabase) e `docs/backup-e-restauracao.md`. As instruções em `.github/instructions/` são do período da refatoração e citam caminhos antigos (`c:\PetControl\...`): consulte-as pelo conteúdo, mas não siga os caminhos.
