# Privacidade: como o app garante que seus dados não saem do computador

**A importação ocorre no seu dispositivo.** A página lê os PDFs do SIGA e guarda o perfil no navegador.
Junto do seletor de PDFs o app lembra: *“O BOA e o Histórico são lidos neste navegador. Os PDFs não são enviados ao GitHub.”*
Esta página descreve o app em `index.html`, incluindo seu modo clássico.

## As garantias, uma a uma

| Garantia | Como é garantida | Onde ver |
|---|---|---|
| **O importador não envia dados** | A política de segurança (CSP) bloqueia conexões iniciadas pelo código para outras origens, envios de formulário e scripts externos. Links comuns continuam funcionando quando você clica | `<meta http-equiv="Content-Security-Policy">` no topo do `index.html` |
| **Sem servidor** | O site é só um conjunto de arquivos estáticos (HTML, CSS, JS). No GitHub Pages ou aberto do seu computador, não há programa do outro lado recebendo nada | Estrutura do repositório: não existe backend |
| **Sem rastreadores** | Não há analytics, fontes externas, CDN nem anúncios. As bibliotecas (pdf.js, ícones Lucide) e o logo estão dentro do repositório | `js/vendor/`, `js/icones.js`, `static/` |
| **PDF lido localmente** | O arquivo é aberto com `File.arrayBuffer()` e lido pelo pdf.js na própria página | `geraPerfilDoSiga` e `linhasPDF` em `js/app.js` |
| **Só dados acadêmicos entram no perfil** | O leitor decodifica a página em memória. O filtro descarta os cabeçalhos pessoais e encaminha ao importador somente linhas acadêmicas e a data de emissão do BOA | `filtrarPaginaPDF` em `js/siga.js` e `filtrar_pagina_pdf` em `ferramentas/gerar_perfil.py` |
| **O nome vem de você** | O nome do cabeçalho (“Grade ECI — Nome”) vem de **Criar/Editar perfil** ou de um perfil que você carregou. O importador não lê o nome dos PDFs | `salvaPerfilCriado` e `nomeDoPerfil` em `js/app.js` |
| **Guardado só no seu navegador** | Perfil, tags, marcações, planos e preferências ficam no `localStorage` deste navegador (prefixo `gradeECI.v2.`). Outro navegador, outra pessoa ou o site publicado não têm acesso | Privacidade, em Configurações |
| **Referências sem carga externa** | Os links de **Referências** (Intranet UFRJ, currículo oficial, repositórios) só abrem quando você clica, em outra aba e com `rel="noopener noreferrer"`. Abrir Configurações ou Referências não carrega nada de fora | `abreReferencias` em `js/app.js` |
| **Experiências com dados fictícios** | **A ECI por trás da Grade** usa PDFs fictícios que já vêm com o site (`js/demo-pdf.js`) e estado temporário. Não lê nem grava perfil, planos ou `localStorage` | `js/eci.js` |
| **Fora do git** | `perfil/perfil.js`, PDFs e planilhas estão no `.gitignore` | `.gitignore` |

### O que o navegador guarda

| Chave (`gradeECI.v2.…`) | Conteúdo |
|---|---|
| `perfilImportado` | Perfil importado do SIGA, criado ou carregado de um arquivo |
| `tags`, `marcacoes`, `creditos` | Tags de cor, o que foi pintado e créditos manuais |
| `plano` | Edições de planejamento, pedidos e extensão ainda não exportados (inclui períodos excluídos) |
| `tema`, `aparencia` | Tema escolhido e formato das abas e da barra (só existem depois de uma escolha) |
| `atalhos`, `ocultarSeletor`, `modoClassico`, `cadeado` | Atalhos fixados na barra, seletor de modo, modo e cadeado da paleta |
| `vista`, `exibir`, `filtros`, `filtroNivel`, `cronoPeriodo`, `progressoAberto` | Preferências de tela |

## Como conferir você mesmo

1. **No app:** abra **Configurações → Privacidade** (ou fixe Privacidade na barra). O painel mostra quantos recursos a
   página carregou e quantos vieram de outros sites (deve ser 0), e lista o que está guardado no navegador.
2. **No navegador:** F12 → aba **Rede/Network** → importe os PDFs ou use as experiências. Não aparece nenhuma requisição para fora.
3. **Sem internet:** desligue o Wi-Fi e use o app normalmente (inclusive importar). Funciona.
4. **No código:** procure por `fetch(`, `XMLHttpRequest` e `sendBeacon` em `js/app.js`, `js/siga.js`, `js/eci.js` e `js/tema.js`:
   não há nenhum. O pdf.js (`js/vendor/`) tem código de rede para abrir PDFs por URL, mas o app sempre entrega o arquivo
   em memória, e a CSP bloquearia qualquer conexão externa. Os únicos scripts carregados depois da página são arquivos
   locais (`js/siga.js`, `js/vendor/pdf*.js`, `js/demo-pdf.js` e o perfil opcional na abertura por `file://`).

## Página legada

A página separada `classico.html` guarda cores de disciplinas e preferências em cookies. Quando aberta por HTTP
ou HTTPS, o navegador pode enviar esses cookies junto das requisições para o mesmo domínio. Eles não contêm
nome, matrícula ou dados importados do SIGA. O modo clássico de `index.html` guarda as marcações em `localStorage`.

## Apagar

- **Configurações → Limpar dados salvos:** marcações, planos e o perfil salvo neste navegador.
- **Configurações → Privacidade → Apagar tudo deste navegador:** todas as chaves do app, inclusive preferências.
- Ou limpe os dados do site nas configurações do navegador.

## Regras para quem contribui

- **Não** adicione scripts, fontes, imagens ou APIs de outros domínios. Copie o arquivo para o repositório.
- **Não** afrouxe a Content-Security-Policy.
- Ao mudar o importador, preserve o filtro que descarta os cabeçalhos pessoais na extração e rode o teste de paridade.
- Dados de demonstração devem ser fictícios e ficar em `js/demo-pdf.js` (gerados por script, sem dado real).
- Para testes por HTTP, siga o README e sirva somente a cópia pública em `127.0.0.1`.
