# Post para o LinkedIn

> **Antes de publicar**
> 1. Se você já tiver feito o merge do PR #2, troque "aguardando o meu merge" por "mergeado".
> 2. No LinkedIn, digite `@André` e escolha o perfil dele na lista, para virar marcação de verdade.
> 3. Imagens sugeridas, do deck: slide 19 (guard bloqueando o Desenvolvedor), slide 14 (PR #1 mergeado), slide 22 (dashboard) e slide 16 (Slack, de preferência com um print novo, depois do hook corrigido).
> 4. Decida antes se o repositório fica público: o link abaixo leva ao código do app, ao schema do banco e aos prompts do professor.
> 5. Só mantenha números que a sua execução confirmou. Os de testes vêm das execuções do orquestrador e do CI.

---

No Projeto Final 4 da disciplina, o desafio foi pegar uma Fábrica de Software Agêntica e levá-la para outra plataforma. Escolhi o **Claude Code**.

A fábrica conduz uma feature da ideia ao pull request: um orquestrador aciona seis subagentes (Analista de Requisitos, Arquiteto, Criador de Tarefas, Desenvolvedor, Revisor de Código e QA), um de cada vez, sobre o GitHub Spec Kit. O humano só entra em dois pontos: aprovar a especificação e fazer o merge.

Rodei a fábrica de ponta a ponta em duas features reais de um app Next.js com Supabase: um relógio de data e hora no dashboard (PR mergeado, 56 testes, 100% de cobertura no módulo de datas) e uma saudação "bom dia, boa tarde, boa noite" abaixo dele (PR aguardando o meu merge, 138 testes). As duas passaram por spec aprovada por mim, plano, tarefas, implementação, revisão, QA e CI verde.

O que aprendi:

🔹 **Reaproveitar vale mais que reconstruir.** Mantive os prompts do professor; um script converte só o formato dos agentes.
🔹 **Permissão não é prompt.** Regras que estavam só no texto viraram hooks. Testei: o hook barrou o Desenvolvedor de editar a spec, com a mensagem do papel, antes de qualquer escrita em disco.
🔹 **Observabilidade também tem pegadinha.** Meu aviso no Slack dizia que faltava o relatório dos subagentes. Não faltava: eles entregavam por outra ferramenta. Só descobri porque passei a registrar o que o hook recebia.
🔹 **A fábrica devolve o que não conseguiu verificar** (login real, layout em 360 px). O humano continua nos dois pontos que importam.

Código, deck e documentação: https://github.com/liviagomes30/fabrica-petcontrol

Obrigada ao professor @André Augusto Menegassi pela disciplina e pelo material.

#IA #AgenticAI #ClaudeCode #SoftwareEngineering #SpecKit #DevOps
