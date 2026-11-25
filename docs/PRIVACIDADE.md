# Privacidade: como o app garante que seus dados não saem do computador

**A importação ocorre no seu dispositivo.** A página processa os PDFs do SIGA e guarda o perfil no navegador.

## As garantias, uma a uma

| Garantia | Como é garantida | Onde ver |
|---|---|---|
| **O importador não envia dados** | A política de segurança bloqueia conexões iniciadas pelo código para outras origens, envios de formulário e scripts externos. Links comuns continuam funcionando | `<meta http-equiv="Content-Security-Policy">` no topo do `index.html` |
| **Sem servidor** | O site é só um conjunto de arquivos estáticos (HTML, CSS, JS). No GitHub Pages ou aberto do seu computador, não há programa do outro lado recebendo nada | Estrutura do repositório: não existe backend |
| **Sem rastreadores** | Não há analytics, fontes externas, CDN nem anúncios. Todas as bibliotecas (pdf.js, ícones) estão dentro do repositório | `js/vendor/`, `js/icones.js` |
| **PDF lido localmente** | O arquivo é aberto com `File.arrayBuffer()` e lido pelo pdf.js na própria página | `geraPerfilDoSiga` e `linhasPDF` em `js/app.js` |
| **Só dados acadêmicos entram no perfil** | O leitor decodifica a página em memória. O filtro descarta os cabeçalhos pessoais e encaminha ao importador somente linhas acadêmicas e a data de emissão do BOA | `filtrarPaginaPDF` em `js/siga.js` e `filtrar_pagina_pdf` em `ferramentas/gerar_perfil.py` |
| **Guardado só no seu navegador** | O perfil importado, as tags e os planos ficam no `localStorage` deste navegador. Outro navegador, outra pessoa ou o site publicado não têm acesso | Botão de escudo (Privacidade) no app |
| **Fora do git** | `perfil/perfil.js`, PDFs e planilhas estão no `.gitignore` | `.gitignore` |

## Como conferir você mesmo

1. **No app:** clique no ícone de escudo. O painel mostra quantos recursos a página carregou e quantos vieram de
   outros sites (deve ser 0), e lista o que está guardado no navegador.
2. **No navegador:** F12 → aba **Rede/Network** → importe os PDFs. Não aparece nenhuma requisição para fora.
3. **Sem internet:** desligue o Wi-Fi e use o app normalmente (inclusive importar). Funciona.
4. **No código:** procure por `fetch(`, `XMLHttpRequest` e `sendBeacon` em `js/app.js` e `js/siga.js`.
   A importação só usa o arquivo selecionado e grava o perfil no navegador.

## Apagar tudo

No painel de Privacidade: **Apagar tudo deste navegador**. Ou limpe os dados do site nas configurações do navegador.

## Regras para quem contribui

- **Não** adicione scripts, fontes, imagens ou APIs de outros domínios. Copie o arquivo para o repositório.
- **Não** afrouxe a Content-Security-Policy.
- Ao mudar o importador, preserve o filtro que descarta os cabeçalhos pessoais na extração.
- Para testes por HTTP, siga o README e sirva somente a cópia pública em `127.0.0.1`.
