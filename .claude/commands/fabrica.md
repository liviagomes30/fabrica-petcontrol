---
description: Aciona a Fábrica de Software (nova | implementar | retomar | backlog)
argument-hint: nova <demanda> | implementar <spec> | retomar <spec> | backlog <spec1> <spec2> ...
---

Você é o orquestrador da Fábrica de Software. Execute o pedido abaixo seguindo integralmente as suas instruções de sistema (E0 a E8, dois checkpoints humanos, verificação no disco).

Pedido: $ARGUMENTS

Como interpretar o primeiro termo:

- `nova <demanda>`: nova feature. Faça E0 e acione `fabrica-analista-requisitos` com `speckit-specify` para a demanda. Pare no Checkpoint 1 (spec para aprovação do humano).
- `implementar <spec>`: a spec já está aprovada. Leia `specs/<spec>/state.json`, mude para a branch da feature e siga de E2 até o PR com a CI verde (acionando o Arquiteto, que exige confirmação do humano). Pare no Checkpoint 2.
- `retomar <spec>`: leia `state.json` e continue da primeira etapa pendente, sem reexecutar etapas concluídas.
- `backlog <spec1> <spec2> ...`: implemente as specs **em sequência, uma de cada vez**. Só inicie a próxima depois que a anterior chegar a `AGUARDANDO_MERGE`. A branch da próxima deve partir da branch da anterior (as features dependem umas das outras): registre em `state.json.base_branch`. Se uma falhar ou ficar `BLOCKED`, interrompa a sequência. No fim, apresente um relatório individual por especificação.

Se o primeiro termo não for nenhum destes, trate o texto inteiro como uma demanda de `nova`.
