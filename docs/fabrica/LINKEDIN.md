# Rascunho do post para o LinkedIn

> Antes de publicar: troque os trechos entre `<...>`, inclua 3 a 5 prints do `ROTEIRO-DEMO.md` (sugestão: 7, 10, 11 e 13) e marque o professor. Só inclua números e resultados que a sua execução real confirmou.

---

Na disciplina de <nome da disciplina>, o desafio foi pegar uma Fábrica de Software Agêntica e levá-la para outra plataforma. Escolhi o **Claude Code**.

A fábrica conduz uma feature da ideia ao pull request: um orquestrador aciona seis subagentes (Analista de Requisitos, Arquiteto, Criador de Tarefas, Desenvolvedor, Revisor de Código e QA), um de cada vez, sobre o GitHub Spec Kit. O humano só entra em dois pontos: aprovar a especificação e fazer o merge.

O que aprendi na adaptação:

🔹 **Reaproveitar, não reconstruir.** Os prompts do professor foram mantidos; um script converte o formato dos agentes e só o frontmatter muda.
🔹 **Permissão não é prompt.** No Claude Code a precedência é deny → ask → allow, e regras que estavam só no texto (o QA não mexe em código de produção) viraram hooks que bloqueiam a ação de verdade.
🔹 **Quem verifica não deve ser o mesmo que produziu.** Revisor, QA e Desenvolvedor usam modelos diferentes para reduzir erros correlacionados.
🔹 **Observabilidade.** Cada subagente avisa no Slack quando termina, por um hook, sem depender de o modelo lembrar.

Resultado: rodei a fábrica de ponta a ponta numa feature real (um relógio de data e hora no dashboard de um app Next.js com Supabase): da especificação ao pull request com CI verde, 56 testes automatizados e 100% de cobertura no módulo de datas. O merge foi meu, como manda o processo.

Código e documentação: https://github.com/liviagomes30/fabrica-petcontrol

Obrigada ao professor @<nome do professor> pela disciplina e pelo material.

#IA #AgenticAI #ClaudeCode #SoftwareEngineering #SpecKit #DevOps
