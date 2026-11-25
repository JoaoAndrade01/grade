# Grade ECI — Engenharia de Computação e Informação (UFRJ)

Fluxograma interativo da grade de ECI. Mostra o que você já cursou, pinta as disciplinas com tags, mostra as
setas de pré-requisito, planeja os próximos períodos com horários, organiza optativas, pedidos de equivalência
e horas de Extensão/ACE. A aba **A ECI por trás da Grade** explica, com disciplinas do curso, como o site funciona.

Fork de [`gremio-eci/grade`](https://github.com/gremio-eci/grade). A versão original continua em `classico.html`.

**Tudo roda no seu navegador.** O site é estático (HTML, CSS e JavaScript, sem servidor). Seus PDFs, seu perfil
e seus planos ficam neste computador: *O BOA e o Histórico são lidos neste navegador. Os PDFs não são enviados ao GitHub.*
Detalhes em [`docs/PRIVACIDADE.md`](docs/PRIVACIDADE.md).

![Arquitetura da Grade ECI: origens dos dados, importador local, arquivos do curso e telas](docs/diagramas/arquitetura-atual.svg)

## Abrir

- **No GitHub Pages**, quando estiver publicado (ver [`docs/PUBLICAR.md`](docs/PUBLICAR.md)).
- **No seu computador:** baixe o repositório e dê dois cliques em `index.html`. Funciona por `file://`, sem instalar nada
  e sem internet.

Na primeira visita o site abre no **modo clássico**: a grade inteira numa tela, a paleta embaixo e o **seletor de modo**
(o interruptor no topo). Desligue o interruptor para o **modo completo**, com as abas.

## Três jeitos de usar

### 1. Sem perfil

- Pinte as disciplinas com a paleta: **Cursada** (cursada e aprovada, conta como concluída), **Cursando** e
  **Planejada**. A borracha tira a tag.
- Veja requisitos em **Grade → Exibir → Setas** (modo completo) e consulte optativas, horários de referência e o guia dos alunos.
- Use **A ECI por trás da Grade**: funciona sem perfil.
- Sem perfil o site não mostra nome nem barras de progresso. **Criar perfil** e **Importar do SIGA** ficam sempre no topo.

### 2. Com um perfil criado à mão

**Criar perfil** pede só dois campos, os dois opcionais: **nome** e **semestre atual** (`AAAA/1` ou `AAAA/2`).
Dá para salvar em branco. O que você já tinha pintado ou planejado continua. Com perfil, o topo mostra
**Grade ECI — Nome** e as barras de progresso aparecem. O mesmo botão vira **Editar perfil**.

### 3. Com importação do SIGA

1. No SIGA (pela [Intranet UFRJ](https://intranet.ufrj.br/)), baixe em PDF o **Histórico** e o **BOA**. Se mudou de curso,
   baixe também o histórico anterior.
2. Clique em **Importar do SIGA**, escolha os PDFs e clique em **Gerar perfil**.
3. Confira a prévia:
   - **Período atual sugerido:** o semestre seguinte ao último semestre do Histórico, com as disciplinas
     “Cursando” do BOA. Corrija se precisar ou deixe em branco para um período sem data.
   - **Planos:** os planos que você já tinha são mantidos. Se um plano coincide com o período atual ou com um
     semestre do Histórico, a prévia pede uma escolha. Troque o semestre ou confirme a substituição.
     **Usar este perfil** e **Baixar perfil.js** ficam bloqueados até lá.
   - **Descartar prévia** sai sem mudar nada.
4. Clique em **Usar este perfil**.

Prefere terminal? `pip install pypdf` e
`python ferramentas/gerar_perfil.py --historico historico.pdf --boa boa.pdf -o perfil/perfil.js`
(regras em [`docs/IMPORTADOR.md`](docs/IMPORTADOR.md)).

## O que dá para fazer

| Onde | Para quê |
|---|---|
| **Grade** | A grade por período. **Exibir**: código e créditos, notas, dificuldade, presença e **Setas** (Ocultas, Disciplina em foco ou Todas). A paleta pinta as disciplinas, e o **cadeado** protege as cursadas contra alterações. **ECI por trás** destaca as disciplinas com experiência |
| **Linha do tempo** | Seus períodos reais, com notas, reprovações, equivalências, dispensas, progresso por grupo e avisos de requisito e de oferta |
| **Optativas** | Catálogo com marcação ativa/inativa pela oferta de referência, filtros “só liberadas” e “só as que cabem” no horário |
| **Cronograma** | Grade semanal por período planejado. Mostra choques, horários de referência, sugestões, proposta sem choques e **Excluir período** |
| **Equivalências e Extensão / ACE** | Pedidos de dispensa, checagem de carga horária e do prazo de 5 anos, contas automáticas e horas de extensão |
| **A ECI por trás da Grade** | Como entrar e as três experiências desta versão (abaixo) |

### Planejamento

- No **Cronograma**, crie períodos com **+ Período** e adicione disciplinas pelo código ou pelo nome.
- Defina os horários clicando nas células e use as **sugestões** para o período.
- Uma obrigatória planejada no semestre da paridade errada recebe o aviso
  “Pode não ser ofertada neste semestre”, exceto as do ciclo básico.
- **Excluir período** remove um período planejado. **Descartar edições** volta ao conteúdo original de um período do perfil.

### Configurações (engrenagem no topo)

- **Perfil e dados:** Criar/Editar perfil, Importar do SIGA, Privacidade e **Limpar dados salvos**.
- **Aparência:** abas e barra com **Ícone e texto** (padrão), **Somente texto** ou **Somente ícone**. Tema igual ao
  sistema, claro ou escuro. Modo clássico ou completo e **Mostrar o seletor de modo no topo**.
- **Grade:** as mesmas opções de **Exibir**, as setas, o cadeado e o editor de **Tags**, sincronizados com a aba Grade.
- **Referências:** de onde vêm os dados e links para o SIGA, o currículo oficial e os repositórios.
  Os links só abrem quando você clica.

Perfil, Importar do SIGA, Tema, Privacidade, Referências e Tags podem ser **fixados** na barra do topo. Todos começam
desafixados e continuam acessíveis em Configurações.

### A ECI por trás da Grade

No modo completo, abra **Grade** e ligue **ECI por trás** na paleta. As disciplinas com experiência ficam destacadas
e as outras ficam inativas. Escolha uma para abrir a experiência em tela cheia. **Voltar** ou Esc retornam ao cartão.
A aba **A ECI por trás da Grade** explica o caminho e também abre as experiências.

| Disciplina | Experiência |
|---|---|
| **COS110 · Algoritmos e Programação** (1º) | Um Histórico fictício vira linhas, registros e prévia de perfil. Você edita uma nota ou situação e vê o que muda. Mostra o cabeçalho descartado e uma linha fora do formato |
| **COS242 · Teoria dos Grafos** (4º) | Requisitos como grafo dirigido: dependência direta, cadeia de pré-requisitos e co-requisito. Permite marcar disciplinas como cursadas (de mentira) e simular uma ligação, inclusive um ciclo |
| **EEL873 · Engenharia de Software** (6º) | Paridade JavaScript × Python com os mesmos dados fictícios. A saída Python é **pré-computada**. Há cenários simulados de divergência de regra e de extração e um erro que as duas compartilham |

As experiências usam dados fictícios e estado temporário. Elas não leem nem gravam seu perfil, seu planejamento ou o
armazenamento do navegador. Próxima etapa: COS231 · Estruturas de Dados, com a detecção de choques de horário.

## Salvar e levar para outro computador

O site guarda tudo no navegador (`localStorage`). Para ter um arquivo, use **Exportar perfil.js** (Cronograma ou
Equivalências) ou **Baixar perfil.js** no aviso do topo. Coloque o arquivo em `perfil/perfil.js` (ele está no
`.gitignore`) ou carregue-o em **Importar do SIGA → Ou carregar um perfil pronto**.

## Para quem quer mexer no código

| Documento | Conteúdo |
|---|---|
| [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) | Fontes de dados, camadas do app, chaves do navegador, regras centrais e o plano de automação com o Notion |
| [`docs/PERFIL.md`](docs/PERFIL.md) | Formato do `perfil.js` |
| [`docs/IMPORTADOR.md`](docs/IMPORTADOR.md) | Regras de leitura dos PDFs do SIGA, prévia e teste de paridade |
| [`docs/PRIVACIDADE.md`](docs/PRIVACIDADE.md) | O que fica no computador e como conferir |
| [`docs/DESIGN.md`](docs/DESIGN.md) | Identidade visual, componentes e acessibilidade |
| [`docs/PUBLICAR.md`](docs/PUBLICAR.md) | Publicar no GitHub Pages e sincronizar o fork |
| [`docs/MUDANCAS.md`](docs/MUDANCAS.md) | Registro das mudanças |

```
index.html            app                         classico.html   versão original
js/app.js             modelo, telas, Configurações js/siga.js      regras do importador do SIGA
js/tema.js            tema e aparência (no <head>) js/eci.js       A ECI por trás da Grade + setas (SVG)
js/demo-pdf.js        PDFs fictícios + Python pré-computado (carregado só nas experiências)
js/database.js        currículo e requisitos       js/optativas.js catálogo de eletivas (SIGA)
js/horarios.js        turmas de referência         js/guia.js      dificuldade/presença (Notion)
js/icones.js          ícones Lucide (ISC)          js/vendor/      pdf.js (Apache-2.0)
static/               app.css, logo do Grêmio      docs/diagramas/ diagramas (gerar.js → SVG)
ferramentas/          gerar_perfil.py · gerar_perfil_node.js · testar_paridade.sh
perfil/               perfil.exemplo.js (o perfil.js pessoal fica fora do git)
```

Sem build e sem dependências em tempo de execução: edite e recarregue a página (Ctrl+F5). Abra `index.html` direto
para usar os PDFs e o perfil do seu computador.

### Testar por HTTP

Sirva **uma cópia dos arquivos públicos**, acessível só neste computador. Assim o servidor não expõe `perfil/perfil.js` nem os PDFs.

```powershell
$gradePublica = Join-Path $env:TEMP ("grade-eci-" + [guid]::NewGuid())
git archive --format=zip --output "$gradePublica.zip" HEAD index.html classico.html js static docs perfil/perfil.exemplo.js
Expand-Archive -LiteralPath "$gradePublica.zip" -DestinationPath $gradePublica
python -m http.server --bind 127.0.0.1 --directory "$gradePublica" 8000
```

Abra `http://127.0.0.1:8000` e use PDFs fictícios ou os seus pelo botão de importação. Ao terminar, pare o servidor com
Ctrl+C e remova a cópia:

```powershell
$gradePasta = Resolve-Path -LiteralPath $gradePublica
if ((Split-Path -Parent $gradePasta.Path) -eq (Resolve-Path -LiteralPath $env:TEMP).Path) {
  Remove-Item -LiteralPath $gradePasta.Path -Recurse -Force
  Remove-Item -LiteralPath "$gradePublica.zip"
}
```

`git archive` usa o último commit (`HEAD`). Para testar mudanças ainda não commitadas, copie os mesmos arquivos da pasta de trabalho.

### Teste de paridade do importador

```bash
GRADE_PYTHON=python bash ferramentas/testar_paridade.sh historico.pdf boa.pdf
```

Compara as regras JavaScript e Python sobre o mesmo texto e os perfis gerados com leitores independentes (pdf.js e pypdf).

## Créditos e licença

- Projeto original: Grêmio ECI / [carloseduardov8](https://github.com/carloseduardov8/Interactive-Flowchart) — AGPL-3.0.
- Logo: Grêmio de ECI.
- Currículo e catálogo: SIGA/UFRJ ([currículo oficial da ECI](https://www.siga.ufrj.br/sira/repositorio-curriculo/distribuicoes/A46B41C8-92A4-F79C-7383-BE627D84214E.html)).
- Horários e guia dos alunos: página “Grades de ECI (Editável)” no Notion, feita por alunos de ECI.
- pdf.js: Mozilla, Apache-2.0 (`js/vendor/LICENSE-pdfjs.txt`). Ícones da interface: Lucide, ISC.
  As fontes das marcas dos diagramas estão na [arquitetura](docs/ARQUITETURA.md).

Licença: AGPL-3.0 (ver `LICENSE`).
