# Registro de mudanças

**Pergunta que este documento responde:** o que mudou em cada versão e o que ainda não funciona. As decisões por trás das
mudanças estão em [DECISOES.md](DECISOES.md); os critérios, em [REQUISITOS.md](REQUISITOS.md). A versão atual aparece no
rodapé da Grade.

## v2.0.0 — primeira versão pública

A data de publicação é a da release `v2.0.0` no GitHub, que usa o texto de "O que mudou" até "Limitações conhecidas"
como notas.

Primeira versão pública da Grade ECI, a partir do fork de [`gremio-eci/grade`](https://github.com/gremio-eci/grade).
É um site estático para alunos de Engenharia de Computação e Informação da UFRJ planejarem o curso, com os dados
acadêmicos só no navegador. A Grade orienta; não substitui o SIGA, o BOA nem a coordenação.

### O que mudou para quem usa

- **Clássico | Planejador.** Um seletor visível no topo troca entre o modo **Clássico** (a grade inteira numa tela,
  com a paleta) e o **Planejador** (linha do tempo, optativas, cronograma e pedidos). No modo Clássico, "Importar do
  SIGA" sugere o Planejador.
- **Aparência em três níveis.** Em Configurações → Aparência: **Ícone + texto** (padrão), **Só ícones** e
  **Minimalista**, para a barra do topo, o seletor, as abas e os controles (Exibir, Destaque, filtros de Optativas,
  + Período, Exportar perfil.js e Excluir período). Em Só ícones, o nome continua no leitor de tela e ao passar o mouse.
  No Minimalista, os cartões da Grade mostram só o nome e o ícone de estado, as ferramentas ficam atrás de um botão ⋯ e
  a barra mostra os números com foco ou toque. As preferências antigas ("Mostrar só ícones no seletor", "Somente
  texto") são convertidas ao abrir.
- **Destaque no lugar das setas.** Exibir → Destaque **Em foco** (padrão) acende o pré-requisito com contorno contínuo,
  o co-requisito com contorno tracejado e marca o que a disciplina libera com a etiqueta "libera"; o resto esmaece.
  Funciona com o mouse, o teclado e o toque. **Desligado** não destaca. A Grade não desenha mais setas; as setas
  didáticas continuam em "A ECI por trás da Grade".
- **Plano na Grade e Todas acesas.** Exibir → Plano mostra no cartão o primeiro semestre planejado e "+N". Em
  Optativas, "todas acesas" tira o esmaecimento das inativas sem filtrar nada.
- **Registrar marcações.** As disciplinas marcadas como aprovadas com o pincel podem virar "Aprovação registrada por
  você" (☑), com semestre opcional, mesmo sem perfil: o fluxo cria um. Elas contam para a fase e as conquistas com a
  marca "declarado", nunca como registro do SIGA. Uma importação posterior confirma a registrada (vale o SIGA), mostra
  divergências e não conta nada duas vezes. Dá para editar o semestre e remover, uma a uma ou em lote, e desfazer logo
  depois de gravar.
- **Modo Foco 🎯.** No Planejador, esconde o que já foi concluído e os períodos passados todos concluídos, deixa Grade,
  Linha do tempo e Cronograma e mostra a **fase do curso** (calouro, meio de curso ou veterano), a **previsão de
  formatura** (só quando o plano cobre tudo o que falta, marcada como estimativa) e a **estante de conquistas** (24
  selos, com o próximo marco). O tom das mensagens é zoeira por padrão e pode ficar discreto. Totais e planejamento não
  mudam.
- **Aviso de que a Grade não é oficial.** Uma linha no rodapé ("Feita por alunos de ECI. Não substitui o SIGA, o BOA
  nem a coordenação."), a seção **Sobre** em Configurações e uma nota junto de cada cálculo que é estimativa: livre
  escolha, prazo de 5 anos, período atual deduzido do histórico e horários de referência.
- **Livre escolha com dois números.** A conta da Grade e a soma das "Cursadas e Não Explicitadas" do BOA aparecem
  rotuladas, em Pedidos e no ⓘ do cartão "Livre escolha" do detalhamento, porque o BOA pode continuar contando créditos
  de um pedido já deferido.
- **Prazo de 5 anos com mais honestidade.** O prazo só aparece como alerta (some a linha "dentro de 5 anos"). Para quem
  reingressou, vale o ano do bloco de créditos transferidos do histórico do curso atual; a data original da aprovação
  não conta para o prazo. Se não dá para saber qual histórico é o do curso atual, a prévia **pergunta** e só libera
  **Usar este perfil** e **Baixar perfil.js** depois da escolha.
- **Transferidas cumprem requisito** (D-08). A disciplina do bloco "AAAA (transferidas)" vale pelo semestre original,
  quando o histórico do curso anterior o informa; sem ele, conta só a partir do ano seguinte ao do bloco. Na Linha do
  tempo, ela aparece no semestre original, com a etiqueta "transferida · bloco AAAA", ou no bloco, sem ele. Se todas
  foram ao semestre original, a coluna do bloco não aparece; o prazo continua pelo ano do bloco.
- **Tags e barra de progresso.** "Não conta" é uma opção só (o antigo "Reprovação (não conta)" é convertido, no
  navegador e em perfis antigos) e só pinta o que você marcou. A barra tem quatro trechos: concluídas, previstas,
  cursando e planejadas; em cada tag que conta, "Usar a cor desta tag na barra" pinta o trecho do tipo dela.
- **Carga horária como orientação.** A comparação deixa de usar ✓ e ✗ e aparece como dica neutra.
- **Marcação manual identificada.** A disciplina aprovada pelo pincel tem o ícone ✎ no cartão e é identificada como
  marcação manual no detalhe e no detalhamento do progresso, e a disciplina que dela depende mostra que o requisito foi
  satisfeito por marcação manual.
- **Barra e legendas por aba.** A barra e os "detalhes" do progresso aparecem na Grade (também no Clássico) e na Linha do
  tempo; as outras abas ficam sem barra e sem legendas. A legenda de categorias fica na Linha do tempo. A escala de
  dificuldade (Trivial, Só o básico, Matéria de verdade, Difícil, Morte instantânea) aparece junto a Exibir →
  Dificuldade, quando ativa.
- **Horas de extensão "a confirmar".** Quando não dá para saber se duas entradas são a mesma atividade, a Grade confirma o
  maior valor e mostra o restante como "a confirmar", com aviso.
- **Rodapé.** Aviso de que a Grade não é oficial, versão, data de conferência do currículo no SIGA e o link "Achou um
  erro? Crie uma nova issue", que abre a escolha de modelo de Issue e também aparece quando a importação falha.
- **Janelas e telas.** Configurações fecha pelo X no topo, por clique fora e por Esc, e o foco volta ao botão que abriu.
  "Adicionar período" usa a mesma janela central de "Excluir período", com validação do nome. Na Linha do tempo,
  "detalhes" recolhe o detalhamento e o clique num cartão abre os detalhes da disciplina. O detalhamento não tem legenda de estados: o cartão tem um
  ícone de estado. O cartão protegido pelo cadeado não mostra ícone; a proteção é anunciada e aparece nos detalhes.
- **Acessibilidade.** Correções feitas depois de uma inspeção com axe-core e teclado:
  - **Ícone de estado no cartão.** ✓ aprovada, ◐ cursando, ○ planejada, … prevista, ✎ marcação manual e ☑ aprovação
    registrada por você (✗ reprovada e ⇄ equivalência pedida), sem depender de cor nem de passar o mouse. A situação e a
    origem ("perfil", "marcação" ou "registrada por você")
    ficam no nome acessível, no primeiro toque e nos detalhes. A disciplina reprovada deixou de ficar
    esmaecida (borda pontilhada e texto riscado).
  - **Toque com o pincel.** No celular, o primeiro toque num cartão só consulta (mostra a situação e a origem, com o
    link "Detalhes") e o segundo toque marca. Mouse e teclado marcam com uma ativação.
  - **Foco e teclado.** O foco entra no painel ao abrir a importação e os detalhes, segue para o resultado e volta ao
    botão de origem (no importador aberto por Configurações, volta a Configurações, inclusive quando o atalho do topo
    some depois de Usar); não fica escondido sob a paleta. O painel de detalhes fica acima da paleta. As
    abas têm painel associado e respondem a setas, Home e End. A grade de horários do Cronograma funciona por teclado
    (setas movem, Espaço ou Enter marca), e "Escolher perfil" pode ser acionado por Tab e Enter e por toque.
  - **Nomes.** O seletor de PDFs e os campos de Pedidos e de atividades de extensão ganharam nome para leitores de tela;
    a prévia da importação é anunciada.
  - **Contraste e telas pequenas.** Textos verdes, vermelhos e âmbar ficaram mais escuros no tema claro; as linhas da
    grade de horários, mais marcadas. Pedidos cabe em 320 px sem rolagem horizontal da página (as tabelas rolam na
    própria região). Os controles pequenos ganharam área mínima de 24 × 24 px.
  - **Mensagens.** A falha de leitura de um PDF aparece em português, com orientação, e o BOA aparece por extenso na
    primeira menção.
  - **Não verificado.** Leitor de tela real, Safari no Mac e iPhone real (ver "Limitações conhecidas"); a Grade não
    declara conformidade integral com a WCAG.
- **Página antiga retirada.** `classico.html` agora é uma página curta, sem script, que leva ao modo clássico do app. O
  link "versão antiga" do rodapé leva à Grade publicada pelo Grêmio (https://gremio-eci.github.io/grade/). A
  versão antiga fica guardada na tag `legado-classico` e no repositório do Grêmio. As cores que ela guardava em cookies
  não são migradas.

### Correções de cálculo

Erros encontrados antes da publicação, cada um com um caso de teste permanente ([REQUISITOS.md](REQUISITOS.md)):

| Caso | Antes | Agora |
| --- | --- | --- |
| CR-01 · requisito e semestre | O aviso de pré-requisito comparava a posição na lista de períodos, não o semestre; a ordem da lista mudava o resultado | Compara o semestre; a ordem não muda aviso, co-requisito nem sugestão |
| CR-02 · origem em duas dispensas | Uma origem de 6 cr com duas dispensas somava 14 cr (origem mais os dois alvos) | Os alvos contam como no histórico (8 cr) e a origem não soma; há aviso quando a origem aparece em duas ou mais dispensas. O alvo fora do catálogo mantém nome, créditos e grupo |
| CR-03 · ACE contada duas vezes | A mesma atividade de 30 h, no catálogo e na extensão, somava 60 h | Mesma identidade: o maior valor é confirmado e o resto fica "a confirmar". Períodos conhecidos diferentes somam |
| CR-04 · reingresso | O prazo dependia da ordem dos arquivos e do semestre antigo; ocorrências distintas de ACE se perdiam | O prazo usa o ano do bloco do histórico atual, nas duas ordens; ocorrências distintas continuam distintas |
| CR-05 · transferida e requisito | A disciplina do bloco de transferidas nunca cumpria pré ou co-requisito ("Requisito MAC128 não cumprido" em Cálculo III de quem reingressou) | Vale pelo semestre original; sem ele, só a partir do ano seguinte ao do bloco. Na Linha do tempo, a transferida aprovada não recebe alerta |

Outras correções: trocar o histórico atual na prévia agora recalcula os planos que ficam de fora, com confirmação antes
de descartar; a escolha explícita do histórico vale mesmo sem datas; o período atual só é marcado como deduzido
quando o semestre é real e a marca é mantida ao reimportar os mesmos PDFs; perfis antigos com histórico em dúvida
continuam abrindo, com o aviso de estimativa; os links do rodapé apontam para o fork (relato e GitHub) e para o
Grêmio (crédito); e o importador de terminal passou a exigir `--atual` quando não consegue decidir. Na interface:
Configurações não abre mais vazia ao ser reaberta logo depois de fechada; o foco volta ao botão também no WebKit; o
editor de tags mantém o foco no controle ao salvar; e, com "ECI por trás" ligada, a Linha do tempo abre os detalhes.

### Validação dos dados de referência

Um validador local confere o formato, os códigos (contra o currículo, o catálogo ou uma exceção justificada) e as
duplicatas de `js/horarios.js` e `js/guia.js`, e lista as turmas sem código. O horário segue uma gramática estrita
(só dígitos ASCII, sem espaço sobrando nem quebra de linha no final). Uma exceção sem uso gera aviso por fonte, e o efeito
"entra no cálculo" é recusado para uma turma sem código. Ver [PLANO-DE-TESTE.md](PLANO-DE-TESTE.md).

### Limitações conhecidas

- **Interpretação do reingresso.** Contar o prazo de 5 anos pelo ano do bloco do histórico atual é uma regra local; a
  interpretação do art. 47 da Resolução CEG 01/2017 para quem reingressa está sob consulta à coordenação
  ([REGRAS-ACADEMICAS.md](REGRAS-ACADEMICAS.md#o-que-a-grade-não-confirma)).
- **Livre escolha.** O segundo número é a soma das não explicitadas do BOA, uma estimativa: o importador não lê o total
  oficial. O comportamento do BOA com pedidos deferidos foi observado em um caso.
- **Extensão.** Com uma única entrada no histórico do curso atual, a Grade mostra 30 h confirmadas e 30 h a confirmar.
  Marcar atividades como distintas fica para uma versão seguinte.
- **Horários e guia.** Vêm de uma página mantida por alunos e não confirmam a oferta oficial. Dois códigos e três
  turmas sem código foram conferidos na página de referência e aparecem só como informação
  ([MANUTENCAO.md](MANUTENCAO.md)). A disciplina "Comp 3" passou a ser a COS013.
- **Layout do SIGA.** Se o SIGA mudar o layout dos PDFs, a importação pode falhar ou omitir linhas
  ([IMPORTADOR.md](IMPORTADOR.md#limitações-conhecidas)).
- **Previsão de formatura.** A Grade só mostra um semestre quando o Cronograma cobre créditos, obrigatórias e ACE; é uma
  estimativa a partir do seu plano. O prazo máximo de integralização não é calculado.
- **Aprovações registradas por você.** São informação sua, não registro do SIGA. Uma versão anterior do app ou do
  importador de terminal não conhece o campo e o perde ao reimportar.
- **Equivalências encadeadas.** Quando uma equivalência é usada como origem de outra, a data, a fonte ou os créditos da
  última podem sair inconsistentes, principalmente quando o SIGA confirma a equivalência do meio. Um pedido que usa a
  própria pedida como origem não é sinalizado e pode retirar créditos. Ciclos maiores são sinalizados, mas o aviso fala
  em "uso em duplicidade". A Grade não bloqueia esses pedidos; confira com a coordenação
  ([DECISOES.md](DECISOES.md#pc-14--registrar-marcações-aprovações-registradas-por-você)).
- **Plano num período que já passou.** Com o período atual sem semestre, o aviso não aparece.
- **Navegação por teclado nos links do Safari.** A verificação automatizada de Tab nos links cobre Chromium e Firefox; o
  Safari no Mac, o iPhone real e a passada com leitor de tela estão pendentes
  ([PLANO-DE-TESTE.md](PLANO-DE-TESTE.md#6-limite-do-ambiente-webkit)).
- **Terminal.** Para uma atividade em curso sem créditos e fora do catálogo, o importador em Python imprime o código dela
  no `stderr`.

### Para quem contribui

Documentação nova: visão, requisitos, regras acadêmicas, plano de teste, decisões, manutenção, privacidade, formato do
perfil e guia de contribuição, além de instruções públicas para agentes de IA ([AGENTS.md](../AGENTS.md)) e modelo de
Issue. O kit de interface tem 132 cenários por `file://` e 133 por HTTP, e as regras de progresso, fase e conquistas têm
testes diretos no Node (`node testes/progresso.js`) ([testes/README.md](../testes/README.md)). O cálculo do progresso e
das conquistas fica em `js/progresso.js` e `js/conquistas.js`, sem DOM ([ARQUITETURA.md](ARQUITETURA.md)). O que
está previsto para depois está em [MANUTENCAO.md](MANUTENCAO.md).

---

## Histórico de etapas do fork

Registro das etapas anteriores à v2.0.0, em relação ao fork original (`gremio-eci/grade`, commit `b0f49fe`).

## Etapa 1 — Correções no currículo (`js/database.js`)

- Estágio Obrigatório (EEWU00): créditos de 160 para **2** (a C.H. de 160 h continua em `workload`), como no BOA/SIGA.
- Otimização (COS360): requisito com índice vazio `[0, ,7, 16]` corrigido para `[0, 7, 16]`.
- Estruturas de Dados (COS231): requisitos `[0]` → `[0, 7]` (COS110 + MAE125), conforme o currículo oficial.
- Programação Avançada (EEL418): COS231 passa a **co-requisito** (`corequirements: [13]`), conforme o currículo oficial.

## Etapa 2 — App novo, sem dependências

- `index.html` novo; a versão original foi renomeada para `classico.html` (retirada depois, na v2.0.0; ver acima).
- `js/app.js`: reescrito em JavaScript puro, estado em `localStorage` indexado por **código** da disciplina
  (a versão original usava cookies indexados pela posição na lista).
- `static/app.css`: visual novo com tema claro/escuro automático.
- Destaque de pré-requisitos (vermelho) e do que a disciplina libera (laranja) ao passar o mouse.
- Painel lateral de detalhes (histórico, requisitos, "libera").

## Etapa 3 — Perfil pessoal e Linha do tempo

- Formato de perfil (`window.PERFIL`) com períodos, notas, reprovações, equivalências (`equivale`) e dispensas (`dispensa`).
- `perfil/perfil.exemplo.js` documentado; `perfil/perfil.js` e documentos pessoais no `.gitignore`.
- Tela **Linha do tempo** com períodos reais, aviso de requisito não cumprido antes do período e coluna "A alocar".
- Barras de progresso por grupo (obrigatórias, optativas, livre escolha, Humanas, Extensão/ACE).

## Etapa 4 — Optativas e Cronograma

- `js/optativas.js`: catálogo de 161 eletivas gerado da página oficial do currículo (condicionadas, Humanas, ACE),
  com requisitos por código.
- Tela **Optativas**: busca, filtro por grupo/prefixo, "só liberadas", "ocultar cursadas", planejar em um período.
- Blocos "Atividades Acad. Optativas" da grade mostram quais disciplinas os preenchem.
- Tela **Cronograma**: grade semanal seg–sex 8h–17h, clique/arraste para marcar horários, choques, novo período,
  exportar `perfil.js`.

## Etapa 5 — Horários de referência e guia (Notion)

- `js/horarios.js`: turmas de referência por paridade (`impar`/`par`) copiadas da página do Notion
  "Grades de ECI (Editável)".
- Eletivas **ativas/inativas** (ativa = tem turma na referência); filtro "só ativas".
- Ao adicionar uma disciplina a um período, o horário de referência entra sozinho; botão "usar" quando difere.
- Filtro "só as que cabem" no horário do período escolhido.
- `js/guia.js`: dificuldade 🟢🔵🟡🟠🔴, presença e comentários (nomes de professores citados em críticas foram retirados).

## Etapa 6 — Planejamento para formar

- Painel **Para formar** (pendências, alertas de requisito e de oferta só em semestres ímpares/pares).
- **Sugestões** de turmas que cabem, ordenadas por obrigatórias, sem choque e menor dificuldade.
- **Busca por horário**: clique numa célula vazia do cronograma.
- **Sugerir combinação sem choques** (proposta aplicável com um clique).

## Etapa 7 — Equivalências e Extensão / ACE

- Pedidos de dispensa/equivalência com **várias cursadas** para uma eletiva, cada uma com papel
  `conteúdo` ou `só horas`.
- Checagens automáticas: soma de C.H., prazo de 5 anos (Res. CEG 01/2017), cursada já usada, créditos de livre escolha consumidos.
- **Contas automáticas**: optativas, Humanas e livre escolha hoje / com pedidos pendentes / se tudo for deferido,
  e quais eletivas planejadas sobram.
- Tabela de **livre escolha** com o destino de cada disciplina não explicitada do BOA.
- Seção **Extensão / ACE** com situações `a pedir` · `planejada` · `em andamento` · `validada`.

## Etapa 8 — Página inicial limpa e tags de cor

- Página inicial no estilo da versão clássica: só os cartões em evidência.
- **Barra única** de progresso (concluída · cursando · planejada · não planejada); "detalhes ▾" abre os cartões por grupo.
- **Tags de cor** padrão (Aprovada, Aprovação esperada, Cursando, Reprovação esperada, Planejada) e editáveis
  (nome, cor, como contam); **pincel** e **borracha** para pintar.
- Menu **Exibir** (código/créditos, notas, dificuldade, presença) e filtro por dificuldade.
- Detalhes por grupo e legenda de situações foram para a **Linha do tempo**.
- Marcações do "✎ Marcar" da versão anterior são migradas para tags.

## Etapa 9 — Importador determinístico do SIGA

- `js/siga.js`: regras de leitura do Histórico e do BOA e montagem do perfil (navegador e Node).
- `ferramentas/gerar_perfil.py`: mesmas regras em Python (pypdf).
- `ferramentas/gerar_perfil_node.js` + `ferramentas/testar_paridade.sh`: teste de que Python e JavaScript geram o mesmo perfil.
- Botão **⤓ Importar do SIGA** (pdf.js em `js/vendor/`, carregado só quando usado); páginas giradas (BOA) tratadas.
- Prioridade do perfil: importado no navegador > `perfil/perfil.js`; aviso no topo com "Baixar perfil.js" e "Voltar ao perfil/perfil.js".
- Validação: as três rotas (pdf.js + siga.js, pypdf + siga.js, pypdf + Python) geraram perfis idênticos com os PDFs de teste.

## Etapa 10 — Documentação

- `README.md` reescrito (uso em 3 passos, telas, estrutura, créditos).
- `docs/ARQUITETURA.md` (diagramas Mermaid, dicionário de fontes, plano de automação com o Notion),
  `docs/PERFIL.md`, `docs/IMPORTADOR.md`, `docs/PUBLICAR.md` e este arquivo.
- Cabeçalho do `js/app.js` com mapa de dados, estado, fluxo e seções.

## Etapa 11 — Modo clássico, celular, privacidade e diagramas

- **Modo clássico** (padrão ao abrir): interruptor sem texto no topo; ligado mostra só a grade e a paleta,
  desligado mostra as abas. Mesmos dados nos dois modos.
- **Grade inteira numa tela** em telas largas (10 períodos lado a lado, altura dos cartões ajustada à janela).
- **Celular**: períodos em lista, matérias em 2 colunas, painel lateral vira folha inferior.
- **Paleta flutuante** com botões de 44–48px, contagem por tag, borracha e editor de tags; texto com contraste automático.
- **Privacidade**: Content-Security-Policy no `index.html` (nenhuma conexão externa), botão de escudo com
  verificação ao vivo e "Apagar tudo"; `docs/PRIVACIDADE.md`.
- Ícones Lucide embutidos (`js/icones.js`); `docs/DESIGN.md` com tokens, componentes e checklist de acessibilidade.
- Diagramas no estilo desenhado à mão (`docs/diagramas/*.svg`, gerados por `docs/diagramas/gerar.js`).

## Etapa 12 — Interface, Configurações e "A ECI por trás da Grade"

- **Tema** claro/escuro (`js/tema.js`, síncrono no `<head>`): segue o sistema até a primeira escolha; vale para controles nativos.
- **Logo do Grêmio** no topo e como favicon; aba "Grade ECI"; cabeçalho "Grade ECI — Nome" com perfil.
- **Sem perfil:** abre no modo clássico, sem nome nem progresso; "Criar perfil" e "Importar do SIGA" no topo.
- **Criar/Editar perfil** com nome e semestre atual opcionais, preservando marcações e planos.
- **Configurações** (engrenagem): aparência (Ícone e texto, Somente texto, Somente ícone), tema, modo, seletor de modo
  visível ou oculto, Exibir/setas/cadeado sincronizados com a Grade e Limpar dados salvos. Perfil, Importar do SIGA,
  Tema, Privacidade, Referências e Tags podem ser fixados na barra; todos começam desafixados.
- **Referências:** fonte dos horários e do guia, links para a Intranet UFRJ (SIGA), o currículo oficial e os repositórios.
- **Abas e atalhos com ícone e texto** (Lucide, `js/icones.js`). Correção: os ícones antigos abriam um `<svg>` sem fechar e
  escondiam o texto seguinte (ex.: "Borracha").
- **Setas de requisitos** em Grade → Exibir: Ocultas, Disciplina em foco (mouse, teclado, toque) e Todas.
- **Paleta:** Cursada, Cursando e Planejada; migração da paleta antiga sem mudar estados; **cadeado** que protege as cursadas.
- **Aviso de oferta por semestre** para obrigatórias fora do ciclo básico; **Excluir período** no Cronograma.
- **Prévia do SIGA:** período atual sugerido e corrigível; planos preservados; colisões com confirmação explícita, que sai
  quando o conjunto de planos em conflito muda; "Usar este perfil" e "Baixar perfil.js" com a mesma validação; "Descartar prévia".
- **Contraste** dos avisos em âmbar ajustado (≥ 4,5:1) e foco visível em todos os controles.
- **A ECI por trás da Grade:** seletor "ECI por trás" na paleta e experiências em tela cheia para COS110, COS242 e EEL873,
  com PDFs fictícios (`js/demo-pdf.js`, gerado por `ferramentas/gerar_demo_pdf.py`) e saída Python pré-computada.

