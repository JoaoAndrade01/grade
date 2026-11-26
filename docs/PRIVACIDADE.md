# Privacidade

**Pergunta que este documento responde:** o que acontece com os seus dados quando você usa a Grade.
A condição de publicação correspondente está em [VISAO.md](VISAO.md); o critério verificável, em
[RNF-01](REQUISITOS.md#5-requisitos-não-funcionais).

## Em resumo

A Grade lê o Histórico e o BOA neste navegador para montar o seu planejamento. **Os arquivos e os seus dados
acadêmicos não são enviados pelo app.** O navegador guarda o perfil até você apagar os dados ou limpar o
armazenamento. O arquivo exportado é uma cópia sob o seu controle e **pode conter dados acadêmicos e o nome que
você informou**: guarde-o em local privado. Na versão hospedada, o GitHub Pages registra o endereço IP de quem
visita o site, para segurança. Links externos abrem seus destinos quando você escolhe acessá-los. Relatos no
GitHub são públicos: descreva o ocorrido com dados fictícios e evite anexar perfil, PDF ou captura identificável.

Junto do seletor de PDFs o app repete a garantia: *“O BOA e o Histórico são lidos neste navegador. Os PDFs não são
enviados ao GitHub.”*

## O que acontece com cada coisa

| O quê | Onde fica | Quem pode ver |
| --- | --- | --- |
| **PDFs do SIGA** (Histórico e BOA) | São lidos na memória da página (`File.arrayBuffer()` e pdf.js, ou pypdf no terminal). Não são gravados nem enviados | Só você |
| **Dados acadêmicos extraídos** (períodos, notas, pedidos, extensão) | No `localStorage` deste navegador, neste site (origem). Outro navegador, outro perfil do navegador, outra pessoa ou outro endereço do site não os enxergam | Quem usa este navegador |
| **Nome** | Vem de **Criar/Editar perfil** ou de um perfil que você carregou. O importador não lê o nome dos PDFs | Quem usa este navegador e quem receber o arquivo exportado |
| **Arquivo exportado** (`perfil.js`) | Onde você salvar. Contém os dados acadêmicos do perfil e o nome, se você o informou | Quem tiver acesso ao arquivo |
| **Visita ao site hospedado** | O GitHub Pages registra o endereço IP de quem acessa, por segurança ([política do GitHub](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#data-collection)). A Grade não adiciona rastreadores, análise de uso nem cookies | GitHub |
| **Links externos** (Referências, rodapé, relato) | Só abrem quando você clica, em outra aba. O destino recebe a sua visita, como em qualquer link | O destino |
| **Issues e Pull Requests** | Públicos no GitHub, com o que você escrever e anexar | Qualquer pessoa |

Abrir a Grade a partir de uma **cópia local** (`index.html` direto do disco) não envolve hospedagem: o IP não é
registrado por ninguém e o armazenamento do navegador continua sendo por origem (`file://`).

## As garantias técnicas

| Garantia | Como é garantida | Onde ver |
| --- | --- | --- |
| **O app não envia dados** | A política de segurança de conteúdo (CSP) bloqueia conexões iniciadas pelo código para outras origens, envios de formulário e scripts externos. Links comuns continuam funcionando quando você clica | `<meta http-equiv="Content-Security-Policy">` no topo do `index.html` |
| **Sem servidor** | O site é só um conjunto de arquivos estáticos (HTML, CSS, JS). Não há programa do outro lado recebendo nada | Estrutura do repositório: não existe backend |
| **Sem rastreadores** | Não há analytics, fontes externas, CDN nem anúncios. As bibliotecas (pdf.js, ícones Lucide) e o logo estão dentro do repositório | `js/vendor/`, `js/icones.js`, `static/` |
| **Só dados acadêmicos entram no perfil** | O leitor decodifica a página em memória. O filtro descarta os cabeçalhos pessoais e encaminha ao importador somente linhas acadêmicas e a data de emissão do BOA | `filtrarPaginaPDF` em `js/siga.js` e `filtrar_pagina_pdf` em `ferramentas/gerar_perfil.py` |
| **Referências sem carga externa** | Os links de **Referências** só abrem quando você clica, em outra aba e com `rel="noopener noreferrer"` | `abreReferencias` em `js/app.js` |
| **Experiências com dados fictícios** | **A ECI por trás da Grade** usa PDFs fictícios que já vêm com o site (`js/demo-pdf.js`) e estado temporário. Não lê nem grava perfil, planos ou `localStorage` | `js/eci.js` |
| **Fora do Git** | `perfil/perfil.js`, PDFs e planilhas estão no `.gitignore` | `.gitignore` |

A CSP limita o que o *código da página* pode fazer. Ela não impede que você mesmo envie um arquivo para outro
lugar, e não controla o que o GitHub registra quando você visita o site hospedado.

### O que o navegador guarda

| Chave (`gradeECI.v2.…`) | Conteúdo |
| --- | --- |
| `perfilImportado` | Perfil importado do SIGA, criado ou carregado de um arquivo |
| `tags`, `marcacoes`, `creditos` | Tags de cor, o que foi pintado e créditos manuais |
| `plano` | Edições de planejamento, pedidos e extensão ainda não exportados (inclui períodos excluídos) |
| `tema`, `aparencia` | Tema escolhido e formato das abas e da barra (só existem depois de uma escolha) |
| `atalhos`, `ocultarSeletor`, `modoClassico`, `cadeado` | Atalhos fixados na barra, seletor de modo, modo e cadeado da paleta |
| `vista`, `exibir`, `filtros`, `filtroNivel`, `cronoPeriodo`, `progressoAberto` | Preferências de tela |

## Como conferir você mesmo

1. **No app:** abra **Configurações → Privacidade** (ou fixe Privacidade na barra). O painel mostra quantos recursos
   a página carregou e quantos vieram de outros sites (deve ser 0) e lista o que está guardado no navegador.
2. **No navegador:** F12 → aba **Rede/Network** → importe PDFs fictícios ou use as experiências. Nenhuma
   requisição sai para outro endereço.
3. **Sem internet:** desligue o Wi-Fi e use o app (inclusive importar). Funciona.
4. **No código:** procure por `fetch(`, `XMLHttpRequest` e `sendBeacon` em `js/app.js`, `js/siga.js`, `js/eci.js` e
   `js/tema.js`: não há nenhum. O pdf.js (`js/vendor/`) tem código de rede para abrir PDFs por URL, mas o app
   sempre entrega o arquivo em memória, e a CSP bloquearia qualquer conexão externa. Os únicos scripts carregados
   depois da página são arquivos locais (`js/siga.js`, `js/vendor/pdf*.js`, `js/demo-pdf.js` e o perfil opcional na
   abertura por `file://`).
5. **No teste:** o kit de testes importa PDFs fictícios e observa as requisições do navegador: nenhuma sai da origem
   do site, nos seis pares de navegador e forma de abertura ([PLANO-DE-TESTE.md](PLANO-DE-TESTE.md)). O teste da
   importação confere que o perfil salvo e a página não contêm o nome, o CPF nem o RG do cabeçalho do PDF. Numa
   conferência avulsa do candidato, com marcadores no cabeçalho dos PDFs fictícios (nome, CPF, RG e matrícula), nenhum
   deles apareceu no arquivo exportado, no armazenamento, nos cookies, no console nem em endereços ou corpos de
   requisição. Essa conferência avulsa ainda não é um teste versionado.

## Exportar e apagar

**Exportar** (antes de limpar os dados ou de trocar de navegador): **Exportar perfil.js** (Cronograma ou
Equivalências) ou **Baixar perfil.js** no aviso do topo. Para recuperar, use **Importar do SIGA → Ou carregar um
perfil pronto**. Trate o arquivo como um documento acadêmico seu.

**Apagar:**

- **Configurações → Limpar dados salvos:** marcações, planos e o perfil salvo neste navegador.
- **Configurações → Privacidade → Apagar tudo deste navegador:** todas as chaves do app, inclusive preferências.
- Ou limpe os dados do site nas configurações do navegador.

Apagar os dados do navegador **não** apaga arquivos exportados nem relatos já publicados no GitHub.

## Referência: LGPD

A Lei Geral de Proteção de Dados ([Lei 13.709/2018](https://planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm))
inclui processamento e armazenamento no conceito de tratamento de dados. A Grade usa a lei como **referência de
minimização e de transparência**: coleta só o que a função precisa, processa no dispositivo e descreve o que
acontece. Este documento é uma descrição técnica do funcionamento. Ele não declara isenção, conformidade nem papéis
jurídicos do projeto.

## Página substituta e cookies antigos

`classico.html` é hoje uma página estática curta, sem script, sem cookies e sem recursos externos, que leva ao
modo clássico do app. A página antiga que ocupava esse endereço guardava cores de disciplinas em cookies; quem a
usou pode ainda ter esses cookies no navegador, que podem ser enviados ao mesmo domínio em requisições HTTP. Eles
não contêm nome, matrícula nem dados importados do SIGA, e não são lidos pelo app. O modo clássico de `index.html`
guarda as marcações em `localStorage`. Para remover os cookies antigos, limpe os dados do site.

## Regras para quem contribui

- **Não** adicione scripts, fontes, imagens ou APIs de outros domínios. Copie o arquivo para o repositório.
- **Não** afrouxe a Content-Security-Policy.
- Ao mudar o importador, preserve o filtro que descarta os cabeçalhos pessoais e rode o teste de paridade
  ([CONTRIBUTING.md](../CONTRIBUTING.md)).
- Dados de demonstração devem ser fictícios e ficar em `js/demo-pdf.js` (gerados por script, sem dado real).
- Para testar por HTTP, sirva somente a cópia pública em `127.0.0.1` ([PUBLICAR.md](PUBLICAR.md#abrir-a-cópia-pública-por-http)).
