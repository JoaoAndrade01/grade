---
# Identidade visual da Grade Interativa (formato inspirado no DESIGN.md do Google Labs)
nome: Grade ECI
logo: static/logo-gremio-eci.png (Grêmio de ECI; também é o favicon)
tema: segue o sistema até a primeira escolha (botão sol/lua ou Configurações); a escolha vale também para controles nativos (color-scheme)
aparencia: "Ícone + texto" (padrão), "Só ícones" ou "Minimalista" na barra do topo, no seletor, nas abas e nos controles com ícone (data-aparencia no <html>)
tipografia:
  familia: system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif
  base: 14px
  nome-da-disciplina: 600, clamp(10px, .78vw, 13px) na grade de uma tela; 13px no celular
cores:
  aprovado: "#16a34a"   # preenchimentos e barras; para texto usa texto-de-estado
  aprovacao-esperada: "#84cc16"
  cursando: "#2563eb"
  reprovacao-esperada: "#dc2626"
  planejado: "#7c3aed"
  analise: "#b45309"
  pendente: "#94a3b8"
  texto-de-estado: { claro: { aprovado: "#166534", reprovado: "#b91c1c", requisito: "#b91c1c", dependencia: "#92400e" }, escuro: { aprovado: "#4ade80", reprovado: "#f87171", requisito: "#f87171", dependencia: "#f59e0b" } }   # texto verde, vermelho e âmbar, contraste >= 4,5:1
  borda-forte: { claro: "#8a93a2", escuro: "#667085" }   # limites das células da grade de horários, >= 3:1
  alerta: { claro: "#b45309", escuro: "#fbbf24" }   # avisos em texto, contraste >= 4,5:1
  foco: { claro: "#1d4ed8", escuro: "#93c5fd" }
  grupos: { obrigatorias: "#475569", condicionadas: "#d97706", livre: "#0d9488", humanas: "#db2777", ace: "#4f46e5" }
espaco: { raio: 10px, raio-paleta: 16px, gap-cartoes: 6–8px }
alvo-de-toque: { interno-minimo: 44px, paleta-no-celular: 48px, minimo-aa: 24px }   # ver "Alvos de toque" abaixo
icones: Lucide (traço 2, 18px), embutidos em js/icones.js
movimento: só transições curtas; respeita prefers-reduced-motion
---

# Princípios

1. **A grade é a estrela.** O modo clássico (padrão) é só para pintar: o logo e o título, o seletor de modo e o tema, a
   grade com cartões de cor e nome e a paleta. Barra, legenda, ícones de estado e o resto moram no Planejador ou em
   **Configurações**.
2. **Barra mínima.** No Planejador, o topo tem a engrenagem, o Foco, o seletor de modo (pode ser ocultado) e só os
   atalhos que a pessoa fixar; sem perfil, "Criar perfil" e "Importar do SIGA" aparecem por padrão. No Clássico, só o
   seletor e o tema, sempre visíveis.
3. **Uma tela.** Em telas largas, os 10 períodos cabem lado a lado sem rolagem horizontal; a altura dos cartões
   se ajusta à janela.
4. **Celular em lista.** Abaixo de 720px, os períodos empilham e as matérias ficam em 2 colunas; nada de girar o aparelho.
5. **Pintar é o gesto principal.** A paleta flutua embaixo, sempre à mão, com botões de 44px.
6. **Cor tem significado, e sempre vem com nome.** As tags mostram nome, contagem e dica de como contam.
   O texto sobre a cor escolhe preto ou branco pela maior razão de contraste (WCAG).
7. **Privacidade visível.** Privacidade (em Configurações, fixável) explica e comprova que nada sai do computador;
   o aviso junto do seletor de PDFs repete a garantia no momento da escolha.
8. **Aprender com o próprio site.** "A ECI por trás da Grade" começa pelo problema, só depois nomeia o conceito
   e guarda a explicação técnica em "Ver a lógica".
9. **A Grade orienta, não confirma.** Estimativa e marcação manual aparecem como tais, com texto, junto do número
   ([REGRAS-ACADEMICAS.md](REGRAS-ACADEMICAS.md#textos-de-aviso)).

# Componentes

| Componente | Estados | Regras |
| --- | --- | --- |
| Cartão de disciplina (`.card.limpo`) | sem tag · com tag (fundo 22% da cor + borda) · equivalência pedida (contorno tracejado âmbar) · apagado pelo filtro (25%) · destaque de requisito (contorno contínuo, tracejado ou etiqueta "libera") · ícone de estado Lucide com `data-estado` (aprovado, cursando, planejado, previsto, marcacao, declarada, reprovado, equivalencia), ligado por Exibir → Situação · Plano (ícone de calendário, AAAA/n +N) · reprovada (borda pontilhada e texto riscado, **sem esmaecer**) | Nome em destaque; extras só se "Exibir" pedir, só no Planejador (no Clássico, só cor e nome). A **situação** ("Aprovada", "Aprovação prevista", "Planejada") e a **origem** ("perfil" ou "marcação") aparecem em **texto** no cartão, sem depender de cor nem de passar o mouse |
| Paleta (`.paleta .pal-btn`) | normal · ativa (fundo da cor, texto com contraste) · foco (contorno azul) | 44px; rola na horizontal no celular. No **toque**, com um pincel ativo, o primeiro toque num cartão só **consulta** (linha "Toque de novo para marcar…", com "Detalhes" no Planejador) e o segundo marca; no Clássico, a borracha se chama "Limpar" e não há "Registrar marcações"; mouse e teclado marcam com uma ativação |
| Seletor de modo (`#seletor-modo`) | Clássico · Planejador · Só ícones e Minimalista (Aparência) · oculto (Configurações, só no Planejador) · foco visível no rótulo | rádios nativos em `role="radiogroup"` ("Modo"); setas trocam; o nome acessível vem do texto, escondido só visualmente em Só ícones e no Minimalista (grade de quadradinhos = Clássico; linha do tempo = Planejador). No Clássico fica sempre visível |
| Trilha (`.seletor-modo.seletor-trilha`) | Desligado · Ao segurar (padrão) · Ao passar o mouse · Só ícones · painel ⋯ do Minimalista | o mesmo componente do seletor de modo: rádios nativos em `role="radiogroup"` ("Trilha dos requisitos"), um segmento aceso por vez, setas trocam, foco visível no rótulo; ícones eye-off, hand e mouse-pointer-2; em Só ícones, só o ícone |
| Barra de atalhos (`#atalhos`, `.btn-atalho`) | fixado · desafixado · primário sem perfil | ícone e texto por padrão; o nome acessível vem do texto (escondido só visualmente em Só ícones e no Minimalista) |
| Controles com ícone (`.ctl`) | Ícone + texto · Só ícones · no painel ⋯ do Minimalista | Exibir, Trilha, filtros de Optativas, + Período, Exportar perfil.js e Excluir período: ícone Lucide decorativo e texto em `.rot`; em Só ícones, o texto some só da tela e fica no nome acessível e no `title`. Nada de emoji ou símbolo solto em botões, abas e controles (exceções de conteúdo: bolinhas da dificuldade, emojis dos selos, chips do cartão da fase) |
| Botão que acende (`.ctl.aceso`) | desligado (borda forte) · aceso (fundo escuro, `aria-pressed="true"`) · indisponível (`aria-disabled`, motivo em texto) | Exibir e filtros das Optativas: um botão por opção, sem caixa de marcar; 32 px (40 px até 720 px); foco visível; `data-*` estável para o foco voltar depois do redesenho |
| Dificuldade (`.filtro-nivel`, `.ctl.aceso.nivel`) | Ícone + texto · Só ícones · nível filtrado (aceso, `aria-pressed`) | Uma fileira só: os botões do filtro por nível são a legenda. Ícone + texto: bolinha e nome ("🟢 Trivial", "🔵 Só o básico", "🟡 Matéria de verdade", "🟠 Difícil", "🔴 Morte instantânea"), a bolinha sempre junto do nome. Só ícones: só a bolinha; o nome fica no `title` e no nome acessível. Filtrar esmaece as outras disciplinas; não há legenda separada |
| Minimalista (`data-aparencia="minimalista"`) | ligado · desligado | cartões da Grade só com o nome e o ícone de estado; ferramentas atrás do botão ⋯ ("Ferramentas", `aria-expanded`), num painel com ícone e texto (Esc fecha e devolve o foco; clicar fora fecha); a barra recebe foco e toque e diz os números no nome acessível; sem detalhamento |
| Foco (`#btn-foco`) | desligado · ligado (fundo escuro, `aria-pressed`) · indisponível (`aria-disabled`, motivo em texto) · oculto no Clássico | na barra do topo do Planejador; 44 px no celular; ligado, as abas Optativas, Equivalências e A ECI por trás da Grade ficam escondidas, a aba Conquistas aparece, e as setas do teclado pulam as escondidas |
| Aba Conquistas (`#aba-conquistas`, `.conquistas`) | Foco ligado · também fora do Foco (Configurações) · sem perfil; calouro · meio do curso · veterano; selo obtido · quase lá · falta · novo | última aba (ícone trophy). Situação à esquerda (em cima até 720 px) em `.cq-situacao`, com "Bora, [nome] 💪" (discreto: "Situação · [nome]"), o cartão da fase (`.cartao-fase`) e a barra (registrado + estimativa listrada); conquistas à direita (`.estante`), em cartões por grupo com emoji grande, nome, regra, barra de progresso e "N de M"; obtido com borda dourada, os outros com borda tracejada; "· declarado" em texto; selo novo pulsa duas vezes (sem animação com `prefers-reduced-motion`). Se a aba some com ela aberta, volta à Grade com anúncio |
| Anúncio curto (`#anuncio`, `role="status"`) | visível por alguns segundos | aparece logo abaixo da barra do topo, sem cobrir os botões; com a página rolada, no alto; não recebe cliques; sem animação com `prefers-reduced-motion` |
| Registrar marcações (`#dlg-registrar`) | escolha · resultado | `<dialog>` modal; foco no título ao abrir e na mensagem depois de gravar; contagem em `role="status"`; linhas indisponíveis e o botão "Gravar" sem escolha usam `aria-disabled` com o motivo em texto; na escolha, Cancelar, Esc e clique fora fecham; no resultado, só Fechar ou Esc; a lista rola dentro do diálogo a 320 px |
| Configurações (`#dlg-config`) | `<dialog>` modal; seções Perfil e dados, Aparência, Grade, Referências e Sobre | fecha pelo X no topo ("Fechar Configurações"), por clique fora e por Esc; o foco volta ao botão que abriu. Cada atalho tem abrir + "Fixar" (`aria-pressed`); controles sincronizados com a Grade |
| Janelas de período (`#dlg-periodo`, `#dlg-confirma`) | Adicionar período · Excluir período | mesma janela central; Enter confirma, Esc e clique fora cancelam; erro do nome em texto (`aria-invalid`) |
| Destaque de requisitos (`.hl-req`, `.hl-coreq`, `.hl-dep`, `.etq-libera`) | Trilha: Desligado · Ao segurar (padrão: só enquanto segura, com mouse, toque de ~400 ms ou Espaço) · Ao passar o mouse | pré-requisito com contorno contínuo, co-requisito tracejado, o que ela libera com a etiqueta "libera" dentro do cartão, abaixo do nome; o resto esmaece com fundo neutro e texto atenuado, sem baixar o contraste. As setas (`svg.setas`, contínua = pré-requisito, tracejada = co-requisito, pontilhada = simulada) ficam só em "A ECI por trás da Grade"; `pointer-events: none`. Sem setas, a Grade não abre vãos extras entre colunas |
| Cadeado (`#cadeado`) | desligado · ligado (fundo escuro) | só ícone, `aria-label="Proteger disciplinas cursadas"` + `aria-pressed` |
| Seletor "ECI por trás" (`#pal-eci`) | desligado · ligado: cartões com experiência contornados, os demais `inert` e atenuados | Esc desliga |
| Experiência (`#dlg-eci`) | `<dialog>` em tela cheia | "Voltar" e Esc fecham; o foco volta ao cartão ou botão que abriu |
| Barra geral (`.bg-barra`) | concluída · prevista (listrada) · cursando · planejada · não planejada | 14px, sempre com a linha de percentuais e "detalhes"; só na Grade e na Linha do tempo do Planejador (o Clássico não tem barra). Cada trecho pode usar a cor de uma tag ("Usar a cor desta tag na barra", uma por tipo) |
| Detalhamento (`#progresso`) | recolhido · aberto ("detalhes" com seta para baixo) | cartão "Livre escolha" no formato dos outros, com um ícone info do tamanho do texto ao lado do título (`aria-expanded`; alvo de 24 px, 44 px em tela estreita) que mostra os dois números rotulados e a nota de RA-13; sem legenda de estados; com aprovação pelo pincel, a linha "✎ Aprovação por marcação manual (pincel)" (PC-02) |
| Painel lateral (`.detalhes`) | aberto · fechado · folha (`.folha`, até 720 px) | lateral no computador; até 720 px, folha que sobe de baixo, inteira e com rolagem interna, com fundo escurecido (`#detalhes-fundo`), o resto da página `inert`, `role="dialog"` e `aria-modal`, foco preso dentro e cabeçalho com ✕ fixo; fica **acima da paleta** em qualquer largura. Clique fora fecha os detalhes da disciplina e o editor de tags (não o importador, a Privacidade e as Referências); o toque no fundo só fecha, sem atravessar. O foco entra no painel ao abrir e volta ao disparador ao fechar. Aberto por Configurações, o importador devolve o foco a Configurações, inclusive quando o atalho do topo some depois de Usar |
| Abas (`.abas [role="tab"]`) | ativa · inativa · foco | `tablist` com painel associado (`aria-controls`, `aria-labelledby`); só a aba ativa entra no Tab; setas, Home e End movem e ativam |
| Grade de horários (`.cel`) | livre · com disciplina · choque · foco | 45 células com nome ("Segunda 08h: livre"); uma só entra no Tab; setas movem, Espaço ou Enter marca, Home e End vão ao começo e ao fim; as linhas têm contraste de 3:1 |
| Aviso no rodapé (`#aviso-rodape`, D-09) | visível em todas as telas, nos dois modos | linha mínima com o texto "Feita por alunos de ECI. Não substitui o SIGA, o BOA nem a coordenação.", `role="note"`, na ordem de leitura; não recebe foco |
| Transferida na linha do tempo (`.card.transferida`) | no semestre original, quando conhecido · no bloco, sem ele | etiqueta "transferida · bloco AAAA" e listras discretas; só exibição |
| Nota de estimativa (`role="note"`) | junto do cálculo a que se refere | texto além da cor; nunca depende de passar o mouse ([RF-08](REQUISITOS.md#rf-08--aviso-de-que-a-grade-não-é-oficial-versão-e-relato-d-06)) |
| Prévia de importação | resumo · escolha do histórico atual · colisões · ações | **Usar este perfil** e **Baixar perfil.js** ficam desativados enquanto houver colisão ou dúvida; **Descartar prévia** sempre disponível |
| Rodapé enxuto | versão · data do currículo · relato · crédito · GitHub | links nativos, com contorno de foco de 2 px; também no modo clássico |

# Critérios de UX, ligados às histórias

A experiência de uso decide se as pessoas usam a Grade ([VISAO.md](VISAO.md)). Cada critério abaixo é verificável na
inspeção heurística, por história ([REQUISITOS.md](REQUISITOS.md#1-histórias-de-usuário)). Mudar um critério pede uma
decisão registrada em [DECISOES.md](DECISOES.md).

| História | Critério verificável | Como se verifica |
| --- | --- | --- |
| H1 · calouro, sem perfil | Na primeira tela, a pessoa vê a grade, o botão **Criar perfil** e o **Importar do SIGA**, e sabe que pode consultar sem alterar a Grade | Inspeção da primeira visita, nos dois modos e a 320 px |
| H2 · importar | Os passos, o estado de leitura e o que foi reconhecido estão visíveis; um erro de leitura diz o que fazer e oferece o relato; **Cancelar** não muda nada | Casos 06a–06g e falhas do caso de uso |
| H3 · progresso | O que falta em cada grupo aparece sem abrir outra tela; o cartão do Planejador tem um ícone de estado Lucide (Exibir → Situação) e a situação e a origem da marcação ficam **em texto** no nome acessível, no toque e nos detalhes, não só em cor | Casos 01a–01b, 14a–14b e 14h–14i; teste de contraste e de pistas além da cor |
| H4 · planejar | Aviso de requisito e de choque diz **qual** disciplina e **por quê**; o horário é editável pelo teclado | Casos 02, 07 e 10 |
| H5, H6 · pedidos | A carga horária aparece como orientação neutra; os dois números de livre escolha têm rótulo e nota | Casos 03d–03g e 05a |
| H7 · reingresso | Quando há dúvida sobre o histórico atual, a prévia pede a escolha e explica por que as ações estão desativadas | Casos 06h–06k |
| H8 · extensão | "A confirmar" aparece no total, no cartão e nos pedidos, com a orientação de conferir | Casos 01c–01f e 06m |
| H10 · alcance | O aviso do rodapé e as notas estão onde o número aparece; o relato é alcançável por teclado | Casos 08a–08m |
| H11 · dados | A pessoa encontra que os dados ficam só neste navegador e como exportá-los | Caso 12e |
| H12 · experiências | Cada experiência diz a disciplina que ilustra; **Voltar** e Esc devolvem o foco | Casos 13a–13c |

**Primeira visita (pergunta obrigatória da inspeção).** Um calouro entende o que fazer na primeira tela? A pessoa sabe
que os dados ficam só neste navegador e que deve exportar o perfil? Se a resposta for "em parte", o ponto vira
melhoria no backlog ([MANUTENCAO.md](MANUTENCAO.md)).

# Acessibilidade

**Alvo.** A Grade usa a **WCAG 2.2** como referência. A lista abaixo traz os critérios **AA selecionados** para a
inspeção; ela **não declara conformidade integral** nem substitui avaliação com pessoas que usam tecnologia
assistiva. O texto normativo está em [W3C, WCAG 2.2](https://www.w3.org/TR/WCAG22/).

| Tema | Critérios | O que a Grade verifica |
| --- | --- | --- |
| Avisos e status | 1.4.1, 1.4.3, 1.4.11 | Texto ou outra pista além da cor. Contraste de 4,5:1 em texto comum, 3:1 em texto grande e em partes de controles e gráficos necessários, nos dois temas |
| Interação | 2.1.1, 2.1.2, 2.4.3, 2.4.7, 2.4.11 | Importar, planejar e trocar de modo **só com o teclado**; saída de diálogos com Esc e retorno do foco; ordem de foco lógica; foco visível e não oculto pela paleta nem pela faixa |
| Telas pequenas | 1.4.10, 2.5.7, 2.5.8 | Conteúdo a 320 CSS px sem rolagem horizontal do documento (tabelas bidimensionais rolam dentro da própria região); alternativa sem arraste; alvos de toque (abaixo) |
| Texto e ação | 3.3.1, 3.3.2, 4.1.2, 4.1.3 | Nome, função e estado em botões de ícone, abas e campos (inclusive o seletor de PDFs); instruções e erros claros; resultados dinâmicos (prévia, erro de leitura) com meio de anúncio |

**Evidência.** Mede-se em tema claro e escuro, modos Clássico e Planejador, computador e celular, e nos três motores. O
axe-core complementa o teclado e a inspeção visual. Leitor de tela real e o teste com colegas ficam no backlog
([MANUTENCAO.md](MANUTENCAO.md)).

**Resultado no candidato** (hash `aa9256cb5a6306ea2361509c1ce7dcc7716525fa`; contagens e versões em
[PLANO-DE-TESTE.md](PLANO-DE-TESTE.md#8-resultado-por-candidato)):

| Medida | Resultado | Teste |
| --- | --- | --- |
| axe-core 4.10.3 (regras WCAG A e AA, 2.0 a 2.2) | Nenhuma ocorrência **grave** ou **crítica** nos três motores. Recorte: grade clássica, Configurações, importador e prévia, grade completa e detalhes de uma disciplina, linha do tempo, Optativas, Cronograma com choque, Pedidos e "A ECI por trás da Grade"; tema claro e escuro; 1440 e 320 px | `t_axe_recorte` |
| Contraste | Texto ≥ 4,5:1 e limites das células ≥ 3:1 nos dois temas, sem ocorrência de `color-contrast` | `t_b6_contraste`, `t_a11y` |
| Refluxo a 320 px | Pedidos sem rolagem horizontal do documento; as tabelas rolam na própria região, que se alcança por teclado | `t_b7_pedidos_320` |
| Alvos | 24 × 24 px nos botões de período, de usar e nos avisos de perfil; 44 px nos atalhos; sem ocorrência de `target-size` | `t_b8_alvos` |
| Teclado | Foco entra no painel, segue ao resultado e volta ao disparador (importação, também quando aberta por Configurações e quando o atalho some depois de Usar; filtros e seleção do Cronograma); foco visível sob a faixa e a paleta, com Tab e Shift+Tab; grade de horários e "Escolher perfil" por teclado; abas com setas, Home e End | `t_b2_importacao`, `t_b2_foco_filtros`, `t_b2_foco_visivel`, `t_b4_grade_horarios`, `t_b5_escolher_perfil`, `t_b9_aria` |
| Pistas além da cor | Ícone de estado nos cartões; situação e origem no nome acessível, em ambos os modos e a 320 px | `t_b1_estado_dos_cartoes` |
| Nomes e papéis | Nenhum controle sem nome nos fluxos de Pedidos, ACE e importação; abas com painel associado e sem `aria-selected` inválido | `t_b3_nomes`, `t_b9_aria` |

**Não verificado.** Leitor de tela real (NVDA), Safari no Mac, iPhone real, axe com perfil real e teste com colegas. Os
percursos de teclado de "marcar com a paleta", de "Configurações" e de "criar período" não têm teste automatizado de
ponta a ponta. O resultado acima não declara conformidade integral com a WCAG.

## Alvos de toque

- **44 CSS px** é o alvo mínimo interno dos controles principais (paleta, barra, abas, ações dos diálogos, botões da
  prévia). É mais exigente que o mínimo AA da WCAG 2.5.8, que é **24 × 24 CSS px** (com exceções de espaçamento).
- **48 px** aparece apenas na paleta no celular e no cartão-resumo, por conforto de uso. **Não** é exigência dos demais
  controles, e os tokens não definem outro valor.
- Controles secundários (por exemplo, os botões de semestre em Optativas) não ficam abaixo de 24 × 24 px nem sem o
  espaçamento previsto no critério.

## Teclado nos fluxos centrais

Cada fluxo abaixo deve poder ser concluído com Tab, Shift+Tab, Enter, Espaço, setas (nos grupos de opções) e Esc, com
foco sempre visível: **abrir a Grade e marcar uma disciplina** (paleta); **importar** (abrir, escolher os PDFs,
escolher o histórico atual quando há dúvida, aplicar, baixar ou descartar); **carregar um perfil pronto**;
**planejar** (criar período, adicionar disciplina, horários e choques); **abrir Configurações** e trocar tema e modo;
**abrir uma experiência** de "A ECI por trás da Grade" e voltar.

**Safari.** No Safari para Mac, Tab foca por padrão campos e menus da página. Option+Tab também alcança os links. O
ajuste avançado do Safari pode trocar o comportamento de Tab e Option+Tab. A navegação por teclado do macOS também
influencia quais botões e outros controles recebem foco. A Grade usa links nativos e segue essa configuração. A suíte
verifica presença, texto e destino dos links do rodapé. Uma sonda automatizada separada verificou a ordem de Tab nos links
em Chromium e Firefox; no WebKit do Playwright no Windows isso não é verificável, e a conferência em Safari no Mac e
em iPhone real está pendente
([PLANO-DE-TESTE.md](PLANO-DE-TESTE.md#6-limite-do-ambiente-webkit)).

## Regras de implementação

- Contraste do texto ≥ 4,5:1 nas cores de tag (escolha automática preto/branco) e nos avisos.
- Ícones com `aria-hidden`; botões só com ícone têm nome acessível (`aria-label` ou texto escondido só visualmente).
- Avisos não dependem de passar o mouse (oferta por semestre, cadeado, ciclo simulado, estimativas).
- Esc fecha painéis e diálogos e devolve o foco a quem os abriu.
- Funciona em 320 px de largura.
