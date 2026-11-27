# Plano de teste da Grade ECI

**Pergunta que este documento responde:** como sabemos que uma versão da Grade está certa e como repetir essa
verificação a cada versão.

Os **casos** (situação → ação → resultado esperado) estão em [REQUISITOS.md](REQUISITOS.md); aqui eles são
referenciados por ID. Os **comandos** e a instalação estão em [testes/README.md](../testes/README.md). As **condições
para publicar** estão em [VISAO.md](VISAO.md#condições-para-publicar). O procedimento de publicar está em
[PUBLICAR.md](PUBLICAR.md).

A estrutura é **adaptada e inspirada na ISO/IEC/IEEE 29119-3:2021** (documentação de teste). Não declara conformidade
com o texto integral da norma. A IEEE 829 aparece só como referência histórica de planos de teste.

## 1. Objetivo, escopo, riscos e responsabilidades

**Objetivo.** Dar evidência, por versão e pelo hash do commit, de que o candidato cumpre as quatro condições para
publicar: privacidade, correção, honestidade sobre o alcance e acessibilidade mínima.

**Dentro do escopo:** o app nos modos Clássico e Planejador, aberto por `file://` e por HTTP; o importador em
JavaScript e em Python; os dados de referência (`js/horarios.js` e `js/guia.js`); a página substituta
`classico.html`; a política de segurança de conteúdo (CSP) e as requisições do navegador.

**Fora do escopo desta versão** (registrado em [MANUTENCAO.md](MANUTENCAO.md)): conferir a oferta oficial de
disciplinas; corrigir o conteúdo das fontes (SIGA, Notion); teste em iPhone real e em Safari no Mac; leitor de tela
real; teste de uso com colegas; desempenho com limiar.

**Riscos que orientam os testes**

| Risco | O que o plano faz |
| --- | --- |
| Um número errado numa interface confiável | Casos de regra por partição e fronteira, com resultado esperado escrito à mão; oráculos do importador |
| Dado pessoal sai do dispositivo | CSP; observação de todas as requisições durante o teste; marcadores sentinela no cabeçalho dos PDFs fictícios |
| Erro igual nas duas implementações do importador | Paridade **e** oráculos independentes: a paridade sozinha não vê erro compartilhado |
| O SIGA muda o layout dos PDFs | PDFs fictícios no formato atual; ver [IMPORTADOR.md](IMPORTADOR.md#limitações-conhecidas) |
| Dado de referência desatualizado ou inválido | Validador local (RF-17) e data de consulta visível |
| Falha intermitente do ambiente de teste | Registro de todas as tentativas (seção 4) |
| Quem não enxerga cor, não usa mouse ou usa tela pequena não consegue usar | axe-core, contraste, foco, teclado e refluxo (seção 7) |

**Responsabilidades.** Quem mantém executa a verificação e registra o resultado. Quem revisa a mudança é outra
pessoa, que não a escreveu. A aprovação é por **hash completo** (40 caracteres) do commit.

## 2. Ambiente, versões e dados

- **Seis pares** motor × forma de abertura: Chromium, Firefox e WebKit (Playwright), cada um por `file://` e por HTTP
  estático sob `/grade/` (o ensaio de publicação). Instalação e execução em
  [testes/README.md](../testes/README.md).
- **Cópia pública.** O executor exporta apenas os caminhos públicos do commit para uma pasta **fora** do checkout e
  testa essa cópia. Assim, `perfil/perfil.js` e PDFs pessoais nunca entram.
- **Dados só fictícios**: `testes/fixtures/` (textos de histórico e BOA, de onde os PDFs são gerados; perfis; oráculos;
  exceções da referência). Códigos como `XYZ101`, `ABC123`, `DEF456` e `ACE901` não existem no currículo.
- **Relógio fixo em 2026-11-26** (semestre 2026/2) nos casos que dependem de data.
- **Registrar a cada execução:** hash do app; SHA-256 da suíte e das fixtures; versão de cada motor, do Playwright, do
  Python e do Node; sistema operacional; contagem esperada e obtida por par.

## 3. Estratégia: níveis de verificação

| Nível | O que verifica | Onde | O que ele **não** prova |
| --- | --- | --- | --- |
| Interface (matriz) | Casos de [REQUISITOS.md](REQUISITOS.md) no navegador, nos seis pares | `testes/runner.py`, `fluxos.py`, `reimportacao.py`, `auditoria.py` | Safari no Mac, iPhone real, leitor de tela |
| Paridade | Que as regras JS e Python geram o mesmo perfil, com leitores de PDF diferentes | `ferramentas/testar_paridade.sh` | Que o perfil está **certo**: erro compartilhado passa |
| Oráculo independente | Que as duas saídas batem com perfis esperados escritos à mão | `testes/importador.py`, `testes/fixtures/oraculos.json` | Layouts do SIGA fora das fixtures |
| Validador dos dados de referência (RF-17) | Formato, códigos, duplicatas e turmas sem código de `js/horarios.js` e `js/guia.js` | `testes/referencia_casos.py`, `testes/referencia.py`, `testes/fixtures/excecoes-referencia.json` | Que a oferta é a oficial |
| Acessibilidade | axe-core nos estados enumerados, contraste, foco, teclado, 320 px | Matriz e inspeção manual ([DESIGN.md](DESIGN.md#acessibilidade)) | Conformidade integral com a WCAG |
| Inspeção heurística | Fluxos das histórias, linguagem, pistas além da cor | Manual, por história | Compreensão de alunos reais (fica no backlog) |

**Partições e fronteiras cobertas** (resultado esperado em [REQUISITOS.md](REQUISITOS.md)): ordem dos períodos
(posterior, anterior, mesmo semestre, sem data); idade de 5 anos (5,0, 5,5 e só o ano, fronteira de 2021);
histórico do curso atual (único, automático, dúvida, escolha explícita, datas ausentes, as duas ordens dos
arquivos); seção do BOA (ausente, vazia, presente); ocorrências de ACE (mesmo período, períodos distintos, sem
período); dispensa (uma, duas ou mais, alvo fora do catálogo); horário (malformado, início igual ou posterior ao
fim, duplicata).

**Lacunas conhecidas** (também marcadas na matriz): os casos 11a–11d (resultado dos filtros e do guia nas
optativas) e o 06n (atividade em curso desconhecida) **não têm teste automatizado**; os casos 12c a 12e e 14e a 14g
têm teste só em parte; a navegação por leitor de tela, o Safari no Mac e o iPhone real não são cobertos. O teste de
sentinelas de privacidade (RNF-01) cobre o armazenamento e a página (`t_siga`) e a restrição das requisições à origem
(`testes/auditoria.py`); a conferência do arquivo exportado e a medida de desempenho (RNF-10) foram feitas por sonda
avulsa, não versionada, descrita na seção 8. Nada disso foi dado como coberto sem teste.

## 4. Critérios de entrada, saída, interrupção e reexecução

**Entrada.** O commit é identificado pelo hash completo; o checkout está limpo; a revisão da mudança terminou; as
versões da seção 2 estão registradas; as fixtures são as do próprio commit.

**Saída (a versão passa).**

1. Matriz completa nos **seis pares**, com a contagem esperada e **zero eventos inesperados** (requisição fora da
   origem, erro de página, navegação inesperada).
2. Paridade e oráculos: todos os conjuntos verdes, inclusive os que exigem código de saída `2`.
3. Validador RF-17: casos 17a–17f verdes e dados reais sem erro.
4. axe-core sem ocorrências graves ou críticas nos estados enumerados, nos dois temas; contraste, foco e teclado
   conforme [DESIGN.md](DESIGN.md#acessibilidade).
5. Privacidade: nenhuma requisição externa e marcadores sentinela ausentes do armazenamento e do arquivo exportado.
6. Cada requisito de [REQUISITOS.md](REQUISITOS.md) com estado e evidência.

**Interrupção.** Interrompa a verificação se o ambiente falhar (disco, permissões, navegador não inicia) ou se
uma condição para publicar for violada: corrija, gere um novo hash e recomece. Não se publica um hash
diferente do verificado.

**Divergências.** Toda falha é registrada com hash, par motor × forma de abertura, caso, saída e capturas. Quando
a suíte mudou entre a base e a correção, indique a **mesma suíte dos dois lados** e o resultado esperado
independente.

**Intermitência.** Uma repetição verde **não encerra** uma falha. Registre **todas** as execuções (as que falharam
também), repita o par isolado, anote a etapa da falha (carga da página, foco, rede, leitura do PDF) e a assinatura do
erro. Se a causa não for encontrada, o caso é declarado **intermitente** no resultado do candidato, com o histórico das
tentativas, e o candidato só é aceito se a falha não afetar nenhuma das quatro condições. Se a falha reaparecer,
registre o estado da página (`document.readyState`, erro de página e prontidão dos objetos) antes de repetir.

## 5. Matriz de rastreabilidade

Cada linha liga **história → requisito → casos → teste → código**. Os **testes** são funções de `testes/fluxos.py`
(`t_…`), oráculos de `testes/fixtures/oraculos.json`, ou os outros arquivos indicados. O **código** é o ponto do app
que implementa a regra. **Cobertura**: *direta* (o teste verifica o resultado esperado do caso), *parcial* (verifica
parte dele) ou *sem teste* (conferir na integração).

| Histórias | Requisito | Casos | Testes | Código | Cobertura |
| --- | --- | --- | --- | --- | --- |
| H3 | [RF-01](REQUISITOS.md#rf-01--progresso-por-grupo-ra-01-ra-05-ra-06-ra-16) | 01a | `t_pc02_manual_credito` (parte: 7 cr como base) | `totais`, `statusDe` (`js/app.js`) | parcial |
| H3 | RF-01 | 01b | `t_pc02_manual_credito` | `tagDe`, `statusDe` | direta |
| H8 | RF-01 | 01c–01e | `t_cr03_historico` | `totais` (identidade por período) | direta |
| H8 | RF-01 | 01f | `t_cr03_lista` | `totais` | direta |
| H8 | RF-01 | 01g | versão seguinte (sem teste na v2.0.0) | — | — |
| H3 | RF-01 | 01h | `t_barra_quatro_trechos` | `renderBarraGeral`, `normalizaTags` | direta |
| H1, H4 | [RF-02](REQUISITOS.md#rf-02--requisitos-e-co-requisitos-ra-03-ra-04) | 02a–02d, 02i | `t_cr01_pre`, `t_mac` | `avisos`, `requisitoCumprido` | direta |
| H4 | RF-02 | 02e–02f | `t_cr01_sugestoes` | `candidatos` | direta |
| H4 | RF-02 | 02g–02h | `t_cr01_co` | `avisos`, `requisitoCumprido` | direta |
| H1, H4 | RF-02 | 02j | `t_pc03_manual_requisito` | `requisitoCumprido`, `statusDe` | direta |
| H4, H7 | RF-02 | 02k–02o (CR-05) | `t_cr05_transferida_requisito` | `registroCumpre`, `anoDoBloco` | direta |
| H5, H7 | [RF-03](REQUISITOS.md#rf-03--análise-de-um-pedido-de-equivalência-ra-07-ra-09-ra-11-ra-12-ra-21) | 03a–03c | `t_rf08_notas_credito`, `t_cr04_fronteira` | `analisaPedido` | parcial |
| H5 | RF-03 | 03d–03g | `t_d01_carga` | `analisaPedido` | direta |
| H5 | RF-03 | 03h, 03j | `t_d01_conteudo` | `analisaPedido` | direta |
| H7 | RF-03 | 03i | `t_cr04_reingresso` | `analisaPedido`, `papelHistoricos` (`js/siga.js`) | direta |
| H5 | [RF-04](REQUISITOS.md#rf-04--a-mesma-origem-não-conta-duas-vezes-ra-08) | 04a–04b | `t_cr02_pedidos` | `montaModelo` | direta |
| H5 | RF-04 | 04c | `t_cr02_duas_dispensas` | `montaModelo` | direta |
| H5 | RF-04 | 04d | `t_cr02_dispensa_unica` | `montaModelo` | direta |
| H5 | RF-04 | 04e | `t_cr02_alvo_fora_do_catalogo`; oráculo `dispensa-fora-catalogo` | `montarPerfil` (`js/siga.js`), `gerar_perfil.py` | direta |
| H6 | [RF-05](REQUISITOS.md#rf-05--créditos-de-um-pedido-deferido-ra-13-d-02) | 05a, 05b, 05g | `t_d02_dois_numeros`, `t_pedidos_sem_total_e_sem_check` | `totais`, `montaModelo` | direta |
| H6 | RF-05 | 05c, 05d, 05h | `t_d02_ausente_e_vazia`, `t_d02_importacao`; oráculos `boa-p5-*` | `lerBOA` (`naoExplicitadasPresente`) | direta |
| H6 | RF-05 | 05e, 05f | `t_d02_outros_grupos` | `totais` | direta |
| H2 | [RF-06](REQUISITOS.md#rf-06--importação-do-siga-ra-05-ra-06-ra-17-ra-19-ra-21) | 06a | `t_siga`; paridade; oráculos de I1 | `montarPerfil`, `gerar_perfil.py` | direta |
| H2 | RF-06 | 06b | `t_siga_sem_boa` | `montarPerfil` | direta |
| H2 | RF-06 | 06c–06e | `testes/reimportacao.py`; `t_plano_preservado` | `perfilDaImportacao` (`js/app.js`) | direta |
| H2, H11 | RF-06 | 06f | `t_plano_preservado` (descartar prévia não muda o salvo) | `avaliaImportacao` | direta |
| H2, H11 | RF-06 | 06g | `t_previa_download`, `t_cr04_papel` (baixar = aplicar) | `perfilDaImportacao` | direta |
| H7 | RF-06 | 06h, PC-05, 06i | `t_cr04_reingresso`, `t_cr04_controles`, `t_cr04_papel`, `t_cr04_fronteira`, `t_pc05_datas_ausentes`; oráculos `reingresso-*`, `so-*`, `zero`, `papel-*`, `fronteira-*`, `duvida-*` | `papelHistoricos`, `montarPerfil` | direta |
| H7 | RF-06 | 06j | `t_cr04_escolha_sem_datas`; oráculos `escolha-sem-datas*` | `papelHistoricos` | direta |
| H7 | RF-06 | 06k | `t_cr04_troca_recalcula_planos`, `t_previa_confirmacao` | `avaliaImportacao` | direta (arquivo baixado: conferir) |
| H7 | RF-06 | 06l | `t_cr04_ordem_dos_arquivos`; oráculos `prazo-ordem-*` | `montarPerfil` | direta |
| H7, H8 | RF-06 | 06m | `t_cr04_ace_duas_ocorrencias`; oráculos `ace-*` | `montarPerfil`, `totais` | direta |
| H2 | RF-06 | 06n | sem teste dirigido | `gerar_perfil.py`, `lerBOA` | sem teste |
| H7 | RF-06 | perfil antigo em dúvida | `t_pc05_perfil_antigo_duvida` | `analisaPedido` | direta |
| H4 | [RF-07](REQUISITOS.md#rf-07--aviso-de-oferta-e-horários-de-referência-ra-20) | 07a–07e | `t_oferta`, `t_rf08_oferta` | `avisoOferta`, `CICLO_BASICO` | direta |
| H10 | [RF-08](REQUISITOS.md#rf-08--aviso-de-que-a-grade-não-é-oficial-versão-e-relato-d-06) | 08a, 08b | `t_rf08_faixa` (aviso no rodapé, D-09) | `index.html`, `static/app.css` | direta |
| H10 | RF-08 | 08m | `t_sobre` | `htmlSobre` | direta |
| H10 | RF-08 | 08n | `t_detalhamento_info` | `htmlLivreCurta`, `renderLegenda` | direta |
| H10 | RF-08 | 08o | `t_versao_antiga` | `index.html` (rodapé), `classico.html` | direta |
| H10 | RF-08 | 08c, 08d | `t_rf08_notas_credito` | `notaHtml` (`js/app.js`) | direta |
| H10 | RF-08 | 08e, 08f | `t_rf08_periodo_atual` | `perfilDaImportacao` | direta |
| H10 | RF-08 | 08l | `t_rf08_deduzido_regras` | `perfilDaImportacao` | direta |
| H10 | RF-08 | 08g, 08h | `t_rf08_oferta` | `notaRA20` | direta |
| H10 | RF-08 | 08i, 08j, 08k | `t_rf08_rodape`; `t_m3_mensagens` (o link de relato na falha da importação). Destino real no fork: conferir na publicação | `index.html`, `js/database.js` (`consultado`) | parcial |
| H4 | [RF-10](REQUISITOS.md#rf-10--planejamento-de-períodos-e-choques-de-horário-h4) | 10a | `t_regressao` (horários por clique), `t_excluir` | `montaModelo` | parcial |
| H4 | RF-10 | 10b | `t_b4_grade_horarios` (teclado: configurar, ver o choque nas duas, limpar); `t_regressao` (clique) | `montaModelo`, grade de horários de `js/app.js` | direta |
| H4 | RF-10 | 10c | `t_cr01_proposta` | `montaProposta` | direta |
| H4 | RF-10 | 10d–10e | `t_excluir` | `excluiPeriodo` | direta |
| H4 | RF-10 | 10f | `t_periodo_janela` | `abreDialogoPeriodo`, `criaPeriodo` | direta |
| H4 | RF-10 | 10g | `t_timeline_detalhes_e_clique` | `desenha`, clique dos cartões | direta |
| H4, H7 | RF-10 | 10h | `t_timeline_transferidas`, `t_timeline_bloco_vazio`, `t_timeline_transferida_origem` | `colunasTimeline`, `renderTimeline` | direta |
| H9 | [RF-11](REQUISITOS.md#rf-11--optativas-guia-e-oferta-h9) | 11a–11d | sem teste do resultado dos filtros e do guia (`t_regressao` cobre busca e foco; `t_b2_foco_filtros` cobre o foco ao filtrar) | `candidatos`, `js/horarios.js`, `js/guia.js` | sem teste |
| H9 | RF-11, RF-17 | turmas sem código | `t_m6_somente_informativo` (lista informativa "cabe"/"choca", sem ação; fora das sugestões e dos cálculos) | `js/horarios.js`, `js/optativas.js` | direta |
| H11 | [RF-12](REQUISITOS.md#rf-12--perfil-e-dados-locais-h11) | 12a | `t_criar_perfil` | `salvaPerfilCriado` | direta |
| H11 | RF-12 | 12b | `t_regressao` (exportação e recarga), `testes/reimportacao.py` | exportação de `js/app.js` | direta |
| H11 | RF-12 | 12c | `t_compat` (carga por arquivo), `t_b5_escolher_perfil` (válido aplicado; inválido preserva o anterior). A mensagem de erro do inválido não é verificada | `erroPerfil` | parcial |
| H11 | RF-12 | 12d | `t_descartar_salvo`, `t_regressao` ("Apagar tudo") | `js/app.js` | parcial |
| H11 | RF-12 | 12e | inspeção heurística; `t_aviso_pdf` | — | parcial |
| H12 | [RF-13](REQUISITOS.md#rf-13--a-eci-por-trás-da-grade-h12) | 13a–13c | `t_experiencias`, `t_exp_com_perfil`, `t_seletor_eci`, `t_fecha_durante_leitura`, `t_eci_timeline` | `js/eci.js`, `js/demo-pdf.js` | direta |
| H1, H3, H10 | [RF-14](REQUISITOS.md#rf-14--marcação-manual-aparência-tags-e-referências-h1-h3-h10) | 14a–14b | `t_cr01_manual`, `t_pc02_manual_credito` | `marca`, `pinta`, `tagDe` | direta |
| H1, H3 | RF-14 | 14c | `t_cadeado` | `protegida` | direta |
| H1, H3 | RF-14 | 14d | `t_setas` | `arestasDe` | direta |
| H1, H3, H10 | RF-14 | 14h, 14i | `t_b1_estado_dos_cartoes` (1º toque consulta e o 2º marca; ícone de estado, situação e origem no nome acessível), `t_timeline_ocorrencia`, `t_timeline_ocorrencia_mesma_coluna`, `t_timeline_ocorrencia_edicao`, `t_nome_sem_espaco` | ícone de estado e linha de consulta (`js/app.js`, `static/app.css`) | direta |
| H1, H3 | RF-14 | 14e | `t_tema`, `t_modo`, `t_atalhos`, `t_formatos` | `renderAtalhos`, `renderConfig` | parcial (anúncio ao desafixar: conferir) |
| H1, H3 | RF-14 | 14f | `t_tags` | `renderConfig` (editor de tags) | parcial |
| H10 | RF-14 | 14g | `t_atalhos` (Referências sem requisição externa) | `abreReferencias` | parcial |
| H1, H3 | RF-14 | 14j | `t_tags_nao_conta` | `normalizaTags`, `tagDe` | direta |
| H1, H3 | RF-14 | 14k | `t_barra_quatro_trechos`, `t_tags_barra_teclado` | editor de tags (`salvaTags`), `renderBarraGeral` | direta |
| H1 | RF-14 | 14l | `t_setas_espaco` | `desenha` (classe `com-setas`), `static/app.css` | direta |
| H1, H3 | RF-14 | 14m | `t_config_fechar` | `abreConfiguracoes`, `fechaAoClicarFora` | direta |
| H1 | RF-14 | 14n | `t_seletor_modo` | `#seletor-modo`, `renderConfig` | direta |
| H1, H2 | RF-14 | 14o | `t_importar_sugere_planejador` | `abreImportador` | direta |
| H1, H3, H10 | RF-14 | 14p | `t_abas_legendas` | `desenha`, `renderLegenda`, `escalaDificuldade`, `renderProgresso` | direta |
| H14 | [RF-17](REQUISITOS.md#rf-17--validação-dos-dados-de-referência-h14) | 17a–17e | `testes/referencia_casos.py` (80 casos sintéticos, inclusive gramática do horário, dígitos não ASCII, exceção sem uso e efeito recusado; e os dados reais) | `testes/referencia.py` | direta |
| H14 | RF-17 | 17f | `testes/referencia_casos.py --browser` | detalhe da optativa em `js/app.js` | direta (sem controle negativo) |
| H11 | [RNF-01](REQUISITOS.md#5-requisitos-não-funcionais) | — | `t_siga` (o perfil salvo e a página não contêm o nome, o CPF nem o RG do cabeçalho); `testes/auditoria.py` (todas as requisições restritas à origem); `testes/reimportacao.py` (`classico.html` e o código sem referência externa). Arquivo exportado: sonda avulsa (seção 8) | CSP em `index.html` | parcial |
| H1–H11 | RNF-02, RNF-04 | — | matriz de seis pares (`testes/runner.py`) | — | direta |
| H1, H3, H10 | [RNF-03](REQUISITOS.md#5-requisitos-não-funcionais) | 1.4.1 | `t_b1_estado_dos_cartoes` (situação e origem em texto, sem cor nem hover; no toque, a 1ª ativação só consulta) | rótulo de estado dos cartões (`js/app.js`, `static/app.css`) | direta |
| H2, H4, H11 | RNF-03 | 2.4.3, 2.4.7, 2.4.11 | `t_b2_importacao`, `t_b2_foco_filtros`, `t_b2_foco_visivel` (foco entra no painel, segue ao resultado, volta ao disparador; não fica sob a faixa nem a paleta) | foco e rolagem (`js/app.js`, `static/app.css`) | direta |
| H2, H5, H8 | RNF-03 | 3.3.2, 4.1.2 | `t_b3_nomes` (seletor de PDF, campos de Pedidos e de ACE; prévia anunciada) | nomes acessíveis (`js/app.js`, `index.html`) | direta |
| H4 | RNF-03, RF-10 | 2.1.1 | `t_b4_grade_horarios` (grade de horários por teclado) | grade de horários (`js/app.js`) | direta |
| H2, H11 | RNF-03, RF-12 | 2.1.1, 2.5.8 | `t_b5_escolher_perfil` ("Escolher perfil" por Tab e por toque, a 320 e 390 px) | `js/app.js`, `static/app.css` | direta |
| H1, H3, H10 | RNF-03 | 1.4.3, 1.4.11 | `t_b6_contraste`, `t_a11y` (contraste de texto e dos limites das células, nos dois temas; axe `color-contrast`) | variantes de cor (`static/app.css`) | direta |
| H5, H8 | RNF-03 | 1.4.10 | `t_b7_pedidos_320` (Pedidos a 320 px sem rolagem horizontal do documento; tabelas rolam na região, por teclado) | `static/app.css`, `js/app.js` | direta |
| H1 a H11 | RNF-03 | 2.5.8 | `t_b8_alvos` (alvos de 24 × 24 px nos controles secundários; axe `target-size`) | `static/app.css` | direta |
| H1 a H4 | RNF-03 | 4.1.2 | `t_b9_aria` (abas com painel associado, setas, Home e End; sem `aria-selected` inválido) | abas (`js/app.js`, `index.html`) | direta |
| H2 | RNF-03 | 3.3.1, 4.1.3 | `t_m3_mensagens` (falha de leitura do PDF em português, com orientação e sem dados do arquivo; BOA por extenso) | `js/app.js`, `js/siga.js` | direta |
| H1, H2, H3, H10, H11 | RNF-03 | axe-core | `t_axe_recorte` (recorte de telas e estados, claro e escuro, 1440 e 320 px: sem ocorrência grave ou crítica) | `static/app.css`, `js/app.js` | parcial (o recorte não inclui perfil real, leitor de tela, Safari nem iPhone) |
| H2, H7 | RNF-05 | — | `ferramentas/testar_paridade.sh`; `testes/importador.py` | `js/siga.js`, `gerar_perfil.py` | direta |
| H10, H14 | RNF-08 | — | `t_rf08_rodape` | `js/database.js`, `js/horarios.js`, `js/guia.js` | parcial |
| H13, H14, H15 | RNF-07 | P13, P14, P15 | processos descritos em [REQUISITOS.md](REQUISITOS.md#1-histórias-de-usuário), sem tela | [CONTRIBUTING.md](../CONTRIBUTING.md), [MANUTENCAO.md](MANUTENCAO.md), [AGENTS.md](../AGENTS.md) | por leitura |

O estado de cada requisito (cumprido, parcial ou planejado) fica em [REQUISITOS.md](REQUISITOS.md). Itens
**planejados** (RF-09, RF-15 a RF-19, RNF-11 a RNF-13) e a versão seguinte (01g) não têm teste nesta versão.

## 6. Limite do ambiente: WebKit

A suíte verifica **presença, texto e destinos** dos links do rodapé (`t_rf08_rodape`). Uma sonda automatizada verificou a
**ordem de Tab e o foco visível** dos links em **Chromium e Firefox**, por arquivo local e por HTTP. No **WebKit 27.2 do
Playwright 1.65.2 no Windows**, a sequência de foco pulou as âncoras com todos os atalhos ensaiados (Tab, Alt+Tab,
Alt+Shift+Tab e Control+Alt+Tab), inclusive numa página mínima, sem CSS nem JavaScript da Grade. Isto é um **limite do
ambiente de teste**, não um defeito conhecido da Grade, e não permite concluir nada sobre o Safari real.

**Pendente:** conferir a navegação por Tab e Option+Tab nos links no **Safari no Mac** e no **iPhone real**, ao lado da
passada com leitor de tela (NVDA), registradas em [MANUTENCAO.md](MANUTENCAO.md). A Grade usa links nativos, sem
`tabindex` forçado.

## 7. Lista de verificação de versão

Esta é a lista canônica. [PUBLICAR.md](PUBLICAR.md) aponta para ela. Marque cada item com o **hash completo** do
candidato; um item que falha volta a verificação ao começo com um novo hash.

- [ ] **Hash.** SHA completo do commit candidato anotado; checkout limpo; nenhum arquivo pessoal na árvore
  (`perfil/perfil.js`, PDFs, planilhas).
- [ ] **Matriz.** Seis pares (Chromium, Firefox e WebKit, por `file://` e HTTP) com a contagem esperada e zero eventos
  inesperados. Versões dos motores e SHA-256 da suíte e das fixtures anotados.
- [ ] **Paridade.** `ferramentas/testar_paridade.sh` verde nos conjuntos de [testes/README.md](../testes/README.md),
  inclusive os que usam `--atual`; os de dúvida param com código `2` nas duas implementações.
- [ ] **Oráculos.** `testes/importador.py` verde (JS × Python e contra o esperado escrito à mão).
- [ ] **Validador RF-17.** `testes/referencia_casos.py` verde (com `--browser` para 17f) e dados reais sem erro; as
  exceções justificadas conferidas contra a fonte.
- [ ] **Kit de reimportação.** Casos de preservação de anotações e igualdade entre baixar e aplicar verdes.
- [ ] **Acessibilidade.** axe-core nos estados enumerados, nos dois temas, sem ocorrências graves ou críticas;
  contraste (4,5:1 em texto comum, 3:1 em texto grande e em componentes); foco visível; teclado completo nos fluxos
  centrais; 320 CSS px sem rolagem horizontal do documento.
- [ ] **Privacidade.** Sentinelas ausentes do armazenamento e do arquivo exportado; nenhuma requisição externa;
  [PRIVACIDADE.md](PRIVACIDADE.md) coerente com o comportamento observado.
- [ ] **CSP.** Meta CSP presente em `index.html`, sem script ou recurso de outro domínio; sem 404 nos recursos.
- [ ] **Página substituta.** `classico.html` abre por `file://` e HTTP, não carrega script nem recurso externo e leva
  ao modo clássico; a tag `legado-classico` aponta para um commit em que a página antiga abre.
- [ ] **Requisitos.** Cada RF e RNF de [REQUISITOS.md](REQUISITOS.md) com estado e evidência.
- [ ] **Hash final.** O hash que foi verificado é o mesmo que será publicado ([PUBLICAR.md](PUBLICAR.md)).

## 8. Resultado por candidato

Um registro curto por candidato; a lista da seção 7 consulta este registro.

### Candidato da v2.0.0

Verificado em 2026-11-26, no Windows 11 (10.0.26300), Python 3.12.10, Node 26.13.1.

**Hash final medido: `ad60477607747f4e835776110aaf869bf5e00c22`.** Verificado em 2026-11-26 por `file://` e HTTP nos três motores, com a suíte abaixo.

| Campo | Valor |
| --- | --- |
| Hash do app | `ad60477607747f4e835776110aaf869bf5e00c22`. O candidato a publicar é o commit que acrescenta só este registro; ver "Hash final" abaixo |
| SHA-256 da suíte e das fixtures | `78c3890d9196b2051d70224912dd8fc5b026492e979b3b3f4109d1a5f5db3f4d` |
| Versões | Chromium 159.0.8154.6, Firefox 159.0, WebKit 27.2, Playwright 1.65.2, axe-core 4.10.3 |
| Matriz (seis pares) | Chromium, Firefox e WebKit: `file://` 85/85 e HTTP 86/86 em cada motor, zero eventos inesperados. Os seis pares rodaram em paralelo, uma vez cada, e passaram na primeira tentativa |
| Paridade e oráculos | Paridade (`testar_paridade.sh`, pypdf × pdf.js): as 4 combinações iguais, inclusive com o perfil anterior (3, 4, 5 e 5 períodos). Oráculos (`importador.py`): 26/26 |
| Validador RF-17 | `referencia_casos.py` 80/80 e dados reais sem erro (5 exceções cadastradas, conferidas no Notion em 2026-11-26) |
| Acessibilidade (axe, contraste, teclado) | Dentro da matriz: `t_axe_recorte`, contraste, alvos, papéis ARIA e foco verdes nos três motores, incluindo o foco do importador aberto por Configurações e depois de Usar sem atalho fixado (`t_b2_importacao`) |
| Correções dos ajustes finais | Aviso de linha do Histórico não lida na prévia (`t_m3_mensagens`, fixtures `historico-ficticio*.txt`); foco do importador pelo menu; `.nojekyll` e link da arquitetura (caso P) |
| Aceite | Candidato **verificado**; a aprovação para publicar é registrada por quem mantém, no [PUBLICAR.md](PUBLICAR.md) |

**Evidência histórica, medida em `aa9256cb5a6306ea2361509c1ce7dcc7716525fa`** (antes dos ajustes finais e das conferências dos horários; não repetida no hash final):

| Campo | Valor |
| --- | --- |
| SHA-256 da suíte e das fixtures | `2536fc3d1a4305db76e224cc710f719529c71cfb0aef23839511c4855a88ba5c` |
| Matriz e validador | Seis pares verdes (85/85 e 86/86); validador RF-17 80/80 e 17f no navegador 84/84 nos seis pares |
| Privacidade (requisições e sentinelas) | Nenhuma requisição fora da origem nos seis pares. Sonda avulsa com sentinelas no cabeçalho dos PDFs fictícios (nome, CPF, RG e matrícula): sem sentinela no arquivo baixado e no exportado, no armazenamento, nos cookies, no console, na página nem em URL ou corpo de requisição, em Chromium, Firefox e WebKit, por `file://` e HTTP (6 de 6 pares limpos) |
| Desempenho (linha de base) | Sonda avulsa, Pixel 7 emulado em Chromium: abrir 100 ms e importar 544 ms (medianas de 7; ver RNF-10 em [REQUISITOS.md](REQUISITOS.md#5-requisitos-não-funcionais)) |
| Páginas e documentos | Links relativos e âncoras dos documentos sem problema; diagramas regenerados sem diferença em relação aos SVGs versionados; busca de termos internos e de dados pessoais sem ocorrência (fora do que a seção "Limitações" abaixo aponta) |

**Tentativas e intermitências.** Cada execução completa dos seis pares conta, e nenhuma repetição verde encerrou uma
falha. Em desenvolvimento, cinco ocorrências intermitentes foram investigadas:

1. Corrida do próprio kit com o seletor de arquivo no Chromium (3 de 11 execuções): corrigida com espera dirigida,
   depois 10 de 10.
2. Rolagem de 10 px ao recarregar a página no Chromium (4 de 20 recargas): defeito do app, corrigido; depois 0 de 40, com
   teste que falhava antes.
3. Cliques perdidos no WebKit (6 a 8 de 50): defeito do app, causado por uma correção de rolagem do foco, corrigido; depois
   0 de 60, com teste que falhava antes.
4. "Paleta ECI por trás" no WebKit por HTTP (1 de 5): a mesma causa da ocorrência 3, sem repetição depois da correção.
5. Em `file://`, o evento `load` do WebKit chega de 17 a 65 ms antes de o app terminar de iniciar, porque o app espera a
   tentativa de carregar o `perfil/perfil.js` opcional. **Declarada como intermitência de ambiente, não corrigida:** o kit
   confere a prontidão logo após o `load`, registra o atraso em `avisos` e espera de forma dirigida. Por HTTP e nos
   outros motores não ocorre. A conclusão sobre piora ou igualdade em relação à base não é possível com os dados.

O Firefox por `file://` registra avisos de console do carregamento do `perfil/perfil.js` ausente, e por HTTP avisos de
reordenação de microtarefas; nenhum é erro de página nem evento inesperado.

**Hash final.** O commit a publicar contém este registro e difere de `ad60477607747f4e835776110aaf869bf5e00c22` só em arquivos de documentação. Antes de
publicar, confirme com `git diff --stat ad60477607747f4e835776110aaf869bf5e00c22 <hash a publicar>` e repita a lista da seção 7 se algo além de documentação
tiver mudado.

**Limitações conhecidas do candidato.** As cinco exceções do validador foram conferidas no Notion em 2026-11-26
(ver [MANUTENCAO.md](MANUTENCAO.md)); leitor de tela real, Safari no Mac e iPhone real não foram verificados; as
sentinelas de privacidade e o desempenho foram medidos por sonda avulsa, sem teste versionado; os casos 11a–11d e 06n
não têm teste; o WebKit do Playwright no Windows não alcança links por Tab (seção 6); a suíte ainda traz, em nomes de
casos, rótulos da inspeção de acessibilidade (por exemplo, `t_b1_estado_dos_cartoes`).
