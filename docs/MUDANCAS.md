# Registro de mudanças

Registro passo a passo de tudo que mudou em relação ao fork original (`gremio-eci/grade`, commit `b0f49fe`).
Serve de base para os commits/PR: cada etapa pode virar um commit.

## Etapa 1 — Correções no currículo (`js/database.js`)

- Estágio Obrigatório (EEWU00): créditos de 160 para **2** (a C.H. de 160 h continua em `workload`), como no BOA/SIGA.
- Otimização (COS360): requisito com índice vazio `[0, ,7, 16]` corrigido para `[0, 7, 16]`.
- Estruturas de Dados (COS231): requisitos `[0]` → `[0, 7]` (COS110 + MAE125), conforme o currículo oficial.
- Programação Avançada (EEL418): COS231 passa a **co-requisito** (`corequirements: [13]`), conforme o currículo oficial.

## Etapa 2 — App novo, sem dependências

- `index.html` novo; a versão original foi renomeada para `classico.html` (continua funcionando).
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

## Sugestão de commits

```
1. fix(database): requisitos de COS231/EEL418/COS360 e créditos do estágio
2. feat: app novo sem dependências (index.html, app.js, app.css); original em classico.html
3. feat: perfil pessoal e linha do tempo
4. feat: catálogo de optativas e cronograma
5. feat: horários de referência e guia (Notion)
6. feat: planejamento para formar e sugestões
7. feat: equivalências e extensão/ACE
8. feat: página inicial limpa com tags de cor
9. feat: importador determinístico do SIGA (navegador + Python)
10. docs: arquitetura, perfil, importador, publicação e registro de mudanças
11. feat: modo clássico, celular, paleta, privacidade (CSP) e diagramas
```

Não entram no git: `perfil/perfil.js`, PDFs, planilhas, a página salva do currículo e a pasta "Claude outputs".
