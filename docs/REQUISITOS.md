# Requisitos da Grade ECI

**Pergunta que este documento responde:** o que a Grade deve fazer.
Por que ela existe: [VISAO.md](VISAO.md). De onde vêm as regras de crédito e equivalência:
[REGRAS-ACADEMICAS.md](REGRAS-ACADEMICAS.md). Por que cada escolha foi feita: [DECISOES.md](DECISOES.md).
Como rodar os testes: [testes/README.md](../testes/README.md).

## Como ler

- **Estes requisitos descrevem a v2.0.0.** O que ficou para depois aparece como "versão seguinte" ou
  "planejado".
- **Estado.** Todo requisito tem um, medido no candidato da v2.0.0 (hash e resultado em
  [PLANO-DE-TESTE.md](PLANO-DE-TESTE.md#8-resultado-por-candidato)):
  - **cumprido:** está no escopo da v2.0.0 e todos os seus casos têm teste automatizado ou verificação registrada
    com o resultado esperado;
  - **parcial:** está no escopo da v2.0.0 e implementado, mas parte dos casos tem teste só em parte ou nenhum teste
    automatizado. A linha do requisito diz quais, e a coluna "Cobertura" da
    [matriz de rastreabilidade](PLANO-DE-TESTE.md#5-matriz-de-rastreabilidade) traz o detalhe;
  - **planejado:** mapeado e ainda não feito;
  - **versão seguinte:** pronto ou previsto para depois da v2.0.0.
- **Casos.** Cada caso é *situação → ação → resultado esperado*, com dados **fictícios**. Códigos como
  `XYZ101`, `ABC123`, `DEF456` e `ACE901` são componentes fora do currículo criados no perfil de teste.
- **Relógio fixo em 2026-11-26** (semestre 2026/2) em todo caso que dependa de data.
- **Aviso de requisito** é o texto `Requisito <código> não cumprido antes deste período` no cartão da
  disciplina. **Sugestão** é um item da lista de sugestões do Cronograma para o semestre indicado.
- **Casos de regressão (CR-01 a CR-05)** vêm de erros encontrados antes da v2.0.0 (CR-05, logo depois). Ficam no kit como casos
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
| H7 | aluno que reingressou | ter o prazo de 5 anos contado pelo histórico do curso atual | ter o prazo coerente com o histórico do curso atual | RF-03, RF-06, RNF-05 |
| H8 | aluno | acompanhar as horas de extensão sem contar a mesma atividade duas vezes | saber quanto falta de ACE | RF-01 |
| H9 | aluno | escolher optativas vendo o guia dos colegas e os horários | montar um semestre que faça sentido | RF-11 |
| H10 | aluno | saber que a Grade não é oficial, onde conferir e como relatar um erro | não decidir só por ela | RF-08, RF-14, RNF-08 |
| H11 | aluno | que os meus dados fiquem só no meu navegador e eu possa exportá-los | ter privacidade e não perder o trabalho | RNF-01, RF-06, RF-12 |
| H12 | aluno curioso ou calouro | ver como as disciplinas do curso aparecem no próprio site | me motivar a cursá-las | RF-13 |
| H13 | aluno que quer contribuir | saber como propor uma experiência e rodar os testes | colaborar sem quebrar nada | [CONTRIBUTING.md](../CONTRIBUTING.md), RNF-07 |
| H14 | mantenedor | atualizar horários e currículo a cada semestre com segurança | a Grade continuar certa | [MANUTENCAO.md](MANUTENCAO.md), RF-17, RNF-07, RNF-08 |
| H15 | aluno que contribui usando IA | instruções prontas para o meu agente e regras claras para usar IA no projeto | contribuir rápido sem quebrar regras nem expor dados | [CONTRIBUTING.md](../CONTRIBUTING.md), [AGENTS.md](../AGENTS.md) |
| H16 (planejada) | quem mantém o guia no Notion | atualizar só lá e a Grade refletir sozinha | não haver duas versões dos dados | RF-15, RNF-11, RNF-13 |

**Critério de H16:** só entram linhas com aprovação editorial ("Pronto para republicar") nas bases Turmas e
Disciplinas, por Pull Request revisado por uma pessoa.

**Casos por história.** Os casos estão nas seções dos RF indicados.

| História | Casos | Seções |
| --- | --- | --- |
| H1 | 02a–02b, 14a–14f, 14l–14o | [RF-02](#rf-02--requisitos-e-co-requisitos-ra-03-ra-04), [RF-14](#rf-14--marcação-manual-aparência-tags-e-referências-h1-h3-h10) |
| H2 | 06a–06g | [RF-06](#rf-06--importação-do-siga-ra-05-ra-06-ra-17-ra-19-ra-21) |
| H3 | 01a–01b, 01h, 14a–14b, 14j–14k | [RF-01](#rf-01--progresso-por-grupo-ra-01-ra-05-ra-06-ra-16), [RF-14](#rf-14--marcação-manual-aparência-tags-e-referências-h1-h3-h10) |
| H4 | 02a–02i, 07a–07e, 10a–10h | [RF-02](#rf-02--requisitos-e-co-requisitos-ra-03-ra-04), [RF-07](#rf-07--aviso-de-oferta-e-horários-de-referência-ra-20), [RF-10](#rf-10--planejamento-de-períodos-e-choques-de-horário-h4) |
| H5 | 03a–03h, 03j, 04a–04e | [RF-03](#rf-03--análise-de-um-pedido-de-equivalência-ra-07-ra-09-ra-11-ra-12-ra-21), [RF-04](#rf-04--a-mesma-origem-não-conta-duas-vezes-ra-08) |
| H6 | 05a–05h | [RF-05](#rf-05--créditos-de-um-pedido-deferido-ra-13-d-02) |
| H7 | 02k–02o, 03i, 06h–06m | [RF-03](#rf-03--análise-de-um-pedido-de-equivalência-ra-07-ra-09-ra-11-ra-12-ra-21), [RF-06](#rf-06--importação-do-siga-ra-05-ra-06-ra-17-ra-19-ra-21) |
| H8 | 01c–01f, 06m (01g na versão seguinte) | [RF-01](#rf-01--progresso-por-grupo-ra-01-ra-05-ra-06-ra-16), [RF-06](#rf-06--importação-do-siga-ra-05-ra-06-ra-17-ra-19-ra-21) |
| H9 | 11a–11d | [RF-11](#rf-11--optativas-guia-e-oferta-h9) |
| H10 | 08a–08n, 14g | [RF-08](#rf-08--aviso-de-que-a-grade-não-é-oficial-versão-e-relato-d-06), [RF-14](#rf-14--marcação-manual-aparência-tags-e-referências-h1-h3-h10) |
| H11 | 06f–06g, 12a–12e, RNF-01 | [RF-06](#rf-06--importação-do-siga-ra-05-ra-06-ra-17-ra-19-ra-21), [RF-12](#rf-12--perfil-e-dados-locais-h11) |
| H12 | 13a–13c | [RF-13](#rf-13--a-eci-por-trás-da-grade-h12) |
| H13 | P13: seguir o `CONTRIBUTING.md` e propor uma experiência fictícia | [CONTRIBUTING.md](../CONTRIBUTING.md) |
| H14 | P14: percorrer o guia semestral com o validador | [MANUTENCAO.md](MANUTENCAO.md), [RF-17](#rf-17--validação-dos-dados-de-referência-h14) |
| H15 | P15: localizar as instruções de privacidade, revisão e declaração de IA no PR, com atribuição fictícia de exemplo | [CONTRIBUTING.md](../CONTRIBUTING.md#contribuir-com-ia), [AGENTS.md](../AGENTS.md) |
| H16 (planejada) | Validações planejadas de RF-15, RNF-11 e RNF-13 | [RF-15](#rf-15--sincronização-dos-dados-do-notion-h16--planejado) |

**Como se comprovam as histórias de documentação e processo** (não são casos de interface):

- **H13 (P13):** uma pessoa roda o kit com dados fictícios seguindo o `CONTRIBUTING.md` e apresenta uma proposta de
  experiência.
- **H14 (P14):** o roteiro semestral de `docs/MANUTENCAO.md` é seguido de ponta a ponta e o validador (RF-17) passa.
- **H15 (P15):** `AGENTS.md` e `CONTRIBUTING.md` trazem as instruções públicas de privacidade, revisão e declaração
  de uso de IA no PR, com atribuição fictícia de exemplo. Se houver modelo de PR público, a comprovação aponta para ele.

## 2. Mapa função → história

Cada função da Grade aponta para uma história. Função sem história é candidata a simplificar ou esconder.

| Função (README, "O que dá para fazer") | Histórias | RF |
| --- | --- | --- |
| Grade: paleta, tags, cadeado, destaque de requisitos, Exibir (com Plano), modo clássico | H1, H3 | RF-14 |
| Configurações de aparência: Aparência (Ícone + texto, Só ícones, Minimalista), tema, modo, atalhos fixados na barra | H1, H3 | RF-14 |
| Registrar marcações: aprovações registradas por você, sem Histórico | H1, H3, H11 | RF-21 |
| Foco: fase do curso, previsão de formatura e conquistas | H3, H4 | RF-19, RF-20 |
| Edição e limpeza de tags | H1, H3 | RF-14 |
| Linha do tempo | H2, H3, H4 | RF-01, RF-02, RF-07 |
| Optativas: catálogo, filtros "só liberadas" e "só as que cabem" | H9 | RF-11 |
| Cronograma: períodos, horários, choques, sugestões, proposta sem choques | H4 | RF-10 |
| Equivalências e Extensão / ACE | H5, H6, H7, H8 | RF-01, RF-03, RF-04, RF-05 |
| Importar do SIGA, criar, exportar e carregar perfil, limpar dados | H2, H11 | RF-06, RF-12 |
| A ECI por trás da Grade | H12 | RF-13 |
| Referências | H10 | RF-14 |
| Aviso no rodapé, seção Sobre, notas, data do currículo, versão | H10 | RF-08 |
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

- **A1 · Só o Histórico, sem BOA.** Sem perfil anterior: não cria período atual e o número do BOA fica
  indisponível (06b, 05c). Com perfil anterior, o período preservado é verificado em 06c.
- **A2 · Reimportação com perfil existente.** Horários e status do período atual são preservados nas
  disciplinas que continuam; as anotações de outro período não migram (06d, 06e).
- **A3 · Planos que colidem com o período atual.** A colisão com plano existente bloqueia **Usar este perfil** e
  **Baixar perfil.js** até a confirmação explícita (06k).
- **A4 · Dois históricos (reingresso).** A Grade reconhece o do curso atual. Quando as datas não permitem
  definir o histórico atual, a prévia informa a escolha, e aplicar e baixar ficam desativados até a pessoa
  escolher. Quando o prazo for exibido, vale a nota de RA-09 (06h, 06j).
- **A5 · Cancelar.** **Descartar prévia** sai sem mudar nada (06f).
- **A6 · Terminal.** `ferramentas/gerar_perfil.py` gera o mesmo perfil. Com dois históricos e dúvida, exige
  `--atual` (06h). Ver [IMPORTADOR.md](IMPORTADOR.md).
- **A7 · Só BOA.** Com disciplinas em curso, sem histórico nem período anterior: o período fica sem data e sem
  a nota de dedução (08l).

**Falhas**

- **F1 · Nada reconhecido.** Nenhum Histórico ou BOA reconhecido, ou falha de leitura do PDF: há erro e o link
  "Achou um erro? Crie uma nova issue", e o perfil anterior é preservado (08k).
- **F2 · Linha fora do formato.** O importador a ignora **sem aviso**, nas duas implementações, e a paridade
  não a detecta. É uma limitação conhecida; a experiência de EEL873 a mostra com dados fictícios.
- **F3 · Layout do PDF mudou.** Um novo layout pode causar falha ou omissão de linhas. Conferir o resultado com
  um oráculo fictício, como no guia semestral ([MANUTENCAO.md](MANUTENCAO.md)).
- **F4 · Atividade em curso desconhecida.** Uma NCC em curso, sem créditos e fora do currículo e do catálogo,
  aparece na prévia para conferência (06n).

**Pós-condições:** o perfil salvo é igual ao do arquivo baixado (06g). Nenhum dado do documento sai do
dispositivo (RNF-01).

## 4. Requisitos funcionais

| ID | Requisito | Histórias | Estado |
| --- | --- | --- | --- |
| RF-01 | Progresso por grupo | H3, H8 | **Parcial.** 01b a 01f têm teste direto (`t_pc02_manual_credito`, `t_cr03_historico`, `t_cr03_lista`); 01a só em parte (confere os 7 cr concluídos). O caso 01g está em **versão seguinte**. 01h: `t_barra_quatro_trechos` |
| RF-02 | Requisitos e co-requisitos | H1, H4 | **Cumprido.** 02a a 02o: `t_cr01_pre`, `t_mac`, `t_cr01_sugestoes`, `t_cr01_co`, `t_pc03_manual_requisito`, `t_cr05_transferida_requisito` |
| RF-03 | Análise de um pedido de equivalência | H5, H7 | **Parcial.** 03d a 03j têm teste direto (`t_d01_carga`, `t_d01_conteudo`, `t_cr04_reingresso`); 03a a 03c só em parte (`t_rf08_notas_credito`, `t_cr04_fronteira`) |
| RF-04 | A mesma origem não conta duas vezes | H5 | **Cumprido.** 04a a 04e: `t_cr02_pedidos`, `t_cr02_duas_dispensas`, `t_cr02_dispensa_unica`, `t_cr02_alvo_fora_do_catalogo` |
| RF-05 | Créditos de um pedido deferido | H6 | **Cumprido.** 05a a 05h: `t_d02_dois_numeros`, `t_d02_ausente_e_vazia`, `t_d02_importacao`, `t_d02_outros_grupos` e os oráculos `boa-p5-*` |
| RF-06 | Importação do SIGA | H2, H7, H11 | **Parcial.** 06a a 06m têm teste direto (`t_siga`, `t_cr04_*`, `t_previa_*`, paridade, oráculos e `testes/reimportacao.py`); 06n (atividade em curso desconhecida) **sem teste**; em 06k, a confirmação vale para a prévia e o arquivo baixado fica por conferir |
| RF-07 | Aviso de oferta e horários de referência | H4 | **Cumprido.** 07a a 07e: `t_oferta`, `t_rf08_oferta` |
| RF-08 | Aviso de que a Grade não é oficial | H10 | **Parcial.** 08a a 08h e 08l têm teste direto (`t_rf08_faixa`, `t_rf08_notas_credito`, `t_rf08_periodo_atual`, `t_rf08_oferta`, `t_rf08_deduzido_regras`); 08i a 08k só em parte: `t_rf08_rodape` confere presença, texto e destino dos links, e o destino no fork se confere na publicação. 08m e 08n: `t_sobre`, `t_detalhamento_info`. 08o: `t_versao_antiga` |
| RF-09 | Procedimentos de estágio, equivalência e ACE | H5, H8 | planejado |
| RF-10 | Planejamento de períodos e choques | H4 | **Parcial.** 10b (choque, também pelo teclado: `t_b4_grade_horarios`), 10c a 10h têm teste direto (10f a 10h: `t_periodo_janela`, `t_timeline_detalhes_e_clique`, `t_timeline_transferidas`, `t_timeline_bloco_vazio`); 10a só em parte (`t_regressao`, `t_excluir`) |
| RF-11 | Optativas, guia e oferta | H9 | **Parcial.** 11a a 11d **sem teste** do resultado dos filtros e do guia. Há teste do foco ao filtrar (`t_b2_foco_filtros`) e da lista informativa de turmas sem código (`t_m6_somente_informativo`) |
| RF-12 | Perfil e dados locais | H11 | **Parcial.** 12a e 12b têm teste direto (`t_criar_perfil`, `t_regressao`, `testes/reimportacao.py`); 12c a 12e só em parte (`t_compat`, `t_b5_escolher_perfil`, `t_descartar_salvo`, `t_aviso_pdf`; a mensagem de erro do arquivo inválido não é verificada) |
| RF-13 | A ECI por trás da Grade | H12 | experiências atuais: **cumprido** (13a a 13c: `t_experiencias`, `t_exp_com_perfil`, `t_seletor_eci`, `t_fecha_durante_leitura`); novas: planejado |
| RF-14 | Marcação manual, aparência, tags e Referências | H1, H3, H10 | **Parcial.** 14a a 14d, 14h e 14i têm teste direto (`t_cr01_manual`, `t_pc02_manual_credito`, `t_cadeado`, `t_destaque`, `t_b1_estado_dos_cartoes`); 14e a 14g só em parte (`t_tema`, `t_modo`, `t_atalhos`, `t_formatos`, `t_tags`; o anúncio ao desafixar um atalho e o cancelamento de "Restaurar padrão" ficam por conferir). 14j a 14p têm teste direto (`t_tags_nao_conta`, `t_barra_quatro_trechos`, `t_destaque`, `t_config_fechar`, `t_seletor_modo`, `t_formatos`, `t_importar_sugere_planejador`, `t_abas_legendas`). 14q a 14u: `t_minimalista`, `t_controles_icones`, `t_todas_acesas`, `t_plano_na_grade`, `t_aparencia_migracao`, `t_destaque_migracao` |
| RF-15 | Sincronização dos dados do Notion | H16 | planejado |
| RF-16 | Atualização do currículo a partir do SIGA | H14 | planejado |
| RF-17 | Validação dos dados de referência | H14 | **Cumprido.** 17a a 17f: `testes/referencia_casos.py` (80 casos sintéticos e os dados reais) e, com `--browser`, o 17f nos seis pares; o 17f não tem controle negativo |
| RF-18 | Aviso de dado desatualizado | H14 | planejado |
| RF-19 | Previsão de formatura calculada | H4 | **Cumprido** no modo Foco. 19a a 19e: `t_motivacao` e os casos diretos de `node testes/progresso.js` |
| RF-20 | Modo Foco, fase do curso e conquistas | H3, H4 | **Cumprido.** 20a a 20l: `t_foco`, `t_motivacao`, `t_conquistas_estante` e os casos diretos de `node testes/progresso.js` (fronteiras de fase e um caso por selo) |
| RF-21 | Registrar marcações (aprovações registradas por você) | H1, H3, H11 | **Cumprido.** R01 a R37: `t_registrar_sem_perfil`, `t_registrar_com_perfil`, `t_declaradas_modelo`, `t_declaradas_prazo_ace`, `t_declaradas_arquivo`, `t_declaradas_reimportar`, `t_declaradas_detalhe`, `t_declaradas_gestao`, `t_declaradas_lote_foco`, `t_declarada_cursando`, o oráculo `declaradas-mesclar`, a paridade com perfil anterior e `node testes/progresso.js`. Fase e selos (R27 a R29, R34): `node testes/progresso.js` e `t_motivacao` |

### RF-01 · Progresso por grupo (RA-01, RA-05, RA-06, RA-16)

Perfil base P1: 2025/1 com MAC118 aprovada (6 cr) e FIS111 dispensada, grau T (1 cr); 2025/2 com FIT112
reprovada (4 cr); 2026/2 (atual) com MAC128 cursando (4 cr); 2027/1 planejado com COS231 (5 cr). Nenhum outro
registro.

| Caso | Situação | Ação | Resultado esperado |
| --- | --- | --- | --- |
| 01a | P1 | Abrir a Grade e o detalhe de progresso | Obrigatórias: concluídas 7 cr (6 + 1), cursando 4 cr, planejadas 5 cr; FIT112 soma 0. Demais grupos em 0. Referência de 226 cr; ACE 0 de 405 h, em horas e separada dos créditos |
| 01b | P1 com a tag "aprovada" aplicada em FIT112 | Abrir a Grade e o detalhe de FIT112 | Concluídas passam a 11 cr. O detalhe e o detalhamento do progresso mostram que a aprovação é marcação manual, não registro importado (PC-02) |
| 01c · CR-03 | P1 + `ACE901` (ACE de 30 h no catálogo de teste) aprovada em 2026/1 + entrada de extensão `ACE901`, 30 h, período 2026/1, "validada", sem marcação da pessoa | Abrir o progresso de Extensão / ACE | **30 h confirmadas** e 30 h "a confirmar", com aviso de possível duplicidade (PC-01) |
| 01d · CR-03 | P1 + `ACE901` aprovada em 2025/2 + entrada `ACE901`, 30 h, período 2026/1, "validada" (duas ocorrências, períodos diferentes) | Abrir o progresso de ACE | **60 h** (PC-01) |
| 01e · CR-03 | P1 + `ACE901` aprovada em 2026/1 + entrada `ACE901`, 30 h, **sem período**, "validada" | Abrir o progresso de ACE | Identidade incerta: **30 h confirmadas** e 30 h à parte como "a confirmar", com aviso de possível duplicidade. O total confirmado nunca é 60 h |
| 01f · CR-03 | P1 + duas entradas `ACE901` no período 2026/1, uma de 30 h e outra de 20 h, sem marcação da pessoa | Abrir o progresso de ACE | Identidade incerta: **30 h confirmadas** (o maior valor) e 20 h "a confirmar", com aviso |
| 01h · barra | Disciplinas aprovadas, previstas, cursando e planejadas | Ler a barra de progresso do topo | Quatro trechos, nesta ordem: concluídas, previstas, cursando e planejadas, e o restante "não planejada". As somas são as mesmas de quando prevista e cursando formavam um só trecho. Sem tag escolhida, cada trecho usa a cor padrão |
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
| 02k · CR-05 | MAC128 no bloco "2025 (transferidas)" com aprovação original em 2020/2; MAC238 cursando em 2026/2 | Abrir a linha do tempo | Nenhum aviso de requisito MAC128 em MAC238 (D-08) |
| 02l · CR-05 | MAC128 no bloco com aprovação original em 2026/1; MAC238 planejada em 2026/1 e, depois, em 2026/2 | Abrir a linha do tempo | Aviso em 2026/1; nenhum em 2026/2. Vale a ordem pelo semestre original |
| 02m · CR-05 | MAC128 no bloco "2025 (transferidas)" ou "2025/0", sem semestre original; MAC238 planejada em 2025/2 e, depois, em 2026/1 | Abrir a linha do tempo | Aviso em 2025/2 (mesmo ano do bloco); nenhum em 2026/1 |
| 02n · CR-05 · co-requisito | COS231 no bloco de 2025 sem semestre original, com EEL418 em 2025/2 e em 2026/1; e COS231 no bloco de 2026 com original em 2026/1, com EEL418 em 2026/1 | Abrir a linha do tempo | Aviso de co-requisito só em 2025/2; o semestre original aceita o mesmo semestre |
| 02o · CR-05 · dois históricos | Importação de reingresso (06h, antigo → atual): MAC118 no bloco de 2025 com original em 2020/1; MAC128 em 2020/2 | Abrir a linha do tempo | Nenhum aviso de requisito MAC118 em MAC128 |

### RF-03 · Análise de um pedido de equivalência (RA-07, RA-09, RA-11, RA-12, RA-21)

Pedido "a pedir" para uma disciplina pedida de 60 h. Cursadas fora do currículo. O prazo de 5 anos só aparece
como **alerta**: não há linha de aprovação ("dentro de 5 anos"). Toda idade vem com a nota de estimativa (RF-08).

| Caso | Situação | Ação | Resultado esperado |
| --- | --- | --- | --- |
| 03a | Cursada `XYZ101` aprovada em 2021/2 (idade de 5,0 anos no cenário) | Abrir o pedido | Exibe a nota aprovada, sem alerta nem aprovação de prazo |
| 03b | `XYZ101` aprovada em 2021/1 (5,5 anos) | Abrir o pedido | Alerta de mais de 5 anos com "pode exigir exame de suficiência". A base normativa consta de RA-09 |
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
| 04e · CR-02 | PDF fictício com `XYZ101` aprovada e uma dispensa única para `ABC123`, de 4 cr, fora do catálogo | Importar, abrir o progresso, exportar e reimportar | O alvo conserva código, nome, 4 cr e grupo de livre escolha; a origem soma 0; não há aviso de reutilização. Exportar e reimportar produz a mesma contagem |

### RF-05 · Créditos de um pedido deferido (RA-13, D-02)

Perfil base P5: `ABC123` (4 cr) e `DEF456` (2 cr), ambas de livre escolha e aprovadas em 2025/1; pedido
**deferido** de COP232 (obrigatória, 4 cr) com `ABC123` como cursada de conteúdo. BOA fictício cuja seção
"Cursadas e Não Explicitadas" lista `ABC123` e `DEF456` (6 cr) e traz uma linha de total.

O segundo número é a **soma da lista** "Cursadas e Não Explicitadas" do BOA (PC-04), rotulada como tal e tratada
como estimativa. Ele nunca é rotulado como "total do BOA": o importador não lê a linha de total, e a lista não
prova o total oficial. A Grade distingue seção **ausente** de seção **presente e vazia**.

| Caso | Situação | Ação | Resultado esperado |
| --- | --- | --- | --- |
| 05a | P5 | Abrir o progresso e Pedidos | COP232 concluída com 4 cr nas obrigatórias. Livre escolha com **dois números rotulados**: "Grade: 2 cr" (regra da Grade, estimativa) e "BOA, soma das não explicitadas: 6 cr" (com a data de emissão do BOA). Nenhum é rotulado como total oficial. A lista de livre escolha contém os dois valores rotulados, sem um terceiro total solto. Datas e qualificadores permanecem vinculados à fonte correspondente |
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
| 06g | Prévia de I1 aberta | Baixar o arquivo e aplicar na mesma configuração | Compare o objeto extraído de `window.PERFIL` no arquivo baixado com o objeto salvo: são iguais |

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
este perfil** e **Baixar perfil.js** ficam desativados até lá. A escolha explícita sempre vence. Antes dela, o
cálculo do prazo mantém a nota de RA-09. O perfil gerado não grava "dúvida" como papel do histórico.

| Cenário | Ação | Resultado esperado |
| --- | --- | --- |
| Atual só com bloco 2025, anterior com 2024/2 real | Importar os dois | O atual é reconhecido pelo bloco 2025, sem pedir escolha |
| Atual com bloco 2024, anterior com 2024/2 real | Importar os dois | Dúvida: a prévia pede a escolha; até lá, aplicar e baixar ficam desativados, e o cálculo do prazo mantém a nota de RA-09 |
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

Casos de regressão e de conferência do importador:

| Caso | Situação | Ação | Resultado esperado |
| --- | --- | --- | --- |
| 06j · escolha explícita | Um histórico tem uma linha de transferência reconhecida sem data utilizável. O outro tem semestre real 2024/2 | Escolher explicitamente o primeiro como atual, na prévia e no CLI com `--atual` | O perfil preserva o bloco sem semestre do histórico escolhido, registra `fonte.historicoAtual = "escolhido"` e preserva `2024/2` como origem informativa de MAC118 |
| 06k · confirmação de colisão | Perfil com plano em 2025/1, dois históricos e BOA. Na prévia inicial, o plano não colide | Escolher o histórico cujo último semestre real é 2024/2. Verificar a colisão e que as duas ações estão desativadas. Marcar a confirmação de descarte e verificar que as duas ações são liberadas. Voltar à escolha inicial e verificar que a colisão some. Escolher novamente o histórico de 2024/2 e verificar que as duas ações voltam a ficar desativadas. Confirmar novamente e conferir o perfil salvo ou baixado | A prévia sugere 2025/1 e lista o plano em colisão. Usar e baixar ficam desativados até confirmar o descarte. Voltar à escolha inicial remove a colisão; repetir a troca exige nova confirmação. Depois de confirmar, o perfil salvo ou baixado tem 2025/1 como atual e não contém o plano descartado |
| 06l · ordem dos arquivos | O histórico anterior tem MAC118 no bloco de 2019 e em 2020/1. O atual tem MAC118 no bloco de 2025 | Importar nas duas ordens, com os mesmos arquivos e relógio | A saída canônica contém um único registro de MAC118 no bloco de 2025, com `aprovadaEm: "2020/1"` só como origem. O prazo usa 2025 nas duas ordens, sem usar 2019 |
| 06m · ACE no reingresso | O histórico anterior registra a mesma ACE fictícia de 30 h (EEW002 no teste) em 2020/1 e em 2021/1. O atual traz o mesmo código e grau no bloco de 2025 | Importar nas duas ordens e abrir o progresso de ACE | O perfil mantém a ocorrência em 2021/1 e a do bloco de 2025, com `aprovadaEm: "2020/1"`. O progresso exibe 30 h confirmadas e 30 h a confirmar; o total das duas parcelas é 60 h. Descreve o comportamento atual; muda se a regra da ACE no reingresso for decidida de outro modo |
| 06n · NCC desconhecida | BOA com uma NCC fictícia sem créditos e fora do currículo e do catálogo | Gerar a prévia | A Grade identifica a atividade e pede conferência |

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

O texto do aviso e das notas está em [REGRAS-ACADEMICAS.md](REGRAS-ACADEMICAS.md#textos-de-aviso). Os casos
verificam presença e local; a clareza do texto exige revisão humana.

**"Alcançável" (08b)** quer dizer: o aviso do rodapé é texto estático, na ordem de leitura e na árvore de acessibilidade,
fora do caminho dos controles; e os controles interativos da tela são percorridos por Tab com foco visível e
sem sobreposição. A passada com leitor de tela real está no backlog ([MANUTENCAO.md](MANUTENCAO.md)).

| Caso | Situação | Ação | Resultado esperado |
| --- | --- | --- | --- |
| 08a · aviso, clássico · D-09 | Sem perfil e com P1; modo clássico (só a Grade); desktop e celular | Abrir a Grade, recarregar e trocar para o Planejador e voltar | O aviso "Feita por alunos de ECI. Não substitui o SIGA, o BOA nem a coordenação." aparece numa linha do rodapé, depois da recarga e após cada troca de modo. O topo não tem faixa |
| 08b · aviso, Planejador · D-09 | Sem perfil e com P1; modo Planejador; desktop e celular | Percorrer as seis abas: Grade, Linha do tempo, Optativas, Cronograma, Equivalências e Extensão / ACE, A ECI por trás da Grade | O aviso está no rodapé em todas, com texto na ordem de leitura e na árvore de acessibilidade. Tab percorre os controles com foco visível |
| 08c · RA-13 | P5 | Abrir Pedidos; depois, na Grade ou na Linha do tempo, abrir "detalhes" e ativar o ⓘ da livre escolha | Em Pedidos, a nota de estimativa aparece junto dos dois números de livre escolha de 05a. No detalhamento, a mesma nota aparece ao ativar o ⓘ |
| 08n · ⓘ | P5; depois, sem BOA importado | Abrir o detalhamento do progresso | O cartão "Livre escolha" tem o formato dos outros (título e número, barra, "faltam"), sem linha extra. Um ⓘ pequeno, do tamanho do texto e sem borda, ao lado do título, mostra e esconde "Grade: NN cr (estimativa)", "BOA, soma das não explicitadas: NN cr (BOA de AAAA-MM-DD)" e a nota de RA-13, por clique, toque e teclado (Enter e Espaço), com `aria-expanded` e foco visível; alvo de 24 px (44 px em tela estreita). Sem BOA, só a linha da Grade. Não há legenda de estados (Aprovada, Aprovação prevista, Cursando, Planejada, Equivalência pedida, Reprovada, Pendente): o cartão tem o ícone de estado (14i). Com aprovação pelo pincel, o detalhamento traz "✎ Aprovação por marcação manual (pincel)" (PC-02) |
| 08d · RA-09 | Cursada com idade calculada (03a ou 03b) | Abrir o pedido e a tabela de livre escolha | Nota de estimativa junto da idade. A nota permanece enquanto a regra de reingresso (RA-21) não tiver sido implementada e testada; retirá-la depois é decisão registrada em [DECISOES.md](DECISOES.md) |
| 08e · RA-19 | Perfil importado com período atual deduzido | Abrir a linha do tempo e a prévia de importação | Nota de estimativa no período atual. A nota volta ao reimportar os mesmos PDFs enquanto o semestre real deduzido for mantido |
| 08f · RA-19 | Perfil com período atual informado pela pessoa | Abrir a linha do tempo | **Sem** nota de período deduzido |
| 08l · RA-19 | Navegador sem perfil | Importar só o BOA, com disciplinas em curso e sem data inferível; abrir a linha do tempo | O período fica sem data, sem nota de dedução e sem campo `deduzido` |
| 08g · RA-20 | 07a | Abrir a linha do tempo e o Cronograma | Nota de estimativa no aviso de oferta |
| 08h · RA-20 | MAC238 planejada em 2027/1, sem horários no perfil | Abrir o Cronograma e adotar a referência | Antes, o item está sem horário e a referência traz ter e qui 10–12, a fonte, a data e a nota. Depois, os horários ficam gravados como iguais à referência |
| 08i · versão e currículo | Modo Clássico e Planejador | Ler o rodapé | Exibe `v2.0.0` e a data `consultado` de `js/database.js`. A data representa o recorte de conferência descrito nas [regras acadêmicas](REGRAS-ACADEMICAS.md#fontes) |
| 08j · relato, rodapé | Cada modo | Seguir com Tab e Enter o link de relato | O destino é a escolha de modelo de Issue no fork da Grade (`/issues/new/choose`), sem dados da pessoa na URL. Com o modelo disponível na branch padrão, a tela pede esperado, observado e passos e orienta a não anexar PDFs, capturas identificáveis nem perfil |
| 08m · Sobre · D-09 | Sem perfil; desktop e celular | Abrir Configurações e ler a seção Sobre | Texto aprovado: quem faz, dados só no navegador, os modos Clássico e Planejador, "a Grade orienta, não confirma", limites conhecidos, link do repositório e link de relato com escolha de modelo (`/issues/new/choose`) |
| 08k · relato, importação | Perfil salvo | Importar um PDF fictício inválido | A mensagem oferece o mesmo link, não inclui dados do arquivo e preserva o perfil salvo |
| 08o · versão antiga | Modo Planejador; depois, abrir `classico.html` | Ler o link "versão antiga" do rodapé | O link leva a https://gremio-eci.github.io/grade/, em outra aba. `classico.html` continua levando a `index.html?modo=classico` |

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
| 10f · janela | Cronograma, desktop e celular | "+ Período" e "Excluir período", por teclado | As duas usam a mesma janela central. "Adicionar período" sugere o semestre seguinte, avisa nome vazio ou repetido em texto, confirma com Enter e cancela com Esc; o foco volta ao botão ou vai ao período criado |
| 10g · linha do tempo | P1 com uma tag escolhida no pincel da Grade | Na Linha do tempo, usar "detalhes ▾" e clicar num cartão | "detalhes" recolhe e expande o detalhamento. O clique abre os detalhes da disciplina, sem pintar nem mandar a cursada para "A alocar" |
| 10h · transferidas | Bloco "2025 (transferidas)" com e sem semestre original | Abrir a Linha do tempo | Com o semestre original, a transferida aparece nele, com a etiqueta "transferida · bloco 2025" e marcação visual discreta; sem ele, fica no bloco. Cada ocorrência vai ao próprio semestre (duas de ACE901, em 2020/1 e 2021/1, ficam separadas). Na coluna de um período atual ou planejado, a transferida aprovada não recebe alerta de requisito nem de oferta. O prazo (D-03) e as contagens não mudam. Se todas as transferidas do bloco foram ao semestre original, a coluna do bloco não aparece; o prazo continua "só o ano 2025 (bloco de transferidos)" e os requisitos seguem D-08. Com uma transferida sem semestre original, o bloco aparece só com ela |

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
| 12b | Perfil com edições | Exportar `perfil.js` e reimportar | Após reimportar, o arquivo recupera os campos exportáveis: períodos, planos, pedidos, extensão, aprovações registradas por você, tags e marcações |
| 12c | Navegador limpo | Carregar um arquivo de perfil válido; depois, um inválido | O válido é aplicado direto e recupera os campos exportáveis. O inválido mostra erro e preserva o perfil anterior. Prévia, cancelamento e escolha são casos de RF-06 |
| 12d | Dados salvos | Configurações → Limpar dados salvos, confirmando | Marcações, planos, perfil e aprovações registradas por você apagados; a confirmação diz quantas aprovações registradas saem e sugere exportar antes. Cancelar não apaga nada |
| 12e | Primeira visita com edições não exportadas | Usar o app | A pessoa encontra a indicação de que os dados ficam só neste navegador e o botão de exportar (critério de UX) |

### RF-13 · A ECI por trás da Grade (H12)

Estado: as três experiências atuais (COS110, COS242, EEL873) são da v2.0.0; as futuras são **planejadas**.

| Caso | Situação | Ação | Resultado esperado |
| --- | --- | --- | --- |
| 13a | Com ou sem perfil | Abrir a aba | As três experiências abrem com dados fictícios e indicam a disciplina de cada uma |
| 13b | Com perfil e marcações | Usar uma experiência e voltar | Perfil, planos e marcações não mudam (a experiência não lê nem grava dados da pessoa) |
| 13c | Planejador, Grade (na Linha do tempo, o seletor não age: o cartão abre os detalhes) | Ligar "ECI por trás" na paleta | As disciplinas com experiência ficam destacadas |

**Experiências planejadas.** COS231 com a detecção de choques de horário; um diagrama vivo da arquitetura
(EEL873), em que passar o mouse numa parte explica o que ela faz e qual disciplina a ensina, e um modo animado
mostra que o PDF é lido dentro do navegador. Critério: cada experiência nova usa dados fictícios, não toca nos
dados da pessoa, funciona por HTTP e por `file://`, com teclado e sem biblioteca externa.

### RF-14 · Marcação manual, aparência, tags e Referências (H1, H3, H10)

| Caso | Situação | Ação | Resultado esperado |
| --- | --- | --- | --- |
| 14a | Com perfil, modo clássico; depois, sem perfil | Pintar uma disciplina com uma tag; depois, limpar a marcação | Com perfil, o progresso usa o status da tag. Sem perfil, a marcação aparece e a limpeza restaura o estado anterior |
| 14b | Disciplina aprovada pelo pincel | Abrir o detalhe e o detalhamento do progresso | Identificada como marcação manual, não registro importado (PC-02, PC-03, PC-08). O cartão mostra o ícone ✎. Depois de "Registrar marcações", a mesma disciplina mostra ☑ e "registrada por você" (RF-21) |
| 14c | Cadeado ligado | Tentar pintar uma cursada importada | A cursada não muda. O cartão não mostra ícone de cadeado; o anúncio e os detalhes dizem que está protegida |
| 14d · destaque | Exibir → Destaque "Em foco" (padrão) | Passar o mouse, focar pelo teclado ou tocar uma disciplina; abrir os detalhes; tirar o mouse da Grade; escolher "Desligado" | O pré-requisito acende com contorno contínuo, o co-requisito com contorno tracejado e o que ela libera ganha a etiqueta "libera"; o resto esmaece sem baixar o contraste do texto. O mouse limpa o destaque ao sair, o teclado acompanha o foco e, com os detalhes abertos, o destaque fica na disciplina consultada. O primeiro toque só consulta (14h) e já destaca. Desligado: a Grade não destaca. A Grade não desenha setas; as setas didáticas ficam em "A ECI por trás da Grade" |
| 14h | Celular (toque), com a paleta e uma tag ativa | Tocar num cartão sem marcação; tocar de novo | O primeiro toque só consulta: mostra, em texto, a situação e a origem do cartão, com o link "Detalhes", e não altera nenhuma marcação. O segundo toque aplica a tag. Mouse e teclado marcam com uma ativação |
| 14i | Perfil com disciplinas aprovadas, previstas, cursando e planejadas, uma marcação manual e uma aprovação registrada por você | Ler os cartões da Grade e da Linha do tempo, nos dois temas e a 320 px; ouvir o nome acessível | Cada cartão mostra um ícone de estado, sem texto de situação: ✓ aprovada, ◐ cursando, ○ planejada, … prevista, ✎ marcação manual e ☑ aprovação registrada por você (✗ reprovada e ⇄ equivalência pedida). A situação e a origem ("perfil", "marcação" ou "registrada por você") ficam no nome acessível ("Nome, Situação · origem"), no primeiro toque (14h) e nos detalhes, sem depender de cor nem de passar o mouse. Na Linha do tempo, uma disciplina com duas ocorrências (reprovada num semestre, prevista noutro) tem em cada cartão a situação daquele semestre; clique, toque e Enter abrem os detalhes com o semestre, a situação e a origem dessa ocorrência antes do resumo |
| 14e | Configurações → Aparência | Alterar tema e modo, fixar um atalho e recarregar; depois desafixar o atalho e recarregar de novo | As escolhas persistem. Em ambas as ações há anúncio, e o item permanece acessível em Configurações |
| 14f | Tag em uso e disciplina marcada | Editar a tag usada e limpar a marcação de uma disciplina; depois pedir "Restaurar padrão", cancelar, pedir de novo e confirmar | A edição e a limpeza aparecem na paleta e na Grade. Cancelar a restauração preserva a edição. Confirmar restaura as tags padrão |
| 14j · Não conta | Tag com o antigo tipo "Reprovação (não conta)", salva no navegador ou num perfil antigo | Abrir a Grade, o editor de tags e exportar | A tag vira "Não conta", a marcação continua e o exportado grava o tipo novo; não há opção "Reprovação". A reprovação importada do período atual segue vermelha pela cor reserva. Uma tag "Não conta" só pinta o que a pessoa marcou |
| 14k · cor na barra | Editor de tags | Marcar "Usar a cor desta tag na barra" em tags de mesmo tipo e de tipos diferentes; recarregar, exportar e reimportar | No máximo uma tag por tipo: marcar uma desmarca a outra. Tags "Não conta" não oferecem a opção. O trecho usa a cor da tag; sem escolha, a cor padrão. A escolha persiste. Pelo teclado, Espaço marca e desmarca sem tirar o foco do controle, e Tab segue para o próximo |
| 14l · etiqueta | Destaque "Em foco" com dependentes visíveis, a 1440 px e a 320 px, nos dois temas | Focar ou tocar uma disciplina que libera outras | A etiqueta "libera" fica dentro do cartão, abaixo do nome e do código, sem cobrir o texto. A página não rola de lado |
| 14m · Configurações | Configurações aberta pelo botão da barra, por teclado e por clique | Fechar pelo X do topo (mouse e teclado), por clique fora e por Esc | Fecha em todos os casos; o foco volta ao botão que abriu, também no WebKit, que não foca o botão no clique. Clique dentro da janela não fecha |
| 14n · Aparência | Configurações → Aparência: Ícone + texto (padrão), Só ícones e Minimalista; desktop e celular | Trocar de nível, trocar de modo pelo seletor com mouse e setas do teclado, recarregar | O nível vale para a barra do topo, o seletor de modo, as abas e os controles com ícone. "Clássico \| Planejador" fica visível, com foco visível e nome acessível; em Só ícones e no Minimalista, só os quadradinhos e a linha do tempo, com o nome acessível e o `title` mantidos. A escolha persiste. Configurações diz "Planejador" |
| 14o · sugestão | Modo Clássico | Abrir "Importar do SIGA" | O importador sugere trocar para o Planejador; o botão troca o modo sem fechar o importador. No Planejador, sem sugestão. Não há aviso de primeira visita |
| 14p · abas e legendas | Perfil com uma aprovação pelo pincel e o detalhamento aberto; depois, Clássico com Dificuldade; depois, sem perfil | Percorrer as abas e marcar Exibir → Dificuldade | Grade (e Clássico) e Linha do tempo têm a barra e "detalhes" (fora do Minimalista, 14q); Optativas, Cronograma, Equivalências e Extensão / ACE e A ECI por trás da Grade não têm barra, detalhamento nem legenda. A legenda de categorias fica só na Linha do tempo. A escala de dificuldade (Trivial, Só o básico, Matéria de verdade, Difícil, Morte instantânea) aparece junto a Exibir → Dificuldade quando ativa; no Clássico, na faixa de legenda. A marcação manual é identificada no detalhamento. A soma da lista do BOA mantém o rótulo de PC-04. Sem perfil, sem barra nem detalhamento |
| 14q · Minimalista | Aparência = Minimalista, no Planejador e no Clássico, com o detalhamento aberto | Ler os cartões; abrir o botão ⋯ (Ferramentas) pelo teclado e pelo toque; fechar com Esc; focar ou tocar a barra; voltar a Ícone + texto | Os cartões da Grade mostram só o nome e o ícone de estado, sem código, créditos, notas nem legenda. As ferramentas ficam num painel com ícone e texto; Esc fecha e devolve o foco ao ⋯, e clicar fora fecha. A barra diz os números no nome acessível e os mostra com foco ou toque. O detalhamento e "detalhes" ficam fora desse nível e voltam ao sair dele |
| 14r · ícones nos controles | Exibir, filtros de Optativas, + Período, Exportar perfil.js e Excluir período, nos níveis Ícone + texto e Só ícones | Ler e acionar os controles | Cada controle tem ícone e texto; em Só ícones, o texto some só da tela e continua no nome acessível e no `title` |
| 14s · Todas acesas | Optativas com e sem uma inativa na lista; "só ativas" ligado com uma inativa planejada | Ligar e desligar "todas acesas" pelo teclado; recarregar | Só tira o esmaecimento das inativas, sem filtrar. Fica habilitado quando há uma inativa na lista (inclusive a exceção de "só ativas"); desabilitado, a preferência fica guardada |
| 14t · Plano na Grade | Exibir → Plano, com uma disciplina planejada em dois semestres | Ler os cartões da Grade e do Clássico; abrir os detalhes | O cartão mostra 📅 com o primeiro semestre planejado e "+N" se houver outros; o nome acessível e os detalhes trazem a lista completa. Começa desligado e sai no Minimalista |
| 14u · migrações | Preferências antigas: "Mostrar só ícones no seletor" ligada ou desligada, Aparência "Somente texto", setas Ocultas, Disciplina em foco ou Todas | Abrir o app | Seletor ligado vira Só ícones; desligado e "Somente texto" viram Ícone + texto; a chave antiga só sai depois de gravar a nova. Ocultas vira Destaque Desligado; Disciplina em foco e Todas viram Em foco. As outras preferências de Exibir continuam |
| 14g | Configurações → Referências | Abrir Referências, percorrer por Tab e ativar um link com Enter | Antes da ativação, as fontes estão listadas e a seção não abre nova aba nem carrega recursos externos. Enter abre o destino em outra aba |

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

O kit valida `js/horarios.js` e `js/guia.js`. A validação é local e não depende do Notion. Os arquivos (`testes/referencia.py`, `testes/referencia_casos.py` e `testes/fixtures/excecoes-referencia.json`) e o comando estão em [testes/README.md](../testes/README.md).

Cada exceção declara `origem`, `motivo` e `efeito` (`somente-informativo` ou `entra-no-calculo`). O efeito
"somente informativo" vale por estrutura: o app não lê a lista de exceções, e um código fora do currículo e do
catálogo já fica fora de cálculos e sugestões. As turmas sem código aparecem só na lista informativa de Optativas ("cabe" ou
"choca"), sem ação para planejar. O validador recusa o efeito "entra no cálculo" para um nome sem código e avisa, por
fonte, quando uma exceção não é usada (a remoção fica para a revisão semestral).

| Caso | Situação | Ação | Resultado esperado |
| --- | --- | --- | --- |
| 17a | Horário e guia válidos | Rodar o validador | Passa |
| 17b | Em cada arquivo, por vez, um código ausente do currículo, do catálogo e da lista de exceções; ou um código com dígito fora do alfabeto ASCII (por exemplo, arábico-índico ou de largura total) ou com quebra de linha no final | Rodar o validador | Falha e identifica o código |
| 17c | O mesmo código cadastrado como exceção, com origem, motivo e efeito no cálculo; ou o efeito "entra no cálculo" para uma turma sem código; ou uma exceção que nenhuma fonte usa | Rodar o validador | A entrada passa e a exceção é reportada. Se o efeito registrado for "somente informativo", a entrada fica fora de cálculos e sugestões. O efeito "entra no cálculo" para turma sem código falha. A exceção sem uso gera **aviso por fonte**, sem falhar |
| 17d | Uma variante por execução: campo obrigatório ausente, tipo inválido, horário malformado (dia fora de `seg` a `sex`, formato diferente de `HH-HH`, dígito não ASCII, espaço sobrando, quebra de linha no final, ou início igual ou posterior ao fim) e duplicata, mesmo idêntica, conforme a identidade da entrada | Rodar o validador separadamente para cada variante | Cada variante falha e identifica a entrada |
| 17e | Turmas sem código | Rodar o validador | O relatório lista todas as turmas sem código e permite conferir as exceções justificadas |
| 17f | Fixture local válida de guia com uma optativa cuja descrição contém `<`, `&` e aspas | Abrir o detalhe da optativa no navegador | Os caracteres aparecem literalmente e o trecho não cria elementos HTML |

A validação editorial, a entrada vazia ou incompleta e a remoção em massa ficam com RF-15.

### RF-18 · Aviso de dado desatualizado (H14) · planejado

A nota muda quando a referência é de semestre anterior ao atual ou não tem data, e não muda quando é do
semestre atual. A ausência de dado não confirma oferta nem atualidade. Casos: referência atual, anterior e
sem data.

### RF-19 · Previsão de formatura calculada (H4)

Aparece no cartão da fase, no modo Foco (RF-20). Só dá um semestre quando o Cronograma cobre tudo o que falta:
créditos de cada grupo, obrigatórias (inclusive Projeto de Graduação e Estágio) e ACE em horas. Cada disciplina
conta uma vez, mesmo planejada em vários períodos. O semestre é o do último período do plano com algo necessário,
marcado como estimativa. Nenhum número aparece sem aviso.

| Caso | Situação | Ação | Resultado esperado |
| --- | --- | --- | --- |
| 19a | Plano que cobre créditos, obrigatórias e ACE | Ligar o Foco | "No seu plano, você forma em AAAA/n (estimativa)" |
| 19b | Plano sem as horas de ACE | Ligar o Foco | A pendência concreta, inclusive quando faltam só horas ("405 h de Extensão / ACE") |
| 19c | Plano sem uma obrigatória ou com créditos de um grupo a menos | Ligar o Foco | "Planeje os NN cr que faltam", com as obrigatórias e os grupos que faltam |
| 19d | Sem perfil, sem período atual ou com algo necessário num período sem semestre | Ligar o Foco | Explica por que a previsão não está disponível |
| 19e | Tudo cumprido | Ligar o Foco | Mostra a conclusão |

### RF-20 · Modo Foco, fase do curso e conquistas (H3, H4)

O 🎯 Foco fica na barra do topo e funciona no Planejador. Totais, barra e planejamento nunca mudam com ele.

| Caso | Situação | Ação | Resultado esperado |
| --- | --- | --- | --- |
| 20a · sem perfil | Sem perfil | Acionar o 🎯 | Desabilitado (`aria-disabled`), com o motivo em texto: "Importe ou crie um perfil para usar o Foco." |
| 20b · Clássico | Perfil, modo Clássico | Acionar o 🎯; trocar para o Planejador | No Clássico, desabilitado com "Disponível no Planejador"; a Grade inteira fica disponível. Ao voltar ao Planejador, a preferência de Foco volta |
| 20c · aba escondida | Planejador na aba Optativas | Ligar o Foco pelo teclado | Ficam Grade, Linha do tempo e Cronograma; o app vai para a Linha do tempo, anuncia a aba escondida e o foco continua no 🎯. As setas do teclado pulam as abas escondidas |
| 20d · o que some | Perfil com aprovadas, transferidas, dispensas, previstas, cursando e planejadas | Ligar o Foco; ler a Grade e a Linha do tempo | Somem as aprovadas (inclusive transferidas, dispensas e registradas por você) e as reprovações já superadas. Previstas, cursando, planejadas e pendentes ficam. Os períodos passados sem nada elegível somem, inclusive o bloco de transferidas; coluna mista mostra só os elegíveis; o período atual sempre aparece |
| 20e · desligar | Foco ligado | Desligar | Fica na aba atual e o foco continua no 🎯 (`aria-pressed`). A escolha persiste ao recarregar |
| 20f · fase | Percentuais 24,9%, 25%, 74,9% e 75%; menos de 25% com três semestres; reingresso com transferidas; sem Histórico | Ler o cartão da fase | Calouro: menos de 25% e até dois semestres reais do Histórico do curso atual (fora o bloco, o período em curso e o semestre declarado). Veterano: 75% ou mais. O resto é meio de curso. Sem Histórico, só o percentual. A precisão é a do cálculo; só a tela arredonda |
| 20g · declarado | 40 cr importados e 20 registrados por você; depois 60 e 50 | Ler o cartão da fase | Com a fase mudando sem as declaradas, "Meio do curso · declarado"; quando não muda, sem marca |
| 20h · cartões | Calouro, meio de curso e veterano; tom zoeira e discreto | Ler o cartão | Calouro: o que a base destrava, primeiro marco e checklist. Meio: avanço do período (estimativa), o que destrava e próximos marcos. Veterano: reta final com Projeto de Graduação, Estágio, ACE, Humanas e Optativas. No tom zoeira, "🐢 Devagar e sempre." junto ao próximo marco do meio de curso e "🧘 Calma, Calabreso. Período … com N matérias difíceis: dá para planejar." quando um período do plano tem duas ou mais 🟠/🔴. "Discreto" troca essas frases e os títulos de brincadeira por versões sóbrias |
| 20i · selos | Um caso fictício por selo | Ler a estante | Cada selo da tabela de conquistas sai com a regra dele; o emoji é o ícone. A estante mostra quantos foram obtidos e o próximo marco com o que falta |
| 20j · fontes | Selo que depende de declarada, de prevista e de pincel | Ler a estante | Declarada dá selo com "· declarado"; prevista e pincel mostram "quase lá (prevista)" ou "quase lá (simulação ✎)", sem selo. Regras de mesmo período usam só períodos do Histórico |
| 20k · Notion e formatura | Todas as disciplinas que faltam planejadas, com ACE pendente; depois, sem uma delas | Ler a estante | O selo do Notion depende só do plano das disciplinas (ACE não entra) e some quando uma disciplina necessária sai do plano. Com os créditos completos e ACE pendente, "Créditos completos" com "falta ACE: NN h"; "Acabou! Acabou!" só com tudo cumprido |
| 20l · avisos | Conquista nova; recarga; atualização do mesmo perfil; outro perfil carregado | Ligar o Foco | A conquista nova é anunciada uma vez, abaixo da barra do topo, sem cobrir nenhum botão (1440 e 320 px). Na estante, o selo não obtido mostra a regra e só o que falta, sem repetir a regra. Recarga e atualização não repetem o aviso; substituição ou limpeza recomeçam a lista. Só a lista de avisos fica no navegador, com uma identidade local opaca. Com movimento reduzido, sem animação |

### RF-21 · Registrar marcações: aprovações registradas por você (H1, H3, H11)

O pincel continua simulação. "Registrar marcações" grava as marcações aprovadas como "Aprovação registrada por
você" no campo `aprovacoesDeclaradas` do perfil ([PERFIL.md](PERFIL.md)). Elas contam para fase e conquistas com a
marca "declarado" e nunca aparecem como registro do SIGA. Regras em [REGRAS-ACADEMICAS.md](REGRAS-ACADEMICAS.md).

| Casos | Situação | Resultado esperado |
| --- | --- | --- |
| R01 a R03 · fluxo sem perfil | Pincel "Cursada" em três disciplinas, sem perfil | "Serão gravadas 3 aprovações", botão "Gravar 3 aprovações" e "Criar perfil". Gravar cria o perfil com as três, `registradoEm` de hoje, sem semestre, e `marcacoes` vazio; os cartões mostram ☑. O resultado fica no diálogo com Desfazer e Fechar (fecha só por Fechar ou Esc). Desfazer volta sem perfil e com as marcações. Com N = 1, "Será gravada 1 aprovação." |
| R04 · grupos | Pincel aprovado em disciplina já aprovada no perfil, numa fora do currículo, numa em curso e numa já registrada | Só as novas são gravadas; as outras aparecem com o motivo. Em curso no BOA fica num grupo desmarcado ("registre só se já foi aprovada") |
| R05 · semestre | Semestre opcional | Formato AAAA/1 ou AAAA/2, até o semestre atual; erro anunciado e botão com `aria-disabled` |
| R06 · barra igual | Registrar uma aprovação do pincel | A barra não muda; o detalhamento passa a contar a registrada (☑) |
| R07 a R09, R36 · requisitos | Declarada com e sem semestre | Com semestre, vale como semestre real (co-requisito também no mesmo). Sem semestre, o limite é o semestre de `registradoEm`: o pré-requisito vale depois dele e o co-requisito também nele. No semestre do registro, aviso "registrado por você sem semestre" |
| R10, R11 · prazo | Pedido de equivalência que usa uma declarada | Sem semestre: "Data de aprovação não confirmada", sem idade. Com semestre: idade estimada, nota de RA-09 e "Semestre informado por você, sem registro do SIGA" |
| R12 a R15, R31, R32, R37 · SIGA | Importação depois de registrar | O registro importado vence: a declarada fica guardada fora da conta ("Confirmada pelo SIGA"); semestre diferente é divergência ("Vale o SIGA"). Reprovação no semestre declarado ou depois (sem semestre, o de `registradoEm`) é conflito e a declarada não conta; antes dele, ela conta com nota. Equivalência deferida com origem declarada também é declarada. O bloco de transferidas confirma, comparando só com `aprovadaEm` |
| R16, R35 · ACE | Declarada de ACE e extensão validada | Sem semestre, possível duplicidade a confirmar; com semestres diferentes, sem duplicidade |
| R17 a R19 · arquivo | Exportar, limpar, carregar e reimportar; `--mesclar` | O campo vai e volta igual; reimportar e `gerar_perfil.py --mesclar` o preservam (paridade e oráculo) |
| R20 a R22 · leitura | Perfil antigo; arquivo com semestre inválido; item inválido no navegador | Antigo aceito sem declaradas; arquivo recusado com o campo apontado; item inválido ignorado com aviso, sem perder planos e pedidos |
| R23 a R26 · gestão | Limpar, carregar outro perfil, remover no detalhe e em lote | Limpar e Descartar citam quantas saem; carregar outro perfil com declaradas não exportadas pede confirmação; remover pede confirmação, não recria a marcação e devolve o foco ao título; a remoção em lote em Configurações não deixa o foco no body |
| R27 a R29, R34 · fase e selos | Ver RF-20 (20g, 20j) | "· declarado" quando dependem de declarada; pincel só "quase lá"; regras de mesmo período só com o Histórico |
| R30, R33 · acessibilidade e conflito | Fluxo pelo teclado e pelo toque a 320 px, nos dois temas; linha que conflitaria com reprovação | Sem ocorrência grave no axe; foco visível e devolvido; a linha em conflito fica desmarcada, com o motivo e `aria-disabled` |

## 5. Requisitos não funcionais

| ID | Requisito | Histórias | Critério verificável | Estado |
| --- | --- | --- | --- | --- |
| RNF-01 | Dados acadêmicos importados e do perfil permanecem no dispositivo | H11 | Com PDFs fictícios contendo marcadores sentinela no cabeçalho: nenhuma requisição externa durante a importação; nenhuma requisição à própria origem contém dados do documento; o perfil salvo e o arquivo exportado não contêm os marcadores. A página substituta `classico.html` não carrega script nem recurso externo e leva ao modo clássico | **Parcial.** Armazenamento e página: `t_siga` (o perfil salvo e a página não contêm o nome, o CPF nem o RG do cabeçalho). Requisições: `testes/auditoria.py` em todos os cenários (nenhuma fora da origem). `classico.html` e o código sem referência externa: `testes/reimportacao.py`. Arquivo exportado e conteúdo das requisições: só em sonda avulsa não versionada (sem sentinela no arquivo baixado, no armazenamento, nos cookies, no console nem em URL ou corpo de requisição, nos seis pares). Não há teste versionado das sentinelas |
| RNF-02 | Funciona por abertura direta (`file://`) e por hospedagem estática, sem servidor próprio do app | H1 a H11 | O kit, numa versão fixa e com dados fictícios, passa nos dois modos, em ambiente isolado de perfil real e sem rede externa | **Parcial.** Critério: os cenários da matriz (126 por `file://` e 127 por HTTP; ver [testes/README.md](../testes/README.md)) passam nos três motores, sobre a cópia pública do commit, com dados fictícios e sem evento inesperado. Verificado: a matriz completa passa no Chromium, por `file://` e HTTP. No Firefox e no WebKit, a conferência mais recente cobriu só os casos de cartões e da Linha do tempo, por HTTP; a matriz completa nesses motores fica para a conferência antes de publicar |
| RNF-03 | Acessibilidade | H1, H2, H3, H10, H11 | Versão fixa do axe-core sem ocorrências "serious" ou "critical" nas telas e estados listados, nos dois temas; percursos de teclado enumerados com foco visível. Leitor de tela real fica no backlog | **Parcial.** Sem ocorrência grave ou crítica no recorte do axe (`t_axe_recorte`) e testes dos dez bloqueios achados (contraste, foco, nomes, teclado, 320 px, alvos, abas), ver a [matriz](PLANO-DE-TESTE.md#5-matriz-de-rastreabilidade). Faltam o percurso de teclado de ponta a ponta de alguns fluxos centrais (paleta, Configurações, criar período), o leitor de tela real, o Safari no Mac e o iPhone real |
| RNF-04 | Compatibilidade | H1 a H11 | O kit passa em Chromium, WebKit e Firefox, nas versões registradas, por `file://` e HTTP. O WebKit automatizado é a aproximação do Safari; não há teste em iPhone real | **Parcial.** Critério: os seis pares (Chromium, Firefox e WebKit, por `file://` e HTTP). Verificado com a matriz completa: Chromium, nos dois modos. Firefox e WebKit: só os casos de cartões e da Linha do tempo, por HTTP; os seis pares completos ficam para a conferência antes de publicar. O WebKit automatizado não alcança links por Tab no Windows: a conferência em Safari no Mac e iPhone real fica pendente ([limite do ambiente](PLANO-DE-TESTE.md#6-limite-do-ambiente-webkit)) |
| RNF-05 | Paridade do importador | H2, H7 | Com os conjuntos fictícios nomeados e um perfil anterior fixo, JS e Python geram perfis iguais (JSON canônico) com e sem BOA, com mescla, sobre o mesmo texto e com leitores diferentes. Complementa o oráculo, não o substitui | **Cumprido.** `ferramentas/testar_paridade.sh` nas quatro combinações (histórico; com BOA; com perfil; com BOA e perfil), também com um perfil anterior com aprovações registradas por você, e `testes/importador.py` nos oráculos escritos à mão |
| RNF-06 | Facilidade de uso na primeira visita | H1, H2, H3, H11 | Na inspeção heurística, sem bloqueio nos fluxos dessas histórias. Um calouro encontra o próximo passo sem perfil; quem importa entende onde os dados ficam e como exportar | **Parcial.** É verificável por inspeção heurística manual, não por teste automatizado. Os dez bloqueios que a inspeção achou foram corrigidos e cada um tem teste (RNF-03). Uma revisão independente do candidato achou mais dois defeitos, o aviso de linha do Histórico não lida na prévia e o foco do importador aberto por Configurações, também corrigidos com teste; a nova passada da inspeção sobre o candidato corrigido ainda não está registrada |
| RNF-07 | Manutenibilidade | H13, H14 | Atualização semestral seguindo [MANUTENCAO.md](MANUTENCAO.md). Correção de defeito prova vermelho → verde no kit, ou registra por que o cenário já passava. Mudança intencional de requisito atualiza o oráculo. Mudança no importador mantém a paridade | **Parcial.** Os processos estão documentados ([MANUTENCAO.md](MANUTENCAO.md), [CONTRIBUTING.md](../CONTRIBUTING.md), [AGENTS.md](../AGENTS.md)) e as correções desta versão seguiram vermelho → verde, mas a primeira atualização semestral ainda não aconteceu |
| RNF-08 | Transparência das fontes | H10, H14 | A interface mostra a versão e a data de conferência do currículo; as fontes registram a data de consulta de horários e guia; cada regra de [REGRAS-ACADEMICAS.md](REGRAS-ACADEMICAS.md) cita a fonte ou se marca "sem fonte oficial" | **Parcial.** Versão e data de conferência no rodapé: `t_rf08_rodape`. A data de consulta de horários e guia e a citação de fonte em cada regra de [REGRAS-ACADEMICAS.md](REGRAS-ACADEMICAS.md) não têm teste automatizado: a conferência é por leitura |
| RNF-09 | Segurança do app estático | H11 | CSP restritiva em `index.html`, sem script externo; PDF.js com `isEvalSupported: false`; nenhum dado do documento em URL ou log | **Cumprido.** A CSP de `index.html` tem `default-src 'self'` e `connect-src 'self'`, sem script externo; `isEvalSupported: false` nas duas chamadas do PDF.js (`js/siga.js`, `js/eci.js`); nenhuma requisição fora da origem e nenhum dado do documento em URL, corpo ou console (matriz e sonda avulsa) |
| RNF-10 | Desempenho | H2 | Abrir o app e importar os PDFs fictícios num celular emulado, registrando dispositivo, versões, cenário, carga fria, repetições e mediana. Enquanto não houver limiar explícito, a medida é linha de base, não cumprimento | **Parcial.** Só linha de base, sem limiar. Sonda avulsa não versionada, em Chromium com o perfil de celular Pixel 7 emulado, por HTTP local e contexto novo a cada repetição: abrir o app, mediana de 100 ms (7 repetições, de 87 a 278 ms); importar o Histórico e o BOA fictícios até a prévia, mediana de 544 ms (de 501 a 766 ms). Sem limitação de CPU nem de rede; não é cumprimento de limiar |
| RNF-11 | Frescor dos dados de referência | H16 | O semestre da conferência editorial selecionada fica a no máximo um semestre do semestre corrente; registra a última execução bem-sucedida e confere que o agendamento não foi desativado | planejado |
| RNF-12 | Portão automático de qualidade | H13, H14 | Paridade e kit rodam no candidato de cada Pull Request; um check obrigatório com falha impede o merge, e isso é provado uma vez com um PR de teste | planejado |
| RNF-13 | Segurança da automação | H16 | Token do Notion só no passo de leitura; sem acesso para forks e sem `pull_request_target`; ações externas fixadas por SHA completo; nenhum dado bruto em logs ou artefatos | planejado |
