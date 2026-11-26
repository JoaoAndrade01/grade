# Requisitos da Grade ECI

**Pergunta que este documento responde:** o que a Grade deve fazer.
Por que ela existe: [VISAO.md](VISAO.md). De onde vêm as regras de crédito e equivalência:
[REGRAS-ACADEMICAS.md](REGRAS-ACADEMICAS.md). Por que cada escolha foi feita: [DECISOES.md](DECISOES.md).
Como rodar os testes: [testes/README.md](../testes/README.md).

## Como ler

- **Estes requisitos descrevem a v2.0.0.** O que ficou para depois aparece como "versão seguinte" ou
  "planejado".
- **Estado.** Todo requisito tem um:
  - **v2.0.0 · a verificar na C2:** está no escopo da v2.0.0 e ainda não tem evidência no candidato final.
    A C2 é a etapa de verificação do candidato, que preenche o estado definitivo e a evidência de cada item;
  - **planejado:** mapeado e ainda não feito;
  - **versão seguinte:** pronto ou previsto para depois da v2.0.0.
- **Casos.** Cada caso é *situação → ação → resultado esperado*, com dados **fictícios**. Códigos como
  `XYZ101`, `ABC123`, `DEF456` e `ACE901` são componentes fora do currículo criados no perfil de teste.
- **Relógio fixo em 2026-11-26** (semestre 2026/2) em todo caso que dependa de data.
- **Aviso de requisito** é o texto `Requisito <código> não cumprido antes deste período` no cartão da
  disciplina. **Sugestão** é um item da lista de sugestões do Cronograma para o semestre indicado.
- **Casos de regressão (CR-01 a CR-04)** vêm de erros encontrados antes da v2.0.0. Ficam no kit como casos
  permanentes. A história desses erros está em [DECISOES.md](DECISOES.md).
- **Verificações do importador.** *Paridade* (RNF-05): as versões JavaScript e Python geram o mesmo perfil;
  detecta divergência entre elas, não erro compartilhado. *Oráculo independente*: um perfil esperado, escrito
  à mão, contra o qual as duas saídas são comparadas.

## 1. Histórias de usuário

| # | Como… | quero… | para… | Base |
| --- | --- | --- | --- | --- |
| H1 | calouro, sem perfil | ver a grade inteira com os pré-requisitos | entender o caminho do curso | RF-02, RF-14 |
| H2 | aluno | importar meu histórico e o BOA do SIGA | não digitar o que já cursei | RF-06, RNF-05 |
| H3 | aluno | ver o que falta em cada grupo de créditos | saber quanto falta para me formar | RF-01, RF-14 |
| H4 | aluno | montar os próximos períodos com horários e ser avisado de pré-requisito fora de ordem | montar a minha previsão de formatura com uma meta clara e realista | RF-02, RF-07, RF-10 |
| H5 | aluno pedindo equivalência | ver se as minhas cursadas servem, com a carga horária como orientação | levar à coordenação um pedido bem fundamentado | RF-03, RF-04 |
| H6 | aluno com pedido deferido | ver a contagem da Grade e a soma das cursadas não explicitadas no BOA lado a lado | não planejar a formatura com créditos que podem sumir | RF-05 |
| H7 | aluno que reingressou | ter o prazo de 5 anos contado pelo histórico do curso atual | não receber alertas falsos | RF-03, RF-06, RNF-05 |
| H8 | aluno | acompanhar as horas de extensão sem contar a mesma atividade duas vezes | saber quanto falta de ACE | RF-01 |
| H9 | aluno | escolher optativas vendo o guia dos colegas e os horários | montar um semestre que faça sentido | RF-11 |
| H10 | aluno | saber que a Grade não é oficial, onde conferir e como relatar um erro | não decidir só por ela | RF-08, RNF-08 |
| H11 | aluno | que os meus dados fiquem só no meu navegador e eu possa exportá-los | ter privacidade e não perder o trabalho | RNF-01, RF-12 |
| H12 | aluno curioso ou calouro | ver como as disciplinas do curso aparecem no próprio site | me motivar a cursá-las | RF-13 |
| H13 | aluno que quer contribuir | saber como propor uma experiência e rodar os testes | colaborar sem quebrar nada | [CONTRIBUTING.md](../CONTRIBUTING.md), RNF-07 |
| H14 | mantenedor | atualizar horários e currículo a cada semestre com segurança | a Grade continuar certa | [MANUTENCAO.md](MANUTENCAO.md), RF-17, RNF-07, RNF-08 |
| H15 | aluno que contribui usando IA | instruções prontas para o meu agente e regras claras para usar IA no projeto | contribuir rápido sem quebrar regras nem expor dados | [CONTRIBUTING.md](../CONTRIBUTING.md), [AGENTS.md](../AGENTS.md) |
| H16 (planejada) | quem mantém o guia no Notion | atualizar só lá e a Grade refletir sozinha | não haver duas versões dos dados | RF-15, RNF-11, RNF-13 |

**Critério de H16:** só entram linhas com aprovação editorial ("Pronto para republicar") nas bases Turmas e
Disciplinas, por Pull Request revisado por uma pessoa.

**Como se comprovam as histórias de documentação e processo** (não são casos de interface):

- **H13:** uma pessoa roda o kit com dados fictícios seguindo o `CONTRIBUTING.md` e apresenta uma proposta de
  experiência.
- **H14:** o roteiro semestral de `docs/MANUTENCAO.md` é seguido de ponta a ponta e o validador (RF-17) passa.
- **H15:** `AGENTS.md` e `CONTRIBUTING.md` trazem as instruções públicas, e o modelo de Pull Request pede a
  declaração de uso de IA.

## 2. Mapa função → história

Cada função da Grade aponta para uma história. Função sem história é candidata a simplificar ou esconder.

| Função (README, "O que dá para fazer") | Histórias | RF |
| --- | --- | --- |
| Grade: paleta, tags, cadeado, setas, Exibir, modo clássico | H1, H3 | RF-14 |
| Configurações de aparência: tema, modo, atalhos fixados na barra | H1, H3 | RF-14 |
| Edição e limpeza de tags | H1, H3 | RF-14 |
| Linha do tempo | H2, H3, H4 | RF-01, RF-02, RF-07 |
| Optativas: catálogo, filtros "só liberadas" e "só as que cabem" | H9 | RF-11 |
| Cronograma: períodos, horários, choques, sugestões, proposta sem choques | H4 | RF-10 |
| Equivalências e Extensão / ACE | H5, H6, H7, H8 | RF-01, RF-03, RF-04, RF-05 |
| Importar do SIGA, criar, exportar e carregar perfil, limpar dados | H2, H11 | RF-06, RF-12 |
| A ECI por trás da Grade | H12 | RF-13 |
| Referências | H10 | RF-14 |
| Faixa, notas, data do currículo, versão | H10 | RF-08 |
| "Achou um erro? Crie uma nova issue" no rodapé e na falha de importação | H10 | RF-08 |

## 3. Caso de uso: Importar do SIGA

**Ator:** aluno de ECI. **Objetivo:** ter o perfil (cursadas, período atual, equivalências, extensão) sem
digitar. **Histórias:** H2, H7, H11.

**Pré-condições:** a pessoa tem os PDFs do Histórico e do BOA baixados do SIGA. Se mudou de curso, tem também o
histórico anterior. Os arquivos ficam no dispositivo.

**Fluxo principal**

1. A pessoa escolhe **Importar do SIGA** e seleciona o Histórico e o BOA.
2. A Grade lê os PDFs no navegador, descarta os cabeçalhos pessoais e gera uma **prévia**.
3. A prévia mostra o período atual sugerido (com a nota de estimativa), os planos existentes e, se houver,
   avisos.
4. A pessoa confere e corrige o período atual, se precisar.
5. A pessoa escolhe **Usar este perfil**. O perfil é salvo neste navegador.
6. A pessoa pode **Baixar perfil.js** para guardar uma cópia.

**Alternativas**

- **A1 · Só o Histórico, sem BOA.** A importação segue; nenhum período atual novo é criado e o número "BOA"
  fica indisponível (06b, 05c). Um período atual que já existia no perfil é preservado (06c).
- **A2 · Reimportação com perfil existente.** Horários e status do período atual são preservados nas
  disciplinas que continuam; as anotações de outro período não migram (06d, 06e).
- **A3 · Planos que colidem com o período atual.** A prévia pede uma escolha. **Usar este perfil** e **Baixar
  perfil.js** ficam desativados até lá (06k).
- **A4 · Dois históricos (reingresso).** A Grade reconhece o do curso atual. Se as datas não permitem decidir,
  a prévia pede a escolha e, até lá, o prazo de 5 anos é só estimativa (06h, 06j).
- **A5 · Cancelar.** **Descartar prévia** sai sem mudar nada (06f).
- **A6 · Terminal.** `ferramentas/gerar_perfil.py` gera o mesmo perfil. Com dois históricos e dúvida, exige
  `--atual` (06h). Ver [IMPORTADOR.md](IMPORTADOR.md).

**Falhas**

- **F1 · Arquivo que não é PDF do SIGA ou sem texto.** A Grade mostra erro, não grava nada e oferece o link
  "Achou um erro? Crie uma nova issue" (08k).
- **F2 · Linha fora do formato.** O importador a ignora **sem aviso**, nas duas implementações, e a paridade
  não a detecta. É uma limitação conhecida; a experiência de EEL873 a mostra com dados fictícios.
- **F3 · Layout do PDF mudou.** As regras de leitura precisam de ajuste e o kit de paridade passa a falhar. É
  tratado no guia semestral ([MANUTENCAO.md](MANUTENCAO.md)).
- **F4 · Atividade em curso fora do catálogo.** Aparece um aviso para conferência antes de ser tratada como
  ACE.

**Pós-condições:** o perfil salvo é igual ao do arquivo baixado (06g). Nenhum dado do documento sai do
dispositivo (RNF-01).

## 4. Requisitos funcionais

| ID | Requisito | Histórias | Estado |
| --- | --- | --- | --- |
| RF-01 | Progresso por grupo | H3, H8 | v2.0.0 · a verificar na C2. O caso 01g está em **versão seguinte** |
| RF-02 | Requisitos e co-requisitos | H1, H4 | v2.0.0 · a verificar na C2 |
| RF-03 | Análise de um pedido de equivalência | H5, H7 | v2.0.0 · a verificar na C2 |
| RF-04 | A mesma origem não conta duas vezes | H5 | v2.0.0 · a verificar na C2 |
| RF-05 | Créditos de um pedido deferido | H6 | v2.0.0 · a verificar na C2 |
| RF-06 | Importação do SIGA | H2, H7 | v2.0.0 · a verificar na C2 |
| RF-07 | Aviso de oferta e horários de referência | H4 | v2.0.0 · a verificar na C2 |
| RF-08 | Aviso de que a Grade não é oficial | H10 | v2.0.0 · a verificar na C2 |
| RF-09 | Procedimentos de estágio, equivalência e ACE | H5, H8 | planejado |
| RF-10 | Planejamento de períodos e choques | H4 | v2.0.0 · a verificar na C2 |
| RF-11 | Optativas, guia e oferta | H9 | v2.0.0 · a verificar na C2 |
| RF-12 | Perfil e dados locais | H11 | v2.0.0 · a verificar na C2 |
| RF-13 | A ECI por trás da Grade | H12 | experiências atuais: v2.0.0 · a verificar na C2; novas: planejado |
| RF-14 | Marcação manual, aparência, tags e Referências | H1, H3, H10 | v2.0.0 · a verificar na C2 |
| RF-15 | Sincronização dos dados do Notion | H16 | planejado |
| RF-16 | Atualização do currículo a partir do SIGA | H14 | planejado |
| RF-17 | Validação dos dados de referência | H14 | v2.0.0 · a verificar na C2 |
| RF-18 | Aviso de dado desatualizado | H14 | planejado |
| RF-19 | Previsão de formatura calculada | H4 | planejado (primeiro item de produto depois da publicação) |

### RF-01 · Progresso por grupo (RA-01, RA-05, RA-06, RA-16)

Perfil base P1: 2025/1 com MAC118 aprovada (6 cr) e FIS111 dispensada, grau T (1 cr); 2025/2 com FIT112
reprovada (4 cr); 2026/2 (atual) com MAC128 cursando (4 cr); 2027/1 planejado com COS231 (5 cr). Nenhum outro
registro.

| Caso | Situação | Ação | Resultado esperado |
| --- | --- | --- | --- |
| 01a | P1 | Abrir a Grade e o detalhe de progresso | Obrigatórias: concluídas 7 cr (6 + 1), cursando 4 cr, planejadas 5 cr; FIT112 soma 0. Demais grupos em 0. Referência de 226 cr; ACE 0 de 405 h, em horas e separada dos créditos |
| 01b | P1 com a tag "aprovada" aplicada em FIT112 | Abrir a Grade e o detalhe de FIT112 | Concluídas passam a 11 cr. O detalhe e a legenda do progresso mostram que a aprovação é marcação manual, não registro importado (PC-02) |
| 01c · CR-03 | P1 + `ACE901` (ACE de 30 h no catálogo de teste) aprovada em 2026/1 + entrada de extensão `ACE901`, 30 h, período 2026/1, "validada", sem marcação da pessoa | Abrir o progresso de Extensão / ACE | **30 h confirmadas** e 30 h "a confirmar", com aviso de possível duplicidade (PC-01) |
| 01d · CR-03 | P1 + `ACE901` aprovada em 2025/2 + entrada `ACE901`, 30 h, período 2026/1, "validada" (duas ocorrências, períodos diferentes) | Abrir o progresso de ACE | **60 h** (PC-01) |
| 01e · CR-03 | P1 + `ACE901` aprovada em 2026/1 + entrada `ACE901`, 30 h, **sem período**, "validada" | Abrir o progresso de ACE | Identidade incerta: **30 h confirmadas** e 30 h à parte como "a confirmar", com aviso de possível duplicidade. O total confirmado nunca é 60 h |
| 01f · CR-03 | P1 + duas entradas `ACE901` no período 2026/1, uma de 30 h e outra de 20 h, sem marcação da pessoa | Abrir o progresso de ACE | Identidade incerta: **30 h confirmadas** (o maior valor) e 20 h "a confirmar", com aviso |
| 01g · versão seguinte | O mesmo de 01f, com a pessoa marcando as duas como atividades distintas | Abrir o progresso de ACE | **50 h** confirmadas, sem aviso de duplicidade. A marcação persiste após recarga, exportação e reimportação |

### RF-02 · Requisitos e co-requisitos (RA-03, RA-04)

Todos os períodos abaixo são planejados, salvo indicação. "Ordem natural": lista em ordem cronológica.
"Ordem permutada": a mesma lista com os períodos trocados de posição. O resultado **não depende** da ordem da
lista.

| Caso | Situação | Ação | Resultado esperado |
| --- | --- | --- | --- |
| 02a | MAC118 e MAC128 planejadas em 2027/1 | Abrir a linha do tempo | Aviso de requisito MAC118 em MAC128 |
| 02b | MAC118 planejada em 2027/1; MAC128 planejada em 2027/2 | Abrir a linha do tempo | Nenhum aviso de requisito em MAC128 |
| 02c · CR-01 | MAC118 aprovada em 2025/1; MAC128 prevista em 2028/1; MAC238 planejada em 2027/1; ordem permutada (2028/1 antes de 2027/1) | Abrir a linha do tempo | Aviso de requisito MAC128 em MAC238 |
| 02d · CR-01 | O mesmo de 02c, em ordem natural | Abrir a linha do tempo | O mesmo resultado de 02c |
| 02e · CR-01 | MAC118 aprovada em 2025/1; MAC128 prevista em 2028/1; período planejado 2027/1 criado vazio; MAC238 em nenhum período; filtros do Cronograma no padrão; ordem permutada e depois natural | Abrir as sugestões de 2027/1 (semestre ímpar, em que há referência de oferta de MAC238) | MAC238 **não** aparece nas sugestões, nas duas ordens |
| 02f | MAC118 aprovada em 2025/1; MAC128 aprovada em 2026/1; período planejado 2027/1 criado vazio; MAC238 em nenhum período; filtros no padrão | Abrir as sugestões de 2027/1 | MAC238 aparece nas sugestões (controle positivo) |
| 02g · co-requisito | EEL670 aprovada em 2026/1; EEL418 e COS231 planejadas em 2027/2; ordem natural e permutada | Abrir a linha do tempo | Nenhum aviso em EEL418, nas duas ordens |
| 02h · co-requisito | EEL670 aprovada em 2026/1; EEL418 em 2027/2; COS231 em 2028/1; ordem natural e permutada | Abrir a linha do tempo | Aviso de co-requisito COS231 em EEL418, nas duas ordens |
| 02i · sem data | MAC118 **cursando** no período "atual" **sem data**; MAC128 planejada em 2027/1 | Abrir a linha do tempo | Aviso de requisito MAC118 em MAC128: período sem data não conta como anterior |
| 02j · sem data | MAC118 com tag "aprovada" e em nenhum período; MAC128 planejada em 2027/1 | Abrir a linha do tempo | Sem aviso. O detalhe de MAC128 indica que o requisito foi satisfeito por marcação manual (PC-03) |

### RF-03 · Análise de um pedido de equivalência (RA-07, RA-09, RA-11, RA-12, RA-21)

Pedido "a pedir" para uma disciplina pedida de 60 h. Cursadas fora do currículo. O prazo de 5 anos só aparece
como **alerta**: não há linha de aprovação ("dentro de 5 anos"). Toda idade vem com a nota de estimativa (RF-08).

| Caso | Situação | Ação | Resultado esperado |
| --- | --- | --- | --- |
| 03a | Cursada `XYZ101` aprovada em 2021/2 | Abrir o pedido | Idade de 5,0 anos: sem alerta de mais de 5 anos e sem linha de aprovação; nota de estimativa |
| 03b | `XYZ101` aprovada em 2021/1 | Abrir o pedido | Idade de 5,5 anos: alerta de mais de 5 anos, com o motivo "pode exigir exame de suficiência" e a referência ao art. 47 |
| 03c | `XYZ101` em período "atual" sem data | Abrir o pedido | "Data de aprovação não confirmada"; nenhum alerta de idade |
| 03d · D-01 | Uma cursada de conteúdo com 45 h | Abrir o pedido | Linha de orientação "45 h de 60 h: abaixo da carga da pedida", sem ✓, ✗ nem estilo de aprovação ou falha |
| 03e · D-01 | O mesmo com 60 h | Abrir o pedido | "60 h de 60 h: igual", com o mesmo estilo neutro |
| 03f · D-01 | O mesmo com 75 h | Abrir o pedido | "75 h de 60 h: acima", estilo neutro |
| 03g · D-01 | Pedida sem carga horária conhecida | Abrir o pedido | "Carga horária da pedida indisponível", estilo neutro; nada é considerado cumprido |
| 03h | Duas cursadas, ambas marcadas "só horas" | Abrir o pedido | Sinal "nenhuma cursada marcada como conteúdo", separado da linha de carga horária |
| 03j | Duas cursadas: uma de conteúdo com 45 h e outra "só horas" com 15 h | Abrir o pedido | "60 h de 60 h: igual", estilo neutro; **nenhum** sinal de falta de conteúdo (cobre RA-07) |
| 03i · CR-04 | Cenário de reingresso de 06h, ordem antigo → atual, pedido usando MAC118 como cursada | Abrir o pedido | Base do prazo: 2025 (bloco de transferidos). Origem em 2020/1 visível só como informação. Sem alerta de mais de 5 anos e sem "data não confirmada" |

### RF-04 · A mesma origem não conta duas vezes (RA-08)

| Caso | Situação | Ação | Resultado esperado |
| --- | --- | --- | --- |
| 04a | `ABC123` (4 cr, livre escolha) aprovada em 2025/1; dois pedidos **deferidos** usando `ABC123`, para COP232 (4 cr) e COP364 (4 cr) | Abrir Pedidos e o progresso | Os dois pedidos mostram o conflito; COP232 e COP364 não contam; `ABC123` continua com 4 cr na livre escolha |
| 04b | `XYZ101` (4 cr) aprovada em 2024/1 com dispensa aprovada de FIS111 (grau T, 1 cr) no histórico; um pedido **deferido** usando `XYZ101` para COP232 | Abrir Pedidos e o progresso | O pedido mostra o conflito e COP232 não conta; FIS111 continua concluída com 1 cr. `XYZ101` é origem de dispensa: contribui com **0 cr** na livre escolha, antes e depois do pedido (D-07) |
| 04c · CR-02 | MAC118 aprovada (6 cr) com duas dispensas importadas para alvos A e B de 4 cr cada, grupo obrigatórias | Abrir o progresso | **8 cr** = 0 (origem) + 4 (A) + 4 (B), com aviso de que a origem aparece em duas dispensas e de que o art. 46, II, da CEG 01/2017 veda reutilizá-la (D-07) |
| 04d · D-07 | `XYZ101` (4 cr, fora do currículo) aprovada em 2024/1 com uma única dispensa importada de FIS111 (1 cr) | Abrir o progresso | FIS111 com 1 cr; `XYZ101` com 0 cr; **sem** aviso de reutilização |
| 04e · CR-02 | `XYZ101` aprovada em 2024/1 com dispensa importada para o alvo `DEF456`, fora do catálogo, com 3 cr na linha do histórico | Abrir o progresso | `DEF456` conta os 3 cr do histórico; `XYZ101` conta 0. O alvo fora do catálogo não é zerado |

### RF-05 · Créditos de um pedido deferido (RA-13, D-02)

Perfil base P5: `ABC123` (4 cr) e `DEF456` (2 cr), ambas de livre escolha e aprovadas em 2025/1; pedido
**deferido** de COP232 (obrigatória, 4 cr) com `ABC123` como cursada de conteúdo. BOA fictício cuja seção
"Cursadas e Não Explicitadas" lista `ABC123` e `DEF456` (6 cr) e traz uma linha de total.

O segundo número é a **soma da lista** "Cursadas e Não Explicitadas" do BOA (PC-04), rotulada como tal e tratada
como estimativa. Ele nunca é rotulado como "total do BOA": o importador não lê a linha de total, e a lista não
prova o total oficial. A Grade distingue seção **ausente** de seção **presente e vazia**.

| Caso | Situação | Ação | Resultado esperado |
| --- | --- | --- | --- |
| 05a | P5 | Abrir o progresso e Pedidos | COP232 concluída com 4 cr nas obrigatórias. Livre escolha com **dois números rotulados**: "Grade: 2 cr" (regra da Grade, estimativa) e "BOA, soma das não explicitadas: 6 cr" (com a data de emissão do BOA). Nenhum é rotulado como total oficial |
| 05b | P5 com `ABC123` cursando em 2026/2 | Abrir o progresso | COP232 prevista em 2026/2; livre escolha "Grade: 2 cr" |
| 05c | P5 **sem BOA** importado | Abrir o progresso | "Grade: 2 cr" e "BOA: indisponível"; nenhum valor apresentado como do BOA |
| 05d | P5 com BOA importado em que a seção "Cursadas e Não Explicitadas" não foi encontrada | Abrir o progresso | Igual a 05c, com o motivo da indisponibilidade |
| 05e | P5 com a cursada sendo uma condicionada (grupo 2, 4 cr) em vez de livre escolha | Abrir o progresso | A cursada sai do grupo 2 pela regra da Grade. Sem nota sobre o BOA: o caso observado de D-02 só cobre a livre escolha |
| 05f | P5 com `ABC123` aprovada em período sem data | Abrir o detalhe de COP232 | COP232 concluída, com "Período não confirmado" no histórico da disciplina |
| 05g | P5 com BOA cuja linha de total diz 4 cr, enquanto a lista soma 6 cr | Abrir o progresso | "BOA, soma das não explicitadas: 6 cr"; o rótulo não sugere que é o total oficial |
| 05h | P5 com BOA em que a seção "Cursadas e Não Explicitadas" existe e está vazia | Abrir o progresso | "BOA, soma das não explicitadas: 0 cr", diferente de "indisponível" (05d) |

### RF-06 · Importação do SIGA (RA-05, RA-06, RA-17, RA-19, RA-21)

Conjunto I1: histórico com dispensa T com e sem origem aprovada, reprovação, `AAAA/0` e semestre normal; BOA
com atividade em curso de estágio (NCC), Projeto de Graduação e uma ACE do catálogo.

| Caso | Situação | Ação | Resultado esperado |
| --- | --- | --- | --- |
| 06a | I1, sem perfil salvo | Importar e aplicar | Perfil igual ao oráculo de I1; paridade JS × Python igual |
| 06b | Só o histórico de I1, **sem perfil anterior** | Importar | Igual ao oráculo "I1 sem BOA": nenhum período atual criado |
| 06c | Só o histórico de I1; perfil anterior com período atual 2026/2 (posterior ao último semestre do histórico), com horários e status | Importar | O período 2026/2 é preservado com os mesmos horários e status |
| 06d | I1; perfil anterior com o mesmo período atual, com horários e status | Reimportar com BOA | Horários e status preservados nas disciplinas que continuam |
| 06e | I1; perfil anterior com outro período atual | Reimportar | As anotações do período anterior não migram para o novo |
| 06f | Prévia de I1 aberta | Cancelar | Perfil salvo igual, campo a campo, ao de antes |
| 06g | Prévia de I1 aberta | Baixar o arquivo e aplicar na mesma configuração | O perfil salvo no navegador e o JSON do arquivo baixado (sem o prefixo `window.PERFIL =`) são iguais |

**06h · CR-04 · reingresso.** Relógio fixo em 2026-11-26. Históricos fictícios, com o papel de cada um
marcado no texto do PDF:

- **Atual:** bloco "Créditos transferidos" do ano 2025 com MAC118 (6 cr); 2025/2 com COS111.
- **Anterior:** 2020/1 com MAC118; 2020/2 com MAC128.

| Cenário | Ação | Resultado esperado para MAC118 |
| --- | --- | --- |
| Antigo → atual | Importar os dois nessa ordem | Um único registro. Base do prazo: ano 2025. Origem 2020/1 visível só como informação, não usada como semestre de precedência |
| Atual → antigo | Importar os dois na ordem inversa | Igual ao cenário anterior |
| Só o atual | Importar só o atual | Base 2025; origem ausente; sem "data não confirmada" no prazo |
| Só o antigo (controle) | Importar só o antigo | Semestre 2020/1 normal; idade calculada por ele |
| `AAAA/0` (controle) | Incluir um registro `2024/0` no atual | Não vira semestre real |
| Paridade | Os três primeiros cenários | JS e Python iguais ao oráculo |

**Papel dos históricos (PC-05).** O atual é o de data mais recente, considerando o semestre real mais
recente e o ano do bloco de transferidos. **Em dúvida, a Grade pergunta:** a prévia pede a escolha, e **Usar
este perfil** e **Baixar perfil.js** ficam desativados até lá. A escolha explícita sempre vence. Antes dela, a
idade das cursadas aparece como estimativa. O perfil gerado não grava "dúvida" como papel do histórico.

| Cenário | Ação | Resultado esperado |
| --- | --- | --- |
| Atual só com bloco 2025, anterior com 2024/2 real | Importar os dois | O atual é reconhecido pelo bloco 2025, sem pedir escolha |
| Atual com bloco 2024, anterior com 2024/2 real | Importar os dois | Dúvida: a prévia pede a escolha; até lá, idade como estimativa e aplicar/baixar desativados |
| Mesmo cenário, com a pessoa escolhendo o anterior como atual | Confirmar a escolha | A escolha vence a regra automática |
| CLI com `--atual` apontando um dos arquivos | Gerar o perfil | O papel segue a opção |
| CLI sem `--atual`, com dúvida | Gerar o perfil | O CLI exige `--atual` e termina com erro, sem dados do documento na mensagem |

**06i · fronteira de 5 anos com só o ano conhecido.** Relógio fixo em 2026-11-26. Blocos do histórico atual
com MAC118 nos anos abaixo; pedido usando MAC118.

| Ano do bloco | Idade possível | Resultado esperado |
| --- | --- | --- |
| 2022 | 4,0 a 4,5 anos | Sem alerta de mais de 5 anos |
| 2021 | 5,0 a 5,5 anos | Aviso de precisão insuficiente ("só o ano é conhecido; pode passar de 5 anos"), sem inventar `/1` nem `/2` (PC-06) |
| 2020 | 6,0 a 6,5 anos | Alerta de mais de 5 anos |

Casos de regressão do importador (achados da revisão independente):

| Caso | Situação | Ação | Resultado esperado |
| --- | --- | --- | --- |
| 06j · escolha explícita | Dois históricos; o reconhecido automaticamente como atual não tem semestre real, só o bloco de transferidos | Escolher na prévia o outro como atual | A escolha explícita vence, no navegador e no CLI (`--atual`), e o perfil registra o papel como escolhido |
| 06k · confirmação de colisão | Dois históricos e um plano da pessoa que coincide com um semestre de um deles | Abrir a prévia e trocar o histórico atual | A prévia recalcula o perfil **e** a lista de planos em colisão. Nenhum plano é descartado sem confirmação, ao aplicar ou ao baixar |
| 06l · ordem dos arquivos | O mesmo código (MAC118) em bloco de 2019, em `2020/1` e em bloco de 2025, em históricos diferentes | Importar em todas as ordens possíveis | O mesmo perfil e a mesma base de prazo em qualquer ordem |
| 06m · ACE em períodos distintos | O mesmo código de ACE (`ACE901`, 30 h) em `2020/1` e em `2021/1` no histórico anterior, e o mesmo código e grau no bloco de 2025 do atual | Importar os dois | As duas ocorrências em períodos conhecidos distintos continuam distintas (**60 h**); o registro do bloco não elimina nenhuma |

### RF-07 · Aviso de oferta e horários de referência (RA-20)

Referências usadas (de `js/horarios.js`): EEL871 e MAC238 só em semestres ímpares; COS360 e MAC248 só em
pares; MAC248 e MAC238 são do ciclo básico; EEWX00 sem referência.

| Caso | Situação | Ação | Resultado esperado |
| --- | --- | --- | --- |
| 07a | EEL871 planejada em 2027/2 | Abrir a linha do tempo | Aviso de **paridade** ("a referência só lista turmas em semestres ímpares"), com nota de estimativa |
| 07b | COS360 planejada em 2027/1; depois em 2027/2 | Abrir a linha do tempo | Aviso de paridade em 2027/1; nenhum em 2027/2 |
| 07c | MAC248 planejada em 2027/1 | Abrir a linha do tempo | Nenhum aviso de oferta (ciclo básico) |
| 07d | EEL871 planejada no período "Verão 2027" (sem data) | Abrir a linha do tempo | Nenhum aviso de paridade |
| 07e | EEWX00 planejada em 2027/1 | Abrir a linha do tempo | Aviso de **ausência de oferta** ("sem oferta de referência"), distinto do aviso de paridade |

### RF-08 · Aviso de que a Grade não é oficial, versão e relato (D-06)

O texto da faixa e das notas está em [REGRAS-ACADEMICAS.md](REGRAS-ACADEMICAS.md#textos-de-aviso). Os casos
verificam presença e local; a clareza do texto exige revisão humana.

**"Alcançável" (08b)** quer dizer: a faixa é texto estático, na ordem de leitura e na árvore de acessibilidade,
fora do caminho dos controles; e os controles interativos da tela são percorridos por Tab com foco visível e
sem sobreposição. A passada com leitor de tela real está no backlog ([MANUTENCAO.md](MANUTENCAO.md)).

| Caso | Situação | Ação | Resultado esperado |
| --- | --- | --- | --- |
| 08a · faixa, clássico | Sem perfil e com P1; modo clássico (só a Grade); desktop e celular | Abrir a Grade, recarregar e trocar para o modo completo e voltar | Faixa visível na Grade, depois da recarga e após cada troca de modo |
| 08b · faixa, completo | Sem perfil e com P1; modo completo; desktop e celular | Percorrer as seis abas: Grade, Linha do tempo, Optativas, Cronograma, Equivalências e Extensão / ACE, A ECI por trás da Grade | Faixa visível em todas, sem cobrir conteúdo, com texto na ordem de leitura e na árvore de acessibilidade. Tab percorre os controles com foco visível |
| 08c · RA-13 | P5 | Abrir o progresso e Pedidos | Nota de estimativa junto dos dois números de livre escolha de 05a |
| 08d · RA-09 | Cursada com idade calculada (03a ou 03b) | Abrir o pedido e a tabela de livre escolha | Nota de estimativa junto da idade. A nota permanece enquanto a regra de reingresso (RA-21) não tiver sido implementada e testada; retirá-la depois é decisão registrada em [DECISOES.md](DECISOES.md) |
| 08e · RA-19 | Perfil importado com período atual deduzido | Abrir a linha do tempo e a prévia de importação | Nota de estimativa no período atual |
| 08f · RA-19 | Perfil com período atual informado pela pessoa | Abrir a linha do tempo | **Sem** nota de período deduzido |
| 08g · RA-20 | 07a | Abrir a linha do tempo e o Cronograma | Nota de estimativa no aviso de oferta |
| 08h · RA-20 | MAC238 planejada em 2027/1 (referência: ter 10-12 e qui 10-12) | Abrir o Cronograma de 2027/1 | Os horários de referência aparecem com a fonte (Notion), a data da fonte registrada em `js/horarios.js` e a nota de estimativa |
| 08i · versão e currículo | Qualquer tela | Ler o rodapé | Aparecem a versão (`v2.0.0`) e "Currículo conferido no SIGA em AAAA-MM-DD", a data do campo `consultado` de `js/database.js` |
| 08j · relato, rodapé | Qualquer tela | Seguir o link "Achou um erro? Crie uma nova issue" com Tab e Enter | Abre a página de nova Issue do repositório. A URL não carrega dado da pessoa. O texto da Issue pede esperado, observado e passos, e avisa para não anexar PDFs, prints identificáveis nem o perfil |
| 08k · relato, importação | Arquivo inválido na importação | Importar | A mensagem de erro traz o mesmo link, sem copiar conteúdo do arquivo |

### RF-09 · Procedimentos de estágio, equivalência e ACE (planejado)

Mostrar as regras e os procedimentos oficiais junto da função correspondente: estágio no cartão de `EEWU00`;
pedido de equivalência ao lado de cada pedido; pedido de ACE na aba de Extensão. Cada referência citará a
fonte e a data de consulta, o aviso de que a Grade não é oficial vale também para ela, e haverá revisão
periódica. Critério a definir quando entrar no escopo.

### RF-10 · Planejamento de períodos e choques de horário (H4)

| Caso | Situação | Ação | Resultado esperado |
| --- | --- | --- | --- |
| 10a | Sem períodos planejados | Criar um período com "+ Período" e adicionar uma disciplina pelo código ou nome | O período aparece no Cronograma e na Linha do tempo; a disciplina conta como planejada no progresso |
| 10b | Duas disciplinas no mesmo período com horário sobreposto | Abrir o Cronograma | O choque aparece nas duas, com o nome da outra |
| 10c | Período com horários livres e fixture com pelo menos uma sugestão possível | Pedir a proposta sem choques | Pelo menos uma sugestão aparece; nenhuma choca com as já colocadas nem com as outras sugestões |
| 10d | Período planejado | Excluir período | Some do Cronograma, da Linha do tempo e do progresso; os outros períodos não mudam |
| 10e | Período vindo do perfil, editado | Descartar edições | Volta ao conteúdo original do perfil |

### RF-11 · Optativas, guia e oferta (H9)

Descreve o comportamento atual. Melhorias de comportamento estão no backlog ([MANUTENCAO.md](MANUTENCAO.md)).

| Caso | Situação | Ação | Resultado esperado |
| --- | --- | --- | --- |
| 11a | Três optativas por cursar: uma com requisito concluído ou previsto, uma com requisito só planejado, uma com requisito pendente | Ligar "só liberadas" | Aparece só a primeira. O filtro usa o estado de hoje (concluído ou previsto), não o semestre planejado |
| 11b | Período-alvo com horários ocupados | Ligar "só as que cabem" | Só aparecem as com horário de referência sem choque |
| 11c | Optativa com comentários no guia dos alunos | Abrir o detalhe | Os campos disponíveis (comentários, dificuldade, presença) aparecem com a fonte (guia dos alunos). A data de consulta do guia fica registrada entre as fontes |
| 11d | Optativa visível sem horário de referência | Abrir o catálogo e ligar "só as que cabem" | Ela aparece no catálogo sem horário inventado e sai do filtro de encaixe. A ausência de horário não é tratada como ausência de oferta |

### RF-12 · Perfil e dados locais (H11)

| Caso | Situação | Ação | Resultado esperado |
| --- | --- | --- | --- |
| 12a | Sem perfil | Criar perfil com campos em branco | Perfil salvo; marcações anteriores continuam |
| 12b | Perfil com edições | Exportar `perfil.js` | O arquivo contém as edições; reimportado, reproduz o mesmo estado |
| 12c | Navegador limpo | Carregar um arquivo de perfil válido; depois, um inválido | O válido é aplicado direto e recupera os campos exportáveis. O inválido mostra erro e preserva o perfil anterior. Prévia, cancelamento e escolha são casos de RF-06 |
| 12d | Dados salvos | Configurações → Limpar dados salvos, confirmando | Marcações, planos e perfil apagados; cancelar não apaga nada |
| 12e | Primeira visita com edições não exportadas | Usar o app | A pessoa encontra a indicação de que os dados ficam só neste navegador e o botão de exportar (critério de UX) |

### RF-13 · A ECI por trás da Grade (H12)

Estado: as três experiências atuais (COS110, COS242, EEL873) são da v2.0.0; as futuras são **planejadas**.

| Caso | Situação | Ação | Resultado esperado |
| --- | --- | --- | --- |
| 13a | Com ou sem perfil | Abrir a aba | As três experiências abrem com dados fictícios e indicam a disciplina de cada uma |
| 13b | Com perfil e marcações | Usar uma experiência e voltar | Perfil, planos e marcações não mudam (a experiência não lê nem grava dados da pessoa) |
| 13c | Modo completo, Grade | Ligar "ECI por trás" na paleta | As disciplinas com experiência ficam destacadas |

**Experiências planejadas.** COS231 com a detecção de choques de horário; um diagrama vivo da arquitetura
(EEL873), em que passar o mouse numa parte explica o que ela faz e qual disciplina a ensina, e um modo animado
mostra que o PDF é lido dentro do navegador. Critério: cada experiência nova usa dados fictícios, não toca nos
dados da pessoa, funciona por HTTP e por `file://`, com teclado e sem biblioteca externa.

### RF-14 · Marcação manual, aparência, tags e Referências (H1, H3, H10)

| Caso | Situação | Ação | Resultado esperado |
| --- | --- | --- | --- |
| 14a | Com perfil, modo clássico; depois, sem perfil | Pintar uma disciplina com uma tag; depois, limpar a marcação | Com perfil, o progresso usa o status da tag. Sem perfil, a marcação aparece e a limpeza restaura o estado anterior |
| 14b | Disciplina aprovada pelo pincel | Abrir detalhe e legenda | Identificada como marcação manual, não registro importado (PC-02, PC-03) |
| 14c | Cadeado ligado | Tentar pintar uma cursada importada | A cursada não muda |
| 14d | Setas em "Disciplina em foco" | Passar o mouse ou focar uma disciplina | Pré-requisitos e o que ela libera acendem, também pelo teclado |
| 14e | Configurações → Aparência | Trocar o tema (sistema, claro, escuro), o modo (clássico ou completo) e fixar um item na barra do topo; recarregar | As escolhas são aplicadas e persistem. Fixar e desafixar anuncia o resultado e o item continua em Configurações |
| 14f | Configurações → Grade → Tags | Editar uma tag e depois escolher "Restaurar padrão" e confirmar | A edição aparece na paleta e na Grade; restaurar volta às tags padrão; cancelar a confirmação não muda nada |
| 14g | Configurações → Referências | Abrir a seção e navegar pelos links com Tab | As fontes são listadas e nenhum link externo é carregado ou aberto antes do clique |

### RF-15 · Sincronização dos dados do Notion (H16) · planejado

Conversor com dois leitores (CSV primeiro, depois a API, com versão fixada) que gera `js/horarios.js` e
`js/guia.js` no formato atual, com saída determinística para o mesmo recorte. Só entram linhas com aprovação
editorial nas duas bases. A automação propõe um Pull Request revisado por uma pessoa, nunca um commit direto.
Recusa entrada vazia, incompleta ou remoção em massa e preserva os dois arquivos do último conjunto aprovado.
Antes de automatizar remoções, define a política para uma linha aprovada que sumiu ou voltou a rascunho.

### RF-16 · Atualização do currículo a partir do SIGA (H14) · planejado

Um script lê a página pública do currículo, regenera `js/optativas.js` e aponta no relatório divergências de
versão curricular, grupos e equações em `js/database.js`. Em falha, preserva os dados anteriores.

### RF-17 · Validação dos dados de referência (H14)

O kit valida `js/horarios.js` e `js/guia.js`. A validação é local e não depende do Notion.

| Caso | Situação | Ação | Resultado esperado |
| --- | --- | --- | --- |
| 17a | Arquivos de referência válidos | Rodar o validador | Passa |
| 17b | Turma com código que não está no currículo nem no catálogo e sem exceção | Rodar o validador | Falha, apontando o código |
| 17c | O mesmo código, com exceção justificada (origem, motivo, efeito no cálculo) | Rodar o validador | Passa. A exceção aparece na lista, e a turma não entra em cálculo nem em sugestão |
| 17d | Entrada inválida: formato errado, horário com início depois do fim ou duplicata conflitante | Rodar o validador | Falha, apontando a entrada |
| 17e | Turmas sem código | Rodar o validador | Aparecem numa lista; as justificadas não fazem o caso falhar |
| 17f | Descrição de guia com caracteres especiais (`<`, `&`, aspas) | Abrir o detalhe da optativa | O texto aparece literalmente, sem virar marcação |

A validação editorial, a entrada vazia ou incompleta e a remoção em massa ficam com RF-15.

### RF-18 · Aviso de dado desatualizado (H14) · planejado

A nota muda quando a referência é de semestre anterior ao atual ou não tem data, e não muda quando é do
semestre atual. A ausência de dado não confirma oferta nem atualidade. Casos: referência atual, anterior e
sem data.

### RF-19 · Previsão de formatura calculada (H4) · planejado

Primeiro item de produto depois da publicação. Mostra o primeiro período planejado em que todos os grupos
ficam completos, ou o que o plano ainda deixa faltar. Casos: plano completo, incompleto, com equivalência, ACE
confirmada e a confirmar, e marcação manual. Distingue créditos registrados das hipóteses do plano e diz quais
hipóteses usou. Nenhum número aparece sem aviso. Até lá, a pessoa monta a previsão com o planejamento.

## 5. Requisitos não funcionais

| ID | Requisito | Histórias | Critério verificável | Estado |
| --- | --- | --- | --- | --- |
| RNF-01 | Os dados pessoais não saem do dispositivo | H11 | Com PDFs fictícios contendo marcadores sentinela no cabeçalho: nenhuma requisição externa durante a importação; nenhuma requisição à própria origem contém dados do documento; o perfil salvo e o arquivo exportado não contêm os marcadores. A página substituta `classico.html` não carrega script nem recurso externo e leva ao modo clássico; o teste dela é registrado na C2 | v2.0.0 · a verificar na C2 |
| RNF-02 | Funciona por abertura direta (`file://`) e por hospedagem estática, sem servidor próprio do app | H1 a H11 | O kit, numa versão fixa e com dados fictícios, passa nos dois modos, em ambiente isolado de perfil real e sem rede externa | v2.0.0 · a verificar na C2 |
| RNF-03 | Acessibilidade | H1, H2, H3, H10, H11 | Versão fixa do axe-core sem ocorrências "serious" ou "critical" nas telas e estados listados, nos dois temas; percursos de teclado enumerados com foco visível. Leitor de tela real fica no backlog | v2.0.0 · a verificar na C2 |
| RNF-04 | Compatibilidade | H1 a H11 | O kit passa em Chromium, WebKit e Firefox, nas versões registradas, por `file://` e HTTP. O WebKit automatizado é a aproximação do Safari; não há teste em iPhone real | v2.0.0 · a verificar na C2 |
| RNF-05 | Paridade do importador | H2, H7 | Com os conjuntos fictícios nomeados e um perfil anterior fixo, JS e Python geram perfis iguais (JSON canônico) com e sem BOA, com mescla, sobre o mesmo texto e com leitores diferentes. Complementa o oráculo, não o substitui | v2.0.0 · a verificar na C2 |
| RNF-06 | Facilidade de uso na primeira visita | H1, H2, H3, H11 | Na inspeção heurística, sem bloqueio nos fluxos dessas histórias. Um calouro encontra o próximo passo sem perfil; quem importa entende onde os dados ficam e como exportar | v2.0.0 · a verificar na C2 |
| RNF-07 | Manutenibilidade | H13, H14 | Atualização semestral seguindo [MANUTENCAO.md](MANUTENCAO.md). Correção de defeito prova vermelho → verde no kit, ou registra por que o cenário já passava. Mudança intencional de requisito atualiza o oráculo. Mudança no importador mantém a paridade | v2.0.0 · a verificar na C2 |
| RNF-08 | Transparência das fontes | H10, H14 | A interface mostra a versão e a data de conferência do currículo; as fontes registram a data de consulta de horários e guia; cada regra de [REGRAS-ACADEMICAS.md](REGRAS-ACADEMICAS.md) cita a fonte ou se marca "sem fonte oficial" | v2.0.0 · a verificar na C2 |
| RNF-09 | Segurança do app estático | H11 | CSP restritiva em `index.html`, sem script externo; PDF.js com `isEvalSupported: false`; nenhum dado do documento em URL ou log | v2.0.0 · a verificar na C2 |
| RNF-10 | Desempenho | H2 | Abrir o app e importar os PDFs fictícios num celular emulado. A C2 registra dispositivo, versões, cenário, carga fria, repetições e mediana. Enquanto não houver limiar explícito, a medida é linha de base, não cumprimento | v2.0.0 · a verificar na C2 (linha de base) |
| RNF-11 | Frescor dos dados de referência | H16 | O semestre da conferência editorial selecionada fica a no máximo um semestre do semestre corrente; registra a última execução bem-sucedida e confere que o agendamento não foi desativado | planejado |
| RNF-12 | Portão automático de qualidade | H13, H14 | Paridade e kit rodam no candidato de cada Pull Request; um check obrigatório com falha impede o merge, e isso é provado uma vez com um PR de teste | planejado |
| RNF-13 | Segurança da automação | H16 | Token do Notion só no passo de leitura; sem acesso para forks e sem `pull_request_target`; ações externas fixadas por SHA completo; nenhum dado bruto em logs ou artefatos | planejado |
