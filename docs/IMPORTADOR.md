# Importador do SIGA

Gera o perfil a partir dos PDFs que todo aluno baixa no SIGA: **Histórico** e **BOA**.
É **determinístico**: os mesmos PDFs sempre geram o mesmo perfil, sem IA e sem edição manual.

## Duas formas de usar (mesmas regras)

| Onde | Como | Arquivo |
|---|---|---|
| Navegador | **Importar do SIGA** (no topo enquanto não há perfil; sempre em Configurações e fixável na barra) → escolher os PDFs → **Gerar perfil** → conferir a prévia → **Usar este perfil** | `js/siga.js` + pdf.js (`js/vendor/`) |
| Terminal | `pip install pypdf` e `python ferramentas/gerar_perfil.py --historico historico.pdf --boa boa.pdf -o perfil/perfil.js` | `ferramentas/gerar_perfil.py` |

Mudou de curso? Passe os dois históricos (`--historico anterior.pdf --historico atual.pdf`, ou selecione os
dois no navegador). Para manter planos, pedidos, extensão e tags, use `--mesclar perfil/perfil.js`
(o navegador mescla automaticamente com o perfil em uso).

## Passo a passo das regras

1. **Linhas**: pdf.js agrupa por posição e pypdf usa `extraction_mode="layout"`. Os dois leitores
   decodificam a página em memória. O filtro conserva as linhas acadêmicas e a data de emissão do BOA.
2. **Histórico** (`lerHistorico`): cada linha `[período] CÓDIGO Nome CrR CH Grau CrO Pontos SF` vira um registro.
   Um período só com ano (ex.: `2025`) é o bloco de **créditos transferidos**. Grau `T` = dispensa; a linha
   seguinte "Disciplina origem da Dispensa: CÓDIGO …" diz qual disciplina gerou a dispensa.
3. **BOA** (`lerBOA`): data de emissão; disciplinas **Cursando**; equivalências automáticas
   (linha `COS231 … EEL470 …` = EEL470 vale COS231); **Cursadas e Não Explicitadas**; **Frequência de reprovações**.
4. **Montagem** (`montarPerfil`):
   1. junta os históricos; um registro do bloco de transferidos que também aparece num semestre real fica só no semestre;
   2. dispensas são associadas à origem aprovada quando ela consta nos documentos. Quando a origem
      está ausente, a disciplina dispensada entra como aprovação com grau `T`;
   3. equivalências do BOA viram `equivale`;
   4. reprovações do BOA entram como `status: "reprovado"` no período indicado (o Histórico só lista aprovações);
      períodos `AAAA/0` são ignorados;
   5. o período atual é o semestre seguinte ao último do histórico, com as disciplinas "Cursando"
      (atividades ACE vão para `extensao`);
   6. mescla com o perfil anterior: títulos, pedidos, extensão, tags e períodos planejados. Preserva
      horários e status das disciplinas que continuam no período atual. Sem BOA, mantém o período atual
      anterior quando seu semestre é posterior ao último semestre do Histórico.

As expressões regulares estão no objeto `RE` de `js/siga.js` e no dicionário `RE` de `gerar_perfil.py`.

## Prévia no navegador (antes de usar o perfil)

A prévia fica no app (`js/app.js`), fora das regras compartilhadas: não muda o que `js/siga.js` e `gerar_perfil.py` produzem.

- **Período atual sugerido** (só com BOA): a prévia mantém o semestre atual anterior se ele ainda vier depois do Histórico.
  Caso contrário, sugere o semestre seguinte ao último semestre real do Histórico. A pessoa pode corrigir
  (`AAAA/1` ou `AAAA/2`) ou deixar em branco, e o período fica sem data (`"atual"`). Se o BOA tiver a mesma data de
  emissão da importação anterior, a prévia mantém o período sem data. Um semestre que já existe como período cursado
  ou planejado é sinalizado.
- **Horários e status:** se o período escolhido for o mesmo do perfil anterior, a prévia mantém as anotações das
  disciplinas que continuam no período atual.
- **Planos preservados:** `montarPerfil` deixa de fora os planejados até o semestre inferido. A prévia guarda esses planos
  e os devolve, em ordem cronológica, depois da escolha do período atual. Exemplo: com o atual corrigido de `2026/2` para
  `2027/1`, o plano de `2026/2` volta com disciplinas e horários.
- **Colisões:** se um plano coincide com o período atual escolhido ou com um semestre do Histórico, a prévia mostra a
  colisão e pede **“Substituir esse plano pelos dados do SIGA”**. A confirmação vale só para o conjunto de planos que a
  pessoa viu: se o conjunto mudar (por exemplo, ao trocar o semestre atual), a marcação sai.
- **Usar este perfil** e **Baixar perfil.js** usam a mesma validação: ficam desabilitados e também recusam o clique
  enquanto houver conflito.
- Se o perfil, o planejamento, as marcações ou as tags mudarem depois de gerar a prévia, gere uma nova prévia
  para aplicar ou baixar o perfil com os dados atualizados.
- **Descartar prévia** (ou fechar o painel) não altera o perfil salvo. Baixar o arquivo também não.

## Teste de paridade

```bash
bash ferramentas/testar_paridade.sh historico_anterior.pdf historico.pdf boa.pdf [perfil/perfil.js]
```

Compara o perfil em duas etapas. Primeiro, as duas implementações recebem o texto filtrado
pelo pypdf. Depois, o Node extrai os mesmos PDFs com o PDF.js que o navegador usa e o teste
compara o perfil com a saída do Python. As linhas extraídas podem variar entre os leitores.
Requer Python com pypdf e Node. No Git Bash, defina `GRADE_PYTHON` se o executável do Python
tiver outro nome ou caminho.

Os PDFs fictícios de **A ECI por trás da Grade** (`js/demo-pdf.js`) também passam no teste. A saída Python mostrada na
experiência de EEL873 é **pré-computada** com `gerar_perfil.py` e fica no mesmo arquivo (`window.DEMO_PARIDADE`).
Se as regras mudarem, gere de novo esse arquivo com `python ferramentas/gerar_demo_pdf.py` (requer pypdf).

## Limitações conhecidas

- Reprovações com período `AAAA/0` (transferência) não têm semestre real e ficam de fora.
- Dispensas (`T`) são registradas sem nota numérica.
- Quando o BOA lista uma atividade em curso como `NCC` e o código está fora do currículo e
  do catálogo, o importador sinaliza a atividade para conferência antes de classificá-la como ACE.
- Uma linha fora do formato (por exemplo, sem as colunas CrO e Pontos) é ignorada **sem aviso** pelas duas implementações.
  O teste de paridade não pega esse caso, porque as duas erram igual. A experiência de EEL873 mostra o exemplo.
- Se o SIGA mudar o layout dos PDFs, ajuste as expressões em `RE` (nos dois arquivos) e rode o teste.

## Privacidade

Tudo roda localmente. Nome, matrícula, CPF, RG, filiação e endereço dos cabeçalhos são descartados
antes da montagem do perfil.
