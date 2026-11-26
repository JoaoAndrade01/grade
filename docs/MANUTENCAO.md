# Manutenção da Grade ECI

**Pergunta que este documento responde:** como manter a Grade certa depois da publicação.
Os comandos dos testes estão em [testes/README.md](../testes/README.md); o procedimento de publicar está em
[PUBLICAR.md](PUBLICAR.md). As regras que o currículo alimenta estão em
[REGRAS-ACADEMICAS.md](REGRAS-ACADEMICAS.md).

## Guia semestral

Faça uma vez por semestre, antes de as inscrições abrirem. Quem mantém a Grade confere as fontes; outra pessoa
revisa o diff do Pull Request, sempre que houver alguém para isso.

| Fonte | Arquivo | Onde fica a data | Quem confere |
| --- | --- | --- | --- |
| Horários de referência (Notion, "Grades de ECI") | `js/horarios.js` | campo `consultado` | quem mantém |
| Guia dos alunos (Notion) | `js/guia.js` | campo `consultado` | quem mantém |
| Currículo e catálogo de eletivas (SIGA) | `js/database.js`, `js/optativas.js` | `consultado` em `js/database.js`, mostrado no rodapé como "Currículo conferido no SIGA em AAAA-MM-DD" | quem mantém |
| Formato dos PDFs do SIGA (Histórico e BOA) | `js/siga.js` e `ferramentas/gerar_perfil.py` | — | quem mantém, a partir de relatos |

### Horários e guia do Notion

Estas duas fontes são **não oficiais**, mantidas por alunos. A Grade avisa disso na interface.

1. **Abra a página** e anote a **data editorial**: o dia em que alguém conferiu os dados. A data da última
   edição da página não serve.
2. **Atualize os dois arquivos juntos** (`js/horarios.js` e `js/guia.js`), no formato atual, e ponha a data
   editorial em `consultado` (AAAA-MM-DD). Horário usa o formato `ter 10-12` (dia com 3 letras, hora de início
   e fim). Um arquivo atualizado sem o outro deixa a Grade incoerente.
3. **Use só turmas com oferta confirmada** e de um único semestre. Uma turma "a confirmar" fica de fora. Não
   misture anos. Se a mesma disciplina tiver turmas alternativas com horários incompatíveis, escolha uma
   referência e registre; juntar as duas pode inventar um choque de horário.
4. **Registre a procedência de cada exceção.** Um código que não está no currículo nem no catálogo só entra se
   tiver uma exceção justificada, com **origem**, **motivo** e **efeito no cálculo**. Não renomeie um código
   por aproximação.
5. **Valide.** Rode o validador dos dados de referência (RF-17), que faz parte do kit de testes. Ele confere o
   formato, os códigos, as duplicatas e lista as turmas sem código. Depois rode a matriz do kit.
6. **Compare o diff.** Confira que só mudaram os horários esperados. Desconfie de remoção em massa, de
   disciplina que trocou de paridade e de código novo.
7. **Guarde o último par bom.** O commit anterior à troca é o último par de arquivos validado. Cite o hash
   dele no Pull Request e não o apague, para poder voltar.

**Se a fonte sumir** (página apagada, sem acesso ou estrutura mudada): não apague os arquivos nem os esvazie.
Mantenha o último par bom. A nota da Grade já mostra a data da consulta e diz que os horários podem mudar.
Se a fonte não voltar no semestre seguinte, avise no README e siga "Se o projeto parar ou o currículo mudar".

**Pendência de identificação antes de publicar:** conferir no Notion os códigos de EET100 e EEL891 e de quatro
turmas que estão sem código ("Comp 3", "Tóp. Ciência de Dados: Estrutura de Dados", "Mapas" e "Grafos de
Interseção (mestrado)"). Enquanto não houver código, elas ficam como exceção justificada, só como informação.

### Currículo do SIGA

1. Abra a [distribuição curricular de ECI](https://siga.ufrj.br/sira/repositorio-curriculo/distribuicoes/A46B41C8-92A4-F79C-7383-BE627D84214E.html).
2. Compare, por código, semestre, créditos, carga horária e requisitos P e C, os componentes de
   `js/database.js`. Confira os totais (226 cr e 405 h de ACE) e o catálogo de `js/optativas.js`.
3. Se algo mudou, **valide antes de trocar**: códigos, grupos, requisitos e se os perfis de exemplo em
   `testes/fixtures` continuam compatíveis.
4. Atualize `consultado` com a data da conferência. Ela vai para o rodapé.
5. Rode a matriz e a paridade (veja abaixo).

A conferência de 2026-11-26 e o que ela não cobre estão em [REGRAS-ACADEMICAS.md](REGRAS-ACADEMICAS.md#fontes).

### Formato dos PDFs do SIGA

O importador lê o texto dos PDFs com expressões regulares (`RE`), nos dois leitores. Se o SIGA mudar o layout, a
importação passa a falhar ou a ignorar linhas. O sinal costuma ser um relato de aluno.

1. Peça o relato sem anexos: o PDF **não** deve ir para a Issue.
2. Reproduza com um PDF **fictício** no novo layout (ver `testes/fixtures`).
3. Ajuste as expressões nos **dois** importadores e rode a paridade e o oráculo.

## Quais testes rodar

Comandos e instalação: [testes/README.md](../testes/README.md).

| Mudança | O que rodar |
| --- | --- |
| Horários ou guia | Validador dos dados de referência e matriz do kit |
| Currículo ou catálogo | Matriz do kit e paridade |
| Importador (`js/siga.js`, `ferramentas/gerar_perfil.py`) | Paridade JS × Python, oráculo e matriz |
| Interface ou regras de crédito | Matriz do kit (seis pares de navegador e modo de abertura) |
| Documentos | Conferir os links relativos |

Um defeito corrigido prova **vermelho → verde**: o caso novo falha antes e passa depois, ou o registro diz por
que o cenário já passava. Uma mudança intencional de requisito atualiza o oráculo. Uma falha intermitente de
aceitação não se resolve com um rerun verde.

## Backlog e dívida

Itens para depois da publicação. A ordem é a de prioridade dentro de cada grupo.

### Qualidade e processo

| # | Item | Critério de pronto |
| --- | --- | --- |
| 1 | CI mínima: paridade e kit em um motor a cada push | Falha bloqueia o merge (RNF-12) |
| 2 | Testes de unidade das regras de crédito: extrair funções puras de `js/app.js`, uma a uma | Cada regra extraída com teste, coberta pelos casos de [REQUISITOS.md](REQUISITOS.md), sem mudar comportamento |
| 3 | PR ao Grêmio com as correções de `js/database.js` e conversa sobre manutenção conjunta | PR aberto em [`gremio-eci/grade`](https://github.com/gremio-eci/grade) |
| 4 | Passada com leitor de tela (NVDA) no fluxo principal | Problemas registrados por severidade |
| 5 | Atualização do PDF.js (hoje 3.11.174). Manter a biblioteca e o worker na mesma versão e preservar `isEvalSupported: false` ([aviso de segurança](https://github.com/mozilla/pdf.js/security/advisories/GHSA-wgrm-67xf-hhpq)) | Importação local por HTTP e `file://`, paridade com PDFs fictícios, CSP e nenhuma requisição externa |
| 6 | Inventário de dependências: nome, versão, origem, licença, onde roda e como atualizar; separar as do app e as dos testes | Para cada uma, é possível saber onde roda e quais testes rodar ao atualizar |
| 7 | Teste de usabilidade com 3 a 5 colegas em 3 ou 4 tarefas, com observação sem ajuda | Problemas registrados por severidade e ligados à história; os bloqueantes viram correção |
| 8 | Discussions no GitHub, quando houver colaboradores, com aviso fixo contra dados pessoais | Categorias Ideias, Perguntas e Anúncios |
| 9 | Refatoração de `js/app.js`, só depois dos testes de unidade | Métricas melhoram sem mudar comportamento |
| 10 | Cobertura estrutural e mutação, depois dos testes de unidade | A definir |
| 11 | O CLI Python imprime no `stderr` o código de uma disciplina fora do catálogo | Mensagem sem dados do documento; caso de teste cobre a saída |

### Produto

| # | Item | Critério de pronto |
| --- | --- | --- |
| 1 | **Previsão de formatura calculada** (RF-19), o primeiro item de produto | Casos com planos completos, incompletos, com equivalências e ACE; nenhum número sem aviso |
| 2 | Aviso de dado desatualizado (RF-18), logo depois da previsão | Casos com dado do semestre atual, anterior e sem data |
| 3 | Marcar atividades de extensão como distintas (caso 01g); a implementação está pronta numa branch de trabalho | Revisão e integração na versão seguinte |
| 4 | Melhorias de optativas e perfil: filtro "só liberadas" com elegibilidade por semestre planejado; data de consulta do guia no detalhe; prévia antes de aplicar um perfil pronto | Casos próprios em RF-11 e RF-12, vermelho → verde |
| 5 | Automação com o Notion (RF-15), combinada com os autores: bases Turmas e Disciplinas, piloto por CSV, depois a API de leitura e uma rotina semanal que propõe um PR revisado, com falha fechada | Dados gerados sem edição manual, diff só das mudanças reais e validador verde |
| 6 | Atualização do currículo a partir do SIGA (RF-16) | Relatório de divergências e dados preservados em falha |
| 7 | Diagrama vivo da arquitetura, como experiência de "A ECI por trás da Grade" (EEL873) e depois COS231 (choques de horário) | Por HTTP e `file://`, com teclado, sem tocar nos dados da pessoa (RF-13) |
| 8 | Procedimentos de estágio, equivalência e ACE (RF-09) | A definir |

**Fora, de propósito:** análise de uso (analytics), por causa da condição 1 de privacidade.

## Se o projeto parar ou o currículo mudar

**Responsável:** quem mantém a Grade na hora. Hoje é o mantenedor atual.

**Gatilhos**

- o mantenedor sai e não há substituto;
- um semestre passa sem conferência das fontes (currículo, horários, guia);
- o currículo muda de forma incompatível com o que está codificado.

**Passos**

1. **Ao mudar o currículo**, valide códigos, grupos, requisitos e a compatibilidade dos perfis antes de
   trocar a referência.
2. **Procure continuidade.** Primeiro com o Grêmio ECI (`gremio-eci/grade`); depois com alunos de ECI, por uma
   Issue fixada pedindo quem queira manter.
3. **Se ninguém assumir:** publique um aviso no README e na faixa, com a **data da última conferência** e as
   instruções para **exportar o perfil**. Decida entre manter, arquivar ou suspender a publicação e registre o
   motivo em [DECISOES.md](DECISOES.md).

## Métricas

*A preencher na C2.* Linha de base de tamanho e complexidade, com a versão e a configuração da ferramenta, o
comando, os arquivos medidos e o limiar, vinculada ao hash medido.

## Plano de reversão

*A preencher na C2.* Gatilho, ação por commit, verificação e o que fazer se a primeira publicação não tiver
uma versão segura anterior.
