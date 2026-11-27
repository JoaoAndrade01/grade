# Decisões da Grade ECI

**Pergunta que este documento responde:** por que está assim.

Cada decisão é um registro curto, no formato de [Nygard](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions):
**estado**, **contexto**, **decisão** e **consequências**. Os casos de teste citados estão em
[REQUISITOS.md](REQUISITOS.md); as regras, em [REGRAS-ACADEMICAS.md](REGRAS-ACADEMICAS.md). Todas as decisões
abaixo são de 2026-11-26 e estão **aceitas**, salvo indicação (as de 2026-11-27 dizem a data; PC-15 a PC-19 são da v2.1.0). Uma decisão substituída aponta para o registro
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
| [D-08](#d-08--transferida-e-requisitos) | Transferida e requisitos |
| [D-09](#d-09--aviso-no-rodapé-seção-sobre-e-modos-clássico-e-planejador) | Aviso no rodapé, Sobre e modos |
| [PC-01](#pc-01--identidade-de-uma-ocorrência-de-extensão) | Identidade de ocorrência de extensão |
| [PC-02 e PC-03](#pc-02-e-pc-03--tag-aprovada-do-pincel) | Tag "aprovada" do pincel |
| [PC-04](#pc-04--número-do-boa-na-livre-escolha) | Número do BOA |
| [PC-05](#pc-05--qual-é-o-histórico-do-curso-atual) | Histórico do curso atual |
| [PC-06](#pc-06--fronteira-de-5-anos-com-só-o-ano) | Fronteira de 5 anos |
| [PC-07](#pc-07--ace-no-reingresso-30-h-confirmadas-e-30-h-a-confirmar) | ACE no reingresso |
| [PC-08](#pc-08--ícone-de-estado-no-cartão-e-legendas-por-aba) | Ícone de estado e legendas por aba |
| [PC-09](#pc-09--aparência-em-três-níveis-e-ícones-nos-controles) | Aparência em três níveis |
| [PC-10](#pc-10--destaque-de-requisitos-no-lugar-das-setas-da-grade) | Destaque no lugar das setas |
| [PC-11](#pc-11--modo-foco-no-planejador) | Modo Foco |
| [PC-12](#pc-12--fase-do-curso-e-previsão-de-formatura) | Fase do curso e previsão de formatura |
| [PC-13](#pc-13--conquistas) | Conquistas |
| [PC-14](#pc-14--registrar-marcações-aprovações-registradas-por-você) | Registrar marcações |
| [PC-15](#pc-15--clássico-só-para-pintar) | Clássico só para pintar |
| [PC-16](#pc-16--botões-que-acendem-ícones-lucide-e-situação) | Botões que acendem, Lucide e Situação |
| [PC-17](#pc-17--trilha-dos-requisitos-ao-segurar) | Trilha dos requisitos ao segurar |
| [PC-18](#pc-18--detalhes-como-folha-no-celular-e-clique-fora) | Detalhes no celular e clique fora |
| [PC-19](#pc-19--aba-conquistas-no-foco) | Aba Conquistas no Foco |
| [PUB-01](#pub-01--retirada-da-página-legada) | Página legada |
| [PUB-02](#pub-02--valor-e-condições-para-publicar) | Valor e condições para publicar |
| [PUB-03](#pub-03--ordem-de-publicação) | Ordem de publicação |
| [PUB-04](#pub-04--previsão-de-formatura-montada-pela-pessoa) | Previsão de formatura |
| [PUB-05](#pub-05--os-requisitos-descrevem-a-v200) | Requisitos descrevem a v2.0.0 |
| [PUB-06](#pub-06--dados-do-notion-e-automação) | Dados do Notion e automação |
| [PUB-07](#pub-07--contribuição-com-ia) | Contribuição com IA |
| [PUB-08](#pub-08--continuidade-e-sucessão) | Continuidade e sucessão |
| [PUB-09](#pub-09--tab-nos-links-no-webkit-do-ambiente-de-teste) | Tab no WebKit do ambiente de teste |
| [PUB-10](#pub-10--exceções-do-validador-aviso-por-fonte-e-efeito-somente-informativo) | Exceções do validador |
| [PUB-11](#pub-11--acessibilidade-corrigida-antes-de-publicar) | Acessibilidade antes de publicar |
| [PUB-12](#pub-12--fechamento-com-uma-revisão-final) | Fechamento com uma revisão final |

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

- **Estado:** aceita para o prazo de 5 anos. Regras: RA-09, RA-21. A interpretação da CEG art. 47 para reingresso
  está pendente. Para pré e co-requisitos, ver [D-08](#d-08--transferida-e-requisitos).
- **Contexto:** quem reingressa (ENEM ou transferência interna) tem o histórico do curso atual com um bloco de
  disciplinas transferidas, só com o ano, e um histórico antigo com os semestres originais. Usar a aprovação
  original gerava alertas diferentes dos produzidos pelo ano do bloco; contar só pelo atual deixava
  disciplinas sem data. A data normativa do reingresso está sob consulta.
- **Decisão:** vale a data em que a disciplina entrou no histórico do curso atual (o ano do bloco). O
  histórico antigo serve só para mostrar a origem.
- **Consequências:** casos 03i, 06h e 06i. A nota de estimativa de RA-09 fica até a regra estar implementada
  e testada.
- **Atualização (2026-11-27):** vale também quando uma equivalência deferida usa uma transferida como origem, direta ou
  por outra equivalência: o prazo da pedida segue o ano do bloco; a data original continua só para requisitos (D-08).
  Ver a regra da pedida em [PC-14](#pc-14--registrar-marcações-aprovações-registradas-por-você).

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

- **Estado:** aceita. A faixa do topo foi substituída por uma linha no rodapé
  ([D-09](#d-09--aviso-no-rodapé-seção-sobre-e-modos-clássico-e-planejador)); as notas continuam.
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

### D-08 · Transferida e requisitos

- **Estado:** aceita em 2026-11-26. Complementa D-03, que continua valendo para o prazo de 5 anos.
- **Contexto:** a disciplina do bloco "AAAA (transferidas)" não tinha semestre e nunca cumpria pré ou
  co-requisito. Quem reingressou via, por exemplo, "Requisito MAC128 não cumprido" em MAC238, com MAC128
  aprovada no curso anterior.
- **Decisão:** a transferida cumpre requisito pelo semestre original (`aprovadaEm`), quando ele existe. Sem o
  semestre original, cumpre só em períodos de anos posteriores ao do bloco; no mesmo ano do bloco, não cumpre.
  O prazo de 5 anos segue D-03 (ano do bloco).
- **Consequências:** casos 02k a 02o. Uma transferida sem semestre original pode gerar aviso num período do ano do
  bloco, mesmo que tenha sido aprovada antes; o aviso orienta, não confirma.

### D-09 · Aviso no rodapé, seção Sobre e modos Clássico e Planejador

- **Estado:** aceita em 2026-11-26. Substitui a faixa do topo de D-06.
- **Contexto:** a faixa fixa no topo ocupava a primeira linha de todas as telas. O interruptor de modo não tinha
  texto, e o nome "Completo" não dizia para que servia o modo.
- **Decisão:** o texto "Feita por alunos de ECI. Não substitui o SIGA, o BOA nem a coordenação." fica numa linha
  mínima no rodapé, em todas as telas e nos dois modos. Configurações ganha a seção **Sobre**, com o texto
  aprovado pela manutenção: quem faz, dados só no navegador, os dois modos, "a Grade orienta, não confirma",
  limites conhecidos e links. O topo tem um seletor visível "Clássico | Planejador"; "Completo" passa a se
  chamar "Planejador". Configurações oferece "Mostrar só ícones no seletor", com o nome acessível mantido. Não
  há aviso de primeira visita: no modo clássico, "Importar do SIGA" sugere trocar para o Planejador.
- **Consequências:** casos 08a, 08b e 08m. As notas de estimativa de D-06 não mudam.
- **Atualização (2026-11-27):** "Mostrar só ícones no seletor" virou o nível Só ícones da Aparência
  ([PC-09](#pc-09--aparência-em-três-níveis-e-ícones-nos-controles)).
- **Atualização (v2.1.0):** o Clássico fica só para pintar e o importador não sugere mais o Planejador: Importar e Criar
  perfil ficam no Planejador ([PC-15](#pc-15--clássico-só-para-pintar)). O aviso do rodapé e a seção Sobre não mudam.

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
- **Atualização (2026-11-27):** ver [PC-08](#pc-08--ícone-de-estado-no-cartão-e-legendas-por-aba). A identificação
  continua no detalhe; a linha da legenda passou ao detalhamento do progresso, e o cartão marcado mostra o ícone ✎.
- **Atualização (2026-11-27):** o pincel continua simulação e não dá selo nem conta para a fase. Para que uma
  marcação passe a contar, a pessoa usa "Registrar marcações"
  ([PC-14](#pc-14--registrar-marcações-aprovações-registradas-por-você)). A aprovação registrada por você tem
  ícone próprio (☑) e a origem "registrada por você", distinta do pincel (✎) e do registro importado (✓).

### PC-04 · Número do BOA na livre escolha

- **Estado:** aceita. Regra: RA-13.
- **Contexto:** o importador lê a lista de "Cursadas e Não Explicitadas", mas não a linha de total do BOA.
- **Decisão:** o segundo número é a **soma da lista** dessa seção, rotulado "BOA, soma das não explicitadas" e
  tratado como estimativa, nunca como total do BOA. Sem a seção, aparece "BOA: indisponível"; seção presente e
  vazia vale 0.
- **Consequências:** casos 05a a 05h.
- **Atualização (2026-11-27):** o número aparece no detalhamento do progresso, com este rótulo, fora da Aparência
  Minimalista; no Minimalista não há detalhamento ([PC-09](#pc-09--aparência-em-três-níveis-e-ícones-nos-controles)).

### PC-05 · Qual é o histórico do curso atual

- **Estado:** aceita (com a decisão de perguntar em caso de dúvida). Regra: RA-21.
- **Contexto:** com dois históricos, o resultado do prazo não pode depender da ordem dos arquivos nem de um
  palpite silencioso.
- **Decisão:** o atual é o de data mais recente, considerando o semestre real mais recente e o ano do bloco
  de transferidos. Em empate, dúvida ou datas ausentes (dois históricos reconhecidos em que algum não tem data
  utilizável), a Grade **pergunta**: a prévia não marca opção, aplicar e baixar ficam desativados até a escolha, e
  o cálculo do prazo mantém a nota de RA-09. A escolha explícita sempre vence, mesmo para um histórico sem datas. O
  CLI Python exige `--atual <arquivo>` na dúvida e sai com código 2. O perfil gerado não grava "dúvida". Perfis
  antigos que gravaram "dúvida" continuam legíveis e voltam a mostrar "Estimativa: o histórico do curso atual não foi
  confirmado."
- **Consequências:** casos 06h, 06j, 06k e 06l.

### PC-06 · Fronteira de 5 anos com só o ano

- **Estado:** aceita. Regra: RA-21.
- **Contexto:** o bloco de transferidos só tem o ano; a idade pode ficar dos dois lados dos 5 anos.
- **Decisão:** a Grade mostra um aviso de precisão insuficiente ("só o ano é conhecido; pode passar de 5
  anos") e não inventa semestre. O prazo só aparece como alerta, nunca como aprovação.
- **Consequências:** caso 06i.

### PC-07 · ACE no reingresso: 30 h confirmadas e 30 h a confirmar

- **Estado:** aceita. Regras: RA-16, RA-21.
- **Contexto:** o histórico anterior registra a mesma atividade de extensão de 30 h em dois períodos (2020/1 e
  2021/1), e o histórico do curso atual traz uma única entrada transferida para ela. Contar 60 h confirmadas
  afirmaria mais do que o registro do curso atual mostra.
- **Decisão:** manter **30 h confirmadas e 30 h a confirmar**, com aviso de possível duplicidade e a orientação de
  conferir no SIGA ou com a coordenação.
- **Consequências:** o caso 06m descreve esse comportamento e muda se a regra da ACE no reingresso for decidida de
  outro modo. Marcar as atividades como distintas (01g) fica para uma versão seguinte.

### PC-08 · Ícone de estado no cartão e legendas por aba

- **Estado:** aceita em 2026-11-27. Atualiza
  [PC-02 e PC-03](#pc-02-e-pc-03--tag-aprovada-do-pincel) e o caso 14i.
- **Contexto:** o texto "Aprovada · perfil" ou "Cursada · marcação" embaixo do nome ocupava espaço em todos os
  cartões. A barra, os "detalhes" e as legendas apareciam em abas que não usam o progresso, como Optativas.
- **Decisão:** o cartão mostra um ícone de estado, sem texto de situação: ✓ aprovada, ◐ cursando, ○ planejada,
  … prevista e ✎ marcação manual. Reprovada (✗) e equivalência pedida (⇄) também têm ícone, para que nenhum estado
  dependa só da cor (WCAG 1.4.1). A situação e a origem ficam no nome acessível, no primeiro toque (14h) e nos
  detalhes. A barra e os "detalhes" do progresso ficam na Grade (também no Clássico) e na Linha do tempo; as outras
  abas ficam sem barra e sem legendas. A legenda de categorias fica na Linha do tempo. A escala de dificuldade aparece
  junto a Exibir → Dificuldade, quando ativa; no Clássico, onde Exibir fica em Configurações, aparece na faixa de
  legenda. A aprovação pelo pincel é identificada no detalhamento do progresso. A soma da lista do BOA mantém o
  rótulo de [PC-04](#pc-04--número-do-boa-na-livre-escolha).
- **Consequências:** casos 14b, 14i e 14p.
- **Atualização (2026-11-27):** a aprovação registrada por você ganha o ícone ☑, distinto do ✓ do registro
  importado, com a origem "registrada por você" no nome acessível, no primeiro toque e nos detalhes. O detalhamento
  tem uma linha irmã da marcação manual: "☑ N aprovações registradas por você: contam para fase e conquistas, não
  são registro do SIGA." No Minimalista, o cartão mostra só o nome e o ícone de estado, sem detalhamento.
- **Atualização (v2.1.0):** os ícones de estado passam a ser da Lucide, com `data-estado` estável, e Exibir → Situação liga
  e desliga o ícone nos cartões da Grade ([PC-16](#pc-16--botões-que-acendem-ícones-lucide-e-situação)). No Clássico, o cartão fica só com cor e nome, sem ícone, sem barra e sem
  legenda; a situação continua no nome acessível ([PC-15](#pc-15--clássico-só-para-pintar)). A escala de dificuldade não aparece mais no Clássico.

### PC-09 · Aparência em três níveis e ícones nos controles

- **Estado:** aceita em 2026-11-27. Atualiza [D-09](#d-09--aviso-no-rodapé-seção-sobre-e-modos-clássico-e-planejador)
  e o caso 14n.
- **Contexto:** a aparência das abas ("Ícone e texto", "Somente texto", "Somente ícone") e a opção de só ícones do
  seletor eram duas preferências para a mesma ideia. Os controles da Grade, de Optativas e do Cronograma só tinham
  texto, e quem quer uma tela limpa não tinha um nível próprio.
- **Decisão:** uma preferência, Aparência, com três níveis: **Ícone + texto** (padrão), **Só ícones** e
  **Minimalista**. Ela vale para a barra do topo, o seletor de modo, as abas e os controles de Exibir, Destaque,
  filtros de Optativas, + Período, Exportar perfil.js e Excluir período. Em Só ícones, o texto some só da tela e fica no
  nome acessível e no `title`. No Minimalista, os cartões da Grade mostram o nome e o ícone de estado; as ferramentas
  ficam atrás de um botão ⋯, num painel com ícone e texto (Esc fecha e devolve o foco); a barra diz os números no nome
  acessível e os mostra com foco ou toque; o detalhamento do progresso fica fora. Migração ao abrir: "Mostrar só
  ícones no seletor" ligada vira Só ícones; desligada vira Ícone + texto; "Somente ícone" continua Só ícones; "Somente
  texto" vira Ícone + texto. A chave antiga só sai depois que a nova é gravada. Em Optativas, "todas acesas" só tira o
  esmaecimento das inativas; fica habilitada quando há uma inativa na lista e guarda a preferência. Exibir → Plano
  mostra no cartão o primeiro semestre planejado e "+N", com a lista completa no nome acessível e nos detalhes.
- **Consequências:** casos 14n, 14q a 14u e 14p.

### PC-10 · Destaque de requisitos no lugar das setas da Grade

- **Estado:** aceita em 2026-11-27. Atualiza os casos 14d e 14l.
- **Contexto:** as setas da Grade cruzavam cartões, pediam vãos maiores entre colunas e eram difíceis de seguir no
  celular. "Todas" desenhava dezenas de curvas.
- **Decisão:** Exibir → Destaque tem dois modos: **Em foco** (padrão) e **Desligado**. Em foco, ao passar o mouse,
  focar pelo teclado ou tocar uma disciplina, o pré-requisito acende com contorno contínuo, o co-requisito com
  contorno tracejado e o que ela libera ganha a etiqueta "libera" em texto, dentro do cartão e sem cobrir o nome; o
  resto esmaece sem baixar o contraste do texto. O mouse limpa o destaque ao sair, o teclado acompanha o foco e, com
  os detalhes abertos, o destaque fica na disciplina consultada. O primeiro toque continua só consultando. Desligado
  não destaca na Grade. A preferência antiga migra: Ocultas vira Desligado; Disciplina em foco e Todas viram Em
  foco. As setas didáticas de "A ECI por trás da Grade" continuam.
- **Consequências:** casos 14d, 14h, 14l e 14u. A distinção não depende da cor (contorno contínuo, tracejado e a
  palavra "libera").
- **Atualização (v2.1.0):** Destaque vira **Trilha**, com três modos; o padrão passa a ser **Ao segurar** e "Em foco" vira
  **Ao passar o mouse** ([PC-17](#pc-17--trilha-dos-requisitos-ao-segurar)).

### PC-11 · Modo Foco no Planejador

- **Estado:** aceita em 2026-11-27.
- **Contexto:** quem já cursou boa parte do curso vê uma tela cheia de disciplinas concluídas e perde o que falta.
- **Decisão:** o botão 🎯 Foco, na barra do topo, liga e desliga um modo do Planejador em que ficam Grade, Linha do
  tempo e Cronograma. Ligado numa aba escondida, o app vai para a Linha do tempo e anuncia a aba escondida. Somem as
  aprovadas (inclusive transferidas, dispensas e registradas por você) e as reprovações já superadas; previstas,
  cursando, planejadas e pendentes ficam. Na Linha do tempo, os períodos passados sem nada elegível somem, inclusive o
  bloco de transferidas; coluna mista mostra só os elegíveis; o período atual sempre aparece. Sem perfil, o botão
  fica desabilitado com "Importe ou crie um perfil"; no Clássico, com "Disponível no Planejador", e a preferência volta
  com o Planejador. Desligar mantém a aba atual e o foco no 🎯 (`aria-pressed`). Totais e planejamento nunca mudam.
- **Consequências:** casos 20a a 20e. O cartão da fase e a estante de conquistas aparecem no Foco
  ([PC-12](#pc-12--fase-do-curso-e-previsão-de-formatura), [PC-13](#pc-13--conquistas)).
- **Atualização (v2.1.0):** no Clássico, o botão do Foco fica oculto (a preferência continua salva) ([PC-15](#pc-15--clássico-só-para-pintar)). Com o Foco
  ligado, a quarta aba é **Conquistas**, que recebe o cartão da fase e a estante ([PC-19](#pc-19--aba-conquistas-no-foco)).
- **Atualização (v2.1.0):** no Foco, as reprovações de períodos passados também somem da Linha do tempo; a disciplina
  continua pendente na Grade. A reprovação esperada do período atual continua; totais e planejamento não mudam.

### PC-12 · Fase do curso e previsão de formatura

- **Estado:** aceita em 2026-11-27. Substitui [PUB-04](#pub-04--previsão-de-formatura-montada-pela-pessoa).
- **Contexto:** a mensagem certa para quem começa não é a mesma de quem está terminando. A previsão de formatura
  montada só pela pessoa deixava de usar o que o plano já diz.
- **Decisão:** a fase usa o percentual registrado (aprovações importadas mais as registradas por você) sobre o total
  de créditos do curso, com cada grupo limitado ao seu total. **Calouro:** menos de 25% e até dois semestres reais do
  Histórico do curso atual com matéria cursada, sem o bloco de transferidas, o período em curso e o semestre declarado.
  **Veterano:** 75% ou mais. O resto é **meio de curso**, inclusive 25% exatos e menos de 25% com mais de dois
  semestres. Sem Histórico, só o percentual. A precisão é a do cálculo; só a tela arredonda. Quando a fase muda sem as
  declaradas, o cartão mostra "· declarado". Os cartões trazem, por fase, o que a base destrava, marcos, avanço do
  período e a reta final (Projeto de Graduação, Estágio, ACE, Humanas e Optativas). O tom é **zoeira** por padrão, com a
  opção **discreto**; projeções aparecem como estimativa. Frases curtas do tom zoeira: "🐢 Devagar e sempre." junto ao
  próximo marco e "🧘 Calma, Calabreso. Período … com N matérias difíceis: dá para planejar." quando um período do
  plano tem duas ou mais 🟠/🔴. A previsão de formatura usa como cumprido só o registrado
  (importado e registrado por você; créditos manuais, pincel e previstas não cumprem) e só dá um semestre quando o plano
  cobre créditos por grupo, obrigatórias (inclusive Projeto de Graduação e Estágio) e ACE em horas. O plano (com as previstas diretas e as pedidas de
  equivalências previstas, no semestre da origem) é lido em ordem cronológica, contando cada disciplina uma vez, na primeira ocorrência, e as horas de ACE no semestre delas; o
  semestre mostrado é o primeiro em que tudo fica coberto. Senão, mostra a pendência concreta ("Planeje os NN cr que faltam", ou só as horas) ou explica por
  que não dá (sem perfil, sem período atual, período sem semestre). Tudo cumprido mostra a conclusão.
- **Consequências:** casos 19a a 19e e 20f a 20h.

### PC-13 · Conquistas

- **Estado:** aceita em 2026-11-27.
- **Contexto:** marcos pequenos ajudam a manter o ritmo, mas não podem parecer confirmação oficial nem premiar uma
  simulação.
- **Decisão:** a estante de conquistas aparece no Foco, junto ao cartão da fase, com os selos obtidos, o próximo
  marco e o que falta. São 24 selos em quatro grupos (linhas de matérias, matérias difíceis, etapas e extras); o emoji
  é o ícone, a dificuldade é a do guia. Dá selo o registrado: aprovação no Histórico, equivalência deferida e dispensa.
  A aprovação registrada por você também dá selo, com "· declarado". Prevista e pincel mostram só "quase lá (prevista)"
  ou "quase lá (simulação ✎)". As regras de mesmo período (Calma, Calabreso; Tá pago; Movido a café) exigem um período
  do Histórico; o semestre declarado não conta. Com o total de créditos e ACE pendente, "Créditos completos" mostra as
  horas que faltam; "Acabou! Acabou!" só sai com créditos, ACE, Projeto de Graduação e Estágio. O selo do Notion depende
  só do registrado e de as disciplinas que faltam estarem no Cronograma (ACE não entra; créditos manuais não cumprem) e
  some se uma sair do plano. Cada ocorrência de ACE guarda a própria origem. A estante recalcula
  sempre do perfil atual. Só a lista de avisos já exibidos fica no navegador, por perfil, com uma identidade local
  opaca, nunca um dado do aluno: recarga e atualização do mesmo perfil preservam a lista; substituição ou limpeza
  recomeçam. A animação do selo novo respeita `prefers-reduced-motion`.
- **Consequências:** casos 20i a 20l. Chaves `perfilId` e `selosAvisados` em [PRIVACIDADE.md](PRIVACIDADE.md).
- **Atualização (v2.1.0):** a estante sai da Grade e vai para a aba Conquistas, em cartões por grupo; o anúncio do selo
  novo fica separado do desenho e sai mesmo com a aba fechada ([PC-19](#pc-19--aba-conquistas-no-foco)). As regras dos selos não mudam.

### PC-14 · Registrar marcações: aprovações registradas por você

- **Estado:** aceita em 2026-11-27. Atualiza [PC-02 e PC-03](#pc-02-e-pc-03--tag-aprovada-do-pincel) e
  [PC-08](#pc-08--ícone-de-estado-no-cartão-e-legendas-por-aba).
- **Contexto:** quem não tem o Histórico em mãos marcava aprovações com o pincel, que é simulação e não conta para
  fase e conquistas. Faltava um jeito de montar o perfil sem importar, sem confundir o declarado com o oficial.
- **Decisão:**
  - **Armazenamento:** o perfil ganha a lista opcional `aprovacoesDeclaradas` (`code`, `registradoEm`, `semestre`
    opcional), fora de `periodos`, porque a reimportação refaz os períodos cursados. Um item por código (vale o
    último). O importador (JS e Python) copia o campo do perfil anterior. No navegador, a lista fica no plano até
    exportar; um item inválido é ignorado com aviso, sem derrubar o plano. No arquivo, um item inválido recusa o perfil
    com o campo apontado. Não há número de versão: perfil antigo lê lista vazia.
  - **Fluxo:** "Registrar marcações" (paleta e Configurações) mostra quantas serão gravadas e separa as já aprovadas, as
    já registradas, as não reconhecidas e as em curso no BOA (desmarcadas). Um campo de semestre opcional vale para o
    lote; o ajuste individual fica no detalhe. Sem perfil, o fluxo cria um. Gravar tira as marcações convertidas do
    pincel e grava as declaradas antes. O resultado fica no diálogo com Desfazer e fecha só por Fechar ou Esc. A linha
    que conflitaria com uma reprovação importada fica desmarcada com o motivo. Controles indisponíveis usam
    `aria-disabled` com o motivo em texto.
  - **Contagem e SIGA:** o registro importado vence a declarada, que fica guardada fora da conta, com remoção em lote
    opcional; semestre diferente é divergência informativa ("Vale o SIGA"). A declarada vence previsão e plano. Uma
    reprovação do SIGA no semestre declarado ou depois é conflito e a declarada não conta; sem semestre, o limite é o
    semestre de `registradoEm`. A equivalência deferida segue a regra da pedida, logo abaixo. Uma equivalência importada
    aprovada confirma também a declarada que estava em conflito. O bloco de transferidas confirma; o semestre declarado
    só é comparado com `aprovadaEm`. Carregar outro perfil pergunta antes quando alguma declarada deste navegador não
    está no arquivo; descartar o perfil salvo tira também as declaradas do plano.
  - **Regra da pedida de uma equivalência deferida**, a partir do conjunto de origens, sem depender da ordem:
    - *status:* aprovada se todas as origens estão aprovadas; prevista se as que faltam estão previstas ou em curso;
      pendente se alguma origem está ausente ou reprovada (sem fonte, sem plano e sem selo).
    - *fonte:* a mais fraca: declarada se alguma origem for declarada; prevista se a pedida ficou prevista.
    - *data efetiva:* a mais tardia entre as origens. Cada origem contribui com o semestre que conhece: importada,
      prevista ou em curso, o semestre do período; transferida, `aprovadaEm` ou, sem ela, o ano do bloco (D-08);
      declarada com semestre, o semestre informado; declarada sem semestre, o limite de `registradoEm` (A7). No empate, o
      semestre conhecido vence o limite. Sem data em alguma origem, a pedida fica sem data.
    - *requisito:* a pedida cumpre num semestre quando todas as origens cumprem, cada uma pelo próprio critério.
    - *prazo de cinco anos:* outra data, a de D-03: a transferida conta pelo ano do bloco, nunca por `aprovadaEm`; a
      declarada sem semestre fica sem data; a pedida usa a origem mais tardia. O texto diz de onde vem a data: registro
      do SIGA, bloco de transferidos ou semestre informado por você (no empate, o registro do SIGA).
    - *previsão e selos:* a pedida prevista entra no plano na data efetiva só quando as origens que faltam estão previstas
      ou em curso no período atual ou num futuro; num período passado não cobre nada. A fonte decide o selo e a fase.
    - *período exibido:* o da origem que dá a data. No empate, período real do Histórico ou do plano, depois o bloco de
      transferidas, a pedida (também a de outra equivalência, mesmo que ela venha de um período real) e a declarada;
      persistindo, a origem de menor código.
    - *pedidos encadeados:* um pedido que usa a pedida de outro é resolvido depois dele, seja qual for a ordem da lista;
      entre pedidos independentes, a ordem é fixa (pela pedida e pelas cursadas). Pedidos em ciclo (A usa a pedida de B e
      B a de A) ficam em conflito, sinalizados, e não registram nada; os demais seguem.
    - *consumo:* a cursada ou a pedida usada por um pedido deferido é consumida: não soma créditos no próprio grupo nem
      entra de novo no plano. Só a pedida final conta.
  - **Ordem fixa fora das equivalências:** nada depende da ordem dos períodos, dos itens ou dos pedidos.
    - *Mesma disciplina em mais de um registro:* vale o mais recente pelo semestre, depois pela base do prazo e pelo nome
      do período. Com dois blocos de transferidos, o prazo usa o mais recente, que é o do curso atual (D-03, PC-05).
    - *Dois itens do plano para a mesma disciplina no mesmo semestre:* conta a origem de menor código.
    - *Dois pedidos pendentes para a mesma pedida:* "em análise" vence "a pedir"; depois, o de menor pedida e cursadas.
  - **Semestre ausente:** requisito pelo limite de `registradoEm` (pré-requisito depois dele; co-requisito também nele),
    com aviso no próprio semestre; o prazo de cinco anos fica "Data de aprovação não confirmada", sem idade e sem data
    inventada. D-03 e D-08 não são reabertas.
  - **Fase e selos:** a declarada conta, com a marca "declarado"; o semestre declarado não conta como semestre cursado
    para a fase de calouro nem para os selos de mesmo período.
  - **Origem visível:** ícone ☑ e o texto "registrada por você", "não é registro do SIGA", no cartão, no nome acessível,
    no detalhe, no detalhamento e na Linha do tempo (coluna "Registradas por você · sem semestre").
- **Consequências:** RF-21 (casos R01 a R37) e RF-12. Campo em [PERFIL.md](PERFIL.md); regras em
  [REGRAS-ACADEMICAS.md](REGRAS-ACADEMICAS.md); cópia no importador em [IMPORTADOR.md](IMPORTADOR.md).
- **Limitações conhecidas** (a Grade não bloqueia nada; confira estes casos com a coordenação):
  - *Equivalências encadeadas:* quando uma equivalência é usada como origem de outra, a data, a fonte ou os créditos da
    última podem sair inconsistentes, principalmente quando o SIGA confirma a equivalência do meio.
  - *Pedido que usa a própria pedida como origem:* não é sinalizado e pode retirar créditos da conta.
  - *Ciclos maiores* (A usa a pedida de B, B a de C, C a de A): são sinalizados, mas o aviso fala em "uso em
    duplicidade", não em ciclo.
  - *Período atual sem semestre:* o aviso de plano num período que já passou não aparece.
  - *Disciplina fora do catálogo com créditos diferentes:* se ela aparece em dois períodos com créditos diferentes, a
    soma pode usar um ou outro valor conforme a ordem dos períodos.
  - *Duas aprovações do mesmo código no mesmo semestre:* o resultado pode variar conforme a ordem.

### PC-15 · Clássico só para pintar

- **Estado:** aceita na v2.1.0 (2026-11-27). Atualiza [D-09](#d-09--aviso-no-rodapé-seção-sobre-e-modos-clássico-e-planejador), [PC-08](#pc-08--ícone-de-estado-no-cartão-e-legendas-por-aba), [PC-11](#pc-11--modo-foco-no-planejador) e
  RNF-06; reescreve os casos 14o, 14p e 20b.
- **Contexto:** o Clássico juntava a grade para pintar com a barra, Configurações, importar, Foco, Registrar e os ícones
  de estado. Quem só queria pintar via controles que não usava, e o modo perdia o sentido de "só a grade".
- **Decisão:**
  - **Topo:** só o seletor "Clássico | Planejador" e o botão de tema, sempre visíveis, mesmo com o seletor oculto ou o
    atalho do tema desfixado em Configurações; essas preferências continuam salvas para o Planejador.
  - **Saem do Clássico:** Configurações, Importar, Exportar, Foco, Registrar marcações, a barra, o detalhamento, a
    legenda, o aviso do perfil salvo, a sugestão de trocar de modo no importador e os extras do cartão (código, nota,
    dificuldade, presença, plano e ícone de estado). Os controles estáticos ficam ocultos, fora do Tab e da árvore de
    acessibilidade.
  - **Ficam:** a paleta (tags, "Limpar", Editar tags e o cadeado) e os cartões com cor e nome. A situação continua no
    nome acessível. O Clássico ignora Exibir sem mudar a preferência salva.
  - **Pintar:** a disciplina protegida só anuncia, sem abrir Detalhes; a consulta do primeiro toque fica só com o texto.
  - **Registrar e criar perfil:** no Planejador.
- **Consequências:** casos 14o, 14p, 14v e 20b; teste `t_classico_so_pintar`. **RNF-06:** sem perfil, o próximo passo
  (Criar perfil ou Importar do SIGA) fica no Planejador, a um toque do seletor visível no topo; a primeira visita
  continua no Clássico, sem aviso. A nova passada da inspeção heurística deve conferir esse caminho.

### PC-16 · Botões que acendem, ícones Lucide e Situação

- **Estado:** aceita na v2.1.0 (2026-11-27). Atualiza [PC-08](#pc-08--ícone-de-estado-no-cartão-e-legendas-por-aba) e [PC-09](#pc-09--aparência-em-três-níveis-e-ícones-nos-controles).
- **Contexto:** os controles misturavam caixas de marcar, rádios, emojis e símbolos soltos (#, ★, ●, ✓, 📅, ⇢, ◌, ⊞, ☼).
- **Decisão:**
  - **Botões que acendem:** Exibir e os filtros das Optativas são um botão por opção, aceso quando ligado
    (`aria-pressed`), sem caixa de marcar. Em Só ícones, só o ícone, com o nome no `title` e no nome acessível.
    "Horários de AAAA/S" continua `select` nativo. "Todas acesas" indisponível fica com `aria-disabled` e anuncia o
    motivo. Configurações mantém os controles nativos.
  - **Ícones:** todos da Lucide (ISC), em `js/icones.js`. Os ícones de estado ganham `data-estado` estável (aprovado,
    cursando, planejado, previsto, marcacao, reprovado, declarada, equivalencia). Pendente continua sem ícone.
    Exceções, por serem conteúdo: as bolinhas da dificuldade, os emojis dos selos e os chips do cartão da fase.
  - **Situação** (Exibir, padrão ligado): liga e desliga o ícone de estado nos cartões da Grade; a situação continua no
    nome acessível e nos detalhes.
  - **Dificuldade numa fileira só:** os botões do filtro por nível são a legenda. Em Ícone + texto, bolinha e nome; em Só
    ícones, só a bolinha, com o nome no `title` e no nome acessível. O filtro continua igual e a legenda separada sai.
- **Consequências:** casos 14i, 14r, 14s, 14w, 14x e 14y.

### PC-17 · Trilha dos requisitos ao segurar

- **Estado:** aceita na v2.1.0 (2026-11-27). Atualiza [PC-10](#pc-10--destaque-de-requisitos-no-lugar-das-setas-da-grade).
- **Contexto:** com "Em foco", qualquer passada do mouse acendia e esmaecia a Grade, o que cansava ao pintar.
- **Decisão:**
  - **Modos:** Desligado, **Ao segurar** (padrão) e Ao passar o mouse (o antigo "Em foco"), numa chave segmentada igual
    ao seletor de modo. Vale na Grade do Clássico e do Planejador; Linha do tempo e Optativas não mudam.
  - **Ao segurar:** clicar e segurar, tocar e segurar (cerca de 400 ms) ou segurar Espaço num cartão mostra a trilha;
    soltar apaga, mesmo com Detalhes aberto. Nenhum outro gatilho acende. Cancela com movimento acima de 10 px, rolagem,
    saída do alvo, perda de foco ou troca de tela. O clique curto continua igual; o clique que encerra a pressão longa é
    consumido. A rolagem da página continua.
  - **Migração pela regra literal:** sem a chave, Ao segurar; "foco" e "desligado" salvos continuam; a cadeia antiga
    `setas` migra (Ocultas → Desligado; Disciplina em foco e Todas → Ao passar o mouse).
- **Consequências:** casos 14d, 14l, 14u e 14z.

### PC-18 · Detalhes como folha no celular e clique fora

- **Estado:** aceita na v2.1.0 (2026-11-27).
- **Contexto:** no celular, o detalhe de uma disciplina pintada podia cortar a parte de cima, e os painéis só fechavam
  pelo ✕ ou por Esc.
- **Decisão:** até 720 px, o painel de detalhes abre como uma folha que sobe de baixo, inteira, com rolagem interna, acima
  da paleta: fundo escurecido, o resto da página `inert`, `role="dialog"` com `aria-modal` e o foco preso dentro.
  ✕, toque no fundo e Esc fecham, e o foco volta ao cartão. O toque no fundo só fecha, sem atravessar para o cartão de
  baixo. Clique fora fecha os detalhes da disciplina e o editor de tags no computador e no celular; o importador, a
  Privacidade e as Referências não fecham por clique fora. Arrastar para baixo fica para depois.
- **Consequências:** casos 22a a 22c.

### PC-19 · Aba Conquistas no Foco

- **Estado:** aceita na v2.1.0 (2026-11-27). Atualiza [PC-11](#pc-11--modo-foco-no-planejador) e
  [PC-13](#pc-13--conquistas).
- **Contexto:** o cartão da fase e a estante ocupavam o alto da Grade e da Linha do tempo, e a lista completa ficava
  escondida em "Ver todas".
- **Decisão:** com o Foco ligado, as abas são Grade, Linha do tempo, Cronograma e **Conquistas**. Fora do Foco, a aba
  só aparece se Configurações → Conquistas estiver em "também fora do Foco" (padrão: só no Foco). A página tem a
  Situação ("Bora, [nome] 💪"; discreto: "Situação · [nome]"), com fase, barra, avanço do período, próximo marco, o que
  destrava e previsão, e as conquistas em cartões por grupo, com progresso e "N de M". Sem perfil, orienta a criar ou
  importar. O anúncio de selo novo sai mesmo com a aba fechada e o selo aparece como novo ao abrir a aba. Se a aba some
  com ela selecionada, a Grade volta, há anúncio e o foco fica no controle que causou a mudança.
- **Consequências:** casos 20m a 20p. Chave `conquistasFora` em [PRIVACIDADE.md](PRIVACIDADE.md).

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
- **Atualização (2026-11-27):** substituída por [PC-12](#pc-12--fase-do-curso-e-previsão-de-formatura). A previsão
  calculada só aparece quando o plano cobre tudo o que falta, marcada como estimativa.

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

### PUB-09 · Tab nos links no WebKit do ambiente de teste

- **Estado:** aceita.
- **Contexto:** no WebKit 27.2 do Playwright 1.65.2 no Windows, nenhum atalho de teclado alcança links: o mesmo
  ocorre numa página HTML mínima e em todos os links do app. Em Chromium e Firefox, Tab percorre os links na ordem do
  DOM, com contorno de foco visível. O comportamento do Safari no Mac e no iPhone não pode ser deduzido desse ambiente.
- **Decisão:** tratar como **limite do ambiente de teste**, não como defeito da Grade. Nenhum `tabindex` é forçado. A
  verificação de Tab nos links vale para Chromium e Firefox, por uma sonda separada da suíte; Safari no Mac, iPhone real
  e a passada com leitor de tela ficam pendentes.
- **Consequências:** a frase do limite está em [DESIGN.md](DESIGN.md#teclado-nos-fluxos-centrais) e em
  [PLANO-DE-TESTE.md](PLANO-DE-TESTE.md#6-limite-do-ambiente-webkit); a passada pendente está em
  [MANUTENCAO.md](MANUTENCAO.md). Se o Safari real mostrar um defeito, ele volta como defeito.

### PUB-10 · Exceções do validador: aviso por fonte e efeito "somente informativo"

- **Estado:** aceita. Requisito: [RF-17](REQUISITOS.md#rf-17--validação-dos-dados-de-referência-h14).
- **Contexto:** os horários e o guia trazem códigos fora do currículo e do catálogo e turmas sem código, ainda por
  identificar. O validador deve falhar para um código desconhecido, mas permitir uma exceção justificada.
- **Decisão:** cada exceção declara **origem, motivo e efeito**. O efeito **"somente informativo"** vale por
  estrutura: o app não lê a lista de exceções, e um código fora do currículo e do catálogo já fica fora de cálculos e
  sugestões; as turmas sem código aparecem só na lista informativa de Optativas, sem ação para planejar. Uma exceção sem
  uso gera **aviso por fonte** (não falha), e a remoção acontece na revisão semestral. Conferir nomes sem código entre
  o guia e os horários fica no backlog, junto da automação do Notion.
- **Consequências:** a lista não acumula exceções vencidas se a revisão semestral a limpar. O efeito "entra no
  cálculo" não vale para um nome sem código, que nunca entraria.

### PUB-11 · Acessibilidade corrigida antes de publicar

- **Estado:** aceita. Condição de publicação 4 ([VISAO.md](VISAO.md)).
- **Contexto:** a inspeção heurística, com axe-core e teclado, encontrou dez bloqueios: estados dos cartões só pela
  cor, ordem e perda do foco, campos sem nome acessível, edição de horários e escolha do perfil sem teclado, contraste,
  rolagem horizontal a 320 px, alvos pequenos, papéis ARIA inconsistentes nas abas e um desvio do validador de horários.
  Também apontou seis melhorias.
- **Decisão:** corrigir os dez bloqueios antes de publicar, cada um com um critério de pronto verificável. Entram a
  mensagem do PDF inválido em português, com BOA por extenso na primeira menção, e o diagnóstico das exceções do
  validador. As demais melhorias (como consultar sem alterar a Grade, explicar a cópia do perfil, o recorte dos filtros de
  Optativas e a lista do BOA) vão para o backlog. O teste que verifica a devolução do foco passa a esperar o retorno de
  forma dirigida, sem trocar o resultado esperado. Os critérios WCAG 2.2 AA são os **selecionados** em
  [DESIGN.md](DESIGN.md#acessibilidade), sem declarar conformidade integral.
- **Consequências:** o resultado das medições entra em [PLANO-DE-TESTE.md](PLANO-DE-TESTE.md) por hash. Leitor de tela
  real e o teste com colegas continuam no backlog.

### PUB-12 · Fechamento com uma revisão final

- **Estado:** aceita.
- **Contexto:** sucessivos ciclos de revisão de cada parte atrasariam a publicação sem ganho proporcional, e a
  documentação e o código dependem um do outro (números, contagens, estados de requisito).
- **Decisão:** a documentação é escrita em paralelo às últimas correções de código, a integração das duas é o
  último passo técnico e preenche os números finais, e **uma única revisão independente** do candidato integrado reúne
  a reinspeção dos critérios de acessibilidade, a revisão dos documentos e o teste independente pelo hash. Depois dela,
  corrige-se só o que fere as quatro condições para publicar, com os testes automáticos como verificação; o resto
  vai para o backlog. A conferência dos dados do Notion por quem mantém continua obrigatória antes de publicar.
- **Consequências:** o procedimento de publicar é o de [PUBLICAR.md](PUBLICAR.md), com a lista de
  [PLANO-DE-TESTE.md](PLANO-DE-TESTE.md#7-lista-de-verificação-de-versão).
