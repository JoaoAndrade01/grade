# Manutenção da Grade ECI

**Pergunta que este documento responde:** como manter a Grade certa depois da publicação.
Os comandos dos testes estão em [testes/README.md](../testes/README.md); o procedimento de publicar está em
[PUBLICAR.md](PUBLICAR.md). As regras que o currículo alimenta estão em
[REGRAS-ACADEMICAS.md](REGRAS-ACADEMICAS.md).

## Guia semestral

Faça uma vez por semestre, antes de as inscrições abrirem. Quem mantém a Grade confere as fontes; outra pessoa
revisa o diff do Pull Request, sempre que houver alguém para isso.

| Fonte | Arquivo | Onde fica a data | Quem confere |
| --- | --- | --- | --- |
| Horários de referência (Notion, "Grades de ECI") | `js/horarios.js` | campo `consultado` | quem mantém |
| Guia dos alunos (Notion) | `js/guia.js` | campo `consultado` | quem mantém |
| Currículo e catálogo de eletivas (SIGA) | `js/database.js`, `js/optativas.js` | `consultado` em `js/database.js`, mostrado no rodapé como "Currículo conferido no SIGA em AAAA-MM-DD" | quem mantém |
| Formato dos PDFs do SIGA (Histórico e BOA) | `js/siga.js` e `ferramentas/gerar_perfil.py` | — | quem mantém, a partir de relatos |

### Horários e guia do Notion

Estas duas fontes são **não oficiais**, mantidas por alunos. A Grade avisa disso na interface.

1. **Abra a página** e anote a **data editorial**: o dia em que alguém conferiu os dados. A data da última
   edição da página não serve.
2. **Atualize os dois arquivos juntos** (`js/horarios.js` e `js/guia.js`), no formato atual, e ponha a data
   editorial em `consultado` (AAAA-MM-DD). Horário usa o formato `ter 10-12` (dia com 3 letras, hora de início
   e fim). Um arquivo atualizado sem o outro deixa a Grade incoerente.
3. **Use só turmas com oferta confirmada.** Use uma edição de referência conferida para cada paridade (ímpar
   e par). Registre o semestre exato de cada edição, sem misturar anos no mesmo mapa. Uma turma "a confirmar"
   fica de fora. Se a mesma disciplina tiver turmas alternativas com horários incompatíveis, escolha uma
   referência e registre; juntar as duas pode inventar um choque de horário.
4. **Registre a procedência de cada exceção.** Um código que não está no currículo nem no catálogo só entra se
   tiver uma exceção justificada, com **origem**, **motivo** e **efeito no cálculo**. Não renomeie um código
   por aproximação.
5. **Valide.** Rode o validador dos dados de referência (RF-17), que faz parte do kit de testes. Ele confere o
   formato, os códigos, as duplicatas e lista as turmas sem código. Depois rode a matriz do kit.
6. **Compare o diff.** Confira que só mudaram os horários esperados. Desconfie de remoção em massa, de
   disciplina que trocou de paridade e de código novo.
7. **Guarde o último par bom.** Registre no Pull Request o hash do último par validado, para poder voltar.
   O commit anterior à troca só serve de referência se tiver passado pelo validador.

**Se a fonte sumir** (página apagada, sem acesso ou estrutura mudada): não apague os arquivos nem os esvazie.
Mantenha o último par bom. A nota da Grade já mostra a data da consulta e diz que os horários podem mudar.
Se a fonte não voltar no semestre seguinte, avise no README e siga "Se o projeto parar ou o currículo mudar".

**Identificação das turmas sem código (conferida no Notion em 2026-11-26):** "Comp 3 (condicionada)" é a COS013
(Tóp. Esp. em Eng. de Computação e Informação) e passou a usar o código nos horários e no guia. Seguem como exceção
justificada, só como informação: EET100 (Tecnologia e Desenvolvimento Social, disciplina de outro curso); EEL891
(Introdução ao Aprendizado de Máquina, que costuma ser aproveitada como Tóp. Esp. em IA, COS623, por pedido de
equivalência; a Grade não afirma a equivalência); "Tóp. Ciência de Dados: Estrutura de Dados" e "Mapas (livre
escolha)" (sem código no SIGA); e "Grafos de Interseção (mestrado)" (disciplina de mestrado).

**Exceções do validador.** Cada exceção declara origem, motivo e efeito ([PUB-10](DECISOES.md#pub-10--exceções-do-validador-aviso-por-fonte-e-efeito-somente-informativo)).
Uma exceção sem uso gera aviso por fonte; **remova as exceções vencidas na revisão semestral**.

### Currículo do SIGA

1. Abra a [distribuição curricular de ECI](https://siga.ufrj.br/sira/repositorio-curriculo/distribuicoes/A46B41C8-92A4-F79C-7383-BE627D84214E.html).
2. Compare, por código, semestre, créditos, carga horária e requisitos P e C, os componentes de
   `js/database.js`. Confira os totais (226 cr e 405 h de ACE) e o catálogo de `js/optativas.js`.
3. Se algo mudou, **valide antes de trocar**: códigos, grupos, requisitos e se os perfis de exemplo em
   `testes/fixtures` continuam compatíveis.
4. Atualize `consultado` com a data da conferência. Ela vai para o rodapé.
5. Rode a matriz e a paridade (veja abaixo).

A conferência de 2026-11-26 e o que ela não cobre estão em [REGRAS-ACADEMICAS.md](REGRAS-ACADEMICAS.md#fontes).

### Formato dos PDFs do SIGA

O importador lê o texto dos PDFs com expressões regulares (`RE`), nos dois leitores. Se o SIGA mudar o layout, a
importação passa a falhar ou a ignorar linhas. O sinal costuma ser um relato de aluno.

1. Peça o relato sem anexos: o PDF **não** deve ir para a Issue.
2. Reproduza com um PDF **fictício** no novo layout (ver `testes/fixtures`).
3. Ajuste as expressões nos **dois** importadores e rode a paridade e o oráculo.

## Quais testes rodar

Comandos e instalação: [testes/README.md](../testes/README.md).

| Mudança | O que rodar |
| --- | --- |
| Horários ou guia | Validador dos dados de referência e matriz do kit |
| Currículo ou catálogo | Matriz do kit e paridade |
| Importador (`js/siga.js`, `ferramentas/gerar_perfil.py`) | Paridade JS × Python, oráculo e matriz |
| Interface ou regras de crédito | Matriz do kit (seis pares de navegador e modo de abertura) |
| Documentos | Conferir os links relativos |

Para defeitos, siga o procedimento de [CONTRIBUTING.md](../CONTRIBUTING.md#corrigir-um-defeito-vermelho--verde).
Para comandos, use [testes/README.md](../testes/README.md). Uma falha intermitente de aceitação não se resolve
com um rerun verde.

## Backlog e dívida

Itens para depois da publicação. A ordem é a de prioridade dentro de cada grupo; o backlog guarda a ordem, e o aceite de cada item com requisito está no requisito.

### Qualidade e processo

| # | Item | Critério de pronto |
| --- | --- | --- |
| 1 | CI mínima: paridade e kit em um motor a cada push | Ver RNF-12 em [REQUISITOS.md](REQUISITOS.md#5-requisitos-não-funcionais) |
| 2 | Testes de unidade das regras de crédito: extrair funções puras de `js/app.js`, uma a uma | Cada regra extraída com teste, coberta pelos casos de [REQUISITOS.md](REQUISITOS.md), sem mudar comportamento |
| 3 | PR ao Grêmio com as correções de `js/database.js` e conversa sobre manutenção conjunta | PR aberto em [`gremio-eci/grade`](https://github.com/gremio-eci/grade) |
| 4 | Passada com leitor de tela (NVDA) e com teclado no Safari, no fluxo principal. Inclui Tab e Option+Tab nos links no Safari do Mac e no iPhone real (o WebKit do Playwright no Windows não alcança links; [PLANO-DE-TESTE.md](PLANO-DE-TESTE.md#6-limite-do-ambiente-webkit)) | Problemas registrados por severidade |
| 5 | Atualização do PDF.js (hoje 3.11.174). Manter a biblioteca e o worker na mesma versão e preservar `isEvalSupported: false` ([aviso de segurança](https://github.com/mozilla/pdf.js/security/advisories/GHSA-wgrm-67xf-hhpq)) | Importação local por HTTP e `file://`, paridade com PDFs fictícios, CSP e nenhuma requisição externa |
| 6 | Inventário de dependências: nome, versão, origem, licença, onde roda e como atualizar; separar as do app e as dos testes | Para cada uma, é possível saber onde roda e quais testes rodar ao atualizar |
| 7 | Teste de usabilidade com 3 a 5 colegas em 3 ou 4 tarefas, com observação sem ajuda | Problemas registrados por severidade e ligados à história; os bloqueantes viram correção |
| 8 | Discussions no GitHub, quando houver colaboradores, com aviso fixo contra dados pessoais | Categorias Ideias, Perguntas e Anúncios |
| 9 | Refatoração de `js/app.js`, só depois dos testes de unidade | Métricas melhoram sem mudar comportamento |
| 10 | Cobertura estrutural e mutação, depois dos testes de unidade | A definir |
| 11 | O CLI Python imprime no `stderr` o código de uma disciplina fora do catálogo | Mensagem sem dados do documento; caso de teste cobre a saída |
| 12 | Conferir nomes sem código entre o guia e os horários, junto da automação do Notion | O validador avisa quando uma mesma exceção declara as duas fontes e só uma contém o nome |
| 13 | Melhorias de UX da inspeção: indicar como consultar requisitos sem marcar a Grade; explicar quando guardar a cópia do perfil, o que ela inclui e como recuperar; explicitar o recorte de cada filtro de Optativas e o sentido do selo "inativa"; explicar a lista do BOA e aproximar o motivo da duplicidade do total de ACE | Cada uma verificada no fluxo da história correspondente |

### Produto

| # | Item | Critério de pronto |
| --- | --- | --- |
| 1 | **Aviso de dado desatualizado**, o primeiro item de produto (a previsão de formatura já está em [RF-19](REQUISITOS.md#rf-19--previsão-de-formatura-calculada-h4)) | Ver [RF-18](REQUISITOS.md#rf-18--aviso-de-dado-desatualizado-h14--planejado) |
| 2 | Marcar atividades de extensão como distintas; a implementação está pronta numa branch de trabalho | Ver o caso 01g em [RF-01](REQUISITOS.md#rf-01--progresso-por-grupo-ra-01-ra-05-ra-06-ra-16); revisão e integração na versão seguinte |
| 3 | Melhorias de optativas e perfil: filtro "só liberadas" com elegibilidade por semestre planejado; data de consulta do guia no detalhe; prévia antes de aplicar um perfil pronto | Casos próprios em RF-11 e RF-12, vermelho → verde |
| 4 | Aviso de plano num período que já passou também com o período atual sem semestre (poucos alunos, custo baixo) | Caso próprio em RF-19, vermelho → verde |
| 5 | Disciplina fora do catálogo que aparece em dois períodos com créditos diferentes: a soma pode usar um ou outro valor conforme a ordem dos períodos (poucos alunos, custo médio) | Regra fixa para escolher a ocorrência, sem mudar a fonte nem tirar da conta o que não deve sair; caso próprio nas duas ordens, vermelho → verde |
| 6 | Duas aprovações do mesmo código no mesmo semestre podem variar conforme a ordem (poucos alunos, custo médio) | Caso próprio no teste de invariância, vermelho → verde |
| 7 | Equivalências encadeadas: data, fonte e créditos coerentes quando uma equivalência é origem de outra, inclusive com a do meio confirmada pelo SIGA; sinalizar o pedido que usa a própria pedida e nomear o ciclo no aviso (poucos alunos, custo alto) | Casos próprios em RF-21 e no teste de invariância, vermelho → verde; sair das limitações conhecidas de PC-14 |
| 8 | Automação com o Notion, combinada com os autores | Ver [RF-15](REQUISITOS.md#rf-15--sincronização-dos-dados-do-notion-h16--planejado), RNF-11 e RNF-13 |
| 9 | Atualização do currículo a partir do SIGA | Ver [RF-16](REQUISITOS.md#rf-16--atualização-do-currículo-a-partir-do-siga-h14--planejado) |
| 10 | Novas experiências de "A ECI por trás da Grade", nesta ordem: diagrama vivo da arquitetura (EEL873), depois COS231 (choques de horário) | Ver [RF-13](REQUISITOS.md#rf-13--a-eci-por-trás-da-grade-h12) |
| 11 | Procedimentos de estágio, equivalência e ACE | Ver [RF-09](REQUISITOS.md#rf-09--procedimentos-de-estágio-equivalência-e-ace-planejado) |

**Fora, de propósito:** análise de uso (analytics), por causa da condição 1 de privacidade.

## Se o projeto parar ou o currículo mudar

**Responsável:** quem mantém a Grade na hora. Hoje é o mantenedor atual.

**Gatilhos**

- o mantenedor sai e não há substituto;
- um semestre passa sem conferência das fontes (currículo, horários, guia);
- o currículo muda de forma incompatível com o que está codificado.

**Passos**

1. **Ao mudar o currículo**, valide códigos, grupos, requisitos e a compatibilidade dos perfis antes de
   trocar a referência.
2. **Procure continuidade.** Primeiro com o Grêmio ECI (`gremio-eci/grade`); depois com alunos de ECI, por uma
   Issue fixada pedindo quem queira manter.
3. **Se ninguém assumir:** publique um aviso no README e no rodapé, com a **data da última conferência** e as
   instruções para **exportar o perfil**. Decida entre manter, arquivar ou suspender a publicação e registre o
   motivo em [DECISOES.md](DECISOES.md).

## Métricas

**O que mede.** Tamanho e complexidade do código do app, para saber se a manutenção está ficando mais difícil e se uma
refatoração futura (depois dos testes de unidade) melhora algo. É uma **linha de base**, não um limiar de aceite:
nenhuma versão é recusada por causa dela, e o limite de complexidade 10 (padrão do ESLint) serve só de referência.

**Como medir** (repita a cada versão):

- **Ferramenta:** ESLint em **versão fixa** (`9.39.5`), rodado numa **cópia fora do repositório** e **sem
  `package.json`** no projeto. Trocar a versão ou a configuração muda os números: exige nova linha de base.
- **Arquivos medidos:** `js/app.js`, `js/siga.js`, `js/eci.js` e `js/tema.js`. Ficam de fora as bibliotecas (`js/vendor/`),
  os dados (`js/database.js`, `js/optativas.js`, `js/horarios.js`, `js/guia.js`, `js/icones.js`, `js/demo-pdf.js`) e o
  código em Python.
- **Métricas:** linhas de código (sem brancos e comentários), número de funções (inclui funções anônimas),
  complexidade ciclomática máxima, funções com complexidade maior que 10 e a maior função, em linhas.
- **Comando** (PowerShell, na raiz do repositório; `<hash>` é o hash completo medido). O ESLint roda de dentro da pasta de
  medição, para aceitar a configuração fora do repositório:

```powershell
$hash = '<hash completo medido>'
$medida = Join-Path $env:TEMP ("grade-metricas-" + [guid]::NewGuid())
New-Item -ItemType Directory $medida | Out-Null
git archive --format=zip --output "$medida\codigo.zip" $hash js/app.js js/siga.js js/eci.js js/tema.js
Expand-Archive -LiteralPath "$medida\codigo.zip" -DestinationPath "$medida\codigo"
@'
export default [{
  files: ["**/*.js"],
  languageOptions: { ecmaVersion: 2022, sourceType: "script" },
  rules: {
    complexity: ["warn", 0],
    "max-lines": ["warn", { max: 0, skipBlankLines: true, skipComments: true }],
    "max-lines-per-function": ["warn", { max: 0, skipBlankLines: true, skipComments: true }],
  },
}];
'@ | Set-Content -Encoding utf8 "$medida\eslint.config.mjs"
@'
import json, re, sys
for arq in json.load(open(sys.argv[1], encoding="utf-8")):
    nome = arq["filePath"].replace("\\", "/").split("/")[-1]
    linhas, comp, tam = 0, [], []
    for m in arq["messages"]:
        if m["ruleId"] == "max-lines":
            linhas = int(re.search(r"\((\d+)\)", m["message"]).group(1))
        elif m["ruleId"] == "complexity":
            comp.append(int(re.search(r"complexity of (\d+)", m["message"]).group(1)))
        elif m["ruleId"] == "max-lines-per-function":
            tam.append(int(re.search(r"\((\d+)\)", m["message"]).group(1)))
    print(f"{nome}: {linhas} linhas, {len(comp)} funções, complexidade máxima {max(comp, default=0)}, "
          f"{sum(c > 10 for c in comp)} com complexidade > 10, maior função {max(tam, default=0)} linhas")
'@ | Set-Content -Encoding utf8 "$medida\resumir.py"
Push-Location $medida
npx --yes eslint@9.39.5 --no-config-lookup -c eslint.config.mjs -f json codigo -o saida.json
python -X utf8 resumir.py saida.json
Pop-Location
Remove-Item -Recurse -Force $medida
```

**Vínculo com o código publicado.** Registre abaixo o hash medido. Antes de publicar, confirme que os arquivos medidos
são **idênticos** aos do hash final: `git diff --exit-code <hash medido> <hash final> -- js/app.js js/siga.js js/eci.js js/tema.js`
termina com código 0. Se algum diferir, meça de novo.

**Linha de base.**

| Campo | Valor |
| --- | --- |
| Hash medido | `da95b6aa9463312c692446c63c6d4ea8e7affd2f` (2026-11-26; os quatro arquivos são idênticos aos do hash final do candidato: ver [PLANO-DE-TESTE.md](PLANO-DE-TESTE.md#8-resultado-por-candidato)) |
| ESLint | `9.39.5` (versão fixa; o npm avisa que a série 9 não tem mais suporte, e trocar de série exige nova linha de base) |
| Node | `26.13.1` |

| Arquivo | Linhas | Funções | Complexidade máxima | Funções com complexidade > 10 | Maior função (linhas) |
| --- | --- | --- | --- | --- | --- |
| `js/app.js` | 2711 | 746 | 69 | 38 | 392 |
| `js/siga.js` | 339 | 79 | 42 | 6 | 336 |
| `js/eci.js` | 461 | 107 | 21 | 5 | 67 |
| `js/tema.js` | 61 | 14 | 5 | 0 | 7 |

## Plano de reversão

Como desfazer uma publicação ruim sem reescrever o histórico. O procedimento de publicar está em
[PUBLICAR.md](PUBLICAR.md) e a lista de verificação em [PLANO-DE-TESTE.md](PLANO-DE-TESTE.md#7-lista-de-verificação-de-versão).

**Gatilhos** (qualquer um aciona o plano):

- uma das quatro condições para publicar ([VISAO.md](VISAO.md#condições-para-publicar)) foi violada no site publicado:
  dado pessoal saindo do dispositivo, um número errado sem aviso, orientação ou marcação manual apresentada como
  oficial, ou um bloqueio de acessibilidade;
- a página não abre ou falha ao carregar (recurso ausente, bloqueio da política de segurança) em algum navegador;
- um defeito de cálculo foi confirmado em pedidos, créditos ou prazos;
- dados de referência errados (currículo, horários ou guia) foram publicados.

**Quem age.** Quem mantém a Grade na hora. Se essa pessoa estiver ausente, qualquer pessoa com permissão de escrita no
repositório segue este plano.

**Último hash validado.** Anote a cada publicação o hash completo que passou pela lista de verificação. Só um hash desta
tabela serve de ponto de volta. Para os dados de referência, só serve um par que passou pelo validador.

| Hash completo | Data | Resultado da verificação |
| --- | --- | --- |
| `ad60477607747f4e835776110aaf869bf5e00c22` | 2026-11-26 | Candidato da v2.0.0 verificado: resultado em [PLANO-DE-TESTE.md](PLANO-DE-TESTE.md#8-resultado-por-candidato). A aprovação para publicar e a data da publicação entram aqui no dia em que a v2.0.0 for publicada |

**Como agir** (sempre por commit novo; **nunca** reescreva a `master` com `git push --force`):

1. **Escolha entre voltar e corrigir.** Para voltar, use o último hash validado. Para corrigir, prefira a correção
   pequena e segura, com o caso de teste que falhava (vermelho → verde, [CONTRIBUTING.md](../CONTRIBUTING.md)).
2. **Voltar:** numa branch a partir da `master`, rode `git revert` nos commits do problema, ou restaure só os arquivos
   afetados do último hash validado (`git restore --source <hash> -- <arquivos>`) e faça um commit descrevendo o motivo.
3. **Verificar:** rode a lista de verificação sobre o novo commit (no mínimo a matriz; paridade e oráculos se mexeu no
   importador; o validador se mexeu nos dados; a conferência de privacidade). Anote o **hash completo** aprovado.
4. **Publicar:** siga os passos 3 a 6 de [PUBLICAR.md](PUBLICAR.md) com esse hash e confira o GitHub Pages no mesmo hash.
5. **Registrar:** abra uma Issue pública descrevendo o problema **sem dados pessoais**, acrescente a nota em
   [MUDANCAS.md](MUDANCAS.md) (uma versão `v2.0.x`, se houver) e atualize a tabela do último hash validado.

**Verificação depois de agir.** Abra o site em janela anônima, por HTTPS; confirme a versão no rodapé, que não há erro
404 nem aviso de política de segurança no console, e repita o caso que motivou a reversão.

**Ensaio local.** Antes de depender do plano, arquive o hash aprovado (uma tag ou branch com nome claro) e confirme, na
[cópia pública por HTTP](PUBLICAR.md#abrir-a-cópia-pública-por-http) desse hash, que o app abre, que existe
`classico.html` e que o link dela leva ao modo clássico.

**Se a primeira publicação não tiver uma versão segura anterior.** Não há para onde voltar: **suspenda a publicação**.
Em **Settings → Pages**, desative o site (ou o fork deixa de servir a página). Abra uma Issue fixada com o motivo, sem
dados pessoais, e atualize o README com a data e o aviso. Corrija, verifique um novo hash e publique de novo pelo
procedimento acima. Se a suspensão durar, registre a decisão e o motivo em [DECISOES.md](DECISOES.md). Se o problema for
exposição de dados pessoais, remova o conteúdo exposto (Issue, anexo ou comentário) e oriente a pessoa: a Grade não guarda
dados em servidor próprio.
