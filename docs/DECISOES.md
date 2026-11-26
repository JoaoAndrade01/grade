# Decisões da Grade ECI

**Pergunta que este documento responde:** por que está assim.

Cada decisão é um registro curto, no formato de [Nygard](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions):
**estado**, **contexto**, **decisão** e **consequências**. Os casos de teste citados estão em
[REQUISITOS.md](REQUISITOS.md); as regras, em [REGRAS-ACADEMICAS.md](REGRAS-ACADEMICAS.md). Todas as decisões
abaixo são de 2026-11-26 e estão **aceitas**, salvo indicação. Uma decisão substituída aponta para o registro
novo. Para propor uma mudança, abra uma Issue e acrescente um registro novo, sem reescrever o antigo.

## Índice

| ID | Assunto |
| --- | --- |
| [D-01](#d-01--carga-horária-das-cursadas-como-orientação) | Carga horária como orientação |
| [D-02](#d-02--dois-números-na-livre-escolha) | Dois números na livre escolha |
| [D-03](#d-03--reingresso-e-prazo-de-5-anos) | Reingresso e prazo de 5 anos |
| [D-04](#d-04--limite-de-25-não-modelado) | Limite de 25% não modelado |
| [D-05](#d-05--prazos-do-pedido-e-de-integralização-não-avisados) | Prazos não avisados |
| [D-06](#d-06--faixa-e-notas-de-estimativa) | Faixa e notas de estimativa |
| [D-07](#d-07--origem-de-dispensa-não-soma-créditos) | Origem de dispensa não soma |
| [PC-01](#pc-01--identidade-de-uma-ocorrência-de-extensão) | Identidade de ocorrência de extensão |
| [PC-02 e PC-03](#pc-02-e-pc-03--tag-aprovada-do-pincel) | Tag "aprovada" do pincel |
| [PC-04](#pc-04--número-do-boa-na-livre-escolha) | Número do BOA |
| [PC-05](#pc-05--qual-é-o-histórico-do-curso-atual) | Histórico do curso atual |
| [PC-06](#pc-06--fronteira-de-5-anos-com-só-o-ano) | Fronteira de 5 anos |
| [PUB-01](#pub-01--retirada-da-página-legada) | Página legada |
| [PUB-02](#pub-02--valor-e-condições-para-publicar) | Valor e condições para publicar |
| [PUB-03](#pub-03--ordem-de-publicação) | Ordem de publicação |
| [PUB-04](#pub-04--previsão-de-formatura-montada-pela-pessoa) | Previsão de formatura |
| [PUB-05](#pub-05--os-requisitos-descrevem-a-v200) | Requisitos descrevem a v2.0.0 |
| [PUB-06](#pub-06--dados-do-notion-e-automação) | Dados do Notion e automação |
| [PUB-07](#pub-07--contribuição-com-ia) | Contribuição com IA |
| [PUB-08](#pub-08--continuidade-e-sucessão) | Continuidade e sucessão |

## Regras acadêmicas

### D-01 · Carga horária das cursadas como orientação

- **Estado:** aceita. Regra: RA-11.
- **Contexto:** a Resolução CEG 01/2017 exige equivalência "em conteúdo e orientação", sem percentual de
  carga horária. A Grade mostrava a comparação com ✓ e ✗, o que parecia uma verificação oficial.
- **Decisão:** a comparação de carga horária continua aparecendo, como dica neutra, sem ✓, ✗ nem estilo de
  aprovação ou falha.
- **Consequências:** casos 03d a 03g e 03j. Se a comissão de dispensa da ECI tiver um ato com percentual, a
  decisão volta a ser examinada (consulta 1 em REGRAS-ACADEMICAS).

### D-02 · Dois números na livre escolha

- **Estado:** aceita. Regra: RA-13.
- **Contexto:** em um caso observado, o BOA continuou contando, na livre escolha, os créditos das cursadas
  usadas num pedido já deferido. Pode ser um erro do sistema, corrigido na colação. Esse é um **caso
  observado**, não uma descrição geral do SIGA.
- **Decisão:** a Grade mantém o cálculo sem contar duas vezes e mostra **dois números rotulados**, o da Grade e
  o da soma das não explicitadas no BOA, com uma nota de estimativa.
- **Consequências:** a pessoa não planeja a formatura contando com créditos que podem ser corrigidos. Casos
  05a a 05h. A dúvida sobre como o SIGA trata a origem vai para a coordenação (consulta 2).

### D-03 · Reingresso e prazo de 5 anos

- **Estado:** aceita. Regras: RA-09, RA-21. A interpretação da CEG art. 47 para reingresso está pendente.
- **Contexto:** quem reingressa (ENEM ou transferência interna) tem o histórico do curso atual com um bloco de
  disciplinas transferidas, só com o ano, e um histórico antigo com os semestres originais. Usar a aprovação
  original gerava alertas diferentes dos produzidos pelo ano do bloco; contar só pelo atual deixava
  disciplinas sem data. A data normativa do reingresso está sob consulta.
- **Decisão:** vale a data em que a disciplina entrou no histórico do curso atual (o ano do bloco). O
  histórico antigo serve só para mostrar a origem.
- **Consequências:** casos 03i, 06h e 06i. A nota de estimativa de RA-09 fica até a regra estar implementada
  e testada.

### D-04 · Limite de 25% não modelado

- **Estado:** aceita. Regra: RA-14.
- **Contexto:** pelo texto do art. 48, II, da CEG, o limite parece valer para ingresso e transferência, não
  para equivalências dentro do curso.
- **Decisão:** não modelar. Fica registrado como "aplicabilidade a confirmar".
- **Consequências:** a Grade não avisa sobre esse limite. Consulta 4.

### D-05 · Prazos do pedido e de integralização não avisados

- **Estado:** aceita. Regras: RA-15, RA-18.
- **Contexto:** o prazo do pedido de dispensa e o limite de 15 semestres existem na CEG e no SIGA, mas não se
  sabe como se aplicam ao curso.
- **Decisão:** não avisar nenhum dos dois; só documentar o que se encontrou.
- **Consequências:** consulta 5.

### D-06 · Faixa e notas de estimativa

- **Estado:** aceita.
- **Contexto:** a Grade parece uma fonte confiável, e o risco central é um número errado numa interface
  confiável. A condição 3 pede honestidade sobre o alcance.
- **Decisão:** uma faixa curta, fixa e discreta no topo e uma nota junto de cada cálculo marcado como
  estimativa: livre escolha nos pedidos deferidos (RA-13), prazo de 5 anos (RA-09, até a regra de reingresso
  estar testada), período atual deduzido (RA-19) e horários e oferta do Notion (RA-20). Os textos estão em
  REGRAS-ACADEMICAS.
- **Consequências:** casos 08a a 08h. Retirar uma nota é uma decisão nova, registrada aqui.

### D-07 · Origem de dispensa não soma créditos

- **Estado:** aceita (alcance ampliado para a dispensa única). Regra: RA-08.
- **Contexto:** uma mesma origem com duas dispensas importadas somava os créditos da origem **e** dos dois
  alvos (14 cr em vez de 8 num caso de teste). A CEG, art. 46, II, veda reutilizar a origem.
- **Decisão:** seguir o histórico oficial e avisar. Os alvos contam como estão no histórico, a origem não soma
  de novo em nenhum grupo, e há um aviso quando a origem aparece em duas ou mais dispensas. A regra vale
  também para uma única dispensa, sem aviso: a mesma disciplina não vale duas vezes.
- **Consequências:** casos 04b a 04e. O alvo fora do catálogo conta os créditos do histórico. Consulta 6.

## Produto e importação

### PC-01 · Identidade de uma ocorrência de extensão

- **Estado:** aceita (com refinamento). Regra: RA-16.
- **Contexto:** a mesma atividade de 30 h, aprovada pelo catálogo e registrada como validada na extensão,
  somava 60 h.
- **Decisão:** períodos conhecidos diferentes identificam ocorrências distintas, que somam. Quando dois
  registros de mesma identificação podem representar a mesma ocorrência, só o maior valor é confirmado e o
  restante aparece "a confirmar", com aviso. Isso cobre a ausência de período e as entradas de mesmo código e
  período de 01c e 01f. A pessoa poderá marcar as entradas como distintas.
- **Consequências:** casos 01c a 01f e 06m. A marcação de "distintas" (01g) fica para a versão seguinte.

### PC-02 e PC-03 · Tag "aprovada" do pincel

- **Estado:** aceita.
- **Contexto:** a tag "aprovada" é uma simulação da pessoa, mas conta como cursada.
- **Decisão:** a tag satisfaz pré-requisitos e conta crédito, e é identificada como marcação manual no
  detalhe da disciplina e na legenda do progresso.
- **Consequências:** casos 01b e 02j.

### PC-04 · Número do BOA na livre escolha

- **Estado:** aceita. Regra: RA-13.
- **Contexto:** o importador lê a lista de "Cursadas e Não Explicitadas", mas não a linha de total do BOA.
- **Decisão:** o segundo número é a **soma da lista** dessa seção, rotulado "BOA, soma das não explicitadas" e
  tratado como estimativa, nunca como total do BOA. Sem a seção, aparece "BOA: indisponível"; seção presente e
  vazia vale 0.
- **Consequências:** casos 05a a 05h.

### PC-05 · Qual é o histórico do curso atual

- **Estado:** aceita (com a decisão de perguntar em caso de dúvida). Regra: RA-21.
- **Contexto:** com dois históricos, o resultado do prazo não pode depender da ordem dos arquivos nem de um
  palpite silencioso.
- **Decisão:** o atual é o de data mais recente, considerando o semestre real mais recente e o ano do bloco
  de transferidos. Em empate ou dúvida, a Grade **pergunta**: a prévia pede a escolha, aplicar e baixar ficam
  desativados até lá, e o cálculo do prazo mantém a nota de RA-09. A escolha explícita sempre vence. O CLI Python
  exige `--atual <arquivo>` na dúvida. O perfil gerado não grava "dúvida".
- **Consequências:** casos 06h, 06j, 06k e 06l.

### PC-06 · Fronteira de 5 anos com só o ano

- **Estado:** aceita. Regra: RA-21.
- **Contexto:** o bloco de transferidos só tem o ano; a idade pode ficar dos dois lados dos 5 anos.
- **Decisão:** a Grade mostra um aviso de precisão insuficiente ("só o ano é conhecido; pode passar de 5
  anos") e não inventa semestre. O prazo só aparece como alerta, nunca como aprovação.
- **Consequências:** caso 06i.

## Publicação e processo

### PUB-01 · Retirada da página legada

- **Estado:** aceita.
- **Contexto:** a página clássica original usava uma versão antiga do jQuery, não tinha testes nem política
  de segurança de conteúdo e gravava cookies com `path=/` no domínio. O modo clássico do app já a substitui.
  Mantê-la exigiria testar uma segunda interface.
- **Decisão:** retirar a página legada e os arquivos que só ela usava. O último estado com ela fica guardado
  numa tag do Git (`legado-classico`) e no repositório de origem do Grêmio. No lugar fica `classico.html`,
  uma página estática curta, sem script, que avisa que a versão antiga saiu e leva ao modo clássico do app.
  As cores guardadas em cookies pela página legada não são migradas.
- **Consequências:** o app não usa nenhum arquivo removido; a página substituta não carrega script nem recurso
  externo (RNF-01).

### PUB-02 · Valor e condições para publicar

- **Estado:** aceita. Texto em [VISAO.md](VISAO.md).
- **Contexto:** um número errado numa interface confiável é o risco central; a experiência de uso decide se
  as pessoas usam a Grade.
- **Decisão:** a declaração de valor é a de VISAO. A publicação depende de quatro condições que passam ou não
  passam, verificadas no candidato pelo hash: privacidade, correção, honestidade sobre o alcance e
  acessibilidade mínima. Depois delas, as prioridades são UX/UI, continuidade e conveniências. Em conflito de
  apresentação, o aviso necessário fica.
- **Consequências:** orienta a ordem de publicação e o desempate do backlog. Análise de uso com colegas fica
  no backlog, sem data.

### PUB-03 · Ordem de publicação

- **Estado:** aceita.
- **Contexto:** as condições 2 e 3 exigem a faixa e as notas, os dois números da livre escolha, a
  identificação da marcação manual e a carga horária como orientação. Marcar ocorrências de extensão como
  distintas é conveniência.
- **Decisão:** antes de publicar, conferir requisitos por semestre, reutilização em dispensas, ocorrências de
  extensão e prazo em reingresso, além de faixa, notas, dois números de livre escolha, identificação da
  marcação manual, carga horária como orientação, validador dos dados de referência e inspeção de UX com
  contraste, foco e teclado. Os critérios estão em [REQUISITOS.md](REQUISITOS.md), as condições em
  [VISAO.md](VISAO.md) e o procedimento em [PUBLICAR.md](PUBLICAR.md). Marcar extensão como distinta fica para
  a versão seguinte, com as horas "a confirmar" e aviso.
- **Consequências:** a v2.0.0 leva essas entregas. O restante está em [MANUTENCAO.md](MANUTENCAO.md).

### PUB-04 · Previsão de formatura montada pela pessoa

- **Estado:** aceita.
- **Contexto:** prometer uma data calculada fere a condição 3, e um cálculo errado fere a condição 2.
- **Decisão:** a Grade não calcula uma data de formatura. A pessoa monta a previsão com o planejamento. A
  previsão calculada (RF-19) é o primeiro item de produto depois da publicação, com casos próprios.
- **Consequências:** os textos públicos dizem "você monta uma previsão de formatura ao planejar os períodos".

### PUB-05 · Os requisitos descrevem a v2.0.0

- **Estado:** aceita.
- **Contexto:** copiar a lista de erros da base antiga para os requisitos publicaria comportamento antigo.
- **Decisão:** [REQUISITOS.md](REQUISITOS.md) e REGRAS-ACADEMICAS descrevem o comportamento esperado da v2.0.0.
  O que fica para depois aparece como "planejado" ou "versão seguinte". A história dos erros fica aqui e,
  depois, em `docs/MUDANCAS.md`.
- **Consequências:** cada requisito tem um estado, preenchido com evidência na verificação do candidato.
  Casos de regressão preservam os erros já encontrados: escolha explícita de histórico, confirmação de
  colisão, ordem dos arquivos, alvo de dispensa fora do catálogo e ocorrências de extensão em períodos
  distintos.

### PUB-06 · Dados do Notion e automação

- **Estado:** aceita (a automação é planejada).
- **Contexto:** horários e guia vêm de uma página mantida por alunos, copiada à mão para `js/horarios.js` e
  `js/guia.js`. Não há como confirmar a oferta oficial por esse caminho.
- **Decisão:** antes de publicar, um validador local confere formato, códigos (contra o currículo, o
  catálogo ou uma exceção justificada), duplicatas e turmas sem código (RF-17). A sincronização automática é
  planejada: um conversor com leitores de CSV e da API, uma rotina semanal que **propõe um Pull Request**
  revisado por uma pessoa, falha fechada e preserva o último conjunto bom. Ela depende de acordo com os
  autores da página.
- **Consequências:** os critérios ficam em [RF-15](REQUISITOS.md#rf-15--sincronização-dos-dados-do-notion-h16--planejado)
  e RNF-11 (CSV primeiro, disparo manual e depois semanal, conexão de leitura criada no workspace dos autores e
  revisão humana do PR), além de RF-18 e RNF-13. Hoje, a atualização é manual ([MANUTENCAO.md](MANUTENCAO.md)).

### PUB-07 · Contribuição com IA

- **Estado:** aceita.
- **Contexto:** o projeto foi feito com ajuda de IA, e a comunidade vai contribuir do mesmo modo. O maior
  risco é expor dados pessoais numa ferramenta de IA.
- **Decisão:** `AGENTS.md` público e genérico na raiz, com `CLAUDE.md` importando-o. `CONTRIBUTING.md` proíbe
  colar PDFs, prints identificáveis e perfil em ferramentas de IA, exige que quem abre o PR revise e teste o
  que a IA produziu, e pede a declaração do uso de IA e o trailer `Co-Authored-By`.
- **Consequências:** instruções privadas de cada pessoa ficam fora do repositório. Ver
  [CONTRIBUTING.md](../CONTRIBUTING.md) e [AGENTS.md](../AGENTS.md).

### PUB-08 · Continuidade e sucessão

- **Estado:** aceita.
- **Contexto:** a retirada da página legada e o guia semestral cobrem a manutenção regular, não a saída de
  quem mantém.
- **Decisão:** [MANUTENCAO.md](MANUTENCAO.md) tem a seção "Se o projeto parar ou o currículo mudar", com
  gatilhos, passos e responsável.
- **Consequências:** se ninguém assumir, o README e a faixa mostram a data da última conferência e como
  exportar o perfil, e a decisão de manter, arquivar ou suspender é registrada aqui, com o motivo.
