# Importador do SIGA

**Pergunta que este documento responde:** como os PDFs do SIGA viram um perfil e o que fazer quando algo não bate.
O formato do arquivo gerado: [PERFIL.md](PERFIL.md). As regras acadêmicas por trás das escolhas:
[REGRAS-ACADEMICAS.md](REGRAS-ACADEMICAS.md). O caso de uso completo, com falhas e alternativas:
[REQUISITOS.md](REQUISITOS.md#3-caso-de-uso-importar-do-siga).

O importador gera o perfil a partir dos PDFs que todo aluno baixa no SIGA: **Histórico** e **BOA** (Boletim de
Orientação Acadêmica). Ele é **determinístico**, sem IA e sem edição manual, nos limites descritos abaixo.

## Duas formas de usar (mesmas regras)

| Onde | Como | Arquivo |
| --- | --- | --- |
| Navegador | **Importar do SIGA** (no topo enquanto não há perfil; sempre em Configurações e fixável na barra) → escolher os PDFs → **Gerar perfil** → conferir a prévia → **Usar este perfil** | `js/siga.js` + pdf.js (`js/vendor/`) |
| Terminal | `pip install pypdf` e `python ferramentas/gerar_perfil.py --historico historico.pdf --boa boa.pdf -o perfil/perfil.js` | `ferramentas/gerar_perfil.py` |

Mudou de curso? Passe os dois históricos (`--historico anterior.pdf --historico atual.pdf`, ou selecione os dois no
navegador). Para manter planos, pedidos, extensão e tags, use `--mesclar perfil/perfil.js` (o navegador mescla
automaticamente com o perfil em uso).

## Opções do terminal

| Opção | Para quê | Obrigatória? |
| --- | --- | --- |
| `--historico ARQ` | PDF do Histórico. Repita para mais de um curso | Ao menos um `--historico` ou um `--boa` |
| `--boa ARQ` | PDF do BOA | Não. Sem BOA não há período atual criado a partir do boletim e o segundo número da livre escolha fica indisponível |
| `--atual ARQ` | Qual dos `--historico` é o do curso atual. Vale mais que a regra automática | Só quando há dúvida (abaixo) |
| `--mesclar PERFIL` | Perfil existente: preserva planos, pedidos, extensão, tags e textos | Não |
| `--curso N` | Índice do curso em `js/database.js` (ECI = 1, o padrão) | Não |
| `-o ARQ` | Grava o perfil no arquivo. Sem ele, imprime na tela | Não |
| `--hoje AAAA-MM-DD`, `--json`, `--texto` | Para teste: data fixa, JSON puro e arquivos `.txt` já extraídos | Não |

`ferramentas/gerar_perfil_node.js` roda as mesmas regras do navegador (`js/siga.js`) no Node. Ele existe para o teste
de paridade, não para uso diário.

### Códigos de saída

| Código | Significado |
| --- | --- |
| `0` | Perfil gerado |
| `2` | **Sem escolha do histórico atual**: há mais de um histórico e as datas não permitem decidir. Nada é gravado e a mensagem, fixa e sem dados do documento, pede `--atual <arquivo>`. O Python usa o mesmo código para argumentos inválidos (por exemplo, `--atual` que não é um dos `--historico`) |
| `1` | Demais falhas (dependência ausente, arquivo ilegível, erro de leitura) |

## Qual é o histórico do curso atual

Com mais de um histórico, o prazo de 5 anos depende de saber qual deles é o do curso atual
([PC-05](DECISOES.md#pc-05--qual-é-o-histórico-do-curso-atual), regra RA-21).

1. **Escolha explícita** (prévia ou `--atual`): vale sempre e fica registrada em `fonte.historicoAtual = "escolhido"`.
2. **Automático**: o atual é o de data mais recente, considerando o semestre real mais recente e o ano do bloco de
   transferidos. O perfil registra `"automatico"`.
3. **Dúvida**: empate, datas que não permitem decidir, ou um dos históricos reconhecidos sem datas utilizáveis. A
   Grade **pergunta**: a prévia não marca opção, desativa **Usar este perfil** e **Baixar perfil.js** até a escolha
   e mantém a nota de estimativa do prazo; o terminal sai com código `2`. O perfil gerado **nunca** grava "dúvida".

Um único histórico reconhecido, mesmo sem datas, não é dúvida. A escolha entra no cálculo como qualquer outra
entrada: trocar a escolha na prévia recalcula o perfil, os planos que ficam de fora e as colisões, e **Usar** e
**Baixar** passam pela mesma validação.

## Determinismo

O mesmo conjunto de arquivos, o mesmo perfil anterior (`--mesclar`), as mesmas opções (`--atual`, `--curso`), o mesmo
relógio e a mesma versão do importador produzem os mesmos dados. Em particular, **a ordem dos arquivos não muda o
resultado** (caso [06l](REQUISITOS.md#rf-06--importação-do-siga-ra-05-ra-06-ra-17-ra-19-ra-21)).

Pontos de atenção:

- `fonte.geradoEm` é **metadado**: usa o relógio (ou `--hoje`) e muda a cada importação sem mudar os dados.
  `fonte.geradoPor` carrega a versão do importador.
- O relógio **não** entra em mais nada do importador. O prazo de 5 anos é calculado depois, na interface, com a data
  do navegador.
- As **extrações** de texto do pdf.js (navegador) e do pypdf (terminal) podem diferir em linhas isoladas. O teste de
  paridade compara os dois nos conjuntos fictícios; ele não prova igualdade para qualquer PDF.
- Com dois históricos, a data original de uma disciplina transferida vira `aprovadaEm`: rege pré e co-requisitos e a
  posição na Linha do tempo (D-08); o prazo de 5 anos usa o ano do bloco do histórico atual ([PERFIL.md](PERFIL.md)).

## Passo a passo das regras

1. **Linhas**: pdf.js agrupa por posição e pypdf usa `extraction_mode="layout"`. Os dois leitores decodificam a
   página em memória. O filtro conserva as linhas acadêmicas e a data de emissão do BOA.
2. **Histórico** (`lerHistorico`): cada linha `[período] CÓDIGO Nome CrR CH Grau CrO Pontos SF` vira um registro.
   Um período só com ano (ex.: `2025`) é o bloco de **créditos transferidos**. Grau `T` = dispensa; a linha seguinte
   "Disciplina origem da Dispensa: CÓDIGO …" diz qual disciplina gerou a dispensa.
3. **BOA** (`lerBOA`): data de emissão; disciplinas **Cursando**; equivalências automáticas (linha
   `COS231 … EEL470 …` = EEL470 vale COS231); **Cursadas e Não Explicitadas** (e se a seção existe, mesmo vazia);
   **Frequência de reprovações**. O importador **não** lê a linha de total do BOA.
4. **Montagem** (`montarPerfil`):
   1. escolhe o histórico do curso atual (seção anterior) e junta os históricos. Um registro do bloco de
      transferidos que também aparece num semestre real fica só no semestre, **exceto** quando o bloco é do
      histórico atual: aí o bloco vale (prazo por ano) e o semestre real do outro histórico vira `aprovadaEm`.
      Entre blocos do mesmo registro vale um só, escolhido pelos dados e não pela ordem dos arquivos;
   2. dispensas são associadas à origem aprovada quando ela consta nos documentos. O alvo conta como está no
      histórico e a origem não soma de novo. Alvo fora do catálogo vai como objeto `{code, name, credits, category}`;
      quando a origem está ausente, a disciplina dispensada entra como aprovação com grau `T`;
   3. equivalências do BOA viram `equivale`;
   4. reprovações do BOA entram como `status: "reprovado"` no período indicado (o Histórico só lista aprovações);
      períodos `AAAA/0` não são semestres reais;
   5. o período atual é o semestre seguinte ao último do histórico, com as disciplinas "Cursando" (atividades ACE vão
      para `extensao`);
   6. mescla com o perfil anterior: títulos, pedidos, extensão, tags e períodos planejados. Preserva horários e
      status das disciplinas que continuam no período atual. Sem BOA, mantém o período atual anterior quando seu
      semestre é posterior ao último semestre do Histórico.

As expressões regulares estão no objeto `RE` de `js/siga.js` e no dicionário `RE` de `gerar_perfil.py`.

## Prévia no navegador (antes de usar o perfil)

A prévia fica no app (`js/app.js`). As regras continuam nos dois importadores; a prévia guarda as escolhas da pessoa
e as repassa a eles.

- **Histórico do curso atual**: com dois ou mais históricos, a prévia mostra o resumo de cada um (último semestre
  real, bloco de transferidos, número de registros). Se o automático decidiu, a opção vem marcada com "Reconhecido
  pela data mais recente. Se não for este, escolha o outro." Em dúvida, nenhuma vem marcada.
- **Período atual sugerido** (só com BOA): a prévia mantém o semestre atual anterior se ele ainda vier depois do
  Histórico. Caso contrário, sugere o semestre seguinte ao último semestre real do Histórico. A pessoa pode corrigir
  (`AAAA/1` ou `AAAA/2`) ou deixar em branco, e o período fica sem data (`"atual"`). Só a prévia (não o terminal) marca `deduzido: true`, e só
  quando o semestre sugerido é real; a marca é mantida ao reimportar no mesmo semestre. Se o BOA tiver a mesma data de
  emissão da importação anterior, a prévia mantém o período sem data. Um semestre que já existe como período cursado
  ou planejado é sinalizado.
- **Horários e status:** se o período escolhido for o mesmo do perfil anterior, a prévia mantém as anotações das
  disciplinas que continuam no período atual.
- **Planos preservados:** `montarPerfil` deixa de fora os planejados até o semestre inferido. A prévia guarda esses
  planos e os devolve, em ordem cronológica, depois da escolha do período atual. Exemplo: com o atual corrigido de
  `2026/2` para `2027/1`, o plano de `2026/2` volta com disciplinas e horários.
- **Colisões:** se um plano coincide com o período atual escolhido ou com um semestre do Histórico, a prévia mostra a
  colisão e pede **“Substituir esse plano pelos dados do SIGA”**. A confirmação vale só para o conjunto de planos que
  a pessoa viu: se o conjunto mudar (ao trocar o semestre atual **ou o histórico atual**), a marcação sai e é preciso
  confirmar de novo.
- **Usar este perfil** e **Baixar perfil.js** usam a mesma validação: ficam desabilitados e também recusam o clique
  enquanto houver conflito ou dúvida sem escolha.
- Se o perfil, o planejamento, as marcações ou as tags mudarem depois de gerar a prévia, gere uma nova prévia para
  aplicar ou baixar o perfil com os dados atualizados.
- **Descartar prévia** (ou fechar o painel) não altera o perfil salvo. Baixar o arquivo também não.

## Teste de paridade

O teste compara as regras JavaScript e Python sobre o mesmo texto e os perfis gerados com leitores independentes
(pdf.js e pypdf). Marque o histórico do curso atual com `--atual` antes do PDF correspondente, como no terminal. Os
**oráculos** (`testes/importador.py`) confrontam as duas saídas com perfis esperados escritos à mão: a paridade só
acusa divergência entre as duas implementações, e um erro compartilhado exige um oráculo. Comandos, instalação e o
procedimento completo estão em [testes/README.md](../testes/README.md); a política (quando rodar) está em
[CONTRIBUTING.md](../CONTRIBUTING.md).

Os PDFs fictícios de **A ECI por trás da Grade** (`js/demo-pdf.js`) também passam no teste. A saída Python mostrada na
experiência de EEL873 é **pré-computada** com `gerar_perfil.py` e fica no mesmo arquivo (`window.DEMO_PARIDADE`). Se as
regras mudarem, gere de novo esse arquivo com `python ferramentas/gerar_demo_pdf.py` (requer pypdf).

## Limitações conhecidas

- **O SIGA pode mudar o layout dos PDFs.** O importador lê o texto com expressões regulares: um novo layout pode
  fazer a leitura **falhar ou omitir linhas**. Confira o resultado na prévia e, ao suspeitar, reproduza com um PDF
  fictício no novo layout e ajuste as expressões nos **dois** importadores ([MANUTENCAO.md](MANUTENCAO.md)).
- Uma linha acadêmica reconhecível que está fora do formato (por exemplo, sem as colunas CrO e Pontos) não é lida. A
  prévia avisa com a contagem ("N linha(s) do Histórico não puderam ser lidas; confira a lista antes de usar o
  perfil."), sem mostrar trechos do documento, e o script em Python avisa o mesmo no stderr. A disciplina da linha
  não entra no perfil. O teste de paridade não pega esse caso, porque as duas erram igual; o aviso cobre.
- A importação cobre a estrutura suportada: Histórico e BOA no formato atual do SIGA.
- Reprovações com período `AAAA/0` (transferência) não têm semestre real e ficam de fora.
- Dispensas (`T`) são registradas sem nota numérica.
- Quando o BOA lista uma atividade em curso como `NCC` e o código está fora do currículo e do catálogo, o importador
  sinaliza a atividade para conferência antes de classificá-la como ACE. No terminal, o Python imprime o código dessa
  atividade no `stderr`, o que é uma limitação conhecida (está no backlog de [MANUTENCAO.md](MANUTENCAO.md)).
- A soma das não explicitadas do BOA é uma **estimativa**: o importador não lê o total oficial.

## Privacidade

Tudo roda localmente. Nome, matrícula, CPF, RG, filiação e endereço dos cabeçalhos são descartados antes da
montagem do perfil. Detalhes em [PRIVACIDADE.md](PRIVACIDADE.md).
