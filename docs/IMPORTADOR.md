# Importador do SIGA

Gera o perfil a partir dos PDFs que todo aluno baixa no SIGA: **Histórico** e **BOA**.
É **determinístico**: os mesmos PDFs sempre geram o mesmo perfil, sem IA e sem edição manual.

## Duas formas de usar (mesmas regras)

| Onde | Como | Arquivo |
|---|---|---|
| Navegador | Botão **⤓ Importar do SIGA** → escolher os PDFs → **Usar este perfil** | `js/siga.js` + pdf.js (`js/vendor/`) |
| Terminal | `pip install pypdf` e `python ferramentas/gerar_perfil.py --historico historico.pdf --boa boa.pdf -o perfil/perfil.js` | `ferramentas/gerar_perfil.py` |

Mudou de curso? Passe os dois históricos (`--historico anterior.pdf --historico atual.pdf`, ou selecione os
dois no navegador). Para manter planos, pedidos, extensão e tags, use `--mesclar perfil/perfil.js`
(o navegador mescla automaticamente com o perfil em uso).

## Passo a passo das regras

1. **Linhas**: cada página vira linhas de texto (pdf.js agrupa por posição respeitando páginas giradas;
   pypdf usa `extraction_mode="layout"`). Espaços repetidos viram um.
2. **Histórico** (`lerHistorico`): cada linha `[período] CÓDIGO Nome CrR CH Grau CrO Pontos SF` vira um registro.
   Um período só com ano (ex.: `2025`) é o bloco de **créditos transferidos**. Grau `T` = dispensa; a linha
   seguinte "Disciplina origem da Dispensa: CÓDIGO …" diz qual disciplina gerou a dispensa.
3. **BOA** (`lerBOA`): data de emissão; disciplinas **Cursando**; equivalências automáticas
   (linha `COS231 … EEL470 …` = EEL470 vale COS231); **Cursadas e Não Explicitadas**; **Frequência de reprovações**.
4. **Montagem** (`montarPerfil`):
   1. junta os históricos; um registro do bloco de transferidos que também aparece num semestre real fica só no semestre;
   2. dispensas viram `dispensa: [...]` na disciplina de origem;
   3. equivalências do BOA viram `equivale`;
   4. reprovações do BOA entram como `status: "reprovado"` no período indicado (o Histórico só lista aprovações);
      períodos `AAAA/0` são ignorados;
   5. o período atual é o semestre seguinte ao último do histórico, com as disciplinas "Cursando"
      (atividades ACE vão para `extensao`);
   6. mescla com o perfil anterior: títulos, pedidos, extensão, tags, horários do período atual e períodos planejados.

As expressões regulares estão no objeto `RE` de `js/siga.js` e no dicionário `RE` de `gerar_perfil.py`.

## Teste de paridade

```bash
bash ferramentas/testar_paridade.sh historico_anterior.pdf historico.pdf boa.pdf [perfil/perfil.js]
```

Extrai o texto uma vez e confere se o Python e o JavaScript geram **o mesmo** perfil.
Rode sempre que mudar uma regra. (Requer Python com pypdf e Node.)

## Limitações conhecidas

- Reprovações com período `AAAA/0` (transferência) não têm semestre real e ficam de fora.
- Notas de disciplinas dispensadas (`T`) não existem; elas aparecem como dispensa na origem.
- Se o SIGA mudar o layout dos PDFs, ajuste as expressões em `RE` (nos dois arquivos) e rode o teste.

## Privacidade

Nenhuma regra lê nome, matrícula, CPF, RG, filiação ou endereço. Tudo roda localmente.
