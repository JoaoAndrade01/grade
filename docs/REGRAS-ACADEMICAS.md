# Regras acadêmicas da Grade ECI

**Pergunta que este documento responde:** quais regras a Grade aplica e de onde elas vêm.
Os casos que provam cada regra estão em [REQUISITOS.md](REQUISITOS.md). O motivo de cada escolha está em
[DECISOES.md](DECISOES.md).

Estas regras descrevem o comportamento esperado da **v2.0.0**. A Grade orienta: a confirmação acadêmica
fica com o SIGA, o BOA e a coordenação.

## Fontes

| Código | Fonte | O que sustenta |
| --- | --- | --- |
| [SIGA] | [Distribuição curricular de ECI, 2012/1 em diante](https://siga.ufrj.br/sira/repositorio-curriculo/distribuicoes/A46B41C8-92A4-F79C-7383-BE627D84214E.html) | Componentes, créditos, semestres, requisitos P (pré) e C (co), totais por grupo, 15 segmentos máximos e 10 recomendados |
| [CEG] | [Resolução CEG 01/2017](https://ifcs.ufrj.br/wp-content/uploads/2023/07/Resolucao-RESCEG-2017_01-Dispensa.pdf), cópia institucional | Dispensa de disciplinas, arts. 44 a 57 |
| [POLI] | [Dispensa de Disciplinas, Escola Politécnica](https://www.poli.ufrj.br/estudante/dispensa-de-disciplinas/) | Aplicação da CEG 01/2017: documentos, 5 anos e exame de suficiência |
| [PR1] | [Índice de resoluções 2010–2019](https://graduacao.ufrj.br/2019/08/21/resolucoes-de-2010-a-2019/) e [orientações sobre o funcionamento do curso](https://graduacao.ufrj.br/category/pro-reitoria-institucional/cursos-de-graduacao/funcionamento-do-curso-de-graduao/) | A CEG 01/2017 consta do índice; crédito ligado à aprovação |
| [CEG-10] | [Resolução CEG 10/2004](https://pr7.ufrj.br/wp-content/uploads/images/DOCUMENTOS/RESOLU%C3%87%C3%95ES_CEG_-_CONSUNI/CEG_10-2004_Disp%C3%B5e_sobre_o_cancelamento_de_matr%C3%ADcula_por_insuficiencia_de_rendimento_acad%C3%AAmico.pdf) | Prazo máximo de integralização e critérios de contagem, arts. 2 e 3 |
| [EXT] | [Resolução Conjunta CEG-CEU 01/2021](https://pr5.ufrj.br/images/CEU/RESOLUCOES/RESOLUCOES_CONJUNTAS/8-2022-resolucao_conjunta_ceg_ceu_boletim.pdf) e [regulamentação da PR5](https://pr5.ufrj.br/2018/04/03/regulamentacao-da-creditacao/) | Extensão integrada ao currículo e registrada no SIGA (arts. 1 e 6); aproveitamento (arts. 5 e 7) |
| [IN-138] | [IN 138/2024 da PR5](https://www.extensao.ufrj.br/index.php/institucional/atos-normativos) | Tramitação e registro das horas de extensão no BOA |
| [NOTION] | [Grades de ECI, no Notion](https://app.notion.com/p/Grades-de-ECI-66aa2e8ffa928304a7f68120847127af) | Horários de referência e guia dos alunos. **Não oficial**, mantido por alunos |
| [CASO] | Caso observado por um aluno | Um reingresso e a livre escolha no BOA depois de um deferimento. Não descreve o funcionamento geral do SIGA |
| [COORD] | Coordenação do curso | Interpretações que as fontes não resolvem (ver "Consultas pendentes à coordenação") |

**Recorte e data da conferência do SIGA (2026-11-26).** Os 46 componentes codificados em `js/database.js`
foram comparados com a distribuição pública do SIGA por código, semestre, créditos, carga horária e requisitos
diretos (P e C), sem divergência. Os totais conferem: **226 créditos** (168 de obrigatórias, 6 de requisitos
curriculares suplementares, 40 de condicionadas, 4 de Humanas e 8 de livre escolha) e, à parte, **405 h de
ACE**. A comparação **não inclui** as alternativas de requisito do SIGA (aparecem em 8 códigos-base), as
equações curriculares, os nomes abreviados nem o catálogo de eletivas, e não prova que a página nunca mudou. A
data aparece na interface como "Currículo conferido no SIGA em AAAA-MM-DD".

**Alcance das fontes normativas.** A CEG 01/2017 consta do índice da PR1 e é citada por unidades da UFRJ em
2026. No recorte pesquisado em 2026-11-26, não se localizou ato que altere os arts. 44 a 57. Isso sustenta o
uso da norma, mas não comprova a ausência de ato não indexado. Interpretações controversas seguem para a
coordenação.

## As regras

**Situação** de cada regra:

- **Confere:** norma ou dado oficial e Grade consistentes, no recorte indicado.
- **Heurística local:** regra da Grade sem norma correspondente, ou que aproxima uma norma.
- **Estimativa:** heurística cujo resultado recebe uma nota junto do cálculo (ver "Textos de aviso").
- **Não modelada:** a norma existe e a Grade não a aplica, por decisão registrada.

| ID | Regra | Norma ou fonte | O que a Grade faz na v2.0.0 | Situação |
| --- | --- | --- | --- | --- |
| RA-01 | Totais para formar: 226 cr e, à parte, 405 h de ACE | [SIGA] | Usa esses totais de referência; ACE em horas, separada dos créditos | Confere |
| RA-02 | Créditos, semestre, carga horária e requisitos diretos de cada componente | [SIGA] | Dados de `js/database.js`. Alternativas de requisito e equações não são modeladas: quem tem uma alternativa reconhecida pode receber aviso indevido | Confere no recorte |
| RA-03 | Pré-requisito antes do período da disciplina | [SIGA], marca P | Compara o **semestre**, não a posição na lista. Aceita aprovado, previsto, cursando e planejado (simulação local). Período sem data não conta como anterior. A tag "aprovada" vale e é identificada como marcação manual | Confere |
| RA-04 | Co-requisito pode estar no mesmo período | [SIGA], marca C (só `EEL418` com `COS231`) | Aceita o mesmo semestre; avisa se o co-requisito vem depois | Confere |
| RA-05 | Reprovação não conta crédito | [PR1] | Soma 0 crédito. Uma tag pode mudar o status efetivo, como simulação | Confere |
| RA-06 | Dispensa conta os créditos da dispensada, fora do coeficiente | [CEG] arts. 53, 55 e 56 | O grau "T" do histórico é convenção lida pelo importador | Confere |
| RA-07 | Várias cursadas podem formar um pedido | [CEG] art. 45, II; mérito institucional no art. 52 | Aceita várias origens e calcula indicadores | Confere como capacidade |
| RA-08 | A mesma origem não serve a duas dispensas | [CEG] art. 46, II | Entre pedidos, e entre pedido e dispensa aprovada, mostra o conflito. Nas dispensas importadas, o alvo conta como no histórico, a origem não soma de novo e há aviso quando a origem aparece em duas ou mais dispensas | Confere |
| RA-09 | Cursada com mais de 5 anos exige exame de suficiência | [CEG] art. 47; [POLI] | Estima a idade pelo semestre de aprovação e pelo relógio. Só alerta, com "pode exigir exame de suficiência"; a base normativa desse alerta é o art. 47 da CEG 01/2017; sem ano nem semestre, "data não confirmada"; só o ano numa fronteira, "precisão insuficiente" | Heurística local, estimativa |
| RA-10 | Exceções ao prazo de 5 anos | [CEG] art. 47, parágrafo único | Não aplicadas. O reingresso está em RA-21 | Não modelada |
| RA-11 | Carga horária das cursadas comparada à da pedida | Nenhuma: a CEG, arts. 45 e 46, pede conteúdo e orientação, não percentual | Soma as horas e mostra a comparação como **orientação neutra**, sem ✓ nem ✗. Carga da pedida desconhecida não é tratada como cumprida | Heurística local |
| RA-12 | Ao menos uma cursada traz o conteúdo | [CEG] art. 45, I e II | Verifica só a marcação "só horas"; não compara ementas | Heurística local |
| RA-13 | Créditos da cursada saem do grupo de origem; a pedida entra no grupo dela | [CEG] art. 53 sustenta o crédito da pedida, não a retirada da origem | Cálculo local, sem contar duas vezes. Mostra "Grade: N cr" e "BOA, soma das não explicitadas: M cr", sendo M a **soma da seção** "Cursadas e Não Explicitadas" do BOA importado | Heurística local, estimativa |
| RA-14 | Créditos da UFRJ de fora do currículo limitados a 25% | [CEG] art. 48, II e § 2º | Não aplicado. Pelo texto, parece valer para ingresso e transferência | Não modelada |
| RA-15 | Prazo do pedido de dispensa | [CEG] art. 44, §§ 1 e 2; art. 54 | Não aplicado | Não modelada |
| RA-16 | Horas de ACE registradas contam para as 405 h | [SIGA]; [EXT]; [IN-138] | Soma a aprovação pelo catálogo e a entrada "validada" da extensão, sem contar a mesma ocorrência duas vezes (INV-15) | Heurística local |
| RA-17 | Atividade em curso vai para extensão quando o catálogo a classifica como ACE | [SIGA]; o catálogo local não é exaustivo | NCC em curso sem créditos e fora do currículo e do catálogo gera aviso para conferência | Heurística local |
| RA-18 | Prazo máximo de integralização | [SIGA]; [CEG-10] arts. 2 e 3; [CEG] art. 53, § 2º | Não aplicado | Não modelada |
| RA-19 | Período atual deduzido na importação | Nenhuma | O período seguinte ao último do histórico, com as disciplinas "cursando" do BOA, aparece na prévia com nota de estimativa. Um BOA só com ACE não cria período atual | Heurística local, estimativa |
| RA-20 | Horários de referência e aviso de oferta por semestre par ou ímpar | [NOTION], não oficial | Aviso só para ECI e obrigatórias fora do ciclo básico. Sem promessa de vaga | Heurística local, estimativa |
| RA-21 | Reingresso: para o prazo de 5 anos vale o ano do bloco do histórico do curso atual | Decisão local ([DECISOES.md](DECISOES.md)); [CASO]. A relação com o [CEG] art. 47 **está pendente de interpretação** pela coordenação | O ano do bloco de transferidos do histórico atual rege o prazo; a data original aparece só como informação. Em dúvida sobre qual é o histórico atual, a Grade pergunta | Regra local, interpretação normativa pendente |

**Políticas locais fora da tabela**

- **Simulação sobre dados oficiais.** Tags do pincel e créditos ou horas manuais entram no progresso, sempre
  identificados como marcação manual.
- **Sugestões.** Proposta gulosa por oferta, créditos faltantes e choques. No último período, inclui qualquer
  componente sem oferta que passe nos requisitos. Sem promessa de grade ótima nem de vaga.
- **Importador.** Deduplica transferências, trata dispensa sem origem aprovada, usa a primeira equivalência
  por origem, trata `AAAA/0` como bloco sem semestre real e preserva o que não vem do BOA. Detalhes em
  [IMPORTADOR.md](IMPORTADOR.md).
- **Lacunas de domínio.** Alternativas oficiais de requisito, dispensa automática de componentes comuns
  ([CEG] art. 48, § 2º, e art. 49) e a decisão institucional de cada pedido (arts. 50 a 52).

## Modelo de domínio

| Entidade | O que é | Atributos principais |
| --- | --- | --- |
| **Componente** | Disciplina ou atividade do currículo ou do catálogo | código, nome, semestre, créditos, carga horária, requisitos P e C, grupo |
| **Grupo de créditos** | Parte do total para formar | obrigatórias, requisitos suplementares, condicionadas, Humanas, livre escolha; ACE conta em horas |
| **Período** | Semestre real `AAAA/1` ou `AAAA/2`; período atual (com ou sem data); bloco de transferidos (`AAAA` ou `AAAA/0`, só com o ano); período planejado | rótulo, data, se foi deduzido |
| **Registro** | A situação de um componente num período | status (aprovada, reprovada, cursando, prevista, planejada, dispensada "T"), créditos, grau, origem (importado ou marcação manual) |
| **Histórico** | Um PDF do SIGA importado | papel (atual ou anterior), último semestre real, ano do bloco de transferidos |
| **BOA** | Boletim de Orientação Acadêmica importado | seção "Cursadas e Não Explicitadas": presente, vazia ou ausente; atividades em curso |
| **Dispensa** | Alvo dispensado a partir de uma origem | alvo, origem, créditos do alvo no histórico |
| **Pedido de equivalência** | Pedida e cursadas de origem | situação (a pedir, deferido), cursadas (conteúdo ou só horas), idade, carga horária |
| **Ocorrência de extensão** | Uma realização de atividade de ACE | código, período, horas, validada, marcada como distinta pela pessoa (versão seguinte) |
| **Referência de oferta** | Horários e guia vindos do Notion | semestre par ou ímpar, data de consulta, fonte |
| **Perfil** | O conjunto salvo no navegador e exportável | períodos, registros, pedidos, extensão, tags (formato em [PERFIL.md](PERFIL.md)) |

### Invariantes

Cada invariante aponta para a regra e para os casos de [REQUISITOS.md](REQUISITOS.md) que o provam.

| ID | Invariante | Regra | Casos |
| --- | --- | --- | --- |
| INV-01 | Reprovação soma 0 no progresso. Aprovações, dispensas, disciplinas em curso e planos aparecem nos seus subtotais | RA-05 | 01a |
| INV-02 | O total de referência é 226 cr, e a ACE conta em horas, separada dos créditos | RA-01 | 01a |
| INV-03 | Uma dispensa conta os créditos da dispensada, sem nota | RA-06 | 01a |
| INV-04 | Pré-requisito vale em semestre anterior. Co-requisito pode valer no mesmo semestre. A ordem da lista de períodos não muda o resultado. A marcação manual segue INV-06 | RA-03, RA-04 | 02a a 02j |
| INV-05 | Período sem data não conta como anterior | RA-03 | 02i |
| INV-06 | A tag "aprovada" satisfaz requisito e conta crédito, sempre identificada como marcação manual | RA-03, RA-05 | 01b, 02j |
| INV-07 | A mesma origem não sustenta dois pedidos nem um pedido e uma dispensa | RA-08 | 04a, 04b |
| INV-08 | A origem de dispensa soma 0 e o alvo conta como no histórico, mesmo fora do catálogo. O aviso específico de reuso entre dispensas aparece com duas ou mais | RA-08 | 04b a 04e |
| INV-09 | Um pedido pode ter várias cursadas; o conteúdo exige ao menos uma marcada como conteúdo | RA-07, RA-12 | 03h, 03j |
| INV-10 | A carga horária é orientação, nunca verificação | RA-11 | 03d a 03g |
| INV-11 | O prazo de 5 anos só gera alerta. Sem ano nem semestre, a data não é confirmada. Com só o ano, verificar o intervalo de idade e emitir alerta de precisão insuficiente quando ele cruzar a fronteira | RA-09 | 03a a 03c, 06i |
| INV-12 | No reingresso, a base do prazo é o ano do bloco do histórico atual; a data original é informação | RA-21 | 03i, 06h |
| INV-13 | O histórico atual é o de data mais recente; em dúvida, a Grade pergunta; a escolha explícita vence; a ordem dos arquivos não muda o resultado | RA-21 | 06h, 06j, 06k, 06l |
| INV-14 | A livre escolha mostra dois números rotulados (Grade e soma da seção do BOA), nunca um "total do BOA"; seção ausente é diferente de seção vazia | RA-13 | 05a a 05h |
| INV-15 | Aplicar PC-01: períodos conhecidos diferentes identificam ocorrências distintas; registros de mesma identificação que podem ser a mesma ocorrência confirmam só o maior valor e mostram o resto "a confirmar". A distinção explícita de 01g fica para a versão seguinte | RA-16 | 01c a 01f, 06m |
| INV-16 | O período atual deduzido é estimativa; o informado pela pessoa não tem nota | RA-19 | 08e, 08f |
| INV-17 | Aviso de paridade e aviso de ausência de oferta são distintos; ciclo básico e período sem data não geram aviso | RA-20 | 07a a 07e |
| INV-18 | ACE em curso identificada pelo catálogo vai para extensão. NCC sem créditos e fora do currículo e do catálogo gera aviso | RA-17 | 06a, 06n |

## Glossário

- **BOA** — Boletim de Orientação Acadêmica do SIGA. Traz o que está em curso e as "Cursadas e Não
  Explicitadas".
- **ACE** — atividades curriculares de extensão, contadas em horas (405 h no currículo de ECI), à parte dos
  créditos.
- **Livre escolha** — grupo de créditos (8 cr) que aceita componentes de fora do currículo.
- **Condicionadas** — grupo de créditos (40 cr) de componentes escolhidos dentro de uma lista do currículo.
- **Dispensa × equivalência** — a **dispensa** é o resultado deferido: a disciplina aparece como dispensada
  (grau "T") no histórico. A **equivalência** é o pedido: uma ou mais cursadas (a origem) servem no lugar de
  uma disciplina do curso (a pedida).
- **Origem e alvo** — a origem é a cursada que sustenta o pedido; o alvo é a disciplina dispensada.
- **Reingresso** — voltar ao curso por ENEM ou transferência interna. A Grade conta o prazo de 5 anos pelo
  histórico do curso atual (RA-21).
- **Bloco de transferidos** — no histórico, as disciplinas aproveitadas, listadas só com o ano ("AAAA" ou
  `AAAA/0`), sem semestre real.
- **Marcação manual** — tag aplicada pela pessoa com o pincel. É simulação: não é registro importado.

## O que a Grade não confirma

A Grade **não** confirma, e nenhum número dela substitui o SIGA, o BOA ou a coordenação, em:

- se um pedido será deferido (arts. 50 a 52 da CEG) e quais exceções de prazo a coordenação reconhece
  (art. 47, parágrafo único);
- o limite de 25% de créditos de fora do currículo (RA-14) e o prazo do pedido de dispensa (RA-15);
- o prazo máximo de integralização, inclusive o limite de segmentos do SIGA (RA-18);
- alternativas de requisito e equações curriculares (RA-02);
- a oferta real de turmas e horários, que vêm do guia dos alunos e podem mudar (RA-20);
- o total de créditos que o BOA conta na livre escolha depois de um deferimento (RA-13);
- a data que a coordenação considera para o prazo de 5 anos em reingresso (RA-21).

## Textos de aviso

A faixa fixa e as notas de estimativa usam estes textos, sem alteração de redação.

**Faixa fixa no topo:** "Feita por alunos de ECI. Não substitui o SIGA, o BOA nem a coordenação."

| Regra | Onde aparece | Texto |
| --- | --- | --- |
| RA-13 · livre escolha | Junto dos dois números de livre escolha | Estimativa da Grade. No BOA, os créditos usados em equivalências podem continuar aparecendo na livre escolha. |
| RA-09 · prazo de 5 anos | Junto da idade da cursada, no pedido e na tabela de livre escolha | Idade estimada pelo semestre de aprovação. Para quem reingressou, a data que vale pode ser outra; confira com a coordenação. |
| RA-19 · período atual | No período atual deduzido, na linha do tempo e na prévia | Período atual deduzido do histórico. Confira e corrija na prévia, se precisar. |
| RA-20 · horários e oferta | No aviso de oferta e nos horários de referência do Cronograma | Horários de referência mantidos por alunos (Notion, consultado em DD/MM/AAAA). Podem mudar; confira no SIGA antes da inscrição. |

Na nota de RA-20, a data vem do campo `consultado` de `js/horarios.js`. A nota de RA-09 fica enquanto a regra
de reingresso (RA-21) não estiver implementada e testada, e retirá-la depois é uma decisão registrada. A nota
de RA-19 não aparece quando a pessoa informou o período atual.

## Limites conhecidos

- **RA-02.** Alternativas de requisito (8 códigos-base no SIGA) e equações curriculares não estão no
  currículo codificado. Uma pessoa com uma alternativa reconhecida pode ver um aviso de requisito indevido.
- **RA-10.** As exceções do art. 47, parágrafo único, não são aplicadas. A Grade alerta e deixa a decisão com
  a coordenação.
- **RA-14.** O limite de 25% não é modelado. A aplicabilidade a equivalências dentro do próprio curso está por
  confirmar.
- **RA-15.** O prazo do pedido de dispensa não gera aviso.
- **RA-18.** O prazo máximo de integralização e o limite de 15 segmentos não geram aviso.
- **RA-20.** A ausência de uma disciplina no Notion não prova que ela não será ofertada. O formato atual não
  representa turmas alternativas da mesma disciplina, e juntá-las pode inventar um choque de horário. A fonte
  não é oficial.

## Consultas pendentes à coordenação

Perguntas que as fontes não respondem. Elas **não bloqueiam** a publicação; a Grade já avisa onde há dúvida.

1. **Carga horária.** A comissão de dispensa da ECI tem ato com percentual de carga horária? (RA-11)
2. **Livre escolha no BOA.** Depois do deferimento, como o SIGA trata a origem: o crédito sai da livre escolha
   ou continua contado? E isso muda na colação? (RA-13)
3. **Reingresso.** Qual é a data base do prazo de 5 anos e quem reconhece as exceções do art. 47? (RA-21, RA-10)
4. **Limite de 25%.** Vale para eletivas do próprio curso e qual é o denominador? (RA-14)
5. **Prazos.** Como se aplicam o prazo do pedido, os trancamentos e as prorrogações, e o limite de segmentos?
   (RA-15, RA-18)
6. **Duas dispensas pela mesma origem.** O SIGA concede de fato? (RA-08)
7. **Alternativas de requisito.** Quais o SIGA reconhece em cada um dos 8 códigos-base? (RA-02)
8. **Oferta.** Existe fonte oficial de turmas por semestre que a Grade possa citar? (RA-20)
